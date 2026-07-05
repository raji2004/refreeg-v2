jest.mock("@/lib/prisma", () => ({
  prisma: {
    petition_comments: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  createPetitionComment,
  updatePetitionComment,
  deletePetitionComment,
  listPetitionComments,
  listRepliesForPetitionComment,
} from "@/actions/petition-comment-actions";

const mockPrisma = prisma as unknown as {
  petition_comments: {
    create: jest.Mock;
    updateMany: jest.Mock;
    findUnique: jest.Mock;
    deleteMany: jest.Mock;
    findMany: jest.Mock;
    groupBy: jest.Mock;
  };
};

const mockUser = {
  fullName: "Jane Doe",
  profilePhoto: "photo.jpg",
  username: "jane",
};

describe("petition-comment-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createPetitionComment", () => {
    it("creates a comment and maps user fields", async () => {
      const createdAt = new Date("2024-06-01T12:00:00.000Z");
      mockPrisma.petition_comments.create.mockResolvedValue({
        id: "comment-1",
        petition_id: "petition-1",
        user_id: "user-1",
        content: "Great petition",
        parent_id: null,
        is_edited: false,
        created_at: createdAt,
        user: mockUser,
      });

      const result = await createPetitionComment(
        "petition-1",
        "user-1",
        "Great petition",
      );

      expect(result).toEqual(
        expect.objectContaining({
          id: "comment-1",
          content: "Great petition",
          created_at: createdAt.toISOString(),
          user: {
            full_name: "Jane Doe",
            profile_photo: "photo.jpg",
            username: "jane",
          },
        }),
      );
    });
  });

  describe("updatePetitionComment", () => {
    it("updates a comment owned by the user", async () => {
      const createdAt = new Date("2024-06-01T12:00:00.000Z");
      mockPrisma.petition_comments.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.petition_comments.findUnique.mockResolvedValue({
        id: "comment-1",
        content: "Updated content",
        created_at: createdAt,
        user: mockUser,
      });

      const result = await updatePetitionComment(
        "comment-1",
        "user-1",
        "Updated content",
      );

      expect(result.content).toBe("Updated content");
      expect(result.user.full_name).toBe("Jane Doe");
    });

    it("throws when comment is not found or not owned by user", async () => {
      mockPrisma.petition_comments.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        updatePetitionComment("comment-1", "user-1", "Updated"),
      ).rejects.toThrow(
        "Comment not found or you don't have permission to edit it",
      );
    });
  });

  describe("deletePetitionComment", () => {
    it("deletes a comment owned by the user", async () => {
      mockPrisma.petition_comments.deleteMany.mockResolvedValue({ count: 1 });

      expect(await deletePetitionComment("comment-1", "user-1")).toBe(true);
    });

    it("throws when comment cannot be deleted", async () => {
      mockPrisma.petition_comments.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        deletePetitionComment("comment-1", "user-1"),
      ).rejects.toThrow(
        "Comment not found or you don't have permission to delete it",
      );
    });
  });

  describe("listPetitionComments", () => {
    it("returns top-level comments with reply counts", async () => {
      const createdAt = new Date("2024-06-01T12:00:00.000Z");
      mockPrisma.petition_comments.findMany.mockResolvedValue([
        {
          id: "comment-1",
          content: "Top level",
          created_at: createdAt,
          user: mockUser,
        },
      ]);
      mockPrisma.petition_comments.groupBy.mockResolvedValue([
        { parent_id: "comment-1", _count: { id: 2 } },
      ]);

      const result = await listPetitionComments("petition-1");

      expect(result).toEqual([
        expect.objectContaining({
          id: "comment-1",
          replies_count: 2,
          user: {
            full_name: "Jane Doe",
            profile_photo: "photo.jpg",
            username: "jane",
          },
        }),
      ]);
    });
  });

  describe("listRepliesForPetitionComment", () => {
    it("returns replies for a comment", async () => {
      const createdAt = new Date("2024-06-02T12:00:00.000Z");
      mockPrisma.petition_comments.findMany.mockResolvedValue([
        {
          id: "reply-1",
          content: "Reply",
          created_at: createdAt,
          user: mockUser,
        },
      ]);

      const result = await listRepliesForPetitionComment("comment-1");

      expect(result).toEqual([
        expect.objectContaining({
          id: "reply-1",
          created_at: createdAt.toISOString(),
        }),
      ]);
    });
  });
});
