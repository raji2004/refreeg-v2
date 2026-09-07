// run with: npx tsx scripts/invalidate-incident-sessions.ts
//
// Sets sessions_invalidated_after = now() for every account affected by the
// 2026-09-03 data-loss incident — the same population scripts/send-recovery-emails.ts
// emails: anyone who currently owns a reconstructed cause, plus anyone whose
// account email matches a reconstructed cause's recovered_owner_email (in
// case they already had an account under that address before claiming).
//
// Once set, the next request either of those accounts makes to a
// Node-runtime auth-guarded route (currently app/dashboard/layout.tsx —
// see lib/auth/session-guard.ts) forces a fresh sign-in, clearing out
// whatever broken/stale session state they were carrying. Accounts created
// or signed into AFTER this script runs are unaffected — the check only
// rejects sessions issued before the cutoff.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Finding accounts affected by the data-loss incident...");

  const reconstructedCauses = await prisma.cause.findMany({
    where: { reconstructed: true },
    select: { userId: true, recovered_owner_email: true },
  });

  console.log(`Found ${reconstructedCauses.length} reconstructed cause(s).`);

  if (reconstructedCauses.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  const ownerIds = new Set(reconstructedCauses.map((c) => c.userId));
  const recoveredEmails = Array.from(
    new Set(
      reconstructedCauses
        .map((c) => c.recovered_owner_email?.toLowerCase().trim())
        .filter((email): email is string => !!email),
    ),
  );

  const usersByEmail =
    recoveredEmails.length > 0
      ? await prisma.user.findMany({
          where: { email: { in: recoveredEmails } },
          select: { id: true, email: true },
        })
      : [];

  const affectedIds = new Set<string>([
    ...ownerIds,
    ...usersByEmail.map((u) => u.id),
  ]);

  console.log(`Affected accounts: ${affectedIds.size} distinct user(s).`);

  if (affectedIds.size === 0) {
    console.log("Nothing to do.");
    return;
  }

  const cutoff = new Date();
  const result = await prisma.user.updateMany({
    where: { id: { in: Array.from(affectedIds) } },
    data: { sessions_invalidated_after: cutoff },
  });

  console.log(
    `Set sessions_invalidated_after=${cutoff.toISOString()} on ${result.count} account(s).`,
  );
}

main()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
