import {
  cn,
  formatCurrency,
  calculateServiceFee,
  getBaseURL,
  calculateProviderFee,
} from "@/lib/utils";

describe("lib/utils", () => {
  it("merges class names with tailwind precedence", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("formats currency in NGN", () => {
    expect(formatCurrency(1000)).toContain("1,000");
    expect(formatCurrency(1000)).toContain("₦");
  });

  it("calculates service fee from env percentage with cap", () => {
    const original = process.env.NEXT_PUBLIC_REFREEG_SERVICE_FEE;
    process.env.NEXT_PUBLIC_REFREEG_SERVICE_FEE = "2";

    expect(calculateServiceFee(1000)).toBe(20);
    expect(calculateServiceFee(1_000_000)).toBe(10_000);

    process.env.NEXT_PUBLIC_REFREEG_SERVICE_FEE = original;
  });

  it("returns configured base URL", () => {
    const original = process.env.NEXT_PUBLIC_BASE_URL;
    process.env.NEXT_PUBLIC_BASE_URL = "https://apps.refreeg.com";

    expect(getBaseURL()).toBe("https://apps.refreeg.com");

    process.env.NEXT_PUBLIC_BASE_URL = original;
  });

  it("falls back to localhost when base URL is unset", () => {
    const original = process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.NEXT_PUBLIC_BASE_URL;

    expect(getBaseURL()).toBe("http://localhost:3000");

    process.env.NEXT_PUBLIC_BASE_URL = original;
  });

  it("adds a https:// scheme when the configured base URL is missing one", () => {
    const original = process.env.NEXT_PUBLIC_BASE_URL;
    process.env.NEXT_PUBLIC_BASE_URL = "apps.refreeg.com";

    expect(getBaseURL()).toBe("https://apps.refreeg.com");

    process.env.NEXT_PUBLIC_BASE_URL = original;
  });

  it("returns zero fee when service fee percentage is unset", () => {
    const original = process.env.NEXT_PUBLIC_REFREEG_SERVICE_FEE;
    delete process.env.NEXT_PUBLIC_REFREEG_SERVICE_FEE;

    expect(calculateServiceFee(10_000)).toBe(0);

    process.env.NEXT_PUBLIC_REFREEG_SERVICE_FEE = original;
  });

  it("returns zero fee when donation amount is zero", () => {
    const original = process.env.NEXT_PUBLIC_REFREEG_SERVICE_FEE;
    process.env.NEXT_PUBLIC_REFREEG_SERVICE_FEE = "2";

    expect(calculateServiceFee(0)).toBe(0);

    process.env.NEXT_PUBLIC_REFREEG_SERVICE_FEE = original;
  });

  describe("calculateProviderFee", () => {
    it("grosses up the Flutterwave fee so the creator receives the full amount", () => {
      // Total = Amount / 0.986, fee = ceil(Total - Amount)
      expect(calculateProviderFee(10_000, "flutterwave")).toBe(
        Math.ceil(10_000 / 0.986 - 10_000),
      );
    });

    it("calculates the Paystack fee as 1.5% with no flat fee under ₦2,500", () => {
      expect(calculateProviderFee(1000, "paystack")).toBe(15);
    });

    it("adds the ₦100 flat fee for Paystack amounts over ₦2,500", () => {
      // 1.5% of 5000 = 75, + 100 flat = 175
      expect(calculateProviderFee(5000, "paystack")).toBe(175);
    });

    it("defaults to Paystack when no provider is given", () => {
      expect(calculateProviderFee(1000)).toBe(15);
    });

    it("caps the Paystack fee at ₦2,000", () => {
      expect(calculateProviderFee(1_000_000, "paystack")).toBe(2000);
    });
  });
});
