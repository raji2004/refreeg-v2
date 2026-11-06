import {
  countWord,
  filterChips,
  filterSummary,
  formatNairaShort,
  noneClause,
  withoutChip,
} from "@/lib/discover-summary";

describe("discover summary", () => {
  it("formats naira compactly from a million up", () => {
    expect(formatNairaShort(12_400_000)).toBe("₦12.4M");
    expect(formatNairaShort(20_000_000)).toBe("₦20M");
    expect(formatNairaShort(450_000)).toBe("₦450,000");
  });

  it("builds one chip per category plus the other filters", () => {
    expect(
      filterChips({
        categories: ["education", "disaster"],
        location: "Lagos",
        maxAmountNeeded: 2_000_000,
      }).map((c) => c.label),
    ).toEqual(["Education", "Disaster Relief", "Lagos", "Under ₦2M to go"]);
  });

  it("summarises causes and location as a phrase", () => {
    expect(
      filterSummary({
        categories: ["education", "disaster"],
        location: "Lagos",
      }),
    ).toBe("Education and disaster relief in Lagos");
    expect(filterSummary({ urgentOnly: true })).toBe("All causes · urgent");
  });

  it("describes what the other filters ruled out", () => {
    expect(
      noneClause({
        categories: ["water"],
        location: "Kano",
        urgentOnly: true,
      }),
    ).toBe("in Kano marked urgent");
  });

  it("removes one category chip without dropping the others", () => {
    const next = withoutChip(
      { categories: ["education", "health"], location: "Lagos" },
      { key: "categories", value: "education" },
    );
    expect(next).toEqual({ categories: ["health"], location: "Lagos" });

    expect(
      withoutChip(
        { minAmountNeeded: 1, maxAmountNeeded: 2 },
        { key: "amount" },
      ),
    ).toEqual({});
  });

  it("spells out small filter counts", () => {
    expect(countWord(4)).toBe("four");
    expect(countWord(12)).toBe("12");
  });
});
