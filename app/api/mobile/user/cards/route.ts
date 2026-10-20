import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { prisma } from "@/lib/prisma";
import Paystack from "@/services/paystack";

export async function OPTIONS() {
  return handleCorsPreflight();
}

/**
 * GET /api/mobile/user/cards
 * List all saved cards for the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateMobileRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }
    const user = authResult.user!;

    const cards = await prisma.user_saved_cards.findMany({
      where: { user_id: user.id },
      orderBy: [{ is_default: "desc" }, { created_at: "desc" }],
      select: {
        id: true,
        card_type: true,
        last4: true,
        exp_month: true,
        exp_year: true,
        bank: true,
        brand: true,
        is_default: true,
        created_at: true,
      },
    });

    return apiSuccess({ cards });
  } catch (error: any) {
    console.error("Error fetching user saved cards:", error);
    return apiError(error.message || "Failed to fetch saved cards", 500);
  }
}

/**
 * POST /api/mobile/user/cards
 * Verify a Paystack transaction reference from card setup (₦50 authorization charge),
 * extract card authorization details, and save the card token for future 1-click charges.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateMobileRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }
    const user = authResult.user!;

    const body = await request.json();
    const { reference } = body;

    if (!reference) {
      return apiError("Missing transaction reference", 400);
    }

    const tx = (await Paystack.verifyTransactionFull(reference)) as {
      status?: string;
      authorization?: {
        authorization_code?: string;
        card_type?: string;
        last4?: string;
        exp_month?: string;
        exp_year?: string;
        bin?: string;
        bank?: string;
        brand?: string;
        signature?: string;
        reusable?: boolean;
      };
      customer?: {
        email?: string;
      };
    };

    if (tx.status !== "success") {
      return apiError("Transaction was not successful", 400);
    }

    const auth = tx.authorization;
    if (!auth?.authorization_code || !auth.last4) {
      return apiError(
        "Card authorization data could not be retrieved from provider",
        400,
      );
    }

    // Check if user already has any cards saved
    const existingCardsCount = await prisma.user_saved_cards.count({
      where: { user_id: user.id },
    });

    // Check if this specific card signature or authorization is already saved
    const duplicate = auth.signature
      ? await prisma.user_saved_cards.findFirst({
          where: {
            user_id: user.id,
            signature: auth.signature,
          },
        })
      : null;

    if (duplicate) {
      return apiSuccess({
        card: {
          id: duplicate.id,
          card_type: duplicate.card_type,
          last4: duplicate.last4,
          exp_month: duplicate.exp_month,
          exp_year: duplicate.exp_year,
          bank: duplicate.bank,
          brand: duplicate.brand,
          is_default: duplicate.is_default,
        },
        message: "Card already saved",
      });
    }

    const savedCard = await prisma.user_saved_cards.create({
      data: {
        user_id: user.id,
        authorization_code: auth.authorization_code,
        card_type: auth.card_type || "visa",
        last4: auth.last4,
        exp_month: auth.exp_month || "12",
        exp_year: auth.exp_year || "30",
        bin: auth.bin || null,
        bank: auth.bank || "Card Issuer",
        brand: auth.brand || auth.card_type || "Card",
        signature: auth.signature || null,
        email: tx.customer?.email || user.email,
        is_default: existingCardsCount === 0,
      },
    });

    return apiSuccess(
      {
        card: {
          id: savedCard.id,
          card_type: savedCard.card_type,
          last4: savedCard.last4,
          exp_month: savedCard.exp_month,
          exp_year: savedCard.exp_year,
          bank: savedCard.bank,
          brand: savedCard.brand,
          is_default: savedCard.is_default,
        },
        message: "Card saved successfully",
      },
      201,
    );
  } catch (error: any) {
    console.error("Error saving card:", error);
    return apiError(error.message || "Failed to save card", 500);
  }
}
