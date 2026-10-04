"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { countCausesByCategory, listCauses } from "@/actions/cause-actions";
import { interestOptions } from "@/lib/interest-categories";
import type { Cause } from "@/types/cause-types";

export interface InterestOptionWithCount {
  id: string;
  label: string;

  count: number | null;
}

export async function getInterestOptions(): Promise<InterestOptionWithCount[]> {
  const countsByCategory = await countCausesByCategory();

  return interestOptions.map((option) => ({
    id: option.id,
    label: option.label,
    count: option.campaignCategoryId
      ? (countsByCategory[option.campaignCategoryId] ?? 0)
      : null,
  }));
}

function categoryIdsForInterests(interests: string[]): string[] {
  return [
    ...new Set(
      interestOptions
        .filter((o) => interests.includes(o.id) && o.campaignCategoryId)
        .map((o) => o.campaignCategoryId!),
    ),
  ];
}

export async function getMatchedCauses(
  interests: string[],
  limit = 6,
): Promise<Cause[]> {
  const categoryIds = categoryIdsForInterests(interests);

  if (categoryIds.length === 0) return [];

  return listCauses({ categories: categoryIds, limit });
}

export async function getMatchedCausesCount(
  interests: string[],
): Promise<number> {
  const categoryIds = categoryIdsForInterests(interests);

  if (categoryIds.length === 0) return 0;

  const countsByCategory = await countCausesByCategory();
  return categoryIds.reduce((sum, id) => sum + (countsByCategory[id] ?? 0), 0);
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
