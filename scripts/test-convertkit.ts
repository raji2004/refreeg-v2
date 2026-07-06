import * as dotenv from "dotenv";
import path from "path";
import { subscribeToConvertKit, addTagsToSubscriber } from "../services/convertkit";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function testConvertKit() {
  console.log("\n🚀 Testing ConvertKit Email Service...");

  const testEmail = process.argv[2] || "test-subscriber@example.com";
  const testName = "Test Subscriber";
  const tagId = process.argv[3] ? parseInt(process.argv[3]) : null;

  console.log(`📧 Email: ${testEmail}`);
  console.log(`🔑 API Key: ${process.env.CONVERTKIT_API_KEY ? "CONFIGURED" : "MISSING"}`);
  console.log(`📝 Form ID: ${process.env.CONVERTKIT_FORM_ID || "MISSING"}`);

  if (!process.env.CONVERTKIT_API_KEY || !process.env.CONVERTKIT_FORM_ID) {
    console.error("❌ Error: ConvertKit credentials are not properly configured in .env file.");
    process.exit(1);
  }

  // 1. Test Subscription
  console.log("\n--- Task 1: Testing Subscription ---");
  try {
    const result = await subscribeToConvertKit({
      email: testEmail,
      first_name: testName,
      fields: {
        registration_source: "Test Script",
      },
    });

    if (result.success) {
      console.log("✅ Success! User successfully subscribed to ConvertKit.");
      console.log(`🆔 Subscriber ID: ${result.subscriberId}`);
    } else {
      console.log("❌ Failed to subscribe.");
      console.log(`⚠️ Error: ${result.error}`);
    }
  } catch (error) {
    console.error("💥 An unexpected error occurred during subscription test:");
    console.error(error);
  }

  // 2. Test Tagging (if tag ID provided)
  if (tagId) {
    console.log(`\n--- Task 2: Testing Tagging (Tag ID: ${tagId}) ---`);
    try {
      const result = await addTagsToSubscriber(testEmail, [tagId]);

      if (result.success) {
        console.log(`✅ Success! Tag ${tagId} added to ${testEmail}.`);
      } else {
        console.log(`❌ Failed to add tag.`);
        console.log(`⚠️ Error: ${result.error}`);
      }
    } catch (error) {
      console.error("💥 An unexpected error occurred during tagging test:");
      console.error(error);
    }
  } else {
    console.log("\nℹ️  Skipping tagging test (no Tag ID provided).");
    console.log("   To test tagging, run: npx tsx scripts/test-convertkit.ts <email> <tag_id>");
  }
}

testConvertKit();
