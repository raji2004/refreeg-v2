"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface Petition {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  goal: number;
  raised: number;
  status: string;
  rejection_reason?: string;
  image?: string;
  multimedia?: string[];
  shared: number;
  days_active?: number;
  created_at: string;
  updated_at: string;
  // NFT-related fields
  contract_address?: string;
  contract_petition_id?: number;
  network: string;
  nft_enabled: boolean;
  signature_count: number;
  creator?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface PetitionSignature {
  id: string;
  petition_id: string;
  signer_id: string;
  signer_wallet_address: string;
  contract_token_id?: number;
  contract_address?: string;
  network: string;
  message?: string;
  signature_hash?: string;
  block_number?: number;
  is_verified: boolean;
  created_at: string;
  signer?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

// Create a new petition (works with existing petitions table)
export async function createPetition(
  title: string,
  description: string,
  category: string,
  goal: number,
  nftEnabled: boolean = false,
  image?: string,
  multimedia?: string[]
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("User not authenticated");
    }

    // Create petition using existing structure
    const { data: petition, error: petitionError } = await supabase
      .from("petitions")
      .insert({
        user_id: user.id,
        title,
        description,
        category,
        goal,
        raised: 0,
        status: 'pending',
        image,
        multimedia: multimedia || [],
        nft_enabled: nftEnabled,
        signature_count: 0,
      })
      .select()
      .single();

    if (petitionError) {
      throw new Error(`Failed to create petition: ${petitionError.message}`);
    }

    revalidatePath("/petitions");
    return { success: true, petition };
  } catch (error: any) {
    console.error("Error creating petition:", error);
    return { success: false, error: error.message };
  }
}

// Get all petitions (works with existing petitions table)
export async function getPetitions(
  page: number = 1,
  limit: number = 10,
  category?: string,
  search?: string,
  nftEnabled?: boolean
) {
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from("petitions")
      .select(`
        *,
        creator:profiles!petitions_user_id_fkey(id, full_name, avatar_url)
      `)
      .eq("status", "approved") // Only show approved petitions
      .order("created_at", { ascending: false });

    // Apply filters
    if (category) {
      query = query.eq("category", category);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (nftEnabled !== undefined) {
      query = query.eq("nft_enabled", nftEnabled);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: petitions, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch petitions: ${error.message}`);
    }

    return { success: true, petitions: petitions || [] };
  } catch (error: any) {
    console.error("Error fetching petitions:", error);
    return { success: false, error: error.message, petitions: [] };
  }
}

// Get petition by ID
export async function getPetitionById(petitionId: string) {
  try {
    const supabase = await createClient();
    
    const { data: petition, error } = await supabase
      .from("petitions")
      .select(`
        *,
        creator:profiles!petitions_user_id_fkey(id, full_name, avatar_url)
      `)
      .eq("id", petitionId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch petition: ${error.message}`);
    }

    return { success: true, petition };
  } catch (error: any) {
    console.error("Error fetching petition:", error);
    return { success: false, error: error.message };
  }
}

// Sign a petition
export async function signPetition(
  petitionId: string,
  message: string,
  signerWalletAddress: string,
  contractTokenId?: number,
  signatureHash?: string,
  blockNumber?: number
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("User not authenticated");
    }

    // Check if user already signed this petition
    const { data: existingSignature } = await supabase
      .from("petition_signatures")
      .select("id")
      .eq("petition_id", petitionId)
      .eq("signer_id", user.id)
      .single();

    if (existingSignature) {
      throw new Error("You have already signed this petition");
    }

    // Create signature
    const { data: signature, error: signatureError } = await supabase
      .from("petition_signatures")
      .insert({
        petition_id: petitionId,
        signer_id: user.id,
        signer_wallet_address: signerWalletAddress,
        contract_token_id: contractTokenId,
        signature_hash: signatureHash,
        block_number: blockNumber,
        message,
        is_verified: !!contractTokenId, // Verified if it has a contract token ID
      })
      .select(`
        *,
        signer:profiles!petition_signatures_signer_id_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (signatureError) {
      throw new Error(`Failed to create signature: ${signatureError.message}`);
    }

    revalidatePath(`/petitions/${petitionId}`);
    return { success: true, signature };
  } catch (error: any) {
    console.error("Error signing petition:", error);
    return { success: false, error: error.message };
  }
}

// Get petition signatures
export async function getPetitionSignatures(
  petitionId: string,
  page: number = 1,
  limit: number = 20
) {
  try {
    const supabase = await createClient();
    
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: signatures, error } = await supabase
      .from("petition_signatures")
      .select(`
        *,
        signer:profiles!petition_signatures_signer_id_fkey(id, full_name, avatar_url)
      `)
      .eq("petition_id", petitionId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch signatures: ${error.message}`);
    }

    return { success: true, signatures: signatures || [] };
  } catch (error: any) {
    console.error("Error fetching signatures:", error);
    return { success: false, error: error.message, signatures: [] };
  }
}

// Get petition categories
export async function getPetitionCategories() {
  try {
    const supabase = await createClient();
    
    const { data: categories, error } = await supabase
      .from("petition_categories")
      .select("*")
      .order("name");

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    return { success: true, categories: categories || [] };
  } catch (error: any) {
    console.error("Error fetching categories:", error);
    return { success: false, error: error.message, categories: [] };
  }
}

// Get user's signatures
export async function getUserSignatures(userId?: string) {
  try {
    const supabase = await createClient();
    
    // Get current user if no userId provided
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("User not authenticated");
      }
      targetUserId = user.id;
    }

    const { data: signatures, error } = await supabase
      .from("petition_signatures")
      .select(`
        *,
        petition:petitions(id, title, description, is_active),
        signer:profiles!petition_signatures_signer_id_fkey(id, full_name, avatar_url)
      `)
      .eq("signer_id", targetUserId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user signatures: ${error.message}`);
    }

    return { success: true, signatures: signatures || [] };
  } catch (error: any) {
    console.error("Error fetching user signatures:", error);
    return { success: false, error: error.message, signatures: [] };
  }
}

// Update petition with contract data
export async function updatePetitionWithContractData(
  petitionId: string,
  contractPetitionId: number,
  contractAddress: string
) {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from("petitions")
      .update({
        contract_petition_id: contractPetitionId,
        contract_address: contractAddress,
        updated_at: new Date().toISOString(),
      })
      .eq("id", petitionId);

    if (error) {
      throw new Error(`Failed to update petition: ${error.message}`);
    }

    revalidatePath(`/petitions/${petitionId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating petition:", error);
    return { success: false, error: error.message };
  }
}
