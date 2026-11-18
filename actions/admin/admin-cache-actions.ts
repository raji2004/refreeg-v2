"use server";

import { revalidatePath } from "next/cache";
import { requireAdminOrManager } from "@/lib/auth/admin-auth";

export async function clearSiteCache(path?: string) {
  await requireAdminOrManager();
  try {
    if (path) {
      revalidatePath(path);
      return { success: true, message: `Cache cleared for path: ${path}` };
    }

    // Clear everything by default
    revalidatePath("/", "layout");
    return {
      success: true,
      message: "Entire site cache cleared successfully.",
    };
  } catch (error) {
    console.error("Failed to clear cache:", error);
    return {
      success: false,
      message: "Failed to clear cache. See server logs.",
    };
  }
}
