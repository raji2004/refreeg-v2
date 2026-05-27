import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { getPetition, deletePetition } from "@/actions/petition-actions";
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
    const petition = await getPetition(id);
    
    if (!petition) {
      return apiError("Petition not found", 404);
    }
    
    return apiSuccess(petition);
  } catch (error: any) {
    console.error("Mobile API Get Petition Error:", error);
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
    
    const existingPetition = await prisma.petitions.findUnique({
      where: { id }
    });

    if (!existingPetition) {
      return apiError("Petition not found", 404);
    }

    if (existingPetition.user_id !== user!.id) {
      return apiError("Unauthorized to update this petition", 403);
    }

    const existingEdit = await prisma.petition_edits.findFirst({
      where: { original_petition_id: id, status: "pending" },
    });

    if (existingEdit) {
      return apiError("You already have a pending edit for this petition.", 400);
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
      const edit = await tx.petition_edits.create({
        data: {
          original_petition_id: id,
          user_id: user!.id,
          title: body.title || existingPetition.title,
          category: body.category || existingPetition.category,
          goal: body.targetSignatures ? Number(body.targetSignatures) : existingPetition.goal,
          image: body.coverImageS3Key || existingPetition.image,
          days_active: daysActive || existingPetition.days_active,
          multimedia: body.multimediaS3Keys || existingPetition.multimedia,
          video_links: body.video_links || existingPetition.video_links,
          status: "pending",
        },
      });

      if (body.sections && body.sections.length > 0) {
        await tx.petition_edit_sections.createMany({
          data: body.sections.map((section: any) => ({
            petition_edit_id: edit.id,
            heading: section.heading,
            description: section.description,
          })),
        });
      }

      return edit;
    });

    return apiSuccess(editData, 202);
  } catch (error: any) {
    console.error("Mobile API Update Petition Error:", error);
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
    
    const existingPetition = await prisma.petitions.findUnique({
      where: { id }
    });

    if (!existingPetition) {
      return apiError("Petition not found", 404);
    }

    if (existingPetition.user_id !== user!.id) {
      return apiError("Unauthorized to delete this petition", 403);
    }

    await deletePetition(id);
    
    return apiSuccess({ message: "Petition deleted successfully" });
  } catch (error: any) {
    console.error("Mobile API Delete Petition Error:", error);
    return apiError("Internal server error", 500);
  }
}
