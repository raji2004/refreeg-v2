/**
 * Part 2 of the 2026-09-03 data-loss recovery:
 *  1. Creates the 2 highest-value causes confirmed by real Paystack funding
 *     but not yet reconstructed (91ba9f28, 4455ed3e).
 *  2. Backfills real Donation rows (not just aggregate totals) for every
 *     cause that has confirmed Paystack metadata, using the cached
 *     transaction data from map-donations-to-causes.ts (already has
 *     customer_name, message, is_anonymous, reference — no new API calls).
 *  3. Recomputes each affected cause's `raised` as the true sum of its
 *     donations.
 *
 * Run: pnpm exec tsx scripts/reconstruct-causes-batch2-and-donations.ts <path-to-tx-cache.json>
 */
import fs from "fs";
import { prisma } from "../lib/prisma";

const UNCLAIMED_EMAIL = "unclaimed-recovered@refreeg.internal";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const newCauses = [
  {
    id: "91ba9f28-509c-4fa4-8c35-5298c3dc38ef",
    originalUserId: "35cb8f59-31da-458a-aa67-165532c11d75",
    imageKey:
      "uploads/causes/35cb8f59-31da-458a-aa67-165532c11d75/91ba9f28-509c-4fa4-8c35-5298c3dc38ef/images/jk9na4d1gi.jpg",
    title: "Untitled campaign (recovered image only)",
    category: "community",
    goal: 2000000,
  },
  {
    id: "4455ed3e-cef5-4175-a943-aee05fdd6c43",
    originalUserId: "84ddd520-a5d3-43f0-a3b0-472d3998547f",
    imageKey:
      "uploads/causes/84ddd520-a5d3-43f0-a3b0-472d3998547f/4455ed3e-cef5-4175-a943-aee05fdd6c43/images/q17s72bnk2_cover.jpg",
    title: "Untitled campaign (recovered image only)",
    category: "community",
    goal: 500000,
  },
];

async function main() {
  const cachePath = process.argv[2];
  if (!cachePath) {
    console.error("Usage: tsx scripts/reconstruct-causes-batch2-and-donations.ts <tx-cache.json>");
    process.exit(1);
  }
  const cache: Record<string, any> = JSON.parse(fs.readFileSync(cachePath, "utf8"));

  const unclaimed = await prisma.user.upsert({
    where: { email: UNCLAIMED_EMAIL },
    update: {},
    create: {
      email: UNCLAIMED_EMAIL,
      fullName: "Unclaimed (recovered campaign)",
      onboarding_completed: true,
      isVerified: false,
    },
  });

  for (const c of newCauses) {
    await prisma.cause.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        userId: unclaimed.id,
        title: c.title,
        category: c.category,
        goal: c.goal,
        raised: 0,
        status: "approved",
        image: c.imageKey,
        description: "",
        reconstructed: true,
        reconstruction_note: `Recovered from S3 image + confirmed Paystack funding history (original account id ${c.originalUserId}). No title/story survived — needs the real creator to fill in.`,
      },
    });
    console.log("Created cause:", c.id);
  }

  const byCause = new Map<string, any[]>();
  for (const [txId, tx] of Object.entries(cache)) {
    const causeId = tx?.metadata?.cause_id;
    if (!causeId || !UUID_RE.test(causeId)) continue;
    if (!byCause.has(causeId)) byCause.set(causeId, []);
    byCause.get(causeId)!.push(tx);
  }

  const existingCauses = await prisma.cause.findMany({
    where: { id: { in: [...byCause.keys()] } },
    select: { id: true },
  });
  const existingIds = new Set(existingCauses.map((c) => c.id));

  let donationsCreated = 0;
  for (const [causeId, txs] of byCause) {
    if (!existingIds.has(causeId)) continue;

    for (const tx of txs) {
      const reference = tx.reference;
      const existing = await prisma.donation.findUnique({
        where: { paystack_reference: reference },
      });
      if (existing) continue;

      await prisma.donation.create({
        data: {
          causeId,
          amount: tx.amount / 100,
          name: tx.metadata?.customer_name || tx.customer?.first_name || "Anonymous",
          email: tx.customer?.email || tx.metadata?.email,
          message: tx.metadata?.message || null,
          is_anonymous: !!tx.metadata?.is_anonymous,
          status: "completed",
          paystack_reference: reference,
          payment_provider: "paystack",
          createdAt: new Date(tx.paid_at || tx.created_at),
        },
      });
      donationsCreated++;
    }

    const sum = await prisma.donation.aggregate({
      where: { causeId },
      _sum: { amount: true },
    });
    await prisma.cause.update({
      where: { id: causeId },
      data: { raised: sum._sum.amount || 0 },
    });
    console.log(`Backfilled ${causeId}: raised = ${sum._sum.amount}`);
  }

  console.log(`\nDone. ${donationsCreated} donation records created.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
