import { PrismaClient } from "@prisma/client";

/**
 * Deletes causes created by the E2E suite (title LIKE 'E2E Cause%')
 * and related child rows via raw SQL.
 *
 * Requires DATABASE_URL (same DB as apps.refreeg.com when running prod E2E).
 */
export async function deleteE2eCauses(): Promise<number> {
  const prisma = new PrismaClient();

  try {
    const targets = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM causes WHERE title LIKE 'E2E Cause%'
    `;

    if (targets.length === 0) {
      console.log("[e2e cleanup] No E2E causes to delete.");
      return 0;
    }

    console.log(`[e2e cleanup] Deleting ${targets.length} E2E cause(s)...`);

    await prisma.$executeRaw`
      DELETE FROM cause_edit_sections
      WHERE cause_edit_id IN (
        SELECT id FROM cause_edits
        WHERE original_cause_id IN (
          SELECT id FROM causes WHERE title LIKE 'E2E Cause%'
        )
      )
    `;
    await prisma.$executeRaw`
      DELETE FROM cause_edits
      WHERE original_cause_id IN (
        SELECT id FROM causes WHERE title LIKE 'E2E Cause%'
      )
    `;
    await prisma.$executeRaw`
      DELETE FROM cause_sections
      WHERE cause_id IN (SELECT id FROM causes WHERE title LIKE 'E2E Cause%')
    `;
    await prisma.$executeRaw`
      DELETE FROM cause_shares
      WHERE cause_id IN (SELECT id FROM causes WHERE title LIKE 'E2E Cause%')
    `;
    await prisma.$executeRaw`
      DELETE FROM campaign_follows
      WHERE cause_id IN (SELECT id FROM causes WHERE title LIKE 'E2E Cause%')
    `;
    await prisma.$executeRaw`
      DELETE FROM comments
      WHERE cause_id IN (SELECT id FROM causes WHERE title LIKE 'E2E Cause%')
    `;
    await prisma.$executeRaw`
      DELETE FROM donations
      WHERE cause_id IN (SELECT id FROM causes WHERE title LIKE 'E2E Cause%')
    `;
    await prisma.$executeRaw`
      DELETE FROM crypto_donations
      WHERE cause_id IN (SELECT id FROM causes WHERE title LIKE 'E2E Cause%')
    `;
    await prisma.$executeRaw`
      DELETE FROM matching_donations
      WHERE cause_id IN (SELECT id FROM causes WHERE title LIKE 'E2E Cause%')
    `;
    await prisma.$executeRaw`
      DELETE FROM matching_pool_causes
      WHERE cause_id IN (SELECT id FROM causes WHERE title LIKE 'E2E Cause%')
    `;
    await prisma.$executeRaw`
      DELETE FROM pledges
      WHERE cause_id IN (SELECT id FROM causes WHERE title LIKE 'E2E Cause%')
    `;
    await prisma.$executeRaw`
      DELETE FROM subscriptions
      WHERE cause_id IN (SELECT id FROM causes WHERE title LIKE 'E2E Cause%')
    `;

    const deleted = await prisma.$executeRaw`
      DELETE FROM causes WHERE title LIKE 'E2E Cause%'
    `;

    console.log(`[e2e cleanup] Deleted ${deleted} E2E cause row(s).`);
    return Number(deleted);
  } catch (error) {
    console.error("[e2e cleanup] Failed to delete E2E causes:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export default async function globalTeardown() {
  if (process.env.REFREEG_E2E_SKIP_CLEANUP === "true") {
    console.log("[e2e cleanup] Skipped (REFREEG_E2E_SKIP_CLEANUP=true).");
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.warn(
      "[e2e cleanup] DATABASE_URL is not set — cannot delete E2E causes. " +
        "Use the same DATABASE_URL as the app under test, or set REFREEG_E2E_SKIP_CLEANUP=true.",
    );
    return;
  }

  await deleteE2eCauses();
}
