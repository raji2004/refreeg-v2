"use server";

import { createClient } from "@/lib/supabase/server";

export interface MatchingPool {
  id: string;
  name: string;
  description?: string;
  total_amount: number;
  remaining_amount: number;
  matching_ratio: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface MatchingPoolCause {
  id: string;
  matching_pool_id: string;
  cause_id: string;
  created_at: string;
}

export interface MatchingDonation {
  id: string;
  matching_pool_id: string;
  original_donation_id?: string;
  original_donation_type: string;
  original_amount: number;
  matched_amount: number;
  cause_id: string;
  created_at: string;
}

// Create a new matching pool
export async function createMatchingPool(poolData: {
  name: string;
  description?: string;
  total_amount: number;
  matching_ratio: number;
  start_date?: string;
  end_date?: string;
  cause_ids: string[];
}) {
  try {
    const supabase = await createClient();
    
    // Validate inputs
    if (!poolData.name?.trim()) {
      throw new Error("Pool name is required");
    }
    if (poolData.total_amount <= 0) {
      throw new Error("Total amount must be positive");
    }
    if (poolData.matching_ratio < 0 || poolData.matching_ratio > 1) {
      throw new Error("Matching ratio must be between 0 and 1");
    }
    if (poolData.start_date && poolData.end_date && new Date(poolData.start_date) > new Date(poolData.end_date)) {
      throw new Error("Start date must be before end date");
    }
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Authentication required");
    }
    
    // Deduplicate cause IDs
    const uniqueCauseIds = [...new Set(poolData.cause_ids)];
    
    // Create the matching pool with created_by
    const { data: pool, error: poolError } = await supabase
      .from("matching_pools")
      .insert([
        {
          name: poolData.name.trim(),
          description: poolData.description?.trim(),
          total_amount: poolData.total_amount,
          remaining_amount: poolData.total_amount,
          matching_ratio: poolData.matching_ratio,
          start_date: poolData.start_date,
          end_date: poolData.end_date,
          created_by: user.id,
        },
      ])
      .select()
      .single();

    if (poolError) {
      console.error("Error creating matching pool:", poolError);
      throw new Error("Failed to create matching pool");
    }

    // Add causes to the matching pool
    if (uniqueCauseIds.length > 0) {
      const causeInserts = uniqueCauseIds.map(causeId => ({
        matching_pool_id: pool.id,
        cause_id: causeId,
      }));

      const { error: causesError } = await supabase
        .from("matching_pool_causes")
        .insert(causeInserts);

      if (causesError) {
        // Compensating delete if cause insertion fails
        await supabase.from("matching_pools").delete().eq("id", pool.id);
        console.error("Error adding causes to matching pool:", causesError);
        throw new Error("Failed to add causes to matching pool");
      }
    }

    return { success: true, data: pool };
  } catch (error) {
    console.error("Matching pool creation error:", error);
    throw error;
  }
}

// Get all matching pools
export async function getMatchingPools() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("matching_pools")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching matching pools:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getMatchingPools:", error);
    return [];
  }
}

// Get matching pool by ID
export async function getMatchingPoolById(poolId: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("matching_pools")
      .select(`
        *,
        matching_pool_causes (
          id,
          cause_id,
          causes (
            id,
            title,
            description
          )
        )
      `)
      .eq("id", poolId)
      .single();

    if (error) {
      console.error("Error fetching matching pool:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getMatchingPoolById:", error);
    return null;
  }
}

// Update matching pool
export async function updateMatchingPool(
  poolId: string,
  updates: Partial<MatchingPool>
) {
  try {
    const supabase = await createClient();
    
    // Whitelist of allowed mutable fields (exclude protected columns)
    const allowedFields = ['name', 'description', 'is_active', 'matching_ratio', 'start_date', 'end_date', 'max_amount'];
    const protectedFields = ['id', 'remaining_amount', 'created_by', 'created_at', 'updated_at'];
    
    // Build sanitized updates object
    const sanitizedUpdates: any = {};
    for (const key of allowedFields) {
      if (key in updates && updates[key as keyof MatchingPool] !== undefined) {
        sanitizedUpdates[key] = updates[key as keyof MatchingPool];
      }
    }
    
    // Validate date ordering if both dates are present
    if (sanitizedUpdates.start_date && sanitizedUpdates.end_date) {
      const startDate = new Date(sanitizedUpdates.start_date);
      const endDate = new Date(sanitizedUpdates.end_date);
      
      if (startDate > endDate) {
        throw new Error('Start date must be before or equal to end date');
      }
    }
    
    // Always update the timestamp
    sanitizedUpdates.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from("matching_pools")
      .update(sanitizedUpdates)
      .eq("id", poolId)
      .select()
      .single();

    if (error) {
      console.error("Error updating matching pool:", error);
      throw new Error("Failed to update matching pool");
    }

    return { success: true, data };
  } catch (error) {
    console.error("Matching pool update error:", error);
    throw error;
  }
}

