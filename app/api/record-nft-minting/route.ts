import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { petitionId, signerAddress, tokenId, txHash, message } = await request.json();

    if (!petitionId || !signerAddress || !tokenId || !txHash) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: petitionId, signerAddress, tokenId, txHash"
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if petition exists and has NFT functionality
    const { data: petition, error: petitionError } = await supabase
      .from("petitions")
      .select("id, nft_enabled, contract_address")
      .eq("id", petitionId)
      .single();

    if (petitionError || !petition) {
      return NextResponse.json({
        success: false,
        error: "Petition not found"
      }, { status: 404 });
    }

    if (!petition.nft_enabled || !petition.contract_address) {
      return NextResponse.json({
        success: false,
        error: "Petition does not have NFT functionality enabled"
      }, { status: 400 });
    }

    // Check if this signature already exists
    const { data: existingSignature, error: checkError } = await supabase
      .from("petition_signatures")
      .select("id")
      .eq("petition_id", petitionId)
      .eq("signer_address", signerAddress)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error("Error checking existing signature:", checkError);
      return NextResponse.json({
        success: false,
        error: "Failed to check existing signature"
      }, { status: 500 });
    }

    if (existingSignature) {
      // Update existing signature with NFT data
      const { data: updatedSignature, error: updateError } = await supabase
        .from("petition_signatures")
        .update({
          token_id: parseInt(tokenId),
          tx_hash: txHash,
          signature_message: message || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingSignature.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating signature:", updateError);
        return NextResponse.json({
          success: false,
          error: "Failed to update signature with NFT data"
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        signature: updatedSignature,
        message: "Signature updated with NFT data"
      });
    } else {
      // Create new signature with NFT data
      const { data: newSignature, error: insertError } = await supabase
        .from("petition_signatures")
        .insert({
          petition_id: petitionId,
          signer_address: signerAddress,
          token_id: parseInt(tokenId),
          tx_hash: txHash,
          signature_message: message || null
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating signature:", insertError);
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
        signature: newSignature,
        message: "Signature created with NFT data"
      });
    }

  } catch (error) {
    console.error("Error recording NFT minting:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
