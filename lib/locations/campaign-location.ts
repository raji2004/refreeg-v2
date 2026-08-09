import "server-only";

import { prisma } from "@/lib/prisma";

export type CampaignLocationSuggestion = {
  id: string;
  label: string;
  type: "city" | "state" | "country";
};

const joinPlaceParts = (parts: Array<string | null | undefined>) =>
  parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");

export async function searchCampaignLocations(
  input: string,
): Promise<CampaignLocationSuggestion[]> {
  const searchTerm = input.trim().split(",")[0]?.trim().slice(0, 80);
  if (!searchTerm || searchTerm.length < 2) return [];

  const [cities, states, countries] = await Promise.all([
    prisma.city.findMany({
      where: { name: { startsWith: searchTerm, mode: "insensitive" } },
      select: {
        id: true,
        name: true,
        state_name: true,
        country_name: true,
      },
      orderBy: { name: "asc" },
      take: 7,
    }),
    prisma.state.findMany({
      where: { name: { startsWith: searchTerm, mode: "insensitive" } },
      select: { id: true, name: true, country_name: true },
      orderBy: { name: "asc" },
      take: 4,
    }),
    prisma.country.findMany({
      where: { name: { startsWith: searchTerm, mode: "insensitive" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 3,
    }),
  ]);

  const suggestions: CampaignLocationSuggestion[] = [
    ...cities.map((city) => ({
      id: `city:${city.id.toString()}`,
      label: joinPlaceParts([city.name, city.state_name, city.country_name]),
      type: "city" as const,
    })),
    ...states.map((state) => ({
      id: `state:${state.id.toString()}`,
      label: joinPlaceParts([state.name, state.country_name]),
      type: "state" as const,
    })),
    ...countries.map((country) => ({
      id: `country:${country.id.toString()}`,
      label: joinPlaceParts([country.name]),
      type: "country" as const,
    })),
  ].filter((suggestion) => suggestion.label.length > 0);

  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    const key = suggestion.label.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function resolveCampaignLocation(input?: string | null) {
  const normalizedLocation = input?.trim();
  if (!normalizedLocation) {
    throw new Error("Campaign location is required");
  }
  if (normalizedLocation.length > 100) {
    throw new Error("Campaign location must be less than 100 characters");
  }

  const parts = normalizedLocation
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 3) {
    const city = await prisma.city.findFirst({
      where: {
        name: { equals: parts[0], mode: "insensitive" },
        state_name: { equals: parts[1], mode: "insensitive" },
        country_name: {
          equals: parts.slice(2).join(", "),
          mode: "insensitive",
        },
      },
      select: { name: true, state_name: true, country_name: true },
    });

    if (city) {
      return joinPlaceParts([city.name, city.state_name, city.country_name]);
    }
  }

  if (parts.length === 2) {
    const [city, state] = await Promise.all([
      prisma.city.findFirst({
        where: {
          name: { equals: parts[0], mode: "insensitive" },
          country_name: { equals: parts[1], mode: "insensitive" },
        },
        select: { name: true, state_name: true, country_name: true },
      }),
      prisma.state.findFirst({
        where: {
          name: { equals: parts[0], mode: "insensitive" },
          country_name: { equals: parts[1], mode: "insensitive" },
        },
        select: { name: true, country_name: true },
      }),
    ]);

    if (city) {
      return joinPlaceParts([city.name, city.state_name, city.country_name]);
    }
    if (state) return joinPlaceParts([state.name, state.country_name]);
  }

  if (parts.length === 1) {
    const country = await prisma.country.findFirst({
      where: { name: { equals: parts[0], mode: "insensitive" } },
      select: { name: true },
    });
    if (country?.name) return country.name;
  }

  return normalizedLocation;
}
