import {
  DOB_INVALID_ERROR_MESSAGE,
  DOB_UNDERAGE_ERROR_MESSAGE,
  FULL_NAME_ERROR_MESSAGE,
  formatOnboardingLocation,
  parseDobInput,
  splitFullName,
  validateOnboardingDob,
  validateOnboardingFullName,
} from "@/lib/onboarding/validation";

describe("lib/onboarding/validation", () => {
  describe("splitFullName & validateOnboardingFullName", () => {
    it("splits first and last name cleanly", () => {
      expect(splitFullName("  Amina   Bello  ")).toEqual({
        firstName: "Amina",
        lastName: "Bello",
        fullName: "Amina Bello",
      });
      expect(splitFullName("Chidi Obi Okonkwo")).toEqual({
        firstName: "Chidi",
        lastName: "Obi Okonkwo",
        fullName: "Chidi Obi Okonkwo",
      });
    });

    it("rejects empty or single-word names with Figma error message", () => {
      expect(validateOnboardingFullName("")).toBe(FULL_NAME_ERROR_MESSAGE);
      expect(validateOnboardingFullName("Amina")).toBe(FULL_NAME_ERROR_MESSAGE);
      expect(validateOnboardingFullName("A B")).toBe(FULL_NAME_ERROR_MESSAGE);
    });

    it("accepts valid two-part or multi-part names", () => {
      expect(validateOnboardingFullName("Amina Bello")).toBeNull();
      expect(validateOnboardingFullName("Ngozi Okonjo-Iweala")).toBeNull();
    });
  });

  describe("parseDobInput & validateOnboardingDob", () => {
    const refDate = new Date("2026-11-09T00:00:00.000Z");

    it("parses DD/MM/YYYY and YYYY-MM-DD formats", () => {
      expect(parseDobInput("15 / 06 / 1998")?.toISOString()).toContain(
        "1998-06-15",
      );
      expect(parseDobInput("1998-06-15")?.toISOString()).toContain(
        "1998-06-15",
      );
      expect(parseDobInput("31/02/2000")).toBeNull();
    });

    it("enforces age >= 18", () => {
      expect(validateOnboardingDob("09/11/2008", refDate)).toBeNull(); // Exactly 18
      expect(validateOnboardingDob("10/11/2008", refDate)).toBe(
        DOB_UNDERAGE_ERROR_MESSAGE,
      ); // 17 years 364 days
      expect(validateOnboardingDob("01/05/2012", refDate)).toBe(
        DOB_UNDERAGE_ERROR_MESSAGE,
      );
    });

    it("rejects malformed or future dates", () => {
      expect(validateOnboardingDob("", refDate)).toBe(DOB_INVALID_ERROR_MESSAGE);
      expect(validateOnboardingDob("not-a-date", refDate)).toBe(
        DOB_INVALID_ERROR_MESSAGE,
      );
      expect(validateOnboardingDob("01/01/2030", refDate)).toBe(
        DOB_INVALID_ERROR_MESSAGE,
      );
    });
  });

  describe("formatOnboardingLocation", () => {
    it("combines city and state when both exist", () => {
      expect(
        formatOnboardingLocation({
          city: "Yaba",
          state: "Lagos",
          country: "Nigeria",
        }),
      ).toBe("Yaba, Lagos");
    });

    it("falls back to state when city is empty", () => {
      expect(
        formatOnboardingLocation({
          city: "",
          state: "Lagos",
          country: "Nigeria",
        }),
      ).toBe("Lagos");
    });
  });
});
