"use server";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type BookmarkTargetType = "cause" | "petition";

export async function toggleBookmark(input: {
  targetType: BookmarkTargetType;
  targetId: string;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { data: null, error: "Sign in to save campaigns and petitions." };
  }

  const existing = await prisma.bookmarks.findUnique({
    where: {
      user_id_target_type_target_id: {
        user_id: userId,
        target_type: input.targetType,
        target_id: input.targetId,
      },
    },
  });

  if (existing) {
    await prisma.bookmarks.delete({ where: { id: existing.id } });
    revalidatePath("/causes");
    return { data: { bookmarked: false }, error: null };
  }

  await prisma.bookmarks.create({
    data: {
      user_id: userId,
      target_type: input.targetType,
      target_id: input.targetId,
    },
  });
  revalidatePath("/causes");
  return { data: { bookmarked: true }, error: null };
}

export async function listBookmarkedIds(): Promise<
  { targetType: BookmarkTargetType; targetId: string }[]
> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return [];

  const rows = await prisma.bookmarks.findMany({
    where: { user_id: userId },
    select: { target_type: true, target_id: true },
  });

  return rows.map((r) => ({
    targetType: r.target_type as BookmarkTargetType,
    targetId: r.target_id,
  }));
}

export async function listUserBookmarks() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { causes: [], petitions: [] };

  const rows = await prisma.bookmarks.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
  });

  const causeIds = rows
    .filter((r) => r.target_type === "cause")
    .map((r) => r.target_id);
  const petitionIds = rows
    .filter((r) => r.target_type === "petition")
    .map((r) => r.target_id);

  const [causes, petitions] = await Promise.all([
    causeIds.length
      ? prisma.cause.findMany({ where: { id: { in: causeIds } } })
      : Promise.resolve([]),
    petitionIds.length
      ? prisma.petitions.findMany({ where: { id: { in: petitionIds } } })
      : Promise.resolve([]),
  ]);

  return { causes, petitions };
}
