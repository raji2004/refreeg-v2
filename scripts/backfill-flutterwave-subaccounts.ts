// run with: npx ts-node scripts/backfill-flutterwave-subaccounts.ts
import { PrismaClient } from "@prisma/client";
import Flutterwave from "../services/flutterwave";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Flutterwave subaccount backfill...");

  // Get all users who have Paystack bank details but no Flutterwave subaccount
  const usersToBackfill = await prisma.user.findMany({
    where: {
      accountNumber: { not: null },
      bankName: { not: null },
      accountName: { not: null },
      subAccountCode: { not: null }, // Has Paystack subaccount
      flutterwaveSubAccountId: null, // But no Flutterwave subaccount
    },
    select: {
      id: true,
      accountNumber: true,
      bankName: true,
      accountName: true,
      email: true,
    },
  });

  console.log(`Found ${usersToBackfill.length} users to backfill.`);

  if (usersToBackfill.length === 0) {
    console.log("No backfill needed.");
    return;
  }

  // Fetch Flutterwave banks to map names to codes
  const flutterwaveBanks = await Flutterwave.listBanks();

  let successCount = 0;
  let failCount = 0;

  for (const user of usersToBackfill) {
    try {
      console.log(`Processing user ${user.id} (${user.email})...`);

      // Try to find the bank code by matching the name
      // Note: bank names might differ slightly between Paystack and Flutterwave,
      // so we use a loose string inclusion match as a fallback.
      let bankCode = flutterwaveBanks.find(
        (b) => b.name.toLowerCase() === user.bankName?.toLowerCase()
      )?.code;

      if (!bankCode) {
        bankCode = flutterwaveBanks.find((b) =>
          b.name.toLowerCase().includes(user.bankName?.toLowerCase() || "")
        )?.code;
      }

      if (!bankCode) {
        throw new Error(`Could not resolve Flutterwave bank code for name: ${user.bankName}`);
      }

      const result = await Flutterwave.createSubaccount({
        account_number: user.accountNumber as string,
        bank_code: bankCode,
        business_name: user.accountName as string,
        percentage_charge: 0,
      });

      if (!result.subaccount_id) {
        throw new Error("Flutterwave returned empty subaccount ID");
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          flutterwaveSubAccountId: result.subaccount_id,
        },
      });

      console.log(`✅ Successfully backfilled user ${user.id} with Flutterwave ID: ${result.subaccount_id}`);
      successCount++;
    } catch (error: any) {
      console.error(`❌ Failed to backfill user ${user.id}:`, error.message || error);
      failCount++;
    }

    // Rate limit delay to avoid hitting Flutterwave API limits
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`\nBackfill complete! Success: ${successCount}, Failed: ${failCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
