import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: commentId } = params;
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isPetition = entityType === "petition";
    const userId = session.user.id;

    const comment = isPetition
      ? await prisma.petition_comments.findUnique({ where: { id: commentId }, select: { user_id: true } })
      : await prisma.comments.findUnique({ where: { id: commentId }, select: { user_id: true } });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.user_id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized to delete this comment" },
        { status: 403 }
      );
    }

    // Explicit child deletion was removed here since it only goes one level deep.
    // Ensure ON DELETE CASCADE is set up on your Database tables!
    // -> ALTER TABLE comments ADD CONSTRAINT fk_parent FOREIGN KEY (parent_id) REFERENCES comments (id) ON DELETE CASCADE;

    if (isPetition) {
      await prisma.petition_comments.delete({ where: { id: commentId } });
    } else {
      await prisma.comments.delete({ where: { id: commentId } });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: commentId } = params;
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content } = await request.json();

    if (!content || typeof content !== "string" || content.trim().length === 0 || content.length > 2000) {
      return NextResponse.json(
        { error: "Content must be provided and not exceed 2000 characters" },
        { status: 400 }
      );
    }

    const isPetition = entityType === "petition";
    const userId = session.user.id;

    const comment = isPetition
      ? await prisma.petition_comments.findUnique({ where: { id: commentId }, select: { user_id: true } })
      : await prisma.comments.findUnique({ where: { id: commentId }, select: { user_id: true } });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.user_id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized to edit this comment" },
        { status: 403 }
      );
    }

    if (isPetition) {
      const updatedComment = await prisma.petition_comments.update({
        where: { id: commentId },
        data: { content: content.trim(), is_edited: true },
      });
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, fullName: true, profilePhoto: true, username: true },
      });
      return NextResponse.json({
        ...updatedComment,
        user: user ? { id: user.id, full_name: user.fullName, profile_photo: user.profilePhoto, username: user.username } : null,
      });
    } else {
      const updatedComment = await prisma.comments.update({
        where: { id: commentId },
        data: { content: content.trim(), is_edited: true, updated_at: new Date() },
        include: {
          user: { select: { id: true, fullName: true, profilePhoto: true, username: true } },
        },
      });
      const { user, ...rest } = updatedComment;
      return NextResponse.json({
        ...rest,
        user: user ? { id: user.id, full_name: user.fullName, profile_photo: user.profilePhoto, username: user.username } : null,
      });
    }
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }
}
