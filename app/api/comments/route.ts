import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";

function formatUser(user: { id: string; fullName: string | null; profilePhoto: string | null; username: string | null } | null | undefined) {
  if (!user) return null;
  return {
    id: user.id,
    full_name: user.fullName,
    profile_photo: user.profilePhoto,
    username: user.username,
  };
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { causeId, content, parentId, entityType } = await request.json();

  if (!causeId || !content || typeof content !== "string" || content.trim().length === 0 || content.length > 2000) {
    return NextResponse.json({ error: "Content must be provided and not exceed 2000 characters" }, { status: 400 });
  }

  try {
    const isPetition = entityType === "petition";
    const userId = session.user.id;

    if (isPetition) {
      const comment = await prisma.petition_comments.create({
        data: {
          petition_id: causeId,
          user_id: userId,
          content: content.trim(),
          parent_id: parentId || null,
          is_edited: false,
        },
      });
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, fullName: true, profilePhoto: true, username: true },
      });
      return NextResponse.json({ ...comment, user: formatUser(user) }, { status: 201 });
    } else {
      const comment = await prisma.comments.create({
        data: {
          cause_id: causeId,
          user_id: userId,
          content: content.trim(),
          parent_id: parentId || null,
          is_edited: false,
        },
        include: {
          user: { select: { id: true, fullName: true, profilePhoto: true, username: true } },
        },
      });
      const { user, ...rest } = comment;
      return NextResponse.json({ ...rest, user: formatUser(user) }, { status: 201 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create comment" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const causeId = searchParams.get("causeId");
  const entityType = searchParams.get("entityType");

  if (!causeId)
    return NextResponse.json({ error: "causeId required" }, { status: 400 });

  try {
    const isPetition = entityType === "petition";

    if (isPetition) {
      const comments = await prisma.petition_comments.findMany({
        where: { petition_id: causeId, parent_id: null },
        orderBy: { created_at: "desc" },
        take: 100,
      });
      const userIds = [...new Set(comments.map((c) => c.user_id))];
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, fullName: true, profilePhoto: true, username: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));
      const result = comments.map((c) => ({ ...c, user: formatUser(userMap.get(c.user_id)) }));
      return NextResponse.json(result);
    } else {
      const comments = await prisma.comments.findMany({
        where: { cause_id: causeId, parent_id: null },
        orderBy: { created_at: "desc" },
        take: 100,
        include: {
          user: { select: { id: true, fullName: true, profilePhoto: true, username: true } },
        },
      });
      const result = comments.map(({ user, ...rest }) => ({ ...rest, user: formatUser(user) }));
      return NextResponse.json(result);
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch comments" },
      { status: 500 }
    );
  }
}
