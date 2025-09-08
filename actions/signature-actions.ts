"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  Signature,
  SignatureWithPetition,
  SignatureFormData,
} from "@/types";
import { getCustodialWallet } from "@/lib/blockchain/custodial-wallet";

/**
 * Create a new signature for a petition
 * @param petitionId - The ID of the petition to sign
 */
export async function createSignature(
  petitionId: string,
  userId: string | null,
  signatureData: SignatureFormData
): Promise<Signature> {
  const supabase = await createClient();

  // Ensure an authenticated user signs only once
  if (userId) {
    const { count: existingCount, error: existingError } = await supabase
      .from("signatures")
      .select("id", { count: "exact", head: true })
      .eq("petition_id", petitionId)
      .eq("user_id", userId);

    if (existingError) {
      console.error("Error checking existing signature:", existingError);
      throw new Error("Failed to verify existing signature");
    }
    if ((existingCount || 0) > 0) {
      throw new Error("You have already signed this petition");
    }
  }

  // First, check if the petition has NFT functionality enabled
  const { data: petition, error: petitionError } = await supabase
    .from("petitions")
    .select("id, title, nft_enabled, contract_address")
    .eq("id", petitionId)
    .single();

  if (petitionError || !petition) {
    console.error("Error fetching petition:", petitionError);
    throw new Error("Petition not found");
  }

  // Create the signature first
  const { data, error } = await supabase
    .from("signatures")
    .insert({
      petition_id: petitionId,
      ...(userId ? { user_id: userId } : {}),
      amount: (() => {
        const parsedValue = typeof signatureData?.amount === "string" 
          ? parseFloat(signatureData.amount)
          : signatureData?.amount;
        return Math.max(1, parsedValue || 0);
      })(),
      name:
        String(signatureData.isAnonymous).toLocaleLowerCase() === "true"
          ? "Anonymous"
          : signatureData.name,
      email: signatureData.email,
      message: signatureData.message || null,
      is_anonymous: signatureData.isAnonymous,
      status: "completed", // For now, all signatures are immediately completed
    })
    .select()
    .single();

  if (error) {
    // Handle unique violation (user already signed) gracefully
    if ((error as any)?.code === "23505") {
      throw new Error("You have already signed this petition");
    }
    console.error("Error creating signature:", error);
    throw error;
  }

  // If NFT functionality is enabled, mint an NFT automatically
  if (petition.nft_enabled && petition.contract_address) {
    try {
      const custodialWallet = getCustodialWallet();
      
      // Use a default address for anonymous users or get user's address
      const signerAddress = userId ? 
        `0x${userId.replace(/-/g, '').substring(0, 40)}` : // Generate a deterministic address from user ID
        "0x0000000000000000000000000000000000000000"; // Default address for anonymous users

      // Mint the NFT using the custodial wallet
      const mintResult = await custodialWallet.mintPetitionNFT(
        petitionId,
        signatureData.message || `Signed petition: ${petition.title}`,
        signerAddress
      );

      if (mintResult.success) {
        // Record the NFT minting in the petition_signatures table
        await supabase
          .from("petition_signatures")
          .insert({
            petition_id: petitionId,
            signer_address: signerAddress,
            token_id: parseInt(mintResult.tokenId),
            signature_message: signatureData.message || `Signed petition: ${petition.title}`,
            tx_hash: mintResult.txHash
          });

        console.log(`NFT minted successfully for petition ${petitionId}:`, {
          tokenId: mintResult.tokenId,
          txHash: mintResult.txHash,
          signerAddress
        });
      } else {
        console.error("Failed to mint NFT:", mintResult.error);
        // Don't fail the signature creation if NFT minting fails
      }
    } catch (nftError) {
      console.error("Error minting NFT for petition signature:", nftError);
      // Don't fail the signature creation if NFT minting fails
    }
  }

  revalidatePath(`/petitions/${petitionId}`);
  revalidatePath("/petitions");
  revalidatePath("/");
  if (userId) {
    revalidatePath("/dashboard/signatures");
  }

  return data as Signature;
}

/**
 * List signatures for a petition
 * @param petitionId - The ID of the petition to list signatures for
 */
export async function listSignaturesForPetition(
  petitionId: string
): Promise<Signature[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("signatures")
    .select("*")
    .eq("petition_id", petitionId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error listing signatures:", error);
    throw error;
  }

  return data as Signature[];
}

/**
 * List signatures for a user
 * @param userId - The ID of the user to list signatures for
 */
export async function listUserSignatures(
  userId: string,
  timeframe: "all" | "recent" = "all"
): Promise<SignatureWithPetition[]> {
  const supabase = await createClient();

  let query = supabase
    .from("signatures")
    .select(
      `
      *,
      petitions:petition_id (
        title,
        category
      )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (timeframe === "recent") {
    // Get signatures from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    query = query.gte("created_at", thirtyDaysAgo.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error listing user signatures:", error);
    throw error;
  }

  // Transform the response to match our SignatureWithPetition type
  if (!data) {
    return [];
  }
  
  return data.map((item) => ({
    ...item,
    petition: {
      title: item.petitions?.title || "Unknown Petition",
      category: item.petitions?.category || "Unknown",
    },
  })) as SignatureWithPetition[];
}
