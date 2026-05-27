import { NextRequest } from "next/server";
import { apiSuccess, apiError, apiPaginated, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { prisma } from "@/lib/prisma";
import { createComment } from "@/actions/comment-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const comments = await prisma.comments.findMany({
      where: {
        cause_id: id,
        parent_id: null,
      },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            profilePhoto: true,
          }
        }
      }
    });

    const total = await prisma.comments.count({
      where: {
        cause_id: id,
        parent_id: null,
      }
    });
    
    return apiPaginated(comments, total, limit, offset);
  } catch (error: any) {
    console.error("Mobile API Get Cause Comments Error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!body.content) {
      return apiError("Missing required field (content)", 400);
    }

    const newComment = await createComment(id, user!.id, body.content, body.parentId || undefined);
    
    return apiSuccess(newComment, 201);
  } catch (error: any) {
    console.error("Mobile API Create Comment Error:", error);
    return apiError("Internal server error", 500);
  }
}
