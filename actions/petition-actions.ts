"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  Petition,
  PetitionWithUser,
  PetitionFormData,
  PetitionFilterOptions,
} from "@/types";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth-actions";
import {
  sendPetitionApprovedEmailForUser,
  sendPetitionRejectedEmailForUser,
} from "@/services/mail";

/**
 * Get a petition by ID
 */
export async function getPetition(
  petitionId: string
): Promise<PetitionWithUser | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from("petitions")
    .select(
      `
      *,
      profiles!inner (
        full_name,
        email,
        sub_account_code,
        profile_photo
      ),
      petition_sections (
        id,
        heading,
        description
      )
    `
    )
    .eq("id", petitionId)
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
    console.error("Error fetching petition:", error);
    throw error;
  }

  // Transform the response to match our PetitionWithUser type
  const petition = {
    ...data,
    user: {
      name: data.profiles?.full_name || "Anonymous",
      email: data.profiles?.email || "",
      sub_account_code: data.profiles?.sub_account_code || "",
    },
    sections: data.petition_sections || [],
  } as unknown as PetitionWithUser;

  // Remove the nested objects that we've flattened
  delete (petition as any).profiles;
  delete (petition as any).petition_sections;

  return petition;
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
    ? "petition-videos"
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
 * Create a new petition
 */
export async function createPetition(
  userId: string,
  petitionData: PetitionFormData
): Promise<Petition> {
  const supabase = await createClient();

  // Upload cover image if provided
  let coverImageUrl = null;
  if (petitionData.coverImage) {
    coverImageUrl = await uploadImageToSupabase(
      petitionData.coverImage,
      userId,
      "cover"
    );
  }

  console.log("Uploaded");

  // Calculate days_active from start and end dates
  let daysActive = null;
  if (petitionData.startDate && petitionData.endDate) {
    // Ensure we have valid Date objects
    const startDate =
      petitionData.startDate instanceof Date
        ? petitionData.startDate
        : new Date(petitionData.startDate);
    const endDate =
      petitionData.endDate instanceof Date
        ? petitionData.endDate
        : new Date(petitionData.endDate);

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
    petitionData.multimedia &&
    Array.isArray(petitionData.multimedia) &&
    petitionData.multimedia.length > 0
  ) {
    try {
      multimediaUrls = await Promise.all(
        petitionData.multimedia.map((file) =>
          uploadImageToSupabase(file, userId, "additional")
        )
      );
    } catch (error) {
      console.error("Error uploading multimedia:", error);
      throw error;
    }
  }

  // Start a transaction
  const { data: petition, error: petitionError } = await supabase
    .from("petitions")
    .insert({
      user_id: userId,
      title: petitionData.title,
      description: petitionData.description, // <-- ensure this is included
      category: petitionData.category,
      goal:
        typeof petitionData.goal === "string"
          ? Number.parseFloat(petitionData.goal)
          : petitionData.goal,
      status: "pending", // All petitions start as pending
      image: coverImageUrl, // Store the cover image URL
      days_active: daysActive, // Store the calculated days active
      multimedia: multimediaUrls, // Store multimedia URLs as JSON array
    })
    .select()
    .single();
  console.log(petition);
  if (petitionError) {
    console.error("Error creating petition:", petitionError);
    throw petitionError;
  }

  // Insert sections if they exist
  if (petitionData.sections && petitionData.sections.length > 0) {
    const sections = petitionData.sections.map((section) => ({
      petition_id: petition.id,
      heading: section.heading,
      description: section.description,
    }));

    const { error: sectionsError } = await supabase
      .from("petition_sections")
      .insert(sections);

    if (sectionsError) {
      console.error("Error creating sections:", sectionsError);
      throw sectionsError;
    }
  }

  revalidatePath("/dashboard/petitions");
  return petition as Petition;
}

/**
 * Update a petition
 */
