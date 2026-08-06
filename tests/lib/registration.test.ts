import {
  getPasswordErrors,
  isStrongPassword,
  normalizeRegistrationInput,
  validateRegistrationInput,
} from "@/lib/auth/registration";

describe("organization registration validation", () => {
  const validOrganization = {
    accountType: "organization" as const,
    fullName: "Ada Lovelace",
    email: "ADMIN@EXAMPLE.ORG ",
    password: "Strong!Pass2026",
    confirmPassword: "Strong!Pass2026",
    organizationName: "Hope & Health Initiative (QA)",
    organizationPhone: "+234 801 234 5678",
    organizationAddress: "12 Unity Road, Lagos",
    organizationIndustry: "Public Health",
  };

  it("accepts complete organization details including special characters", () => {
    const input = normalizeRegistrationInput(validOrganization);

    expect(validateRegistrationInput(input)).toEqual({});
    expect(input.email).toBe("admin@example.org");
    expect(input.organizationName).toBe("Hope & Health Initiative (QA)");
  });

  it("reports every missing organization field", () => {
    const errors = validateRegistrationInput({
      ...validOrganization,
      fullName: "",
      email: "",
      organizationName: "",
      organizationPhone: "",
      organizationAddress: "",
      organizationIndustry: "",
    });

    expect(errors).toMatchObject({
      fullName: expect.any(String),
      email: expect.any(String),
      organizationName: expect.any(String),
      organizationPhone: expect.any(String),
      organizationAddress: expect.any(String),
      organizationIndustry: expect.any(String),
    });
  });

  it("rejects invalid email and mismatched confirmation", () => {
    const errors = validateRegistrationInput({
      ...validOrganization,
      email: "not-an-email",
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
