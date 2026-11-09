/**
 * @jest-environment node
 */
import crypto from "crypto";
import sharp from "sharp";
import {
  issueKycChallenge,
  verifyChallengeToken,
  verifyCameraStreamAuthenticity,
  normalizeSkinToneLuminance,
  computeCosineSimilarity,
  verifyServerBiometrics,
  CaptureManifest,
} from "@/lib/kyc/server-biometrics";

describe("KYC Fraud Prevention & Adversarial Biometrics Suite", () => {
  // Helper to generate test JPEG buffers
  const makeImageBuffer = async (
    width: number,
    height: number,
    color: { r: number; g: number; b: number },
  ) => {
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: color,
      },
    })
      .jpeg()
      .toBuffer();
  };

  describe("1. HMAC Challenge Tokens & Anti-Replay", () => {
    it("generates a valid signed challenge token that verifies successfully", () => {
      const challenge = issueKycChallenge("user-123", "kyc-abc");
      expect(challenge.challengeToken).toBeDefined();
      expect(challenge.expiresAt).toBeGreaterThan(Date.now());

      const verified = verifyChallengeToken(challenge.challengeToken);
      expect(verified.valid).toBe(true);
      expect(verified.payload?.userId).toBe("user-123");
      expect(verified.payload?.kycId).toBe("kyc-abc");
    });

    it("rejects forged or tampered challenge tokens", () => {
      const challenge = issueKycChallenge("user-123", "kyc-abc");
      const [b64, sig] = challenge.challengeToken.split(".");

      // Tamper with the base64 payload to pretend to be another user
      const tamperedB64 = Buffer.from(
        JSON.stringify({
          userId: "attacker-666",
          kycId: "kyc-abc",
          expiresAt: Date.now() + 100000,
        }),
      ).toString("base64url");

      const tamperedToken = `${tamperedB64}.${sig}`;
      const result = verifyChallengeToken(tamperedToken);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("signature");
    });

    it("rejects expired challenge tokens (older than 3 minutes)", () => {
      const issuedAt = Date.now() - 4 * 60 * 1000; // 4 minutes ago
      const expiresAt = issuedAt + 3 * 60 * 1000; // expired 1 minute ago
      const payloadStr = JSON.stringify({
        userId: "user-123",
        kycId: "kyc-abc",
        challengeType: "blink_then_turn_left",
        issuedAt,
        expiresAt,
      });

      const secret =
        process.env.KYC_CHALLENGE_SECRET ||
        process.env.NEXTAUTH_SECRET ||
        "refreeg-kyc-biometric-secret-key-32b";
      const signature = crypto
        .createHmac("sha256", secret)
        .update(payloadStr)
        .digest("hex");
      const expiredToken = `${Buffer.from(payloadStr).toString("base64url")}.${signature}`;

      const result = verifyChallengeToken(expiredToken);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("expired");
    });
  });

  describe("2. Camera Stream Authenticity & Anti-Virtual Camera Checks", () => {
    it("rejects stream when challenge token belongs to a different user", async () => {
      const frame0 = await makeImageBuffer(100, 100, { r: 60, g: 60, b: 60 });
      const frame1 = await makeImageBuffer(100, 100, { r: 65, g: 65, b: 65 });
      const frame2 = await makeImageBuffer(100, 100, { r: 70, g: 70, b: 70 });

      const challenge = issueKycChallenge("legit-user", "kyc-123");
      const t0 = Date.now() - 3000;
      const manifest: CaptureManifest = {
        challengeToken: challenge.challengeToken,
        timestamps: [t0, t0 + 1000, t0 + 2500],
        frameDigests: [
          crypto.createHash("sha256").update(frame0).digest("hex"),
          crypto.createHash("sha256").update(frame1).digest("hex"),
          crypto.createHash("sha256").update(frame2).digest("hex"),
        ],
      };

      const result = await verifyCameraStreamAuthenticity(
        [frame0, frame1, frame2],
        manifest,
        "impostor-user", // mismatch
      );

      expect(result.authentic).toBe(false);
      expect(result.error).toContain("does not belong to user");
    });

    it("rejects non-sequential or out-of-order timestamps", async () => {
      const frame0 = await makeImageBuffer(100, 100, { r: 60, g: 60, b: 60 });
      const frame1 = await makeImageBuffer(100, 100, { r: 65, g: 65, b: 65 });
      const frame2 = await makeImageBuffer(100, 100, { r: 70, g: 70, b: 70 });

      const challenge = issueKycChallenge("user-123", "kyc-123");
      const t0 = Date.now();
      const manifest: CaptureManifest = {
        challengeToken: challenge.challengeToken,
        timestamps: [t0 + 2000, t0 + 1000, t0], // Reversed timestamps
        frameDigests: [
          crypto.createHash("sha256").update(frame0).digest("hex"),
          crypto.createHash("sha256").update(frame1).digest("hex"),
          crypto.createHash("sha256").update(frame2).digest("hex"),
        ],
      };

      const result = await verifyCameraStreamAuthenticity(
        [frame0, frame1, frame2],
        manifest,
        "user-123",
      );

      expect(result.authentic).toBe(false);
      expect(result.error).toContain("Non-sequential frame capture timestamps");
    });

    it("rejects unnatural stream durations (< 1.5s burst or > 6.5s timeout)", async () => {
      const frame0 = await makeImageBuffer(100, 100, { r: 60, g: 60, b: 60 });
      const frame1 = await makeImageBuffer(100, 100, { r: 65, g: 65, b: 65 });
      const frame2 = await makeImageBuffer(100, 100, { r: 70, g: 70, b: 70 });

      const challenge = issueKycChallenge("user-123", "kyc-123");
      const t0 = Date.now();
      // Burst duration 300ms (too fast for human response to motion challenge)
      const burstManifest: CaptureManifest = {
        challengeToken: challenge.challengeToken,
        timestamps: [t0, t0 + 100, t0 + 300],
        frameDigests: [
          crypto.createHash("sha256").update(frame0).digest("hex"),
          crypto.createHash("sha256").update(frame1).digest("hex"),
          crypto.createHash("sha256").update(frame2).digest("hex"),
        ],
      };

      const result = await verifyCameraStreamAuthenticity(
        [frame0, frame1, frame2],
        burstManifest,
        "user-123",
      );

      expect(result.authentic).toBe(false);
      expect(result.error).toContain("Invalid stream duration");
    });

    it("rejects tampered frame checksums", async () => {
      const frame0 = await makeImageBuffer(100, 100, { r: 60, g: 60, b: 60 });
      const frame1 = await makeImageBuffer(100, 100, { r: 65, g: 65, b: 65 });
      const frame2 = await makeImageBuffer(100, 100, { r: 70, g: 70, b: 70 });

      const challenge = issueKycChallenge("user-123", "kyc-123");
      const t0 = Date.now() - 3000;
      const manifest: CaptureManifest = {
        challengeToken: challenge.challengeToken,
        timestamps: [t0, t0 + 1000, t0 + 2500],
        frameDigests: [
          "fake-checksum-0",
          crypto.createHash("sha256").update(frame1).digest("hex"),
          crypto.createHash("sha256").update(frame2).digest("hex"),
        ],
      };

      const result = await verifyCameraStreamAuthenticity(
        [frame0, frame1, frame2],
        manifest,
        "user-123",
      );

      expect(result.authentic).toBe(false);
      expect(result.error).toContain("checksum mismatch");
    });

    it("rejects mismatched sensor dimensions across frames", async () => {
      const frame0 = await makeImageBuffer(100, 100, { r: 60, g: 60, b: 60 });
      const frame1 = await makeImageBuffer(100, 100, { r: 65, g: 65, b: 65 });
      const frame2 = await makeImageBuffer(150, 150, { r: 70, g: 70, b: 70 }); // altered resolution!

      const challenge = issueKycChallenge("user-123", "kyc-123");
      const t0 = Date.now() - 3000;
      const manifest: CaptureManifest = {
        challengeToken: challenge.challengeToken,
        timestamps: [t0, t0 + 1000, t0 + 2500],
        frameDigests: [
          crypto.createHash("sha256").update(frame0).digest("hex"),
          crypto.createHash("sha256").update(frame1).digest("hex"),
          crypto.createHash("sha256").update(frame2).digest("hex"),
        ],
      };

      const result = await verifyCameraStreamAuthenticity(
        [frame0, frame1, frame2],
        manifest,
        "user-123",
      );

      expect(result.authentic).toBe(false);
      expect(result.error).toContain("Sensor dimensions changed mid-stream");
    });
  });

  describe("3. Active Liveness Delta (Static Printed Photo Attack)", () => {
    it("detects static 2D image attack when all 3 frames are identical", async () => {
      // Attacker holds a printed photo or phone screen still
      const staticPhoto = await makeImageBuffer(100, 100, { r: 80, g: 80, b: 80 });

      const result = await verifyServerBiometrics(
        staticPhoto,
        [staticPhoto, staticPhoto, staticPhoto], // exactly identical frames
        "blink_then_turn_left",
        2500,
      );

      expect(result.passed).toBe(false);
      expect(result.livenessPassed).toBe(false);
      expect(result.failureReason).toContain("Static 2D image detected");
      expect(result.telemetry.challengeDelta).toBeLessThan(0.02);
    });

    it("rejects pitch-black camera environments", async () => {
      const darkBuffer = await makeImageBuffer(100, 100, { r: 10, g: 10, b: 10 });

      const result = await verifyServerBiometrics(
        darkBuffer,
        [darkBuffer, darkBuffer, darkBuffer],
        "turn_left_then_right",
        2500,
      );

      expect(result.passed).toBe(false);
      expect(result.failureReason).toContain("Room is too dark");
    });
  });

  describe("4. Skin-Tone & Low Ambient Light Adaptive Normalization", () => {
    it("applies adaptive gamma and brightness normalization to low-luminance frames", async () => {
      // Dark indoor Nigerian room lighting (mean luminance ~ 60)
      const lowLightFrame = await makeImageBuffer(100, 100, { r: 60, g: 60, b: 60 });

      const { buffer, averageLuminance, adjusted } =
        await normalizeSkinToneLuminance(lowLightFrame);

      expect(adjusted).toBe(true);
      expect(averageLuminance).toBeLessThan(100);
      expect(buffer).toBeInstanceOf(Buffer);

      // Verify enhanced frame has higher luminance
      const stats = await sharp(buffer).stats();
      const enhancedLuminance =
        0.299 * stats.channels[0].mean +
        0.587 * stats.channels[1].mean +
        0.114 * stats.channels[2].mean;
      expect(enhancedLuminance).toBeGreaterThan(averageLuminance);
    });

    it("does not artificially alter well-lit frames (luminance >= 100)", async () => {
      const brightFrame = await makeImageBuffer(100, 100, { r: 140, g: 140, b: 140 });

      const { adjusted, averageLuminance } =
        await normalizeSkinToneLuminance(brightFrame);

      expect(adjusted).toBe(false);
      expect(averageLuminance).toBeGreaterThanOrEqual(100);
    });
  });

  describe("5. Vector Math & Cosine Similarity Engine", () => {
    it("returns 1.0 for identical embedding vectors", () => {
      const vec = [0.1, 0.5, 0.9, -0.3];
      expect(computeCosineSimilarity(vec, vec)).toBeCloseTo(1.0, 5);
    });

    it("returns 0.0 for orthogonal vectors", () => {
      const vecA = [1, 0];
      const vecB = [0, 1];
      expect(computeCosineSimilarity(vecA, vecB)).toBe(0);
    });

    it("returns -1.0 for inverted vectors", () => {
      const vecA = [1, 2, 3];
      const vecB = [-1, -2, -3];
      expect(computeCosineSimilarity(vecA, vecB)).toBeCloseTo(-1.0, 5);
    });

    it("returns 0 safely for zero or mismatched vectors", () => {
      expect(computeCosineSimilarity([], [])).toBe(0);
      expect(computeCosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
      expect(computeCosineSimilarity([0, 0], [0, 0])).toBe(0);
    });
  });
});