// Add causes to matching pool
export async function addCausesToMatchingPool(
  poolId: string,
  causeIds: string[]
) {
  try {
    const supabase = await createClient();
    
    // Deduplicate causeIds
    const uniqueCauseIds = [...new Set(causeIds)];
    
    const causeInserts = uniqueCauseIds.map(causeId => ({
      matching_pool_id: poolId,
      cause_id: causeId,
    }));

    const { error } = await supabase
      .from("matching_pool_causes")
      .upsert(causeInserts, { onConflict: 'matching_pool_id,cause_id' });

    if (error) {
      console.error("Error adding causes to matching pool:", error);
      throw new Error("Failed to add causes to matching pool");
    }

    return { success: true };
  } catch (error) {
    console.error("Error in addCausesToMatchingPool:", error);
    throw error;
  }
}

// Remove causes from matching pool
export async function removeCausesFromMatchingPool(
  poolId: string,
  causeIds: string[]
) {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from("matching_pool_causes")
      .delete()
      .eq("matching_pool_id", poolId)
      .in("cause_id", causeIds);

    if (error) {
      console.error("Error removing causes from matching pool:", error);
      throw new Error("Failed to remove causes from matching pool");
    }

    return { success: true };
  } catch (error) {
    console.error("Error in removeCausesFromMatchingPool:", error);
    throw error;
  }
}

// Get matching donations for a cause
export async function getMatchingDonationsForCause(causeId: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("matching_donations")
      .select(`
        *,
        matching_pools (
          id,
          name
        )
      `)
      .eq("cause_id", causeId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching matching donations:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getMatchingDonationsForCause:", error);
    return [];
  }
}

// Process matching for a donation
export async function processMatchingForDonation(
  causeId: string,
  originalDonationId: string,
  originalDonationType: 'donation' | 'crypto_donation',
  originalAmount: number
) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase.rpc("process_matching_donation", {
      p_cause_id: causeId,
      p_original_donation_id: originalDonationId,
      p_original_donation_type: originalDonationType,
      p_original_amount: originalAmount,
    });

    if (error) {
      console.error("Error processing matching donation:", error);
      return { success: false, matched_amount: 0 };
    }

    // Normalize and validate RPC result
    if (!data) {
      console.warn("RPC returned null/undefined data");
      return { success: false, matched_amount: 0, pool_id: null };
    }
    
    let normalizedResult;
    if (Array.isArray(data)) {
      normalizedResult = data.length > 0 ? data[0] : {};
    } else if (typeof data === 'object') {
      normalizedResult = data;
    } else {
      console.warn("Unexpected RPC response shape:", typeof data);
      return { success: false, matched_amount: 0, pool_id: null };
    }
    
    return { 
      success: Boolean(normalizedResult?.success), 
      matched_amount: Number(normalizedResult?.matched_amount) || 0,
      pool_id: normalizedResult?.pool_id || null
    };
  } catch (error) {
    console.error("Error in processMatchingForDonation:", error);
    return { success: false, matched_amount: 0 };
  }
}

// Check if cause is eligible for matching
export async function isCauseEligibleForMatching(causeId: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase.rpc("is_cause_eligible_for_matching", {
      p_cause_id: causeId,
    });

    if (error) {
      console.error("Error checking matching eligibility:", error);
      return false;
    }

    // Normalize boolean return value
    if (typeof data === 'boolean') {
      return data;
    }
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && 'is_eligible' in data[0]) {
      return Boolean(data[0].is_eligible);
    }
    return Boolean(data);
  } catch (error) {
    console.error("Error in isCauseEligibleForMatching:", error);
    return false;
  }
}

// Get matching pool info for a cause
export async function getMatchingPoolForCause(causeId: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase.rpc("get_matching_pool_for_cause", {
      p_cause_id: causeId,
    });

    if (error) {
      console.error("Error getting matching pool for cause:", error);
      return null;
    }

    // Normalize RPC result before indexing
    if (!data) {
      return null;
    }
    
    if (Array.isArray(data)) {
      return data.length > 0 ? data[0] : null;
    }
    
    if (typeof data === 'object') {
      return data;
    }
    
    return null;
  } catch (error) {
    console.error("Error in getMatchingPoolForCause:", error);
    return null;
  }
}