export async function updatePetition(
  petitionId: string,
  userId: string,
  petitionData: Partial<PetitionFormData>
): Promise<Petition> {
  const supabase = await createClient();

  let coverImageUrl = petitionData.coverImage
    ? await uploadImageToSupabase(petitionData.coverImage, userId, "cover")
    : petitionData.image;

  // Calculate days_active from start and end dates
  let daysActive = null;
  if (petitionData.startDate && petitionData.endDate) {
    // Ensure we have valid Date objects
    const startDate =
      petitionData.startDate instanceof Date
        ? petitionData.startDate
        : new Date(petitionData.startDate);
    const endDate =
      petitionData.endDate instanceof Date
        ? petitionData.endDate
        : new Date(petitionData.endDate);

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
    title: petitionData.title,
    description: petitionData.description, // <-- ensure this is included
    category: petitionData.category,
    goal: petitionData.goal,
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
    .from("petitions")
    .update(updateData)
    .eq("id", petitionId)
    .eq("user_id", userId) // Ensure the user owns this petition
    .select()
    .single();

  if (error) {
    console.error("Error updating petition:", error);
    throw error;
  }

  // Handle sections update
  if (petitionData.sections) {
    // First delete existing sections
    const { error: deleteError } = await supabase
      .from("petition_sections")
      .delete()
      .eq("petition_id", petitionId);

    if (deleteError) {
      console.error("Error deleting existing sections:", deleteError);
      throw deleteError;
    }

    // Then insert new sections if they exist
    if (petitionData.sections.length > 0) {
      const sections = petitionData.sections.map((section) => ({
        petition_id: petitionId,
        heading: section.heading,
        description: section.description,
      }));

      const { error: sectionsError } = await supabase
        .from("petition_sections")
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
    petitionData.multimedia &&
    Array.isArray(petitionData.multimedia) &&
    petitionData.multimedia.length > 0
  ) {
    try {
      updatedMultimediaUrls = await Promise.all(
        petitionData.multimedia.map((file) =>
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

  const { data: updatedPetition, error: updateError } = await supabase
    .from("petitions")
    .update(updateData)
    .eq("id", petitionId)
    .eq("user_id", userId) // Ensure the user owns this petition
    .select()
    .single();

  if (updateError) {
    console.error("Error updating petition:", updateError);
    throw updateError;
  }

  revalidatePath("/dashboard/petitions");
  return updatedPetition as Petition;
}

/**
 * List petitions with filtering options
 */
export async function listPetitions(
  options: PetitionFilterOptions = {}
): Promise<Petition[]> {
  const supabase = await createClient();

  let query = supabase
    .from("petitions")
    .select("*,profiles(full_name,email,profile_photo)")
    .order("created_at", { ascending: false });

  // Apply filters
  if (options.category && options.category !== "all") {
    query = query.eq("category", options.category);
  }

  if (options.status) {
    query = query.eq("status", options.status);
  } else {
    // Default to approved petitions for public listing
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
    // Log the whole error object, fallback to string if empty
    console.error("Error listing petitions:", error || "Unknown error");
    throw error;
  }

  return data as Petition[];
}

/**
 * Count petitions with filtering options
 */
export async function countPetitions(
  options: PetitionFilterOptions = {}
): Promise<number> {
  const supabase = await createClient();

  let query = supabase
    .from("petitions")
    .select("id", { count: "exact", head: true });

  // Apply filters
  if (options.category && options.category !== "all") {
    query = query.eq("category", options.category);
  }

  if (options.status) {
    query = query.eq("status", options.status);
  } else {
    // Default to approved petitions for public listing
    if (!options.userId) {
      query = query.eq("status", "approved");
    }
  }

  if (options.userId) {
    query = query.eq("user_id", options.userId);
  }

  const { count, error } = await query;

  if (error) {
    console.error("Error counting petitions:", error);
    throw error;
  }

  return count || 0;
}

/**
 * Approve or reject a petition (admin function)
 */
export async function updatePetitionStatus(
  petitionId: string,
  status: "approved" | "rejected",
  rejectionReason?: string
): Promise<Petition> {
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
    // Get the petition to access the original days_active
    const { data: petitionData, error: fetchError } = await supabase
      .from("petitions")
      .select("days_active")
      .eq("id", petitionId)
      .single();

    if (fetchError) {
      console.error("Error fetching petition for approval:", fetchError);
      throw fetchError;
    }

    // Set the updated_at to now so the cron job can start counting from this moment
    updateData.updated_at = new Date().toISOString();

    // Keep the original days_active value - the cron job will decrement it
    if (petitionData.days_active) {
      updateData.days_active = petitionData.days_active;
    }
  }

  const { data, error } = await supabase
    .from("petitions")
    .update(updateData)
    .eq("id", petitionId)
    .select()
    .single();

  if (error) {
    console.error("Error updating petition status:", error);
    throw error;
  }

  // Attempt to notify the petition owner by email
  try {
    if (data?.user_id) {
      if (status === "approved") {
        await sendPetitionApprovedEmailForUser(data.user_id, {
          petitionName: data.title,
        });
      }
      if (status === "rejected") {
        await sendPetitionRejectedEmailForUser(data.user_id, {
          petitionName: data.title,
          rejectionReason,
        });
      }
    }
  } catch (mailError) {
    console.error("Failed to send petition status email:", mailError);
  }

  revalidatePath("/dashboard/admin/petitions");
  return data as Petition;
}

/**
 * Get all petitions for a specific user
 */
export async function getUserPetitions(userId: string): Promise<Petition[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("petitions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user petitions:", error);
    throw error;
  }

  return data as Petition[];
}

export async function getUserPetitionsWithStatus(
  userId: string,
  status?: string
): Promise<Petition[]> {
  const supabase = await createClient();

  let query = supabase
    .from("petitions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // Only apply status filter if status is provided and not empty
  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching user petitions with status:", error);
    throw error;
  }

  return data as Petition[];
}

export async function deletePetition(petitionId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("petitions")
    .delete()
    .eq("id", petitionId);

  if (error) {
    console.error("Error deleting petition:", error);
    throw error;
  }
}

/**
 * Save a petition share to the database
 */
export async function savePetitionShare(petitionId: string): Promise<void> {
  const supabase = await createClient();

  // Start a transaction
  const { error: shareError, data: petitionData } = await supabase
    .from("petitions")
    .select("shared")
    .eq("id", petitionId)
    .single();
  if (shareError) {
    console.error("Error saving petition share:", shareError);
    throw shareError;
  }

  const { data: mine, error: petitionError } = await supabase
    .from("petitions")
    .update({ shared: petitionData.shared + 1 })
    .eq("id", petitionId)
    .single();

  if (petitionError) {
    console.error("Error saving petition share:", petitionError);
    throw petitionError;
  }

  return mine;
}
