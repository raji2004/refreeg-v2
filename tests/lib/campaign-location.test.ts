/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    city: { findMany: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  resolveDeviceCampaignLocation,
  validateDeviceLocation,
} from "@/lib/locations/campaign-location";

const mockFindMany = prisma.city.findMany as jest.Mock;

describe("device campaign location", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects missing, stale, and imprecise location readings", () => {
    expect(() => validateDeviceLocation()).toThrow(
      "Use your current location",
    );
    expect(() =>
      validateDeviceLocation({
        latitude: 6.5244,
        longitude: 3.3792,
        accuracy: 50,
        capturedAt: Date.now() - 61 * 60 * 1000,
      }),
    ).toThrow("expired");
    expect(() =>
      validateDeviceLocation({
        latitude: 6.5244,
        longitude: 3.3792,
        accuracy: 25_000,
        capturedAt: Date.now(),
      }),
    ).toThrow("not precise enough");
  });

  it("uses the nearest database city instead of a browser-supplied label", async () => {
    mockFindMany.mockResolvedValue([
      {
        name: "Ibadan",
        state_name: "Oyo",
        country_name: "Nigeria",
        latitude: 7.3775,
        longitude: 3.947,
      },
      {
        name: "Lagos",
        state_name: "Lagos",
        country_name: "Nigeria",
        latitude: 6.5244,
        longitude: 3.3792,
      },
    ]);

    await expect(
      resolveDeviceCampaignLocation({
        latitude: 6.52,
        longitude: 3.38,
        accuracy: 30,
        capturedAt: Date.now(),
      }),
    ).resolves.toBe("Lagos, Lagos, Nigeria");
  });

  it("rejects a reading that cannot be matched to a supported city", async () => {
    mockFindMany.mockResolvedValue([]);

    await expect(
      resolveDeviceCampaignLocation({
        latitude: 0,
        longitude: 0,
        accuracy: 30,
        capturedAt: Date.now(),
      }),
    ).rejects.toThrow("supported city");
    expect(mockFindMany).toHaveBeenCalledTimes(3);
  });
});
