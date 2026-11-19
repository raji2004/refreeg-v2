"use server";

import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const MAX_LISTS = 20;
const MAX_NAME = 40;
const MAX_BATCH = 200;
const DEFAULT_COLOR = "#0D1E16";

async function requireUserId() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Unauthorized");
  return id;
}

function countBookmarks(userId: string) {
  return prisma.bookmark.count({ where: { user_id: userId } });
}

export type ToggleBookmarkResult = { saved: boolean; count: number };

export async function toggleBookmark(
  targetId: string,
  targetType: "cause" | "petition",
): Promise<ToggleBookmarkResult> {
  const userId = await requireUserId();
  if (targetType !== "cause" && targetType !== "petition") {
    throw new Error("Invalid target type");
  }

  const removed = await prisma.bookmark.deleteMany({
    where: { user_id: userId, target_id: targetId, target_type: targetType },
  });
  if (removed.count > 0) {
    return { saved: false, count: await countBookmarks(userId) };
  }

  const target =
    targetType === "cause"
      ? await prisma.cause.findUnique({
          where: { id: targetId },
          select: { id: true },
        })
      : await prisma.petitions.findUnique({
          where: { id: targetId },
          select: { id: true },
        });
  if (!target) throw new Error("Not found");

  try {
    await prisma.bookmark.create({
      data: { user_id: userId, target_id: targetId, target_type: targetType },
    });
  } catch (err) {
    if (!(
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    )) {
      throw err;
    }
  }
  return { saved: true, count: await countBookmarks(userId) };
}

type CreateListResult =
  | { ok: true; list: { id: string; name: string; color: string } }
  | { ok: false; error: string };

export async function createList(
  name: string,
  color?: string,
): Promise<CreateListResult> {
  const userId = await requireUserId();

  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) return { ok: false, error: "Give the list a name" };
  if (clean.length > MAX_NAME) {
    return { ok: false, error: `Keep it under ${MAX_NAME} characters` };
  }

  const [count, duplicate] = await Promise.all([
    prisma.savedList.count({ where: { user_id: userId } }),
    prisma.savedList.findFirst({
      where: { user_id: userId, name: { equals: clean, mode: "insensitive" } },
      select: { id: true },
    }),
  ]);
  if (duplicate) return { ok: false, error: "You already have that list" };
  if (count >= MAX_LISTS) {
    return { ok: false, error: `You can keep up to ${MAX_LISTS} lists` };
  }

  const list = await prisma.savedList.create({
    data: {
      user_id: userId,
      name: clean,
      color: color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : DEFAULT_COLOR,
    },
    select: { id: true, name: true, color: true },
  });
  revalidatePath("/dashboard/saved");
  return { ok: true, list };
}

export async function renameList(
  listId: string,
  name: string,
): Promise<CreateListResult> {
  const userId = await requireUserId();

  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) return { ok: false, error: "Give the list a name" };
  if (clean.length > MAX_NAME) {
    return { ok: false, error: `Keep it under ${MAX_NAME} characters` };
  }

  const [owned, duplicate] = await Promise.all([
    prisma.savedList.findFirst({
      where: { id: listId, user_id: userId },
      select: { id: true },
    }),
    prisma.savedList.findFirst({
      where: {
        user_id: userId,
        name: { equals: clean, mode: "insensitive" },
        id: { not: listId },
      },
      select: { id: true },
    }),
  ]);
  if (!owned) return { ok: false, error: "That list no longer exists" };
  if (duplicate) return { ok: false, error: "You already have that list" };

  const list = await prisma.savedList.update({
    where: { id: listId },
    data: { name: clean },
    select: { id: true, name: true, color: true },
  });
  revalidatePath("/dashboard/saved");
  return { ok: true, list };
}

export async function deleteList(
  listId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();

  const removed = await prisma.savedList.deleteMany({
    where: { id: listId, user_id: userId },
  });
  if (removed.count === 0) {
    return { ok: false, error: "That list no longer exists" };
  }

  revalidatePath("/dashboard/saved");
  return { ok: true };
}

export async function moveBookmarksToList(
  bookmarkIds: string[],
  listId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  if (bookmarkIds.length === 0 || bookmarkIds.length > MAX_BATCH) {
    return { ok: false, error: "Nothing to move" };
  }

  if (listId) {
    const owned = await prisma.savedList.findFirst({
      where: { id: listId, user_id: userId },
      select: { id: true },
    });
    if (!owned) return { ok: false, error: "That list no longer exists" };
  }

  await prisma.bookmark.updateMany({
    where: { id: { in: bookmarkIds }, user_id: userId },
    data: { list_id: listId },
  });
  revalidatePath("/dashboard/saved");
  return { ok: true };
}

export async function removeBookmarks(
  ids: string[],
): Promise<{ count: number | null }> {
  const userId = await requireUserId();
  if (ids.length === 0 || ids.length > MAX_BATCH) return { count: null };

  await prisma.bookmark.deleteMany({
    where: { id: { in: ids }, user_id: userId },
  });
  revalidatePath("/dashboard/saved");
  return { count: await countBookmarks(userId) };
}

export async function updateAlertPrefs(prefs: {
  closing_3d?: boolean;
  reached_80pct?: boolean;
  delivered?: boolean;
  weekly_digest?: boolean;
}) {
  const userId = await requireUserId();

  const data = {
    closing_3d: prefs.closing_3d,
    reached_80pct: prefs.reached_80pct,
    delivered: prefs.delivered,
    weekly_digest: prefs.weekly_digest,
  };
  await prisma.userAlertPrefs.upsert({
    where: { user_id: userId },
    update: { ...data, updated_at: new Date() },
    create: { user_id: userId, ...data },
  });
  revalidatePath("/dashboard/saved");
}

export async function listBookmarkedIds(): Promise<string[]> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return [];

  const rows = await prisma.bookmark.findMany({
    where: { user_id: userId },
    select: { target_id: true },
  });

  return rows.map((r) => r.target_id);
}

export async function listBookmarkedKeys(): Promise<string[]> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return [];

  const rows = await prisma.bookmark.findMany({
    where: { user_id: userId },
    select: { target_id: true, target_type: true },
  });

  return rows.map((r) => `${r.target_type}:${r.target_id}`);
}
