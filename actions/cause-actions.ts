"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  Cause,
  CauseWithUser,
  CauseFormData,
  CauseFilterOptions,
} from "@/types";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth-actions";

/**
 * Get a cause by ID
 */
export async function getCause(causeId: string): Promise<CauseWithUser | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from("causes")
    .select(
      `
      *,
      profiles!inner (
        full_name,
        email,
        sub_account_code,
        profile_photo
      ),
      cause_sections (
        id,
        heading,
        description
      )
    `
    )
    .eq("id", causeId)
    .single();

  if (
    (data?.status === "pending" || data?.status === "rejected") &&
    user?.id !== data?.user_id
  ) {
    redirect("/");
    return null;
  }
  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching cause:", error);
    throw error;
  }

  // Transform the response to match our CauseWithUser type
  const cause = {
    ...data,
    user: {
      name: data.profiles?.full_name || "Anonymous",
      email: data.profiles?.email || "",
      sub_account_code: data.profiles?.sub_account_code || "",
      profile_photo: data.profiles?.profile_photo || null,
    },
    sections: data.cause_sections || [],
  } as unknown as CauseWithUser;

  // Remove the nested objects that we've flattened
  delete (cause as any).profiles;
  delete (cause as any).cause_sections;

  return cause;
}

/**
 * Upload an image to Supabase storage
 */
async function uploadImageToSupabase(
  file: File,
  userId: string,
  type: "cover" | "additional"
): Promise<string> {
  const supabase = await createClient();

  // Generate a unique filename and sanitize it by removing special characters
  const sanitizedOriginalName = file.name.replace(/[^\w\s.-]/g, "_");
  const fileName = `${userId}-${Date.now()}-${type}-${sanitizedOriginalName}`;

  // Choose the appropriate storage bucket based on the file type
  const bucket = file.type.startsWith("video/")
    ? "cause-videos"
    : "profile-photos";

  console.log("bucket", bucket);

  // Upload the file to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    console.error("Error uploading image:", uploadError);
    throw uploadError;
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);
  return urlData.publicUrl;
}

/**
 * Create a new cause
 */
export async function createCause(
  userId: string,
  causeData: CauseFormData
): Promise<Cause> {
  const supabase = await createClient();

  // Upload cover image if provided
  let coverImageUrl = null;
  if (causeData.coverImage) {
    coverImageUrl = await uploadImageToSupabase(
      causeData.coverImage,
      userId,
      "cover"
    );
  }

  console.log("Uploaded");

  // Calculate days_active from start and end dates
  let daysActive = null;
  if (causeData.startDate && causeData.endDate) {
    // Ensure we have valid Date objects
    const startDate =
      causeData.startDate instanceof Date
        ? causeData.startDate
        : new Date(causeData.startDate);
    const endDate =
      causeData.endDate instanceof Date
        ? causeData.endDate
        : new Date(causeData.endDate);

    // Validate that the dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Invalid date format provided");
    }

    daysActive = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  // Upload multimedia files if they exist
  let multimediaUrls: string[] = [];
  if (
    causeData.multimedia &&
    Array.isArray(causeData.multimedia) &&
    causeData.multimedia.length > 0
  ) {
    try {
      multimediaUrls = await Promise.all(
        causeData.multimedia.map((file) =>
          uploadImageToSupabase(file, userId, "additional")
        )
      );
    } catch (error) {
      console.error("Error uploading multimedia:", error);
      throw error;
    }
  }

  // Start a transaction
  const { data: cause, error: causeError } = await supabase
    .from("causes")
    .insert({
      user_id: userId,
      title: causeData.title,
      description: causeData.description, // <-- ensure this is included
      category: causeData.category,
      goal:
        typeof causeData.goal === "string"
          ? Number.parseFloat(causeData.goal)
          : causeData.goal,
      status: "pending", // All causes start as pending
      image: coverImageUrl, // Store the cover image URL
      days_active: daysActive, // Store the calculated days active
      multimedia: multimediaUrls, // Store image URLs as JSON array
    })
    .select()
    .single();
  console.log(cause);
  if (causeError) {
    console.error("Error creating cause:", causeError);
    throw causeError;
  }

  // Insert sections if they exist
  if (causeData.sections && causeData.sections.length > 0) {
    const sections = causeData.sections.map((section) => ({
      cause_id: cause.id,
      heading: section.heading,
      description: section.description,
    }));

    const { error: sectionsError } = await supabase
      .from("cause_sections")
      .insert(sections);

    if (sectionsError) {
      console.error("Error creating sections:", sectionsError);
      throw sectionsError;
    }
  }

  revalidatePath("/dashboard/causes");
  return cause as Cause;
}

