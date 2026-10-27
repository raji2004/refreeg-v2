import {
  authenticateMobileRequest,
  mobileCorsPreflight,
  mobileErrorResponse,
  mobileJsonResponse,
} from "@/lib/auth/mobile-auth";
import { executeUserAccountDeletion } from "@/lib/auth/account-deletion";

export async function OPTIONS() {
  return mobileCorsPreflight();
}

export async function DELETE(request: Request) {
  const user = await authenticateMobileRequest(request);
  if (!user) {
    return mobileErrorResponse("Unauthorized", 401);
  }

  const result = await executeUserAccountDeletion(user.id);
  if (!result.success) {
    return mobileErrorResponse(
      result.error ?? "Failed to delete account",
      result.statusCode,
      result.code ? { code: result.code } : undefined,
    );
  }

  return mobileJsonResponse({
    deleted: true,
    message:
      "Your account and personal data have been permanently deleted, and historical financial records have been anonymized.",
  });
}

