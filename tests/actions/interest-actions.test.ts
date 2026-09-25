/**
 * @jest-environment node
 */

jest.mock("@/lib/prisma", () => ({
  prisma: { user: { update: jest.fn() } },
}));

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

jest.mock("@/actions/cause-actions", () => ({
  listCauses: jest.fn(),
  countCauses: jest.fn(),
  countCausesByCategory: jest.fn(),
}));

import {
  getInterestOptions,
  getMatchedCauses,
  getMatchedCausesCount,
} from "@/actions/interest-actions";
import {
  listCauses,
  countCauses,
  countCausesByCategory,
} from "@/actions/cause-actions";

const mockListCauses = listCauses as jest.Mock;
const mockCountByCategory = countCausesByCategory as jest.Mock;

describe("interest-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCountByCategory.mockResolvedValue({
      education: 7,
      health: 3,
      disaster: 2,
    });
  });

  describe("getInterestOptions", () => {
    it("fills every interest count from a single grouped query", async () => {
      const options = await getInterestOptions();

      expect(mockCountByCategory).toHaveBeenCalledTimes(1);
      expect(countCauses).not.toHaveBeenCalled();
      expect(options.find((o) => o.id === "education")?.count).toBe(7);
      expect(options.find((o) => o.id === "disaster-relief")?.count).toBe(2);
    });

    it("keeps count null for interests with no campaign category", async () => {
      const options = await getInterestOptions();

      const uncategorised = options.filter((o) => o.count === null);
      expect(uncategorised.length).toBeGreaterThan(0);
    });
  });

  describe("getMatchedCausesCount", () => {
    it("sums the selected categories from one grouped query", async () => {
      const total = await getMatchedCausesCount(["education", "health"]);

      expect(total).toBe(10);
      expect(mockCountByCategory).toHaveBeenCalledTimes(1);
      expect(countCauses).not.toHaveBeenCalled();
    });

    it("skips the query when no interest maps to a category", async () => {
      expect(await getMatchedCausesCount([])).toBe(0);
      expect(mockCountByCategory).not.toHaveBeenCalled();
    });
  });

  describe("getMatchedCauses", () => {
    it("lists causes for all selected categories in one query", async () => {
      mockListCauses.mockResolvedValue([{ id: "cause-1" }]);

      const result = await getMatchedCauses(["education", "health"], 4);

      expect(result).toEqual([{ id: "cause-1" }]);
      expect(mockListCauses).toHaveBeenCalledTimes(1);
      expect(mockListCauses).toHaveBeenCalledWith({
        categories: ["education", "health"],
        limit: 4,
      });
    });

    it("returns nothing without querying when no interest maps to a category", async () => {
      expect(await getMatchedCauses([], 4)).toEqual([]);
      expect(mockListCauses).not.toHaveBeenCalled();
    });
  });
});
