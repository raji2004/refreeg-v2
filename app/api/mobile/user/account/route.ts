import { NextRequest } from "next/server";
import {
  apiError,
  apiSuccess,
  handleCorsPreflight,
} from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { executeUserAccountDeletion } from "@/lib/auth/account-deletion";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function DELETE(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  const result = await executeUserAccountDeletion(user!.id);
  if (!result.success) {
    return apiError(
      result.error ?? "Failed to delete account",
      result.statusCode,
    );
  }

  return apiSuccess({
    deleted: true,
    message:
      "Your account and personal data have been permanently deleted, and historical financial records have been anonymized.",
  });
}
