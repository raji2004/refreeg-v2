/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    comments: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    events: {
      findFirst: jest.fn(),
    },
    cause: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/actions/event-reward-actions", () => ({
  recordEvent: jest.fn(),
}));

jest.mock("@/services/mail", () => ({
  sendNewCommentEmail: jest.fn(),
}));

jest.mock("@/lib/event-bus", () => ({
  eventBus: {
    emit: jest.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { recordEvent } from "@/actions/event-reward-actions";
import { sendNewCommentEmail } from "@/services/mail";
import { eventBus } from "@/lib/event-bus";
import {
  createComment,
  updateComment,
  deleteComment,
  listCommentsForCause,
  listRepliesForComment,
} from "@/actions/comment-actions";

const mockPrisma = prisma as unknown as {
  comments: {
    create: jest.Mock;
    updateMany: jest.Mock;
    findUnique: jest.Mock;
    deleteMany: jest.Mock;
    findMany: jest.Mock;
    groupBy: jest.Mock;
  };
  events: { findFirst: jest.Mock };
  cause: { findUnique: jest.Mock };
};

const commentRecord = {
  id: "comment-1",
  cause_id: "cause-1",
  user_id: "user-1",
  content: "Great cause!",
  parent_id: null,
  is_edited: false,
  created_at: new Date("2026-01-15T10:00:00.000Z"),
  updated_at: new Date("2026-01-15T10:00:00.000Z"),
  user: {
    fullName: "Jane Doe",
    profilePhoto: "photo.jpg",
    username: "jane",
  },
};

describe("comment-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (recordEvent as jest.Mock).mockResolvedValue({});
    (sendNewCommentEmail as jest.Mock).mockResolvedValue({ success: true });
    mockPrisma.events.findFirst.mockResolvedValue(null);
    mockPrisma.cause.findUnique.mockResolvedValue(null);
  });

  describe("createComment", () => {
    it("creates comment and records reward event for authenticated user", async () => {
      mockPrisma.comments.create.mockResolvedValue(commentRecord);

      const result = await createComment("cause-1", "user-1", "Great cause!");

      expect(result.content).toBe("Great cause!");
      expect(result.user).toEqual({
        full_name: "Jane Doe",
        profile_photo: "photo.jpg",
        username: "jane",
      });
      expect(recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "comment",
          userId: "user-1",
        }),
      );
      expect(eventBus.emit).toHaveBeenCalledWith(
        "comment",
        expect.objectContaining({ type: "comment" }),
      );
    });

    it("skips reward when recent comment event exists within 60 seconds", async () => {
      mockPrisma.comments.create.mockResolvedValue(commentRecord);
      mockPrisma.events.findFirst.mockResolvedValue({
        id: "event-1",
        created_at: new Date(),
      });

      await createComment("cause-1", "user-1", "Another comment");

      expect(recordEvent).not.toHaveBeenCalled();
    });

    it("does not record event for guest comments", async () => {
      mockPrisma.comments.create.mockResolvedValue({
        ...commentRecord,
        user_id: null,
      });

      await createComment("cause-1", null, "Guest comment");

      expect(recordEvent).not.toHaveBeenCalled();
    });

    it("emails the cause owner when someone else comments", async () => {
      mockPrisma.comments.create.mockResolvedValue(commentRecord);
      mockPrisma.cause.findUnique.mockResolvedValue({
        title: "Clean Water Initiative",
        userId: "owner-1",
        user: { fullName: "Owner Name", email: "owner@test.com" },
      });

      await createComment("cause-1", "user-1", "Great cause!");

      // Fire-and-forget: give the un-awaited notification microtask a chance to run.
      await new Promise((resolve) => setImmediate(resolve));

      expect(sendNewCommentEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "owner@test.com",
          ownerName: "Owner Name",
          commenterName: "Jane Doe",
          causeTitle: "Clean Water Initiative",
          commentText: "Great cause!",
        }),
      );
    });

    it("does not email the owner when they comment on their own cause", async () => {
      mockPrisma.comments.create.mockResolvedValue({
        ...commentRecord,
        user_id: "owner-1",
      });
      mockPrisma.cause.findUnique.mockResolvedValue({
        title: "Clean Water Initiative",
        userId: "owner-1",
        user: { fullName: "Owner Name", email: "owner@test.com" },
      });

      await createComment("cause-1", "owner-1", "Thanks everyone!");
      await new Promise((resolve) => setImmediate(resolve));

      expect(sendNewCommentEmail).not.toHaveBeenCalled();
    });

    it("does not throw when the cause owner lookup fails", async () => {
      mockPrisma.comments.create.mockResolvedValue(commentRecord);
      mockPrisma.cause.findUnique.mockRejectedValue(new Error("db error"));

      await expect(
        createComment("cause-1", "user-1", "Great cause!"),
      ).resolves.toBeDefined();
      expect(sendNewCommentEmail).not.toHaveBeenCalled();
    });
  });

  describe("updateComment", () => {
    it("updates comment when user owns it", async () => {
      mockPrisma.comments.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.comments.findUnique.mockResolvedValue({
        ...commentRecord,
        content: "Updated content",
        is_edited: true,
        updated_at: new Date("2026-01-16T10:00:00.000Z"),
      });

      const result = await updateComment(
        "comment-1",
        "user-1",
        "Updated content",
      );

      expect(result.content).toBe("Updated content");
      expect(result.is_edited).toBe(true);
    });

    it("throws when user does not own the comment", async () => {
      mockPrisma.comments.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        updateComment("comment-1", "other-user", "Hacked"),
      ).rejects.toThrow("Comment not found or you don't have permission");
    });
  });

  describe("deleteComment", () => {
    it("returns true when comment is deleted", async () => {
      mockPrisma.comments.deleteMany.mockResolvedValue({ count: 1 });

      const result = await deleteComment("comment-1", "user-1");

      expect(result).toBe(true);
    });

    it("throws when comment cannot be deleted", async () => {
      mockPrisma.comments.deleteMany.mockResolvedValue({ count: 0 });

      await expect(deleteComment("comment-1", "user-1")).rejects.toThrow(
        "Comment not found or you don't have permission",
      );
    });
  });

  describe("listCommentsForCause", () => {
    it("returns top-level comments with reply counts", async () => {
      mockPrisma.comments.findMany.mockResolvedValue([commentRecord]);
      mockPrisma.comments.groupBy.mockResolvedValue([
        { parent_id: "comment-1", _count: { id: 2 } },
      ]);

      const result = await listCommentsForCause("cause-1");

      expect(result).toHaveLength(1);
      expect(result[0].replies_count).toBe(2);
      expect(result[0].user.full_name).toBe("Jane Doe");
    });
  });

  describe("listRepliesForComment", () => {
    it("returns replies with mapped user fields", async () => {
      mockPrisma.comments.findMany.mockResolvedValue([
        {
          ...commentRecord,
          id: "reply-1",
          parent_id: "comment-1",
          content: "I agree!",
        },
      ]);

      const result = await listRepliesForComment("comment-1");

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("I agree!");
    });
  });
});
