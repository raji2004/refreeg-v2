import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { getCause, deleteCause } from "@/actions/cause-actions";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cause = await getCause(id);
    
    if (!cause) {
      return apiError("Cause not found", 404);
    }
    
    return apiSuccess(cause);
  } catch (error: any) {
    console.error("Mobile API Get Cause Error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const body = await request.json();
    
    const existingCause = await prisma.cause.findUnique({
      where: { id }
    });

    if (!existingCause) {
      return apiError("Cause not found", 404);
    }

    if (existingCause.userId !== user!.id) {
      return apiError("Unauthorized to update this cause", 403);
    }

    // Bypass 'updateCause' action for the same reason as create (file uploads)
    // Instead we create the pending edit directly
    const existingEdit = await prisma.cause_edits.findFirst({
      where: { original_cause_id: id, status: "pending" },
    });

    if (existingEdit) {
      return apiError("You already have a pending edit for this cause.", 400);
    }

    let daysActive = null;
    if (body.startDate && body.endDate) {
      const startDate = new Date(body.startDate);
      const endDate = new Date(body.endDate);
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        daysActive = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    const editData = await prisma.$transaction(async (tx: any) => {
      const edit = await tx.cause_edits.create({
        data: {
          original_cause_id: id,
          user_id: user!.id,
          title: body.title || existingCause.title,
          category: body.category || existingCause.category,
          goal: typeof body.goal === "string" ? Number.parseFloat(body.goal) : (body.goal || existingCause.goal),
          image: body.coverImageS3Key || existingCause.image,
          days_active: daysActive || existingCause.daysActive,
          start_date: body.startDate ? new Date(body.startDate) : existingCause.start_date,
          end_date: body.endDate ? new Date(body.endDate) : existingCause.end_date,
          multimedia: body.multimediaS3Keys || existingCause.multimedia,
          video_links: body.video_links || existingCause.videoLinks,
          summary: body.summary || existingCause.summary,
          location: body.location || existingCause.location,
          status: "pending",
        },
      });

      if (body.sections && body.sections.length > 0) {
        await tx.cause_edit_sections.createMany({
          data: body.sections.map((section: any) => ({
            cause_edit_id: edit.id,
            heading: section.heading,
            description: section.description,
          })),
        });
      }

      return edit;
    });

    return apiSuccess(editData, 202);
  } catch (error: any) {
    console.error("Mobile API Update Cause Error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    
    const existingCause = await prisma.cause.findUnique({
      where: { id }
    });

    if (!existingCause) {
      return apiError("Cause not found", 404);
    }

    if (existingCause.userId !== user!.id) {
      return apiError("Unauthorized to delete this cause", 403);
    }

    await deleteCause(id);
    
    return apiSuccess({ message: "Cause deleted successfully" });
  } catch (error: any) {
    console.error("Mobile API Delete Cause Error:", error);
    return apiError("Internal server error", 500);
  }
}
