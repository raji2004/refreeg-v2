import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const petitionId = searchParams.get("petitionId");
    const userId = searchParams.get("userId");

    if (!petitionId || !userId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get petition details
    const { data: petition, error: petitionError } = await supabase
      .from("petitions")
      .select("nft_enabled, contract_address, network")
      .eq("id", petitionId)
      .single();

    if (petitionError) {
      // Check for PostgREST "not found" error
      if (petitionError.code === "PGRST116" || petitionError.message?.includes("PGRST116") || petitionError.message?.includes("0 rows returned")) {
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
      }
      console.error("Error fetching petition:", petitionError);
      return NextResponse.json({ error: "Failed to fetch petition" }, { status: 500 });
    }

    // Check if user has signed this petition
    const { data: signatures, error: signatureError } = await supabase
      .from("petition_signatures")
      .select("token_id, tx_hash")
      .eq("petition_id", petitionId)
      .eq("signer_address", userId) // userId is actually the signer_address
      .order("created_at", { ascending: false })
      .limit(1);

    if (signatureError) {
      console.error("Error fetching signature:", signatureError);
      return NextResponse.json({ error: "Failed to fetch signature" }, { status: 500 });
    }

    const signature = signatures && signatures.length > 0 ? signatures[0] : null;

    // Determine status
    let status: "not_signed" | "signed_no_nft" | "nft_pending" | "nft_minted";
    
    if (!signature) {
      status = "not_signed";
    } else if (!petition.nft_enabled) {
      status = "signed_no_nft";
    } else if (signature.token_id && signature.tx_hash) {
      status = "nft_minted";
    } else {
      status = "nft_pending";
    }

    // Helper function to generate explorer links
    const getExplorerLinks = (network: string, contractAddress: string, tokenId: string, txHash: string) => {
      // Handle Solana separately
      if (network === 'solana') {
        return {
          contractUrl: contractAddress ? `https://explorer.solana.com/address/${contractAddress}?cluster=mainnet` : null,
          tokenUrl: tokenId ? `https://explorer.solana.com/token/${tokenId}?cluster=mainnet` : null,
          transactionUrl: txHash ? `https://explorer.solana.com/tx/${txHash}?cluster=mainnet` : null,
          openseaUrl: null, // Solana doesn't use OpenSea
        };
      }
      
      // EVM networks
      const baseUrls = {
        polygon_mainnet: "https://polygonscan.com",
        polygon_amoy: "https://amoy.polygonscan.com",
        ethereum: "https://etherscan.io",
        sepolia: "https://sepolia.etherscan.io",
        bsc: "https://bscscan.com",
        bsc_testnet: "https://testnet.bscscan.com",
        arbitrum: "https://arbiscan.io",
        arbitrum_sepolia: "https://sepolia.arbiscan.io",
        optimism: "https://optimistic.etherscan.io",
        base: "https://basescan.org",
        avalanche: "https://snowtrace.io",
      };

      const baseUrl = baseUrls[network as keyof typeof baseUrls] || baseUrls.polygon_mainnet;
      
      return {
        contractUrl: contractAddress ? `${baseUrl}/address/${contractAddress}` : null,
        tokenUrl: contractAddress && tokenId ? `${baseUrl}/token/${contractAddress}?a=${tokenId}` : null,
        transactionUrl: txHash ? `${baseUrl}/tx/${txHash}` : null,
        openseaUrl: contractAddress && tokenId ? 
          (network.includes('polygon') ? 
            `https://opensea.io/assets/matic/${contractAddress}/${tokenId}` :
            `https://opensea.io/assets/ethereum/${contractAddress}/${tokenId}`) : null,
      };
    };

    const network = petition.network || "polygon_amoy";
    const contractAddress = petition.contract_address || "";
    const tokenId = signature?.token_id?.toString() || "";
    const txHash = signature?.tx_hash || "";
    
    const explorerLinks = getExplorerLinks(network, contractAddress, tokenId, txHash);

    const nftStatus = {
      hasSigned: !!signature,
      nftEnabled: petition.nft_enabled || false,
      tokenId: signature?.token_id?.toString(),
      txHash: signature?.tx_hash,
      contractAddress: petition.contract_address,
      network: petition.network,
      status,
      explorerLinks,
    };

    return NextResponse.json({ status: nftStatus });
  } catch (error) {
    console.error("Error in petition-nft-status API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
