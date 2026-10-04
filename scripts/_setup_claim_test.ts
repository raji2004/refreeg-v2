import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "test-claim@example.com";
  const password = await bcrypt.hash("password123", 10);

  // 1. Ensure the user exists
  const user = await prisma.user.upsert({
    where: { email },
    update: { password, onboarding_completed: true },
    create: {
      email,
      password,
      fullName: "Claim Tester",
      firstName: "Claim",
      lastName: "Tester",
      onboarding_completed: true,
    },
  });

  // 2. Ensure an 'unclaimed' placeholder user exists (needs to own the cause temporarily)
  const unclaimed = await prisma.user.upsert({
    where: { email: "unclaimed-recovered@refreeg.internal" },
    update: {},
    create: {
      email: "unclaimed-recovered@refreeg.internal",
      fullName: "Unclaimed Placeholder",
      onboarding_completed: true,
    },
  });

  await prisma.cause.create({
    data: {
      title: "Save the Whales (Recovered)",
      description: "A recovered campaign that needs claiming.",
      goal: 500000,
      raised: 25000,
      status: "ACTIVE",
      currency: "NGN",
      country: "NG",
      category: "Environment",
      image: "https://via.placeholder.com/150",
      reconstructed: true,
      recovered_owner_email: email,
      userId: unclaimed.id, // Currently owned by the placeholder
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
