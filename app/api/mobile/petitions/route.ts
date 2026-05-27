import { NextRequest } from "next/server";
import { apiSuccess, apiError, apiPaginated, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { listPetitions, countPetitions } from "@/actions/petition-actions";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;
    const sortBy = (searchParams.get("sortBy") as any) || "latest";
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    const options = {
      category,
      search,
      sortBy,
      limit,
      offset,
    };

    const [petitions, total] = await Promise.all([
      listPetitions(options),
      countPetitions(options)
    ]);
    
    return apiPaginated(petitions, total, limit, offset);
  } catch (error: any) {
    console.error("Mobile API Get Petitions Error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    
    if (!body.title || !body.category || !body.targetSignatures) {
      return apiError("Missing required fields (title, category, targetSignatures)", 400);
    }

    const petitionId = crypto.randomUUID();
    
    let daysActive = null;
    if (body.startDate && body.endDate) {
      const startDate = new Date(body.startDate);
      const endDate = new Date(body.endDate);
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        daysActive = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    const petition = await prisma.$transaction(async (tx: any) => {
      const newPetition = await tx.petitions.create({
        data: {
          id: petitionId,
          user_id: user!.id,
          title: body.title,
          category: body.category,
          target_signatures: Number(body.targetSignatures),
          status: "pending",
          image: body.coverImageS3Key || null,
          days_active: daysActive,
          start_date: body.startDate ? new Date(body.startDate) : null,
          end_date: body.endDate ? new Date(body.endDate) : null,
          multimedia: body.multimediaS3Keys || [],
          video_links: body.video_links || [],
          summary: body.summary || null,
          location: body.location || null,
        },
      });

      if (body.sections && body.sections.length > 0) {
        await tx.petition_sections.createMany({
          data: body.sections.map((section: any) => ({
            petition_id: newPetition.id,
            heading: section.heading,
            description: section.description,
          })),
        });
      }

      return newPetition;
    });
    
    return apiSuccess(petition, 201);
  } catch (error: any) {
    console.error("Mobile API Create Petition Error:", error);
    return apiError("Internal server error", 500);
  }
}
