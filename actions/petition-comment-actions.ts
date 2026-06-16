"use server";

import { prisma } from "@/lib/prisma";

/** Helper to map Prisma's camelCase User fields to the snake_case shape the frontend expects */
function mapUserToCommentUser(user: {
  fullName: string | null;
  profilePhoto: string | null;
  username: string | null;
}) {
  return {
    full_name: user.fullName,
    profile_photo: user.profilePhoto,
    username: user.username,
  };
}

export async function createPetitionComment(
  petitionId: string,
  userId: string,
  content: string,
  parentId?: string,
) {
  const comment = await prisma.petition_comments.create({
    data: {
      petition_id: petitionId,
      user_id: userId,
      content,
      parent_id: parentId || null,
      is_edited: false,
    },
    include: {
      user: {
        select: { fullName: true, profilePhoto: true, username: true },
      },
    },
  });

  return {
    ...comment,
    created_at: comment.created_at.toISOString(),
    user: mapUserToCommentUser(comment.user),
  };
}

export async function updatePetitionComment(
  commentId: string,
  userId: string,
  content: string,
) {
  // petition_comments has no updated_at column — only update content & is_edited
  const result = await prisma.petition_comments.updateMany({
    where: { id: commentId, user_id: userId },
    data: {
      content,
      is_edited: true,
    },
  });

  if (result.count === 0) {
    throw new Error("Comment not found or you don't have permission to edit it");
  }

  const updated = await prisma.petition_comments.findUnique({
    where: { id: commentId },
    include: {
      user: {
        select: { fullName: true, profilePhoto: true, username: true },
      },
    },
  });

  if (!updated) throw new Error("Comment not found after update");

  return {
    ...updated,
    created_at: updated.created_at.toISOString(),
    user: mapUserToCommentUser(updated.user),
  };
}

export async function deletePetitionComment(
  commentId: string,
  userId: string,
) {
  const result = await prisma.petition_comments.deleteMany({
    where: { id: commentId, user_id: userId },
  });

  if (result.count === 0) {
    throw new Error(
      "Comment not found or you don't have permission to delete it",
    );
  }

  return true;
}

export async function listPetitionComments(petitionId: string) {
  // Fetch top-level comments
  const comments = await prisma.petition_comments.findMany({
    where: { petition_id: petitionId, parent_id: null },
    orderBy: { created_at: "desc" },
    include: {
      user: {
        select: { fullName: true, profilePhoto: true, username: true },
      },
    },
  });

  // Batch-count replies using groupBy instead of N+1 queries
  const commentIds = comments.map((c) => c.id);
  const replyCounts =
    commentIds.length > 0
      ? await prisma.petition_comments.groupBy({
          by: ["parent_id"],
          where: { parent_id: { in: commentIds } },
          _count: { id: true },
        })
      : [];

  const replyCountMap = new Map(
    replyCounts.map((r) => [r.parent_id, r._count.id]),
  );

  return comments.map((comment) => ({
    ...comment,
    created_at: comment.created_at.toISOString(),
    user: mapUserToCommentUser(comment.user),
    replies_count: replyCountMap.get(comment.id) || 0,
  }));
}

export async function listRepliesForPetitionComment(commentId: string) {
  const replies = await prisma.petition_comments.findMany({
    where: { parent_id: commentId },
    orderBy: { created_at: "asc" },
    include: {
      user: {
        select: { fullName: true, profilePhoto: true, username: true },
      },
    },
  });

  return replies.map((reply) => ({
    ...reply,
    created_at: reply.created_at.toISOString(),
    user: mapUserToCommentUser(reply.user),
  }));
}
