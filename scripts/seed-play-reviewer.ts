import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_STORE_REVIEW_DEMO_EMAIL } from "../lib/auth/store-review-demo";

const prisma = new PrismaClient();

async function main() {
  const email = (
    process.env.STORE_REVIEW_DEMO_EMAIL || DEFAULT_STORE_REVIEW_DEMO_EMAIL
  )
    .trim()
    .toLowerCase();
  const rawPassword =
    process.env.STORE_REVIEW_DEMO_PASSWORD || "RefreeGPlayReview2026!";

  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      fullName: "Google Play Reviewer",
      accountType: "individual",
      isVerified: true,
      isBlocked: false,
      onboarding_completed: true,
      bankName: "Wema Bank (Store Review Demo)",
      accountNumber: "0123456789",
      accountName: "Google Play Reviewer",
      subAccountCode: "ACCT_store_review_demo",
    },
    create: {
      email,
      password: hashedPassword,
      fullName: "Google Play Reviewer",
      accountType: "individual",
      isVerified: true,
      isBlocked: false,
      onboarding_completed: true,
      bankName: "Wema Bank (Store Review Demo)",
      accountNumber: "0123456789",
      accountName: "Google Play Reviewer",
      subAccountCode: "ACCT_store_review_demo",
    },
  });

  const existingKyc = await prisma.kyc_verifications.findFirst({
    where: { user_id: user.id },
  });

  if (existingKyc) {
    await prisma.kyc_verifications.update({
      where: { id: existingKyc.id },
      data: {
        status: "approved",
        full_name: "Google Play Reviewer",
        verification_notes:
          "Pre-verified demo account for Google Play Store review.",
      },
    });
  } else {
    await prisma.kyc_verifications.create({
      data: {
        user_id: user.id,
        document_type: "national_id",
        document_url: "store_review_demo_verified",
        status: "approved",
        full_name: "Google Play Reviewer",
        dob: "1990-01-01",
        phone: "+2348000000000",
        address: "Lagos, Nigeria",
        city: "Lagos",
        state: "Lagos",
        country: "Nigeria",
        verification_notes:
          "Pre-verified demo account for Google Play Store review.",
      },
    });
  }

  console.log("Store Reviewer account provisioned:");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${rawPassword}`);
  console.log(`  User ID:  ${user.id}`);
  console.log(
    "Remember to set STORE_REVIEW_DEMO_ENABLED=\"true\" in your server environment during store review, and set it to \"false\" once review completes.",
  );
}

main()
  .catch((err) => {
    console.error("Failed to seed store reviewer account:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

