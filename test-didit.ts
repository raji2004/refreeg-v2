import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
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
      phone: "+15551234567"
    }
  };

  console.log("Sending simulated payload to localhost webhook...");

  try {
    const res = await fetch("http://localhost:3000/api/webhooks/didit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    console.log("Response Status:", res.status);
    console.log("Response Body:", text);

    console.log("\nSuccess! The webhook was triggered. You can now check the user's KYC record in the admin dashboard to verify the fields were saved.");
  } catch (error) {
    console.error("Error triggering webhook:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
