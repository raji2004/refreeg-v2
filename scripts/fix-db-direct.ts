import { PrismaClient } from "@prisma/client";

// Supabase session mode pooler (port 6543) supports DDL
const directUrl = "postgresql://postgres.eivlgwyipqojpeaxoajm:Refreeg4life%23@aws-0-us-east-2.pooler.supabase.com:6543/postgres";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: directUrl,
    },
  },
});

async function main() {
  console.log("Checking and adding missing columns via session pooler...");

  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS flutterwave_sub_account_id TEXT;`
    );
    console.log("Added flutterwave_sub_account_id to profiles");
  } catch (e) {
    console.error("Error adding to profiles:", e);
  }

  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE donations ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'paystack';`
    );
    console.log("Added payment_provider to donations");
  } catch (e) {
    console.error("Error adding to donations:", e);
  }

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
