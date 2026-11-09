export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT - Abuja",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
] as const;

export const ORGANIZATION_TYPES = [
  "Registered NGO",
  "Community group",
  "School or clinic",
  "Faith-based organisation",
  "Social enterprise",
  "Other",
] as const;

export const ONBOARDING_GENDER_OPTIONS = [
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
  { id: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export const FULL_NAME_ERROR_MESSAGE =
  "Enter your first and last name, as on your ID.";
export const DOB_UNDERAGE_ERROR_MESSAGE =
  "You need to be 18 or over to use RefreeG.";
export const DOB_INVALID_ERROR_MESSAGE = "Enter a valid date of birth.";

export function splitFullName(fullName?: string | null): {
  firstName: string;
  lastName: string;
  fullName: string;
} {
  const normalized = (fullName || "").trim().replace(/\s+/g, " ");
  if (!normalized) {
    return { firstName: "", lastName: "", fullName: "" };
  }
  const parts = normalized.split(" ");
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ") || "";
  return { firstName, lastName, fullName: normalized };
}

export function validateOnboardingFullName(
  fullName?: string | null,
): string | null {
  const { firstName, lastName, fullName: normalized } = splitFullName(fullName);
  if (!normalized || !firstName || !lastName) {
    return FULL_NAME_ERROR_MESSAGE;
  }
  if (firstName.length < 2 || lastName.length < 2) {
    return FULL_NAME_ERROR_MESSAGE;
  }
  if (normalized.length > 120) {
    return "Name must be 120 characters or fewer.";
  }
  return null;
}

/**
 * Parses either YYYY-MM-DD or DD/MM/YYYY (or DD / MM / YYYY) into a UTC Date.
 */
export function parseDobInput(dob?: string | null): Date | null {
  if (!dob || typeof dob !== "string") return null;
  const trimmed = dob.trim();
  if (!trimmed) return null;

  // Match DD/MM/YYYY or DD - MM - YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})\s*[\/\-]\s*(\d{1,2})\s*[\/\-]\s*(\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return date;
    }
    return null;
  }

  // Match YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]);
    const day = Number(ymdMatch[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return date;
    }
    return null;
  }

  return null;
}

export function validateOnboardingDob(
  dob?: string | null,
  referenceDate: Date = new Date(),
): string | null {
  if (!dob || !dob.trim()) {
    return DOB_INVALID_ERROR_MESSAGE;
  }

  const parsed = parseDobInput(dob);
  if (!parsed) {
    return DOB_INVALID_ERROR_MESSAGE;
  }

  const nowYear = referenceDate.getUTCFullYear();
  const nowMonth = referenceDate.getUTCMonth();
  const nowDay = referenceDate.getUTCDate();

  const birthYear = parsed.getUTCFullYear();
  const birthMonth = parsed.getUTCMonth();
  const birthDay = parsed.getUTCDate();

  if (birthYear < 1900 || parsed.getTime() > referenceDate.getTime()) {
    return DOB_INVALID_ERROR_MESSAGE;
  }

  let age = nowYear - birthYear;
  if (
    nowMonth < birthMonth ||
    (nowMonth === birthMonth && nowDay < birthDay)
  ) {
    age -= 1;
  }

  if (age < 18) {
    return DOB_UNDERAGE_ERROR_MESSAGE;
  }

  return null;
}

export function formatOnboardingLocation(params: {
  city?: string | null;
  state?: string | null;
  country?: string | null;
  fallbackLocation?: string | null;
}): string {
  const city = (params.city || "").trim();
  const state = (params.state || "").trim();
  const country = (params.country || "").trim();
  const fallback = (params.fallbackLocation || "").trim();

  if (city && state) {
    return `${city}, ${state}`;
  }
  if (state) {
    return state;
  }
  if (city) {
    return city;
  }
  if (fallback) {
    return fallback;
  }
  if (country && country.toLowerCase() !== "nigeria") {
    return country;
  }
  return "";
}
