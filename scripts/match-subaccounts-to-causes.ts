/**
 * One-off recovery script: pulls every successful transaction directly from
 * Paystack's List Transactions API (no CSV export needed — the list
 * response already carries `metadata.cause_id` and the `subaccount` split
 * per transaction), then joins each cause to the real bank-account holder
 * name from paystack-subaccounts.csv (see list-paystack-subaccounts.ts).
 *
 * This is a stronger identity signal than the April auth.audit_log_entries
 * match used elsewhere in the recovery — it's the actual payout name tied
 * to that specific cause's fund split, not a guessed signup record.
 *
 * Run: pnpm exec tsx scripts/match-subaccounts-to-causes.ts
 */
import fs from "fs";
import { prisma } from "../lib/prisma";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

async function fetchTransactionsPage(page: number) {
  const res = await fetch(
    `https://api.paystack.co/transaction?perPage=50&page=${page}&status=success`,
    { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } },
  );
  if (!res.ok) throw new Error(`Paystack API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  if (!PAYSTACK_SECRET_KEY) {
    console.error("PAYSTACK_SECRET_KEY not set in environment");
    process.exit(1);
  }

  const subaccountsCsvPath = "scripts/paystack-subaccounts.csv";
  if (!fs.existsSync(subaccountsCsvPath)) {
    console.error(`${subaccountsCsvPath} not found — run list-paystack-subaccounts.ts first`);
    process.exit(1);
  }
  const subaccounts = parseCsv(subaccountsCsvPath);
  const subaccountByCode = new Map(subaccounts.map((s) => [s.subaccount_code, s]));

  console.log("Fetching all successful transactions from Paystack...");
  const all: any[] = [];
  let page = 1;
  while (true) {
    const json = await fetchTransactionsPage(page);
    const rows = json?.data ?? [];
    all.push(...rows);
    const total = json?.meta?.total ?? rows.length;
    console.log(`  page ${page}: ${rows.length} rows (${all.length}/${total} so far)`);
    if (all.length >= total || rows.length === 0) break;
    page++;
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log(`\nFetched ${all.length} successful transactions.\n`);

  type CauseLink = {
    causeId: string;
    subaccountCode: string;
    holderName: string;
    bank: string;
    accountNumber: string;
    txCount: number;
    total: number;
  };
  const byCause = new Map<string, CauseLink>();
  let noCauseId = 0;
  let noSubaccount = 0;

  for (const tx of all) {
    const causeId = tx?.metadata?.cause_id;
    const subaccountCode = tx?.subaccount?.subaccount_code;
    const amount = (tx?.amount || 0) / 100;

    if (!causeId || !UUID_RE.test(causeId)) {
      noCauseId++;
      continue;
    }
    if (!subaccountCode) {
      noSubaccount++;
      continue;
    }
    const sub = subaccountByCode.get(subaccountCode);
    if (!byCause.has(causeId)) {
      byCause.set(causeId, {
        causeId,
        subaccountCode,
        holderName: sub?.business_name || "(unknown — not in subaccount list)",
        bank: sub?.settlement_bank || "",
        accountNumber: sub?.account_number || "",
        txCount: 0,
        total: 0,
      });
    }
    const entry = byCause.get(causeId)!;
    entry.txCount++;
    entry.total += amount;
  }

  console.log(
    `Linked ${byCause.size} causes to a subaccount holder name. ` +
      `(${noCauseId} transactions had no usable cause_id, ${noSubaccount} had no subaccount split.)\n`,
  );

  const causeIds = [...byCause.keys()];
  const knownCauses = await prisma.cause.findMany({
    where: { id: { in: causeIds } },
    select: { id: true, title: true, reconstructed: true, recovered_owner_email: true },
  });
  const knownMap = new Map(knownCauses.map((c) => [c.id, c]));

  const outLines = [
    "cause_id,cause_title,in_db,already_has_owner_email,subaccount_code,holder_name,bank,account_number,donation_count,total_ngn",
  ];
  for (const link of byCause.values()) {
    const known = knownMap.get(link.causeId);
    outLines.push(
      [
        link.causeId,
        known ? `"${known.title.replace(/"/g, '""')}"` : "NOT IN DB",
        known ? "yes" : "no",
        known?.recovered_owner_email ? "yes" : "no",
        link.subaccountCode,
        `"${link.holderName.replace(/"/g, '""')}"`,
        `"${link.bank.replace(/"/g, '""')}"`,
        link.accountNumber,
        link.txCount,
        link.total,
      ].join(","),
    );
  }
  const outPath = "scripts/cause-subaccount-holders.csv";
  fs.writeFileSync(outPath, outLines.join("\n"));
  console.log("Wrote:", outPath);

  console.log("\nCauses currently in DB, linked to a real bank-account holder name:");
  for (const link of byCause.values()) {
    const known = knownMap.get(link.causeId);
    if (!known) continue;
    console.log(
      ` ${link.causeId} - "${known.title}" -> ${link.holderName} (${link.bank} ${link.accountNumber})` +
        (known.recovered_owner_email ? ` [already has email: ${known.recovered_owner_email}]` : " [no owner email yet]"),
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
