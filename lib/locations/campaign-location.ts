import "server-only";

import { prisma } from "@/lib/prisma";
import type { DeviceLocation } from "@/types/cause-types";

export type CampaignLocationSuggestion = {
  id: string;
  label: string;
  type: "city" | "state" | "country";
};

const MAX_DEVICE_LOCATION_ACCURACY_METERS = 20_000;
const MAX_DEVICE_LOCATION_AGE_MS = 60 * 60 * 1000;
const MAX_NEAREST_CITY_DISTANCE_KM = 250;

export class DeviceLocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeviceLocationError";
  }
}

const joinPlaceParts = (parts: Array<string | null | undefined>) =>
  parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const distanceInKilometers = (
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) => {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(latitudeB - latitudeA);
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const startLatitude = toRadians(latitudeA);
  const endLatitude = toRadians(latitudeB);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  const normalizedHaversine = Math.min(1, Math.max(0, haversine));
  return (
    2 *
    earthRadiusKm *
    Math.atan2(
      Math.sqrt(normalizedHaversine),
      Math.sqrt(1 - normalizedHaversine),
    )
  );
};

export function validateDeviceLocation(
  deviceLocation?: DeviceLocation | null,
): DeviceLocation {
  if (!deviceLocation) {
    throw new DeviceLocationError(
      "Use your current location before creating this cause",
    );
  }

  const { latitude, longitude, accuracy, capturedAt } = deviceLocation;
  if (
    ![latitude, longitude, accuracy, capturedAt].every((value) =>
      Number.isFinite(value),
    ) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new DeviceLocationError(
      "The device location is invalid. Please try again",
    );
  }

  if (accuracy < 0 || accuracy > MAX_DEVICE_LOCATION_ACCURACY_METERS) {
    throw new DeviceLocationError(
      "Your location is not precise enough to verify. Move near a window and try again",
    );
  }

  const age = Date.now() - capturedAt;
  if (age < -60_000 || age > MAX_DEVICE_LOCATION_AGE_MS) {
    throw new DeviceLocationError(
      "Your location check has expired. Please verify it again",
    );
  }

  return deviceLocation;
}

export async function resolveDeviceCampaignLocation(
  input?: DeviceLocation | null,
) {
  const { latitude, longitude } = validateDeviceLocation(input);

  type CityCandidate = {
    name: string | null;
    state_name: string | null;
    country_name: string | null;
    latitude: number | null;
    longitude: number | null;
  };

  const findCandidates = (radius: number) =>
    prisma.city.findMany({
      where: {
        latitude: { gte: latitude - radius, lte: latitude + radius },
        longitude: { gte: longitude - radius, lte: longitude + radius },
      },
      select: {
        name: true,
        state_name: true,
        country_name: true,
        latitude: true,
        longitude: true,
      },
      take: 5000,
    }) as Promise<CityCandidate[]>;

  let candidates = await findCandidates(0.5);
  if (candidates.length === 0) candidates = await findCandidates(2);
  if (candidates.length === 0) candidates = await findCandidates(5);

  const nearest = candidates
    .filter(
      (city): city is CityCandidate & {
        latitude: number;
        longitude: number;
      } => city.latitude !== null && city.longitude !== null,
    )
    .map((city) => ({
      city,
      distance: distanceInKilometers(
        latitude,
        longitude,
        city.latitude,
        city.longitude,
      ),
    }))
    .sort((a, b) => a.distance - b.distance)[0];

  if (!nearest || nearest.distance > MAX_NEAREST_CITY_DISTANCE_KM) {
    throw new DeviceLocationError(
      "We could not match your current position to a supported city. Please try again",
    );
  }

  const label = joinPlaceParts([
    nearest.city.name,
    nearest.city.state_name,
    nearest.city.country_name,
  ]);
  if (!label) {
    throw new DeviceLocationError(
      "We could not identify your current location",
    );
  }

  return label;
}

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
