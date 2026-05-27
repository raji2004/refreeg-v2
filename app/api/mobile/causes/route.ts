import { NextRequest } from "next/server";
import { apiSuccess, apiError, apiPaginated, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { listCauses, countCauses } from "@/actions/cause-actions";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const sortBy = (searchParams.get("sortBy") as any) || "latest";
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    const options: any = {
      category,
      status,
      search,
      sortBy,
      limit,
      offset,
    };

    const [causes, total] = await Promise.all([
      listCauses(options),
      countCauses(options)
    ]);
    
    return apiPaginated(causes, total, limit, offset);
  } catch (error: any) {
    console.error("Mobile API Get Causes Error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    
    // We need to bypass the 'createCause' server action because it expects a 'File' object
    // for coverImage and multimedia. The mobile app will send S3 keys instead.
    
    if (!body.title || !body.category || !body.goal) {
      return apiError("Missing required fields (title, category, goal)", 400);
    }

    const causeId = crypto.randomUUID();
    let daysActive = null;
    
    if (body.startDate && body.endDate) {
      const startDate = new Date(body.startDate);
      const endDate = new Date(body.endDate);

      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        daysActive = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    const cause = await prisma.$transaction(async (tx: any) => {
      const newCause = await tx.cause.create({
        data: {
          id: causeId,
          userId: user!.id,
          title: body.title,
          category: body.category,
          goal: typeof body.goal === "string" ? Number.parseFloat(body.goal) : body.goal,
          status: "pending",
          image: body.coverImageS3Key || null,
          daysActive: daysActive,
          start_date: body.startDate ? new Date(body.startDate) : null,
          end_date: body.endDate ? new Date(body.endDate) : null,
          multimedia: body.multimediaS3Keys || [],
          videoLinks: body.video_links || [],
          summary: body.summary || null,
          location: body.location || null,
        },
      });

      if (body.sections && body.sections.length > 0) {
        await tx.cause_sections.createMany({
          data: body.sections.map((section: any) => ({
            cause_id: newCause.id,
            heading: section.heading,
            description: section.description,
          })),
        });
      }

      return newCause;
    });
    
    return apiSuccess(cause, 201);
  } catch (error: any) {
    console.error("Mobile API Create Cause Error:", error);
    return apiError("Internal server error", 500);
  }
}
