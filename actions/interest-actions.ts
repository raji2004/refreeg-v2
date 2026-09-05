"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { countCauses, listCauses } from "@/actions/cause-actions";
import { interestOptions } from "@/lib/interest-categories";
import type { Cause } from "@/types/cause-types";

export interface InterestOptionWithCount {
  id: string;
  label: string;
  /** Live count for tiles backed by a real cause category; null when there's no mapping yet. */
  count: number | null;
}

export async function getInterestOptions(): Promise<InterestOptionWithCount[]> {
  return Promise.all(
    interestOptions.map(async (option) => ({
      id: option.id,
      label: option.label,
      count: option.campaignCategoryId
        ? await countCauses({ category: option.campaignCategoryId })
        : null,
    })),
  );
}

/**
 * Causes matching the user's picked interests, for the dashboard's
 * matched-campaigns row. Only interests with a real campaign-category
 * mapping (see lib/interest-categories.ts) can match anything.
 */
export async function getMatchedCauses(
  interests: string[],
  limit = 6,
): Promise<Cause[]> {
  const categoryIds = interestOptions
    .filter((o) => interests.includes(o.id) && o.campaignCategoryId)
    .map((o) => o.campaignCategoryId!);

  if (categoryIds.length === 0) return [];

  const results = await Promise.all(
    categoryIds.map((category) => listCauses({ category, limit })),
  );

  const seen = new Set<string>();
  const merged: Cause[] = [];
  for (const cause of results.flat()) {
    if (seen.has(cause.id)) continue;
    seen.add(cause.id);
    merged.push(cause);
  }

  return merged.slice(0, limit);
}

/** Total count behind getMatchedCauses, for a "See all N" link — causes only ever have one category, so summing per-category counts can't double-count. */
export async function getMatchedCausesCount(interests: string[]): Promise<number> {
  const categoryIds = interestOptions
    .filter((o) => interests.includes(o.id) && o.campaignCategoryId)
    .map((o) => o.campaignCategoryId!);

  if (categoryIds.length === 0) return 0;

  const counts = await Promise.all(
    categoryIds.map((category) => countCauses({ category })),
  );
  return counts.reduce((sum, n) => sum + n, 0);
}

export async function saveUserInterests(
  userId: string,
  data: { interests: string[]; location?: string },
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      interests: data.interests,
      interest_location: data.location || null,
    },
  });

  revalidatePath("/dashboard");
}
