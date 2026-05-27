import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
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
    
    // Check if parent comment exists
    const parentComment = await prisma.comments.findUnique({
      where: { id }
    });

    if (!parentComment) {
      return apiError("Comment not found", 404);
    }

    const replies = await prisma.comments.findMany({
      where: { parent_id: id },
      orderBy: { created_at: 'asc' },
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
    
    return apiSuccess({ replies, count: replies.length });
  } catch (error: any) {
    console.error("Mobile API Get Comment Replies Error:", error);
    return apiError("Internal server error", 500);
  }
}
