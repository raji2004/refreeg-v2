import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get("parentId");
  const entityType = searchParams.get("entityType");

  if (!parentId) {
    return NextResponse.json({ error: "parentId required" }, { status: 400 });
  }

  try {
    const isPetition = entityType === "petition";

    if (isPetition) {
      // Fetch petition comment replies
      const replies = await prisma.petition_comments.findMany({
        where: { parent_id: parentId },
        orderBy: { created_at: "asc" },
        take: 100,
        include: {
          user: {
            select: { id: true, fullName: true, profilePhoto: true, username: true },
          },
        },
      });

      // Fetch nested reply counts in one query
      const replyIds = replies.map((r) => r.id);
      const nestedCounts = await prisma.petition_comments.groupBy({
        by: ["parent_id"],
        where: { parent_id: { in: replyIds } },
        _count: { id: true },
      });

      const countsMap: Record<string, number> = {};
      for (const c of nestedCounts) {
        if (c.parent_id) countsMap[c.parent_id] = c._count.id;
      }

      const repliesWithCounts = replies.map((reply) => ({
        ...reply,
        // Map Prisma field names to the frontend's expected shape
        user: reply.user
          ? {
              id: reply.user.id,
              full_name: reply.user.fullName,
              profile_photo: reply.user.profilePhoto,
              username: reply.user.username,
            }
          : null,
        replies_count: countsMap[reply.id] || 0,
      }));

      return NextResponse.json(repliesWithCounts);
    } else {
      // Fetch cause comment replies
      const replies = await prisma.comments.findMany({
        where: { parent_id: parentId },
        orderBy: { created_at: "asc" },
        take: 100,
        include: {
          user: {
            select: { id: true, fullName: true, profilePhoto: true, username: true },
          },
        },
      });

      // Fetch nested reply counts in one query
      const replyIds = replies.map((r) => r.id);
      const nestedCounts = await prisma.comments.groupBy({
        by: ["parent_id"],
        where: { parent_id: { in: replyIds } },
        _count: { id: true },
      });

      const countsMap: Record<string, number> = {};
      for (const c of nestedCounts) {
        if (c.parent_id) countsMap[c.parent_id] = c._count.id;
      }

      const repliesWithCounts = replies.map((reply) => ({
        ...reply,
        // Map Prisma field names to the frontend's expected shape
        user: reply.user
          ? {
              id: reply.user.id,
              full_name: reply.user.fullName,
              profile_photo: reply.user.profilePhoto,
              username: reply.user.username,
            }
          : null,
        replies_count: countsMap[reply.id] || 0,
      }));

      return NextResponse.json(repliesWithCounts);
    }
  } catch (error) {
    console.error("Failed to fetch replies:", error);
    return NextResponse.json(
      { error: "Failed to fetch replies" },
      { status: 500 }
    );
  }
}
