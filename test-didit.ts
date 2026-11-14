import { createHmac } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Simulates a signed Didit webhook. The webhook rejects unsigned payloads, so
// this signs the raw body with DIDIT_WEBHOOK_SECRET exactly like Didit does
// (HMAC-SHA256 in the x-didit-signature header). Run against a staging or
// local environment with synthetic data only.
async function runTest() {
  const secret = process.env.DIDIT_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      "DIDIT_WEBHOOK_SECRET is not set in this shell's environment; the webhook will reject the payload.",
    );
    return;
  }

  // Get a user to test with
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No users found in the database. Cannot run test.");
    return;
  }

  console.log(`Using user ID for test: ${user.id}`);

  // Simulated Didit Payload
  const payload = {
    session_id: "test-didit-session-123",
    status: "Approved",
    vendor_data: user.id,
    data: {
      first_name: "John",
      last_name: "Doe",
      date_of_birth: "1990-01-01",
      address: "123 Main St",
      city: "San Francisco",
      state: "CA",
      country: "US",
      postal_code: "94105",
      phone: "+15551234567",
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(rawBody).digest("hex");

  console.log("Sending simulated signed payload to localhost webhook...");

  try {
    const res = await fetch("http://localhost:3000/api/webhooks/didit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-didit-signature": signature,
      },
      body: rawBody,
    });

    const text = await res.text();
    console.log("Response Status:", res.status);
    console.log("Response Body:", text);

    console.log(
      "\nSuccess! The webhook was triggered. You can now check the user's KYC record in the admin dashboard to verify the fields were saved.",
    );
  } catch (error) {
    console.error("Error triggering webhook:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
