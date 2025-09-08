import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/actions/auth-actions";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    
    // Get user's NFT signatures from petition_signatures table
    const { data: signatures, error } = await supabase
      .from("petition_signatures")
      .select(`
        id,
        token_id,
        petition_id,
        signature_message,
        tx_hash,
        created_at,
        petitions!inner (
          id,
          title,
          contract_address,
          network,
          nft_enabled
        )
      `)
      .eq("signer_address", user.id) // Assuming signer_address stores user_id
      .not("token_id", "is", null)
      .not("tx_hash", "is", null);

    if (error) {
      console.error("Error fetching user NFTs:", error);
      return NextResponse.json({ error: "Failed to fetch NFTs" }, { status: 500 });
    }

    // Helper function to generate explorer links
    const getExplorerLinks = (network: string, contractAddress: string, tokenId: string, txHash: string) => {
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
        solana: "https://explorer.solana.com",
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

    // Transform the data to match the NFT interface
    const nfts = signatures?.map((sig) => {
      const network = sig.petitions?.network || "polygon_mainnet";
      const contractAddress = sig.petitions?.contract_address || "";
      const tokenId = sig.token_id?.toString() || "";
      const txHash = sig.tx_hash || "";
      
      const explorerLinks = getExplorerLinks(network, contractAddress, tokenId, txHash);
      
      return {
        id: sig.id,
        tokenId,
        petitionId: sig.petition_id,
        petitionTitle: sig.petitions?.title || "Unknown Petition",
        imageUrl: `https://refreeg.com/logo.svg`, // Default image or fetch from contract
        contractAddress,
        network,
        mintedAt: sig.created_at,
        transactionHash: txHash,
        status: txHash ? "minted" : "pending",
        explorerLinks,
      };
    }) || [];

    return NextResponse.json({ nfts });
  } catch (error) {
    console.error("Error in user-nfts API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
