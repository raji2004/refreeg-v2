import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCustodialWallet } from "@/lib/blockchain/custodial-wallet"; // Polygon mainnet RPC

export async function POST(request: NextRequest) {
  try {
    const { petitionId, signerAddress, message } = await request.json();

    if (!petitionId || !signerAddress || !message) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: petitionId, signerAddress, message"
      }, { status: 400 });
    }

    // Get petition details from database
    const supabase = await createClient();
    const { data: petition, error: petitionError } = await supabase
      .from("petitions")
      .select("id, title, description, contract_address, network")
      .eq("id", petitionId)
      .single();

    if (petitionError || !petition) {
      return NextResponse.json({
        success: false,
        error: "Petition not found"
      }, { status: 404 });
    }

    // Check if petition has NFT functionality enabled
    if (!petition.contract_address) {
      return NextResponse.json({
        success: false,
        error: "Petition does not have NFT functionality enabled"
      }, { status: 400 });
    }

    // Use custodial wallet to mint NFT server-side
    const custodialWallet = getCustodialWallet();
    
    // Mint the NFT using the custodial wallet
    const mintResult = await custodialWallet.mintPetitionNFT(
      petitionId,
      message || "Petition signature",
      signerAddress
    );

    if (!mintResult.success) {
      return NextResponse.json({
        success: false,
        error: mintResult.error || "Failed to mint NFT"
      }, { status: 500 });
    }

    // Record the signature in the database
    const { data: signature, error: signatureError } = await supabase
      .from("petition_signatures")
      .insert({
        petition_id: petitionId,
        signer_address: signerAddress,
        token_id: parseInt(mintResult.tokenId),
        signature_message: message,
        tx_hash: mintResult.txHash
      })
      .select()
      .single();

    if (signatureError) {
      console.error("Error creating signature:", signatureError);
      return NextResponse.json({
        success: false,
        error: "Failed to create signature record"
      }, { status: 500 });
    }

    // Update petition signature count
    const { error: countError } = await supabase.rpc('increment_petition_signature_count', {
      petition_id: petitionId
    });

    if (countError) {
      console.error("Error updating signature count:", countError);
      // Don't fail the request for this, just log it
    }

    return NextResponse.json({
      success: true,
      signature: {
        id: signature.id,
        tokenId: mintResult.tokenId,
        txHash: mintResult.txHash,
        petitionId: petitionId,
        signerAddress: signerAddress,
        message: message,
        blockNumber: mintResult.blockNumber,
        gasUsed: mintResult.gasUsed
      },
      message: "NFT minted successfully using custodial wallet!"
    });

  } catch (error) {
    console.error("Error minting NFT:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
