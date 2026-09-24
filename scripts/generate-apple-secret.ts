/**
 * Helper script to generate an Apple Client Secret JWT for NextAuth v5.
 *
 * Requirements:
 * 1. An Apple Developer Account
 * 2. Services ID (APPLE_ID, e.g. "com.refreeg.web")
 * 3. Team ID (10 characters, e.g. "DEF456GHIJ")
 * 4. Key ID (10 characters, e.g. "ABC123DEFG")
 * 5. Private Key (.p8 file) downloaded from developer.apple.com
 *
 * Usage:
 * npx tsx scripts/generate-apple-secret.ts \
 *   --team-id "YOUR_TEAM_ID" \
 *   --key-id "YOUR_KEY_ID" \
 *   --client-id "com.refreeg.web" \
 *   --key-file "./AuthKey_XXXXXXXXXX.p8"
 *
 * Or set the following in your environment:
 *   APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_ID, APPLE_KEY_FILE (or APPLE_PRIVATE_KEY)
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64url");
}

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const val = process.argv[i + 1];
      if (val && !val.startsWith("--")) {
        args[key] = val;
        i++;
      }
    }
  }
  return args;
}

function main() {
  const cliArgs = parseArgs();

  const teamId = cliArgs["team-id"] || process.env.APPLE_TEAM_ID;
  const keyId = cliArgs["key-id"] || process.env.APPLE_KEY_ID;
  const clientId = cliArgs["client-id"] || process.env.APPLE_ID;
  const keyFile = cliArgs["key-file"] || process.env.APPLE_KEY_FILE;
  let privateKey = process.env.APPLE_PRIVATE_KEY;

  if (!privateKey && keyFile) {
    const resolvedPath = path.resolve(process.cwd(), keyFile);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`Error: Key file not found at: ${resolvedPath}`);
      process.exit(1);
    }
    privateKey = fs.readFileSync(resolvedPath, "utf8");
  }

  if (!teamId || !keyId || !clientId || !privateKey) {
    console.log(`
======================================================
  RefreeG — Apple Client Secret Generator
======================================================

Missing required parameters!

Provide via CLI arguments:
  npx tsx scripts/generate-apple-secret.ts \\
    --team-id "<APPLE_TEAM_ID>" \\
    --key-id "<APPLE_KEY_ID>" \\
    --client-id "<APPLE_ID / Services ID>" \\
    --key-file "<path to AuthKey_XXXXXX.p8>"

Or set them in .env:
  APPLE_TEAM_ID
  APPLE_KEY_ID
  APPLE_ID
  APPLE_KEY_FILE (or APPLE_PRIVATE_KEY)
`);
    process.exit(1);
  }

  const now = Math.floor(Date.now() / 1000);
  const expirationTime = now + 86400 * 180; // 180 days (~6 months, maximum allowed by Apple)

  const header = {
    alg: "ES256",
    kid: keyId,
    typ: "JWT",
  };

  const payload = {
    iss: teamId,
    iat: now,
    exp: expirationTime,
    aud: "https://appleid.apple.com",
    sub: clientId,
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign("SHA256");
  signer.update(signingInput);
  const rawSignature = signer.sign({
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });

  const clientSecret = `${signingInput}.${base64url(rawSignature)}`;

  console.log(`
======================================================
  Apple Client Secret Generated Successfully!
======================================================

Copy the following lines to your .env file:

APPLE_ID="${clientId}"
APPLE_SECRET="${clientSecret}"

Expires in: 180 days (${new Date(expirationTime * 1000).toLocaleDateString()})
======================================================
`);
}

main();
