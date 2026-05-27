import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { updateComment, deleteComment } from "@/actions/comment-actions";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
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
    
    if (!body.content) {
      return apiError("Missing required field (content)", 400);
    }

    const comment = await prisma.comments.findUnique({
      where: { id }
    });

    if (!comment) {
      return apiError("Comment not found", 404);
    }

    if (comment.user_id !== user!.id) {
      return apiError("Unauthorized to update this comment", 403);
    }

    const updatedComment = await updateComment(id, user!.id, body.content);
    
    return apiSuccess(updatedComment);
  } catch (error: any) {
    console.error("Mobile API Update Comment Error:", error);
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
    
    const comment = await prisma.comments.findUnique({
      where: { id }
    });

    if (!comment) {
      return apiError("Comment not found", 404);
    }

    if (comment.user_id !== user!.id) {
      return apiError("Unauthorized to delete this comment", 403);
    }

    await deleteComment(id, user!.id);
    
    return apiSuccess({ message: "Comment deleted successfully" });
  } catch (error: any) {
    console.error("Mobile API Delete Comment Error:", error);
    return apiError("Internal server error", 500);
  }
}