/**
 * Update a cause
 */
export async function updateCause(
  causeId: string,
  userId: string,
  causeData: Partial<CauseFormData>
): Promise<Cause> {
  const supabase = await createClient();

  let coverImageUrl = causeData.coverImage
    ? await uploadImageToSupabase(causeData.coverImage, userId, "cover")
    : causeData.image;

  // Calculate days_active from start and end dates
  let daysActive = null;
  if (causeData.startDate && causeData.endDate) {
    // Ensure we have valid Date objects
    const startDate =
      causeData.startDate instanceof Date
        ? causeData.startDate
        : new Date(causeData.startDate);
    const endDate =
      causeData.endDate instanceof Date
        ? causeData.endDate
        : new Date(causeData.endDate);

    // Validate that the dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Invalid date format provided");
    }

    daysActive = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  // Prepare the update data
  const updateData: any = {
    title: causeData.title,
    description: causeData.description, // <-- ensure this is included
    category: causeData.category,
    goal: causeData.goal,
    status: "pending",
    image: coverImageUrl,
    days_active: daysActive,
    updated_at: new Date().toISOString(),
  };

  // Convert goal to number if it's a string
  if (typeof updateData.goal === "string") {
    updateData.goal = Number.parseFloat(updateData.goal);
  }

  const { data, error } = await supabase
    .from("causes")
    .update(updateData)
    .eq("id", causeId)
    .eq("user_id", userId) // Ensure the user owns this cause
    .select()
    .single();

  if (error) {
    console.error("Error updating cause:", error);
    throw error;
  }

  // Handle sections update
  if (causeData.sections) {
    // First delete existing sections
    const { error: deleteError } = await supabase
      .from("cause_sections")
      .delete()
      .eq("cause_id", causeId);

    if (deleteError) {
      console.error("Error deleting existing sections:", deleteError);
      throw deleteError;
    }

    // Then insert new sections if they exist
    if (causeData.sections.length > 0) {
      const sections = causeData.sections.map((section) => ({
        cause_id: causeId,
        heading: section.heading,
        description: section.description,
      }));

      const { error: sectionsError } = await supabase
        .from("cause_sections")
        .insert(sections);

      if (sectionsError) {
        console.error("Error creating new sections:", sectionsError);
        throw sectionsError;
      }
    }
  }

  // Handle multimedia update
  let updatedMultimediaUrls: string[] = [];
  if (
    causeData.multimedia &&
    Array.isArray(causeData.multimedia) &&
    causeData.multimedia.length > 0
  ) {
    try {
      updatedMultimediaUrls = await Promise.all(
        causeData.multimedia.map((file) =>
          uploadImageToSupabase(file, userId, "additional")
        )
      );
    } catch (error) {
      console.error("Error uploading multimedia:", error);
      throw error;
    }
  }
  if (updatedMultimediaUrls.length > 0) {
    updateData.multimedia = updatedMultimediaUrls;
  }

  const { data: updatedCause, error: updateError } = await supabase
    .from("causes")
    .update(updateData)
    .eq("id", causeId)
    .eq("user_id", userId) // Ensure the user owns this cause
    .select()
    .single();

  if (updateError) {
    console.error("Error updating cause:", updateError);
    throw updateError;
  }

  revalidatePath("/dashboard/causes");
  return updatedCause as Cause;
}

/**
 * List causes with filtering options
 */
