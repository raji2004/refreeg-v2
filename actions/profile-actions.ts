"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Profile, ProfileFormData, BankDetailsFormData } from "@/types";

/**
 * Get a user's profile
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching profile:", error);
    throw error;
  }

  return data as Profile;
}

/**
 * Check if a user has bank details
 */
export async function hasBankDetails(userId: string): Promise<boolean> {
  const profile = await getProfile(userId);
  return !!(profile && profile.account_number && profile.bank_name);
}

/**
 * Update a user's profile
 */
export async function updateProfile(
  userId: string,
  profileData: ProfileFormData
): Promise<Profile> {
  const supabase = await createClient();

  const updateData = {
    id: userId,
    full_name: profileData.name,
    email: profileData.email,
    phone: profileData.phone,
    bio: profileData.bio, // Add this line to include bio in the update
    profile_photo: profileData.profile_photo,
    updated_at: new Date().toISOString(),
  };

  console.log("Updating profile with data:", updateData); // Debug log

  const { data, error } = await supabase
    .from("profiles")
    .upsert(updateData)
    .select()
    .single();

  if (error) {
    console.error("Error updating profile:", error);
    throw error;
  }

  // Revalidate both dashboard and public profile paths
  revalidatePath("/dashboard/settings");
  revalidatePath(`/profile/${userId}`);
  revalidatePath("/"); // Optional: if profile appears elsewhere

  return data as Profile;
}

/**
 * Update a user's profile photo
 */
export async function updateProfilePhoto(
  userId: string,
  photoFile: File
): Promise<string> {
  const supabase = await createClient();

  // Upload the file to Supabase Storage
  const fileName = `${userId}-${Date.now()}-${photoFile.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("profile-photos")
    .upload(fileName, photoFile, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    console.error("Error uploading profile photo:", uploadError);
    throw uploadError;
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from("profile-photos")
    .getPublicUrl(fileName);

  const publicUrl = urlData.publicUrl;

  // Update the profile with the new photo URL
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      profile_photo: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error updating profile with photo URL:", error);
    throw error;
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/");
  return publicUrl;
}

/**
 * Update a user's bank details
 */
export async function updateBankDetails(
  userId: string,
  bankData: BankDetailsFormData
): Promise<Profile> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      account_number: bankData.accountNumber,
      bank_name: bankData.bankName,
      account_name: bankData.accountName,
      sub_account_code: bankData.sub_account_code,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error updating bank details:", error);
    throw error;
  }

  revalidatePath("/dashboard/settings");
  return data as Profile;
}
