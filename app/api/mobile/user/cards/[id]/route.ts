import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

/**
 * DELETE /api/mobile/user/cards/[id]
 * Remove a saved card belonging to the authenticated user.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await authenticateMobileRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }
    const user = authResult.user!;
    const { id } = await params;

    const card = await prisma.user_saved_cards.findFirst({
      where: {
        id,
        user_id: user.id,
      },
    });

    if (!card) {
      return apiError("Card not found", 404);
    }

    await prisma.user_saved_cards.delete({
      where: { id },
    });

    // If deleted card was default, make another card default if any exists
    if (card.is_default) {
      const nextCard = await prisma.user_saved_cards.findFirst({
        where: { user_id: user.id },
        orderBy: { created_at: "desc" },
      });
      if (nextCard) {
        await prisma.user_saved_cards.update({
          where: { id: nextCard.id },
          data: { is_default: true },
        });
      }
    }

    return apiSuccess({ message: "Card deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting card:", error);
    return apiError(error.message || "Failed to delete card", 500);
  }
}

/**
 * PATCH /api/mobile/user/cards/[id]
 * Set card as default for the user.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await authenticateMobileRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }
    const user = authResult.user!;
    const { id } = await params;

    const card = await prisma.user_saved_cards.findFirst({
      where: { id, user_id: user.id },
    });

    if (!card) {
      return apiError("Card not found", 404);
    }

    // Set all user cards to is_default = false
    await prisma.user_saved_cards.updateMany({
      where: { user_id: user.id },
      data: { is_default: false },
    });

    // Set this card as default
    const updated = await prisma.user_saved_cards.update({
      where: { id },
      data: { is_default: true },
    });

    return apiSuccess({ card: updated, message: "Default card updated" });
  } catch (error: any) {
    console.error("Error setting default card:", error);
    return apiError(error.message || "Failed to update default card", 500);
  }
}
