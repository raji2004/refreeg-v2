export const STORE_REVIEW_DEMO_REFERENCE_PREFIX = "ref_store_review_";
export const DEFAULT_STORE_REVIEW_DEMO_EMAIL = "playreview@refreeg.com";

export interface StoreReviewDemoPayload {
  causeId: string;
  amount: number;
  tipAmount: number;
  donorName: string;
  email: string;
  message: string;
  isAnonymous: boolean;
  createdAt: string;
}

export const STORE_REVIEW_DEMO_SAVED_CARD = {
  id: "store_review_demo_card",
  card_type: "visa",
  last4: "4081",
  exp_month: "12",
  exp_year: "2030",
  bank: "Store Review Demo Bank",
  brand: "Visa",
  is_default: true,
  created_at: "2026-01-01T00:00:00.000Z",
};

/**
 * Returns true only when STORE_REVIEW_DEMO_ENABLED is explicitly set to "true".
 * Turn this off in production environment variables immediately after store review passes.
 */
export function isStoreReviewDemoEnabled(): boolean {
  return process.env.STORE_REVIEW_DEMO_ENABLED === "true";
}

/**
 * Returns the single email address permitted to use Store Review Demo Mode.
 */
export function getStoreReviewDemoEmail(): string {
  return (
    process.env.STORE_REVIEW_DEMO_EMAIL || DEFAULT_STORE_REVIEW_DEMO_EMAIL
  )
    .trim()
    .toLowerCase();
}

/**
 * Strictly checks both that Store Review Demo Mode is enabled on the server AND
 * that the authenticated user's email matches the single configured reviewer account.
 */
export function isStoreReviewDemoAccount(email?: string | null): boolean {
  if (!isStoreReviewDemoEnabled() || !email) {
    return false;
  }
  return email.trim().toLowerCase() === getStoreReviewDemoEmail();
}

/**
 * Encodes a self-contained demo transaction reference so verification can return
 * a realistic receipt to the store reviewer without polluting production financial
 * tables or inflating real campaign raised totals.
 */
export function encodeStoreReviewDemoReference(
  payload: Omit<StoreReviewDemoPayload, "createdAt"> & { createdAt?: string },
): string {
  const fullPayload: StoreReviewDemoPayload = {
    ...payload,
    createdAt: payload.createdAt || new Date().toISOString(),
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), "utf8").toString(
    "base64url",
  );
  return `${STORE_REVIEW_DEMO_REFERENCE_PREFIX}${encoded}`;
}

/**
 * Decodes a Store Review Demo reference if and only if Store Review Demo Mode is enabled.
 */
export function decodeStoreReviewDemoReference(
  reference?: string | null,
): StoreReviewDemoPayload | null {
  if (
    !isStoreReviewDemoEnabled() ||
    !reference ||
    !reference.startsWith(STORE_REVIEW_DEMO_REFERENCE_PREFIX)
  ) {
    return null;
  }

  const encoded = reference.slice(STORE_REVIEW_DEMO_REFERENCE_PREFIX.length);
  if (!encoded) {
    return null;
  }

  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as Partial<StoreReviewDemoPayload>;
    if (!parsed || typeof parsed.amount !== "number" || !parsed.causeId) {
      return null;
    }
    return {
      causeId: String(parsed.causeId),
      amount: Number(parsed.amount),
      tipAmount: Number(parsed.tipAmount || 0),
      donorName: String(parsed.donorName || "Store Reviewer"),
      email: String(parsed.email || getStoreReviewDemoEmail()),
      message: String(parsed.message || ""),
      isAnonymous: Boolean(parsed.isAnonymous),
      createdAt: String(parsed.createdAt || new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

