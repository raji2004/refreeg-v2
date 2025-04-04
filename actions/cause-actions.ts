"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Cause, CauseWithUser, CauseFormData, CauseFilterOptions } from "@/types"

/**
 * Get a cause by ID
 */
export async function getCause(causeId: string): Promise<CauseWithUser | null> {
  const supabase = await createClient()


  const { data, error } = await supabase
    .from("causes")
    .select(`
      *,
      profiles:user_id (
        full_name
      ),
      auth_users:user_id (
        email
      )
    `)
    .eq("id", causeId)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return null
    }
    console.error("Error fetching cause:", error)
    throw error
  }

  // Transform the response to match our CauseWithUser type
  const cause = {
    ...data,
    user: {
      name: data.profiles?.full_name || "Anonymous",
      email: data.auth_users?.email || "",
    },
  } as unknown as CauseWithUser

  // Remove the nested objects that we've flattened
  delete (cause as any).profiles
  delete (cause as any).auth_users

  return cause
}

/**
 * Create a new cause
 */
export async function createCause(userId: string, causeData: CauseFormData): Promise<Cause> {
  const supabase = await createClient()


  const { data, error } = await supabase
    .from("causes")
    .insert({
      user_id: userId,
      title: causeData.title,
      description: causeData.description,
      category: causeData.category,
      goal: typeof causeData.goal === "string" ? Number.parseFloat(causeData.goal) : causeData.goal,
      status: "pending", // All causes start as pending
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating cause:", error)
    throw error
  }

  revalidatePath("/dashboard/causes")
  return data as Cause
}

/**
 * Update a cause
 */
export async function updateCause(causeId: string, userId: string, causeData: Partial<CauseFormData>): Promise<Cause> {
  const supabase = await createClient()


  // Prepare the update data
  const updateData: any = {
    ...causeData,
    updated_at: new Date().toISOString(),
  }

  // Convert goal to number if it's a string
  if (typeof updateData.goal === "string") {
    updateData.goal = Number.parseFloat(updateData.goal)
  }

  const { data, error } = await supabase
    .from("causes")
    .update(updateData)
    .eq("id", causeId)
    .eq("user_id", userId) // Ensure the user owns this cause
    .select()
    .single()

  if (error) {
    console.error("Error updating cause:", error)
    throw error
  }

  revalidatePath(`/dashboard/causes/${causeId}`)
  revalidatePath("/dashboard/causes")
  return data as Cause
}

/**
 * List causes with filtering options
 */
export async function listCauses(options: CauseFilterOptions = {}): Promise<Cause[]> {
  const supabase = await createClient()


  let query = supabase.from("causes").select("*").order("created_at", { ascending: false })

  // Apply filters
  if (options.category && options.category !== "all") {
    query = query.eq("category", options.category)
  }

  if (options.status) {
    query = query.eq("status", options.status)
  } else {
    // Default to approved causes for public listing
    if (!options.userId) {
      query = query.eq("status", "approved")
    }
  }

  if (options.userId) {
    query = query.eq("user_id", options.userId)
  }

  // Apply pagination
  if (options.limit) {
    query = query.limit(options.limit)
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error listing causes:", error)
    throw error
  }

  return data as Cause[]
}

/**
 * Count causes with filtering options
 */
export async function countCauses(options: CauseFilterOptions = {}): Promise<number> {
  const supabase = await createClient()


  let query = supabase.from("causes").select("id", { count: "exact", head: true })

  // Apply filters
  if (options.category && options.category !== "all") {
    query = query.eq("category", options.category)
  }

  if (options.status) {
    query = query.eq("status", options.status)
  } else {
    // Default to approved causes for public listing
    if (!options.userId) {
      query = query.eq("status", "approved")
    }
  }

  if (options.userId) {
    query = query.eq("user_id", options.userId)
  }

  const { count, error } = await query

  if (error) {
    console.error("Error counting causes:", error)
    throw error
  }

  return count || 0
}

/**
 * Approve or reject a cause (admin function)
 */
export async function updateCauseStatus(
  causeId: string,
  status: "approved" | "rejected",
  rejectionReason?: string,
): Promise<Cause> {
  const supabase = await createClient()


  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === "rejected" && rejectionReason) {
    updateData.rejection_reason = rejectionReason
  }

  const { data, error } = await supabase.from("causes").update(updateData).eq("id", causeId).select().single()

  if (error) {
    console.error("Error updating cause status:", error)
    throw error
  }

  revalidatePath("/dashboard/admin/causes")
  return data as Cause
}

