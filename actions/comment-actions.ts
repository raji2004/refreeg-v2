import { prisma } from "@/lib/prisma";
import { Comment } from "@/types/common-types";
import { recordEvent } from "@/actions/event-reward-actions";
import { sendNewCommentEmail } from "@/services/mail";

/** Helper to map Prisma's camelCase User fields to the snake_case shape the Comment type expects */
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

export async function createComment(
  causeId: string,
  userId: string | null,
  content: string,
  parentId?: string,
) {
  // Normalize userId for DB: use null for guest/unauthenticated users
  const dbUserId = userId && userId !== "" ? userId : null;

  const comment = await prisma.comments.create({
    data: {
      cause_id: causeId,
      user_id: dbUserId,
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

  // Record event for reward tracking only for authenticated users
  if (dbUserId) {
    try {
      // Rate-limit rewarding: prevent rapid repeated comment rewards.
      // If the user has a recent 'comment' event within the last 60 seconds, skip recording a new reward event.
      const recent = await prisma.events.findFirst({
        where: { user_id: dbUserId, event_type: "comment" },
        orderBy: { created_at: "desc" },
        select: { id: true, created_at: true },
      });

      let shouldRecord = true;
      if (recent?.created_at) {
        const last = new Date(recent.created_at).getTime();
        const now = Date.now();
        const windowMs = 60 * 1000; // 60 seconds
        if (now - last < windowMs) {
          shouldRecord = false;
        }
      }

      if (shouldRecord) {
        await recordEvent({
          type: "comment",
          userId: dbUserId,
          metadata: {
            cause_id: causeId,
            comment_id: comment.id,
            has_parent: !!parentId,
          },
        });
      }
    } catch (eventError) {
      console.error("Error recording comment event:", eventError);
      // Don't throw - event tracking shouldn't break the main action
    }
  }

  // Emit SSE event
  try {
    const { eventBus } = await import("@/lib/event-bus");
    eventBus.emit("comment", {
      type: "comment",
      data: comment,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Error emitting comment SSE:", e);
  }

  // Notify the cause owner about the new comment (skip if they commented on
  // their own cause — no point emailing yourself).
  try {
    const causeWithOwner = await prisma.cause.findUnique({
      where: { id: causeId },
      select: {
        title: true,
        userId: true,
        user: {
          select: { fullName: true, email: true },
        },
      },
    });

    if (causeWithOwner && causeWithOwner.userId !== dbUserId) {
      const ownerEmail = causeWithOwner.user?.email;
      const ownerName = causeWithOwner.user?.fullName || "Campaign Owner";

      if (ownerEmail) {
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || "https://www.refreeg.com";
        const commenterName =
          comment.user?.fullName || comment.user?.username || "Someone";

        sendNewCommentEmail({
          to: ownerEmail,
          ownerName,
          commenterName,
          causeTitle: causeWithOwner.title,
          commentText: content,
          causeUrl: `${appUrl}/causes/${causeId}`,
        }).catch((err) =>
          console.error("Error sending new comment email:", err),
        );
      }
    }
  } catch (ownerEmailError) {
    console.error(
      "Error fetching cause owner for comment email:",
      ownerEmailError,
    );
  }

  return {
    ...comment,
    created_at: comment.created_at.toISOString(),
    updated_at: comment.updated_at.toISOString(),
    user: mapUserToCommentUser(comment.user),
  };
}

export async function updateComment(
  commentId: string,
  userId: string,
  content: string,
) {
  // Prisma doesn't support compound where on non-unique fields for update,
  // so we use updateMany for the ownership check, then re-fetch.
  const result = await prisma.comments.updateMany({
    where: { id: commentId, user_id: userId },
    data: {
      content,
      is_edited: true,
      updated_at: new Date(),
    },
  });

  if (result.count === 0) {
    throw new Error("Comment not found or you don't have permission to edit it");
  }

  const updated = await prisma.comments.findUnique({
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
    updated_at: updated.updated_at.toISOString(),
    user: mapUserToCommentUser(updated.user),
  };
}

export async function deleteComment(commentId: string, userId: string) {
  const result = await prisma.comments.deleteMany({
    where: { id: commentId, user_id: userId },
  });

  if (result.count === 0) {
    throw new Error(
      "Comment not found or you don't have permission to delete it",
    );
  }

  return true;
}

export async function listCommentsForCause(causeId: string) {
  // Fetch top-level comments
  const comments = await prisma.comments.findMany({
    where: { cause_id: causeId, parent_id: null },
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
      ? await prisma.comments.groupBy({
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
    updated_at: comment.updated_at.toISOString(),
    user: mapUserToCommentUser(comment.user),
    replies_count: replyCountMap.get(comment.id) || 0,
  })) as Comment[];
}

export async function listRepliesForComment(commentId: string) {
  const replies = await prisma.comments.findMany({
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
    updated_at: reply.updated_at.toISOString(),
    user: mapUserToCommentUser(reply.user),
  })) as Comment[];
}
