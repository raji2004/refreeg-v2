import {
  deriveFullNameFromEmail,
  getPasswordErrors,
  isStrongPassword,
  normalizeRegistrationInput,
  validateRegistrationInput,
} from "@/lib/auth/registration";

describe("deriveFullNameFromEmail", () => {
  it("derives readable capitalized names from dotted emails", () => {
    expect(deriveFullNameFromEmail("john.doe@example.com")).toBe("John Doe");
    expect(deriveFullNameFromEmail("ada.lovelace@charity.org")).toBe("Ada Lovelace");
  });

  it("derives names from underscores and hyphens", () => {
    expect(deriveFullNameFromEmail("sandra_smith@domain.com")).toBe("Sandra Smith");
    expect(deriveFullNameFromEmail("david-miller@company.org")).toBe("David Miller");
  });

  it("capitalizes single-word usernames", () => {
    expect(deriveFullNameFromEmail("alex123@domain.com")).toBe("Alex123");
  });

  it("handles empty or invalid inputs gracefully", () => {
    expect(deriveFullNameFromEmail(null)).toBe("User");
    expect(deriveFullNameFromEmail("")).toBe("User");
    expect(deriveFullNameFromEmail("no-at-sign")).toBe("User");
  });
});

describe("streamlined registration validation", () => {
  it("accepts signup with only email and password (auto-deriving fullName)", () => {
    const input = normalizeRegistrationInput({
      accountType: "individual",
      email: "jane.doe@example.com",
      password: "Strong!Pass2026",
      confirmPassword: "Strong!Pass2026",
    });

    expect(input.fullName).toBe("Jane Doe");
    expect(validateRegistrationInput(input)).toEqual({});
  });

  it("accepts organization signup with only work email and password", () => {
    const input = normalizeRegistrationInput({
      accountType: "organization",
      email: "founder@myngo.org",
      password: "Strong!Pass2026",
      confirmPassword: "Strong!Pass2026",
    });

    expect(input.fullName).toBe("Founder");
    expect(validateRegistrationInput(input)).toEqual({});
  });

  it("preserves explicit fullName if supplied", () => {
    const input = normalizeRegistrationInput({
      accountType: "individual",
      fullName: "Custom Full Name",
      email: "user@example.com",
      password: "Strong!Pass2026",
      confirmPassword: "Strong!Pass2026",
    });

    expect(input.fullName).toBe("Custom Full Name");
    expect(validateRegistrationInput(input)).toEqual({});
  });

  it("reports missing email and password", () => {
    const errors = validateRegistrationInput({
      accountType: "individual",
      email: "",
      password: "",
    });

    expect(errors).toMatchObject({
      email: expect.any(String),
      password: expect.any(String),
    });
  });

  it("rejects invalid email and mismatched confirmation", () => {
    const errors = validateRegistrationInput({
      accountType: "individual",
      email: "not-an-email",
      password: "Strong!Pass2026",
      confirmPassword: "Different!Pass2026",
    });

    expect(errors.email).toBe("Enter a valid email address");
    expect(errors.confirmPassword).toBe("Passwords do not match");
  });

  it("enforces the full password policy", () => {
    expect(isStrongPassword("12345678")).toBe(false);
    expect(getPasswordErrors("12345678")).toEqual(
      expect.arrayContaining([
        "At least 10 characters",
        "One uppercase letter",
        "One lowercase letter",
        "One special character",
      ]),
    );
    expect(isStrongPassword("Strong!Pass2026")).toBe(true);
  });
});
