export type SignupAccountType = "individual" | "organization";

/**
 * Derives a human-friendly full name from an email address before the '@'.
 * e.g., "john.doe@example.com" -> "John Doe"
 * "ada_lovelace@domain.com" -> "Ada Lovelace"
 * "sandra-smith@domain.com" -> "Sandra Smith"
 * "user123@domain.com" -> "User123"
 */
export function deriveFullNameFromEmail(email?: string | null): string {
  if (!email || !email.includes("@")) return "User";
  const prefix = email.split("@")[0].trim();
  if (!prefix) return "User";

  // Split by dots, underscores, or hyphens if present
  const parts = prefix.split(/[._-]+/).filter(Boolean);
  if (parts.length > 0) {
    return parts
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

export type RegistrationInput = {
  accountType: SignupAccountType;
  fullName?: string;
  email: string;
  password: string;
  confirmPassword?: string;
  organizationName?: string;
  organizationPhone?: string;
  organizationAddress?: string;
  organizationIndustry?: string;
};

export type RegistrationField = keyof RegistrationInput;
export type RegistrationErrors = Partial<Record<RegistrationField, string>>;

const COMMON_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password1",
  "qwerty123",
  "letmein123",
  "admin123",
  "welcome123",
]);

export const PASSWORD_REQUIREMENTS = [
  "At least 10 characters",
  "One uppercase letter",
  "One lowercase letter",
  "One number",
  "One special character",
] as const;

export function getPasswordErrors(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 10) errors.push(PASSWORD_REQUIREMENTS[0]);
  if (!/[A-Z]/.test(password)) errors.push(PASSWORD_REQUIREMENTS[1]);
  if (!/[a-z]/.test(password)) errors.push(PASSWORD_REQUIREMENTS[2]);
  if (!/\d/.test(password)) errors.push(PASSWORD_REQUIREMENTS[3]);
  if (!/[^A-Za-z0-9]/.test(password)) errors.push(PASSWORD_REQUIREMENTS[4]);
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push("Choose a password that is not commonly used");
  }

  return errors;
}

export function isStrongPassword(password: string): boolean {
  return getPasswordErrors(password).length === 0;
}

export function validateRegistrationInput(
  input: RegistrationInput,
): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const email = (input.email || "").trim();
  const rawFullName = input.fullName ? input.fullName.trim() : "";
  const fullName = rawFullName || deriveFullNameFromEmail(email);

  if (fullName.length > 120) {
    errors.fullName = "Name must be 120 characters or fewer";
  }

  if (!email) {
    errors.email = "Email address is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address";
  }

  const passwordErrors = getPasswordErrors(input.password);
  if (passwordErrors.length > 0) {
    errors.password = passwordErrors[0];
  }

  if (
    input.confirmPassword !== undefined &&
    input.password !== input.confirmPassword
  ) {
    errors.confirmPassword = "Passwords do not match";
  }

  if (input.accountType === "organization") {
    const organizationName = input.organizationName?.trim();
    const organizationPhone = input.organizationPhone?.trim();
    const organizationAddress = input.organizationAddress?.trim();
    const organizationIndustry = input.organizationIndustry?.trim();

    // Organization details are now primarily collected during onboarding (Step 3B).
    // If provided during initial registration, validate length and format.
    if (organizationName && organizationName.length > 160) {
      errors.organizationName =
        "Organization name must be 160 characters or fewer";
    }

    if (organizationPhone && !/^\+?[\d\s\-()]{7,24}$/.test(organizationPhone)) {
      errors.organizationPhone = "Enter a valid phone number";
    }

    if (organizationAddress && organizationAddress.length > 240) {
      errors.organizationAddress = "Address must be 240 characters or fewer";
    }

    if (organizationIndustry && organizationIndustry.length > 100) {
      errors.organizationIndustry = "Industry must be 100 characters or fewer";
    }
  }

  return errors;
}

export type NormalizedRegistration = Omit<RegistrationInput, "fullName"> & {
  fullName: string;
};

export function normalizeRegistrationInput(
  input: RegistrationInput,
): NormalizedRegistration {
  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const rawFullName =
    typeof input.fullName === "string" ? input.fullName.trim() : "";
  const fullName = rawFullName || deriveFullNameFromEmail(email);

  return {
    ...input,
    accountType:
      input.accountType === "organization" ? "organization" : "individual",
    fullName,
    email,
    password: typeof input.password === "string" ? input.password : "",
    confirmPassword:
      typeof input.confirmPassword === "string"
        ? input.confirmPassword
        : input.confirmPassword,
    organizationName:
      typeof input.organizationName === "string"
        ? input.organizationName.trim() || undefined
        : undefined,
    organizationPhone:
      typeof input.organizationPhone === "string"
        ? input.organizationPhone.trim() || undefined
        : undefined,
    organizationAddress:
      typeof input.organizationAddress === "string"
        ? input.organizationAddress.trim() || undefined
        : undefined,
    organizationIndustry:
      typeof input.organizationIndustry === "string"
        ? input.organizationIndustry.trim() || undefined
        : undefined,
  };
}
