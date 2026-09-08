export type SignupAccountType = "individual" | "organization";

export type RegistrationInput = {
  accountType: SignupAccountType;
  fullName: string;
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
  const fullName = input.fullName.trim();
  const email = input.email.trim();

  if (!fullName) {
    errors.fullName =
      input.accountType === "organization"
        ? "Admin or primary contact name is required"
        : "Full name is required";
  } else if (fullName.length > 120) {
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
    const organizationName = input.organizationName?.trim() || "";
    const organizationPhone = input.organizationPhone?.trim() || "";
    const organizationAddress = input.organizationAddress?.trim() || "";
    const organizationIndustry = input.organizationIndustry?.trim() || "";

    if (!organizationName) {
      errors.organizationName = "Organization name is required";
    } else if (organizationName.length > 160) {
      errors.organizationName =
        "Organization name must be 160 characters or fewer";
    }

    if (!organizationPhone) {
      errors.organizationPhone = "Organization phone number is required";
    } else if (!/^\+?[\d\s\-()]{7,24}$/.test(organizationPhone)) {
      errors.organizationPhone = "Enter a valid phone number";
    }

    if (!organizationAddress) {
      errors.organizationAddress = "Organization address is required";
    } else if (organizationAddress.length > 240) {
      errors.organizationAddress = "Address must be 240 characters or fewer";
    }

    if (!organizationIndustry) {
      errors.organizationIndustry = "Industry is required";
    } else if (organizationIndustry.length > 100) {
      errors.organizationIndustry = "Industry must be 100 characters or fewer";
    }
  }

  return errors;
}

export function normalizeRegistrationInput(
  input: RegistrationInput,
): RegistrationInput {
  return {
    ...input,
    accountType:
      input.accountType === "organization" ? "organization" : "individual",
    fullName: typeof input.fullName === "string" ? input.fullName.trim() : "",
    email:
      typeof input.email === "string" ? input.email.trim().toLowerCase() : "",
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
