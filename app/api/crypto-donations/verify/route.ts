import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordCryptoDonation, confirmCryptoDonation } from "@/actions/crypto-donation-actions";
import { getTokensForNetwork } from "@/lib/tokens";
import { z } from "zod";
import { ethers } from "ethers";

// Schema validation for crypto donation verification
const cryptoDonationSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash format"),
  network: z.enum(['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'avalanche', 'fantom', 'solana']),
  causeId: z.string().uuid("Invalid cause ID format"),
  expectedRecipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid recipient address format"),
  expectedAmount: z.number().positive("Amount must be positive")
});

// Verify and record a crypto donation
export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
    
    // Validate request body against schema
    const validationResult = cryptoDonationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Invalid input",
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }
    
    const { txHash, network, causeId, expectedRecipient, expectedAmount } = validationResult.data;

    // Get cause details from database for server-side verification
    const supabase = await createClient();
    const { data: cause, error: causeError } = await supabase
      .from("causes")
      .select("id, title, recipient_address")
      .eq("id", causeId)
      .single();
      
    if (causeError || !cause) {
      return NextResponse.json(
        { error: "Cause not found" },
        { status: 404 }
      );
    }
    
    // Verify transaction on-chain with server-side validation
    const verification = await verifyTransactionOnChain(
      txHash,
      network,
      cause.recipient_address || expectedRecipient,
      expectedAmount
    );

    if (!verification.valid) {
      return NextResponse.json(
        { error: "Transaction verification failed", details: verification.error },
        { status: 400 }
      );
    }

    // Record the donation
    const donationData = {
      causeId,
      txHash,
      amountInCrypto: verification.amount || 0,
      amountInNaira: verification.amountInNaira || 0,
      donorWalletAddress: verification.from || "",
      recipientAddress: verification.to || "",
      network,
      currency: verification.currency || "",
      walletType: verification.walletType || "",
    };

    const result = await recordCryptoDonation(donationData);

    if (result.success) {
      // Mark as pending with transaction details for background confirmation
      await supabase
        .from("crypto_donations")
        .update({ 
          status: "pending",
          verified_at: new Date().toISOString(),
          block_number: verification.blockNumber,
          block_hash: verification.blockHash
        })
        .eq("tx_signature", txHash)
        .eq("network", network);
      
      // Enqueue background confirmation job (in production, use a proper job queue)
      // For now, we'll just mark it as verified and let the webhook handle confirmation
      
      return NextResponse.json({
        success: true,
        message: "Donation recorded and verified successfully",
        data: result.data,
      });
    } else {
      return NextResponse.json(
        { error: "Failed to record donation" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error verifying crypto donation:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      body: body || "Failed to parse body"
    });
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

async function verifyTransactionOnChain(
  txHash: string,
  network: string,
  expectedRecipient: string,
  expectedAmount: number
) {
  try {
    // Check if stub mode is enabled
    if (process.env.CRYPTO_VERIFY_MODE === 'stub') {
      return {
        valid: true,
        amount: expectedAmount,
        amountInNaira: expectedAmount * 1500,
        from: expectedRecipient, // Use expected recipient as fallback
        to: expectedRecipient,
        currency: network === "solana" ? "SOL" : "ETH",
        walletType: network === "solana" ? "phantom" : "metamask",
      };
    }
    
    const rpcUrl = getRpcUrl(network);
    
    if (!rpcUrl) {
      return {
        valid: false,
        error: "Unsupported network",
      };
    }

    // Real on-chain verification for EVM networks
    if (network !== 'solana') {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return {
          valid: false,
          error: "Transaction not found",
        };
      }
      
      if (receipt.status !== 1) {
        return {
          valid: false,
          error: "Transaction failed",
        };
      }
      
      // Check confirmations (at least 1 for now)
      const currentBlock = await provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber;
      
      if (confirmations < 1) {
        return {
          valid: false,
          error: "Insufficient confirmations",
        };
      }
      
      // Verify recipient and amount from transaction
      const tx = await provider.getTransaction(txHash);
      if (!tx) {
        return {
          valid: false,
          error: "Transaction details not found",
        };
      }
      
      if (tx.to?.toLowerCase() !== expectedRecipient.toLowerCase()) {
        return {
          valid: false,
          error: "Recipient mismatch",
        };
      }
      
      // Convert wei to ether for amount comparison
      const actualAmount = parseFloat(ethers.formatEther(tx.value));
      if (Math.abs(actualAmount - expectedAmount) > 0.001) {
        return {
          valid: false,
          error: "Amount mismatch",
        };
      }
      
      // Get exchange rate - find native token more robustly
      const tokens = getTokensForNetwork(network);
      const nativeToken = tokens.find(token => 
        token.isNative || 
        token.type === 'native' || 
        token.address === '0x0000000000000000000000000000000000000000' ||
        token.symbol === (network === 'solana' ? 'SOL' : 'ETH')
      );
      const exchangeRate = nativeToken?.exchangeRate || 1500;
      
      return {
        valid: true,
        amount: actualAmount,
        amountInNaira: actualAmount * exchangeRate,
        from: tx.from,
        to: tx.to,
        currency: nativeToken?.symbol || "ETH",
        walletType: "metamask",
      };
    }
    
    // For Solana, you would implement similar logic using Solana web3.js
    // This is a placeholder for Solana verification
    return {
      valid: false,
      error: "Solana verification not implemented",
    };
    
  } catch (error) {
    console.error("Transaction verification error:", error);
    return {
      valid: false,
      error: "Failed to verify transaction",
    };
  }
}

function getRpcUrl(network: string): string | null {
  const rpcUrls: Record<string, string> = {
    ethereum: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
    polygon: process.env.POLYGON_RPC_URL || "https://polygon.llamarpc.com",
    bsc: process.env.BSC_RPC_URL || "https://bsc.llamarpc.com",
    arbitrum: process.env.ARBITRUM_RPC_URL || "https://arbitrum.llamarpc.com",
    optimism: process.env.OPTIMISM_RPC_URL || "https://optimism.llamarpc.com",
    base: process.env.BASE_RPC_URL || "https://base.llamarpc.com",
    avalanche: process.env.AVALANCHE_RPC_URL || "https://avalanche.llamarpc.com",
    fantom: process.env.FANTOM_RPC_URL || "https://fantom.llamarpc.com",
    solana: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  };

  return rpcUrls[network] || null;
}
