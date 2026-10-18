import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { user } = await authenticateMobileRequest(request);

    const cause = await prisma.cause.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!cause) {
      return apiError("Cause not found", 404);
    }

    const isOwner = user?.id === cause.userId;

    const updates = await prisma.campaign_proof_updates.findMany({
      where: {
        cause_id: id,
        ...(isOwner ? {} : { status: "approved" }),
      },
      orderBy: { created_at: "desc" },
      include: {
        user: {
          select: {
            fullName: true,
            profilePhoto: true,
          },
        },
      },
    });

    return apiSuccess(updates);
  } catch (error: any) {
    console.error("Mobile API Get Proof Updates Error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const body = await request.json();

    const cause = await prisma.cause.findUnique({
      where: { id },
      select: { id: true, userId: true, title: true },
    });

    if (!cause) {
      return apiError("Cause not found", 404);
    }

    if (cause.userId !== user!.id) {
      return apiError("You can only post updates for your own cause.", 403);
    }

    const description = String(body.description || "").trim();
    if (description.length < 20) {
      return apiError(
        "Please describe how the funds were used (at least 20 characters).",
        400,
      );
    }

    const media = Array.isArray(body.media) ? body.media : [];
    if (media.length === 0) {
      return apiError("Attach at least one photo, video, or document.", 400);
    }

    if (media.length > 10) {
      return apiError("Maximum 10 files allowed.", 400);
    }

    const milestoneRaw = body.milestone;
    const milestone =
      milestoneRaw && Number(milestoneRaw) > 0 ? Number(milestoneRaw) : null;

    const update = await prisma.campaign_proof_updates.create({
      data: {
        cause_id: id,
        user_id: user!.id,
        milestone,
        description,
        media,
        status: "pending",
      },
    });

    // Check if there is an active milestone requirement to mark as submitted
    const requirement = await prisma.campaign_proof_requirements.findFirst({
      where: {
        cause_id: id,
        status: "pending",
        ...(milestone ? { milestone } : {}),
      },
      orderBy: { crossed_at: "asc" },
    });

    if (requirement) {
      await prisma.campaign_proof_requirements.update({
        where: { id: requirement.id },
        data: {
          status: "submitted",
          submitted_update_id: update.id,
        },
      });
    }

    return apiSuccess(update, 201);
  } catch (error: any) {
    console.error("Mobile API Submit Proof Update Error:", error);
    return apiError("Internal server error", 500);
  }
}
