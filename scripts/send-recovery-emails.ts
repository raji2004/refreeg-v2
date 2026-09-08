// run with: npx tsx scripts/send-recovery-emails.ts
//
// Sends the "your campaign was recovered" notice (services/mail.ts
// sendCauseRecoveredEmail) to everyone whose reconstructed cause still has
// a recovered_owner_email set (i.e. they haven't claimed it yet). One email
// per distinct email address — when someone has more than one reconstructed
// cause, the highest-raised one is used as the card in the email.
//
// Idempotent: marks every cause in the group with recovery_email_sent_at
// once the send succeeds, and only ever selects causes where that's still
// null, so re-running this after a partial failure only retries the causes
// that didn't get a successful send yet.
import { PrismaClient } from "@prisma/client";
import { sendCauseRecoveredEmail } from "../services/mail";

const prisma = new PrismaClient();

async function main() {
  console.log("Finding reconstructed causes awaiting a recovery notice...");

  const causes = await prisma.cause.findMany({
    where: {
      reconstructed: true,
      recovered_owner_email: { not: null },
      recovery_email_sent_at: null,
    },
    select: {
      id: true,
      title: true,
      image: true,
      raised: true,
      goal: true,
      recovered_owner_email: true,
    },
  });

  console.log(`Found ${causes.length} unclaimed reconstructed cause(s).`);

  if (causes.length === 0) {
    console.log("Nothing to send.");
    return;
  }

  const byEmail = new Map<string, typeof causes>();
  for (const cause of causes) {
    const email = cause.recovered_owner_email!.toLowerCase().trim();
    const group = byEmail.get(email) || [];
    group.push(cause);
    byEmail.set(email, group);
  }

  console.log(`Grouped into ${byEmail.size} distinct recipient(s).`);

  let successCount = 0;
  let failCount = 0;

  for (const [email, group] of byEmail) {
    const primary = group.reduce((best, c) =>
      Number(c.raised || 0) > Number(best.raised || 0) ? c : best,
    );

    try {
      const result = await sendCauseRecoveredEmail({
        to: email,
        causeTitle: primary.title,
        causeImage: primary.image,
        causeRaised: Number(primary.raised || 0),
        causeGoal: Number(primary.goal || 0),
      });

      if (!result?.success) {
        throw new Error(
          typeof result?.error === "string"
            ? result.error
            : "sendCauseRecoveredEmail returned no success flag",
        );
      }

      await prisma.cause.updateMany({
        where: { id: { in: group.map((c) => c.id) } },
        data: { recovery_email_sent_at: new Date() },
      });

      successCount++;
      console.log(`Sent to ${email} (${group.length} cause(s) marked).`);
    } catch (error) {
      failCount++;
      console.error(`Failed to send to ${email}:`, error);
    }
  }

  console.log(`Done. Sent: ${successCount}, Failed: ${failCount}.`);
}

main()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
