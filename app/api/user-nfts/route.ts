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

    // Transform the data to match the NFT interface
    const nfts = signatures?.map((sig) => ({
      id: sig.id,
      tokenId: sig.token_id?.toString() || "",
      petitionId: sig.petition_id,
      petitionTitle: sig.petitions?.title || "Unknown Petition",
      imageUrl: `https://refreeg.com/logo.svg`, // Default image or fetch from contract
      contractAddress: sig.petitions?.contract_address || "",
      network: sig.petitions?.network || "polygon_mainnet",
      mintedAt: sig.created_at,
      transactionHash: sig.tx_hash || "",
      status: sig.tx_hash ? "minted" : "pending",
    })) || [];

    return NextResponse.json({ nfts });
  } catch (error) {
    console.error("Error in user-nfts API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