export async function listCauses(
  options: CauseFilterOptions = {}
): Promise<Cause[]> {
  const supabase = await createClient();

  let query = supabase
    .from("causes")
    .select("*,profiles(full_name,email,profile_photo)")
    .order("created_at", { ascending: false });

  // Apply filters
  if (options.category && options.category !== "all") {
    query = query.eq("category", options.category);
  }

  if (options.status) {
    query = query.eq("status", options.status);
  } else {
    // Default to approved causes for public listing
    if (!options.userId) {
      query = query.eq("status", "approved");
    }
  }

  if (options.userId) {
    query = query.eq("user_id", options.userId);
  }

  // Apply pagination
  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 10) - 1
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error listing causes:", error);
    throw error;
  }

  return data as Cause[];
}

/**
 * Count causes with filtering options
 */
export async function countCauses(
  options: CauseFilterOptions = {}
): Promise<number> {
  const supabase = await createClient();

  let query = supabase
    .from("causes")
    .select("id", { count: "exact", head: true });

  // Apply filters
  if (options.category && options.category !== "all") {
    query = query.eq("category", options.category);
  }

  if (options.status) {
    query = query.eq("status", options.status);
  } else {
    // Default to approved causes for public listing
    if (!options.userId) {
      query = query.eq("status", "approved");
    }
  }

  if (options.userId) {
    query = query.eq("user_id", options.userId);
  }

  const { count, error } = await query;

  if (error) {
    console.error("Error counting causes:", error);
    throw error;
  }

  return count || 0;
}

/**
 * Approve or reject a cause (admin function)
 */
export async function updateCauseStatus(
  causeId: string,
  status: "approved" | "rejected",
  rejectionReason?: string
): Promise<Cause> {
  const supabase = await createClient();

  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "rejected" && rejectionReason) {
    updateData.rejection_reason = rejectionReason;
  }

  // If approving, we need to get the original days_active and set updated_at to now
  if (status === "approved") {
    // Get the cause to access the original days_active
    const { data: causeData, error: fetchError } = await supabase
      .from("causes")
      .select("days_active")
      .eq("id", causeId)
      .single();

    if (fetchError) {
      console.error("Error fetching cause for approval:", fetchError);
      throw fetchError;
    }

    // Set the updated_at to now so the cron job can start counting from this moment
    updateData.updated_at = new Date().toISOString();

    // Keep the original days_active value - the cron job will decrement it
    if (causeData.days_active) {
      updateData.days_active = causeData.days_active;
    }
  }

  const { data, error } = await supabase
    .from("causes")
    .update(updateData)
    .eq("id", causeId)
    .select()
    .single();

  if (error) {
    console.error("Error updating cause status:", error);
    throw error;
  }

  revalidatePath("/dashboard/admin/causes");
  return data as Cause;
}

/**
 * Get all causes for a specific user
 */
export async function getUserCauses(userId: string): Promise<Cause[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("causes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user causes:", error);
    throw error;
  }

  return data as Cause[];
}

export async function getUserCausesWithStatus(
  userId: string,
  status?: string
): Promise<Cause[]> {
  const supabase = await createClient();

  let query = supabase
    .from("causes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // Only apply status filter if status is provided and not empty
  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching user causes with status:", error);
    throw error;
  }

  return data as Cause[];
}

export async function deleteCause(causeId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("causes").delete().eq("id", causeId);

  if (error) {
    console.error("Error deleting cause:", error);
    throw error;
  }
}

/**
 * Save a cause share to the database
 */
export async function saveCauseShare(causeId: string): Promise<void> {
  const supabase = await createClient();

  // Start a transaction
  const { error: shareError, data: causeData } = await supabase
    .from("causes")
    .select("shared")
    .eq("id", causeId)
    .single();
  if (shareError) {
    console.error("Error saving cause share:", shareError);
    throw shareError;
  }

  const { data: mine, error: causeError } = await supabase
    .from("causes")
    .update({ shared: causeData.shared + 1 })
    .eq("id", causeId)
    .single();

  if (causeError) {
    console.error("Error saving cause share:", causeError);
    throw causeError;
  }

  return mine;
}
