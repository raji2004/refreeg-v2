/**
 * @jest-environment node
 */

jest.mock("@/actions/cause-actions", () => ({
  listCauses: jest.fn(),
  countCauses: jest.fn(),
  countCausesByCategory: jest.fn(),
}));

jest.mock("@/actions/petition-actions", () => ({
  listPetitions: jest.fn(),
  countPetitions: jest.fn(),
  countPetitionsByCategory: jest.fn(),
}));

jest.mock("@/actions/organization-actions", () => ({
  searchOrganizations: jest.fn(),
}));

import { getDiscoverFacets } from "@/actions/discover-actions";
import { countCausesByCategory, countCauses } from "@/actions/cause-actions";
import {
  countPetitionsByCategory,
  countPetitions,
} from "@/actions/petition-actions";

const causeCounts = countCausesByCategory as jest.Mock;
const petitionCounts = countPetitionsByCategory as jest.Mock;

describe("getDiscoverFacets", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    causeCounts.mockResolvedValue({ health: 3, education: 1 });
    petitionCounts.mockResolvedValue({ health: 2, environment: 4 });
  });

  it("sums cause and petition counts per category and zero-fills the rest", async () => {
    const facets = await getDiscoverFacets({}, [
      "health",
      "education",
      "environment",
      "arts",
    ]);

    expect(facets).toEqual([
      { category: "health", count: 5 },
      { category: "education", count: 1 },
      { category: "environment", count: 4 },
      { category: "arts", count: 0 },
    ]);
  });

  it("runs one grouped query per content type, not one per category", async () => {
    await getDiscoverFacets({}, ["a", "b", "c", "d", "e", "f"]);

    expect(causeCounts).toHaveBeenCalledTimes(1);
    expect(petitionCounts).toHaveBeenCalledTimes(1);
    expect(countCauses).not.toHaveBeenCalled();
    expect(countPetitions).not.toHaveBeenCalled();
  });

  it("passes cause and petition filters through without a category", async () => {
    await getDiscoverFacets(
      {
        search: "water",
        location: "Lagos",
        urgentOnly: true,
        verifiedOnly: true,
        minAmountNeeded: 100,
        maxAmountNeeded: 900,
      },
      ["health"],
    );

    expect(causeCounts).toHaveBeenCalledWith({
      search: "water",
      location: "Lagos",
      urgentOnly: true,
      verifiedOnly: true,
      minAmountNeeded: 100,
      maxAmountNeeded: 900,
    });
    expect(petitionCounts).toHaveBeenCalledWith({
      search: "water",
      verifiedOnly: true,
    });
  });

  it("skips petitions when only campaigns are included", async () => {
    const facets = await getDiscoverFacets({ includeType: "campaigns" }, [
      "health",
    ]);

    expect(petitionCounts).not.toHaveBeenCalled();
    expect(facets).toEqual([{ category: "health", count: 3 }]);
  });

  it("skips causes when only petitions are included", async () => {
    const facets = await getDiscoverFacets({ includeType: "petitions" }, [
      "health",
    ]);

    expect(causeCounts).not.toHaveBeenCalled();
    expect(facets).toEqual([{ category: "health", count: 2 }]);
  });
});
