"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { UserRole, UserWithRole } from "@/types";

const DEFAULT_ADMIN_EMAIL = "kingraj1344@gmail.com";

/**
 * Get all role information for a user in a single query
 */
export async function getUserRoleInfo(userId: string): Promise<{
  isAdmin: boolean;
  isManager: boolean;
  role: UserRole;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error getting user role info:", error);
    return {
      isAdmin: false,
      isManager: false,
      role: "user",
    };
  }

  const role = data?.role || "user";
  return {
    isAdmin: role === "admin",
    isManager: role === "manager" || role === "admin",
    role,
  };
}

/**
 * Check if a user is an admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const { isAdmin } = await getUserRoleInfo(userId);
  return isAdmin;
}

/**
 * Check if a user is a manager
 */
export async function isManager(userId: string): Promise<boolean> {
  const { isManager } = await getUserRoleInfo(userId);
  return isManager;
}

/**
 * Check if a user is an admin or manager
 */
export async function isAdminOrManager(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error checking admin/manager status:", error);
    return false;
  }

  return data?.role === "admin" || data?.role === "manager";
}

/**
 * Get a user's role
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  const { role } = await getUserRoleInfo(userId);
  return role;
}

/**
 * Set a user's role
 */
export async function setUserRole(
  userId: string,
  role: UserRole
): Promise<boolean> {
  const supabase = await createClient();

  // Get the current user's ID
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Error getting current user:", userError);
    return false;
  }

  // Check if the current user is an admin by checking their role directly
  const { data: currentUserRole } = await supabase
    .from("roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (currentUserRole?.role !== "admin") {
    console.error("Only admins can set roles");
    return false;
  }

  // Check if the user already has a role
  const { data: existingRole } = await supabase
    .from("roles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  let result;

  if (existingRole) {
    // Update existing role
    result = await supabase
      .from("roles")
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  } else {
    // Insert new role
    result = await supabase.from("roles").insert({
      user_id: userId,
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  if (result.error) {
    console.error("Error setting user role:", result.error);
    return false;
  }

  revalidatePath("/dashboard/admin/users");
  return true;
}

/**
 * List all users with their roles
 */
export async function listUsersWithRoles(): Promise<UserWithRole[]> {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Error getting current user:", userError);
    throw new Error("Not authenticated");
  }

  // Check if current user is admin
  const { data: currentUserRole } = await supabase
    .from("roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    currentUserRole?.role !== "admin" &&
    currentUserRole?.role !== "manager"
  ) {
    throw new Error("Only admins or managers can list users");
  }

  // Get all profiles with their roles using left join to include users without roles
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select(
      `
      id,
      full_name,
      email,
      is_blocked,
      created_at,
      roles:roles!left ( role )
    `
    )
    .order("created_at", { ascending: false });

  if (profilesError) {
    console.error("Error listing profiles:", profilesError);
    throw profilesError;
  }
  // revalidatePath("/dashboard/admin/users")
  // Map profiles to UserWithRole
  return profiles.map((profile) => ({
    id: profile.id,
    email: profile.email || "",
    role: profile.roles?.[0]?.role || "user",
    is_blocked: profile.is_blocked || false,
    full_name: profile.full_name || null,
    created_at: profile.created_at,
  }));
}

/**
 * Ensure default admin exists
 */
export async function ensureDefaultAdmin(): Promise<void> {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Error getting current user:", userError);
    return;
  }

  // If the current user's email matches the default admin email, set them as admin
  if (user?.email === DEFAULT_ADMIN_EMAIL) {
    // Check if the user already has an admin role
    const { data: roleData } = await supabase
      .from("roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!roleData) {
      // Set the user as an admin
      await setUserRole(user.id, "admin");
    }
  }
}

/**
 * Get all users from profiles
 */
export async function getAllUsers(): Promise<UserWithRole[]> {
  const supabase = await createClient();

  const { data: profiles, error: profilesError } = await supabase.from(
    "profiles"
  ).select(`
      id,
      full_name,
      email,
      is_blocked,
      created_at,
      roles (
        role
      )
    `);

  if (profilesError) {
    console.error("Error listing profiles:", profilesError);
    throw profilesError;
  }

  // Map profiles to UserWithRole
  return profiles.map((profile) => ({
    id: profile.id,
    email: profile.email || "",
    role: profile.roles?.[0]?.role || "user",
    is_blocked: profile.is_blocked || false,
    full_name: profile.full_name || null,
    created_at: profile.created_at,
  }));
}
