import {
  formatFundingGoalInput,
  normalizeFundingGoalInput,
} from "@/lib/funding-goal";

describe("funding goal input", () => {
  it("adds thousands separators without changing the stored value", () => {
    expect(formatFundingGoalInput("70000000")).toBe("70,000,000");
    expect(formatFundingGoalInput("1250000.50")).toBe("1,250,000.50");
    expect(formatFundingGoalInput(5000)).toBe("5,000");
  });

  it("removes separators before saving", () => {
    expect(normalizeFundingGoalInput("70,000,000")).toBe("70000000");
    expect(normalizeFundingGoalInput("1,250.50")).toBe("1250.50");
  });

  it("rejects non-numeric and over-precision input", () => {
    expect(normalizeFundingGoalInput("1e6")).toBeNull();
    expect(normalizeFundingGoalInput("100.999")).toBeNull();
  });
});
