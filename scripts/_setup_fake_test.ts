import { prisma } from "../lib/prisma";

async function main() {
  // Revert the real cause — don't use it for testing.
  const reverted = await prisma.cause.update({
    where: { id: "b57376a5-33e5-4735-a43a-0366a1c878f9" },
    data: { recovered_owner_email: null },
    select: { id: true, title: true, recovered_owner_email: true },
  });
  console.log("Reverted:", reverted);

  const unclaimedUser = await prisma.user.findFirst({
    where: { email: "unclaimed-recovered@refreeg.internal" },
    select: { id: true },
  });
  if (!unclaimedUser) throw new Error("Unclaimed placeholder user not found");

  const fakeCause = await prisma.cause.create({
    data: {
      title: "[TEST] Sample Recovered Campaign",
      description: "This is a fake test campaign created to verify the recovery email + claim flow. Safe to delete after testing.",
      category: "community",
      goal: 150000,
      raised: 42000,
      status: "approved",
      userId: unclaimedUser.id,
      reconstructed: true,
      reconstruction_note: "Fake test cause — not a real recovery, for QA only.",
      recovered_owner_email: "tega2112@gmail.com",
      compliance_paused: false,
    },
    select: { id: true, title: true, goal: true, raised: true, recovered_owner_email: true },
  });
  console.log("Created fake test cause:", JSON.stringify(fakeCause, null, 2));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
