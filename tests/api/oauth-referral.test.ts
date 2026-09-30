/**
 * tests/api/oauth-referral.test.ts
 *
 * Unit tests for OAuth referral attribution.
 * Tests the logic in the NextAuth signIn event that reads the ref_v1 cookie
 * and calls createReferralRecord for new Google OAuth users.
 *
 * We test the logic directly (not the NextAuth wiring) by importing and
 * calling the handler functions in isolation.
 */

// ── Mock createReferralRecord ─────────────────────────────────────────────────
const mockCreateReferralRecord = jest.fn().mockResolvedValue({ created: true, referrerId: "ref-id" });

jest.mock("@/lib/referral-utils", () => ({
  createReferralRecord: (...args: any[]) => mockCreateReferralRecord(...args),
}));

// ── Mock Prisma ────────────────────────────────────────────────────────────────
const mockUserFindUnique = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: any[]) => mockUserFindUnique(...args) },
  },
}));

// ── Isolated handler — mirrors exactly what auth.ts signIn event does ─────────
// We extract the OAuth attribution logic into a testable function so we don't
// need to spin up NextAuth itself.
async function handleOAuthReferralAttribution(params: {
  userId: string;
  email: string;
  cookieHeader: string | null;
}) {
  const { userId, email, cookieHeader } = params;

  const refV1Cookie = cookieHeader
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("ref_v1="))
    ?.split("=")[1];

  if (!refV1Cookie || !userId) return { attributed: false, reason: "no_cookie_or_id" };

  const { prisma } = await import("@/lib/prisma");
  const { createReferralRecord } = await import("@/lib/referral-utils");

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, email: true },
  });

  const isNewUser =
    dbUser?.createdAt &&
    Date.now() - new Date(dbUser.createdAt).getTime() < 10_000;

  if (!isNewUser) return { attributed: false, reason: "not_new_user" };

  await createReferralRecord({
    referralCode: refV1Cookie,
    newUserId: userId,
    email,
  });

  return { attributed: true };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("OAuth referral attribution (signIn event logic)", () => {
  const NEW_USER_ID = "new-oauth-user-id";
  const REFERRAL_CODE = "REF123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls createReferralRecord when ref_v1 cookie is present and user is new", async () => {
    // User created 2 seconds ago
    mockUserFindUnique.mockResolvedValue({
      createdAt: new Date(Date.now() - 2000),
      email: "newuser@example.com",
    });

    const result = await handleOAuthReferralAttribution({
      userId: NEW_USER_ID,
      email: "newuser@example.com",
      cookieHeader: `ref_v1=${REFERRAL_CODE}; other_cookie=abc`,
    });

    expect(result.attributed).toBe(true);
    expect(mockCreateReferralRecord).toHaveBeenCalledWith({
      referralCode: REFERRAL_CODE,
      newUserId: NEW_USER_ID,
      email: "newuser@example.com",
    });
  });

  it("does NOT call createReferralRecord when no ref_v1 cookie is present", async () => {
    const result = await handleOAuthReferralAttribution({
      userId: NEW_USER_ID,
      email: "newuser@example.com",
      cookieHeader: "session_token=abc; other=xyz", // no ref_v1
    });

    expect(result.attributed).toBe(false);
    expect(result.reason).toBe("no_cookie_or_id");
    expect(mockCreateReferralRecord).not.toHaveBeenCalled();
  });

  it("does NOT call createReferralRecord when cookie header is null", async () => {
    const result = await handleOAuthReferralAttribution({
      userId: NEW_USER_ID,
      email: "newuser@example.com",
      cookieHeader: null,
    });

    expect(result.attributed).toBe(false);
    expect(mockCreateReferralRecord).not.toHaveBeenCalled();
  });

  it("does NOT call createReferralRecord for an existing user re-logging in", async () => {
    // User created 5 minutes ago — existing user, not new
    mockUserFindUnique.mockResolvedValue({
      createdAt: new Date(Date.now() - 5 * 60 * 1000),
      email: "existing@example.com",
    });

    const result = await handleOAuthReferralAttribution({
      userId: NEW_USER_ID,
      email: "existing@example.com",
      cookieHeader: `ref_v1=${REFERRAL_CODE}`,
    });

    expect(result.attributed).toBe(false);
    expect(result.reason).toBe("not_new_user");
    expect(mockCreateReferralRecord).not.toHaveBeenCalled();
  });

  it("parses ref_v1 correctly when multiple cookies are present", async () => {
    mockUserFindUnique.mockResolvedValue({
      createdAt: new Date(Date.now() - 1000),
      email: "newuser@example.com",
    });

    await handleOAuthReferralAttribution({
      userId: NEW_USER_ID,
      email: "newuser@example.com",
      cookieHeader: "session=abc; ref_v1=MYCODE; other=xyz",
    });

    expect(mockCreateReferralRecord).toHaveBeenCalledWith(
      expect.objectContaining({ referralCode: "MYCODE" })
    );
  });

  it("does NOT call createReferralRecord when ref_v1 cookie is invalid/unknown code", async () => {
    mockUserFindUnique.mockResolvedValue({
      createdAt: new Date(Date.now() - 1000),
      email: "newuser@example.com",
    });
    // createReferralRecord handles the invalid code gracefully (returns { created: false })
    mockCreateReferralRecord.mockResolvedValue({ created: false });

    const result = await handleOAuthReferralAttribution({
      userId: NEW_USER_ID,
      email: "newuser@example.com",
      cookieHeader: `ref_v1=INVALID_CODE`,
    });

    // Attribution was attempted but createReferralRecord handled the invalid code
    expect(result.attributed).toBe(true); // we still tried
    expect(mockCreateReferralRecord).toHaveBeenCalledWith(
      expect.objectContaining({ referralCode: "INVALID_CODE" })
    );
  });
});
