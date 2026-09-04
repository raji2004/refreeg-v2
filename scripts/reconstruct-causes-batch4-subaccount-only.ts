/**
 * Part 4 of the 2026-09-03 data-loss recovery: creates the 15 causes
 * discovered via Paystack subaccount/transaction matching
 * (scripts/match-subaccounts-to-causes.ts) that were missed by the
 * original S3-image-listing-based batches 1-3 — these have real donation
 * history but no surviving S3 image and no Wayback archive, so there's
 * nothing to recover beyond the bank-account holder's name and the
 * donation total. Pure placeholders, same spirit as the "recovered image
 * only" rows from earlier batches but with even less to go on.
 *
 * Run: pnpm exec tsx scripts/reconstruct-causes-batch4-subaccount-only.ts
 */
import fs from "fs";
import { prisma } from "../lib/prisma";

const UNCLAIMED_EMAIL = "unclaimed-recovered@refreeg.internal";

function parseCsv(path: string) {
  const text = fs.readFileSync(path, "utf8").replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter(Boolean);
  function parseLine(line: string) {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (c === '"') inQuotes = false;
        else cur += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ",") {
          out.push(cur);
          cur = "";
        } else cur += c;
      }
    }
    out.push(cur);
    return out;
  }
  const header = parseLine(lines[0]);
  return lines.slice(1).map((l) => {
    const cols = parseLine(l);
    const row: Record<string, string> = {};
    header.forEach((h, i) => (row[h] = cols[i]));
    return row;
  });
}

async function main() {
  const rows = parseCsv("scripts/cause-subaccount-holders.csv").filter(
    (r) => r.in_db === "no",
  );
  console.log(`${rows.length} causes to create (subaccount-only, no image/archive found).`);

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

  let created = 0;
  let skipped = 0;
  for (const row of rows) {
    const causeId = row.cause_id;
    const existing = await prisma.cause.findUnique({ where: { id: causeId } });
    if (existing) {
      skipped++;
      continue;
    }

    const raised = Number(row.total_ngn) || 0;
    const holderName = row.holder_name;

    await prisma.cause.create({
      data: {
        id: causeId,
        userId: unclaimed.id,
        title: "Untitled campaign (no image or archive found)",
        category: "community",
        goal: Math.max(500000, Math.ceil(raised * 1.5)),
        raised,
        status: "approved",
        image: null,
        description: "",
        reconstructed: true,
        reconstruction_note:
          `Recovered from Paystack subaccount/transaction matching only — no S3 image and no ` +
          `Wayback Machine archive survived. Bank-account holder on file for this campaign's payout: ` +
          `${holderName} (${row.bank} ${row.account_number}). Donation total (₦${raised.toLocaleString()} ` +
          `across ${row.donation_count} transaction${row.donation_count === "1" ? "" : "s"}) is real, ` +
          `confirmed via Paystack; title, story, and goal are placeholders needing the real creator to fill in.`,
      },
    });
    created++;
    console.log(`Created ${causeId} - holder: ${holderName} - ₦${raised.toLocaleString()} raised`);
  }

  console.log(`\nDone. ${created} causes created, ${skipped} already existed.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
