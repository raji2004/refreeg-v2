/**
 * @jest-environment node
 */

const mockCacheKeys: string[] = [];

jest.mock("next/cache", () => ({
  unstable_cache:
    (fn: (...args: any[]) => any) =>
    (...args: any[]) => {
      mockCacheKeys.push(args[0]);
      return fn(...args);
    },
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
}));

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

import {
  listDiscoverResults,
  countDiscoverResults,
  getDiscoverFacets,
} from "@/actions/discover-actions";
import {
  listCauses,
  countCauses,
  countCausesByCategory,
} from "@/actions/cause-actions";
import {
  listPetitions,
  countPetitions,
  countPetitionsByCategory,
} from "@/actions/petition-actions";

const mockListCauses = listCauses as jest.Mock;
const mockListPetitions = listPetitions as jest.Mock;

function cause(
  id: string,
  raised: number,
  goal = 100,
  createdAt = "2024-01-01",
) {
  return {
    id,
    title: id,
    image: null,
    profiles: { full_name: "Org", is_verified: true },
    goal,
    raised,
    end_date: null,
    location: null,
    paused: false,
    created_at: createdAt,
  };
}

describe("discover caching", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheKeys.length = 0;
    mockListPetitions.mockResolvedValue([]);
    (countCauses as jest.Mock).mockResolvedValue(3);
    (countPetitions as jest.Mock).mockResolvedValue(2);
    (countCausesByCategory as jest.Mock).mockResolvedValue({});
    (countPetitionsByCategory as jest.Mock).mockResolvedValue({});
  });

  it("does not split the cache by sort order", async () => {
    mockListCauses.mockResolvedValue([cause("a", 10), cause("b", 20)]);

    await listDiscoverResults(
      { category: "health", sortBy: "newest" },
      { limit: 10, offset: 0 },
    );
    await listDiscoverResults(
      { category: "health", sortBy: "most-given" },
      { limit: 10, offset: 0 },
    );

    expect(mockCacheKeys).toHaveLength(2);
    expect(mockCacheKeys[0]).toBe(mockCacheKeys[1]);
  });

  it("uses a different cache entry for a different category", async () => {
    mockListCauses.mockResolvedValue([]);

    await listDiscoverResults({ category: "health" }, { limit: 10, offset: 0 });
    await listDiscoverResults(
      { category: "education" },
      { limit: 10, offset: 0 },
    );

    expect(mockCacheKeys[0]).not.toBe(mockCacheKeys[1]);
  });

  it("bypasses the cache for free-text search", async () => {
    mockListCauses.mockResolvedValue([cause("a", 10)]);

    await listDiscoverResults({ search: "water" }, { limit: 10, offset: 0 });
    await countDiscoverResults({ search: "water" });
    await getDiscoverFacets({ search: "water" }, ["health"]);

    expect(mockCacheKeys).toHaveLength(0);
  });

  it("caches counts and facets when there is no search", async () => {
    await countDiscoverResults({ category: "health" });
    await getDiscoverFacets({}, ["health"]);

    expect(mockCacheKeys).toHaveLength(2);
  });

  it("pages from the capped set and reports whether more remain", async () => {
    mockListCauses.mockResolvedValue([
      cause("a", 5, 100, "2024-01-05"),
      cause("b", 5, 100, "2024-01-04"),
      cause("c", 5, 100, "2024-01-03"),
      cause("d", 5, 100, "2024-01-02"),
      cause("e", 5, 100, "2024-01-01"),
    ]);

    const page = await listDiscoverResults({}, { limit: 2, offset: 2 });

    expect(page.items.map((i) => i.id)).toEqual(["c", "d"]);
    expect(page.hasMore).toBe(true);
    expect(mockListCauses).toHaveBeenCalledTimes(1);
  });

  it("sorts by amount raised when asked", async () => {
    mockListCauses.mockResolvedValue([cause("low", 1), cause("high", 90)]);

    const page = await listDiscoverResults(
      { sortBy: "most-given" },
      { limit: 10, offset: 0 },
    );

    expect(page.items.map((i) => i.id)).toEqual(["high", "low"]);
  });

  it("keeps only near-goal items when nearGoalOnly is set", async () => {
    mockListCauses.mockResolvedValue([
      cause("near", 95),
      cause("far", 10),
      cause("done", 100),
    ]);

    const page = await listDiscoverResults(
      { nearGoalOnly: true },
      { limit: 10, offset: 0 },
    );

    expect(page.items.map((i) => i.id)).toEqual(["near"]);
  });
});
