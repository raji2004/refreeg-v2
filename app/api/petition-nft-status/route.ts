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
      console.error("Error fetching petition:", petitionError);
      return NextResponse.json({ error: "Failed to fetch petition" }, { status: 500 });
    }

    // Check if user has signed this petition
    const { data: signature, error: signatureError } = await supabase
      .from("petition_signatures")
      .select("token_id, tx_hash")
      .eq("petition_id", petitionId)
      .eq("signer_address", userId)
      .single();

    if (signatureError && signatureError.code !== "PGRST116") {
      console.error("Error fetching signature:", signatureError);
      return NextResponse.json({ error: "Failed to fetch signature" }, { status: 500 });
    }

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

    const nftStatus = {
      hasSigned: !!signature,
      nftEnabled: petition.nft_enabled || false,
      tokenId: signature?.token_id?.toString(),
      txHash: signature?.tx_hash,
      contractAddress: petition.contract_address,
      network: petition.network,
      status,
    };

    return NextResponse.json({ status: nftStatus });
  } catch (error) {
    console.error("Error in petition-nft-status API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
