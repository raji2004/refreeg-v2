/**
 * One-off recovery script: reads the Paystack transaction export, calls
 * GET /transaction/:id for each row to pull metadata.cause_id (not present
 * in the CSV export), and produces a per-cause funding summary — total
 * raised and the donor list, cross-referenced against causes already
 * reconstructed in the DB.
 *
 * Run: pnpm exec tsx scripts/map-donations-to-causes.ts <path-to-csv>
 */
import fs from "fs";
import { prisma } from "../lib/prisma";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

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
        } else if (c === '"') {
          inQuotes = false;
        } else cur += c;
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

async function fetchTransaction(id: string) {
  const res = await fetch(`https://api.paystack.co/transaction/${id}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data ?? null;
}

async function main() {
  if (!PAYSTACK_SECRET_KEY) {
    console.error("PAYSTACK_SECRET_KEY not set in environment");
    process.exit(1);
  }
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: tsx scripts/map-donations-to-causes.ts <csv-path>");
    process.exit(1);
  }

  const rows = parseCsv(csvPath).filter((r) => r.Status === "success");
  console.log(`Fetching metadata for ${rows.length} transactions...`);

  const cachePath = csvPath.replace(/\.csv$/, "") + "-tx-cache.json";
  const cache: Record<string, any> = fs.existsSync(cachePath)
    ? JSON.parse(fs.readFileSync(cachePath, "utf8"))
    : {};

  type CauseFunding = {
    causeId: string;
    total: number;
    donors: { email: string; amount: number; date: string }[];
  };
  const byCause = new Map<string, CauseFunding>();
  let noMetadata = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let tx = cache[row.Id];
    if (!tx) {
      tx = await fetchTransaction(row.Id);
      cache[row.Id] = tx;
      await new Promise((r) => setTimeout(r, 120));
    }
    const causeId = tx?.metadata?.cause_id;
    const email = tx?.customer?.email || row["Customer Email"];
    const amount = parseFloat(row.Amount) || 0;

    if (!causeId) {
      noMetadata++;
    } else {
      if (!byCause.has(causeId)) {
        byCause.set(causeId, { causeId, total: 0, donors: [] });
      }
      const entry = byCause.get(causeId)!;
      entry.total += amount;
      entry.donors.push({ email, amount, date: row["Paid At"] });
    }

    if ((i + 1) % 20 === 0) console.log(`  ...${i + 1}/${rows.length}`);
  }
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));

  console.log(`\nDone. ${byCause.size} distinct causes funded, ${noMetadata} transactions had no cause_id metadata.\n`);

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const causeIds = [...byCause.keys()].filter((id) => UUID_RE.test(id));
  const malformedIds = [...byCause.keys()].filter((id) => !UUID_RE.test(id));
  if (malformedIds.length) {
    console.log("Non-UUID cause_id values found (likely petitions or test data):", malformedIds);
  }
  const knownCauses = await prisma.cause.findMany({
    where: { id: { in: causeIds } },
    select: { id: true, title: true, reconstructed: true },
  });
  const knownMap = new Map(knownCauses.map((c) => [c.id, c]));

  const summary = [...byCause.values()].sort((a, b) => b.total - a.total);
  const outLines = ["cause_id,cause_title,in_db,total_ngn,donor_count,donor_emails"];
  for (const c of summary) {
    const known = knownMap.get(c.causeId);
    outLines.push(
      [
        c.causeId,
        known ? `"${known.title.replace(/"/g, '""')}"` : "NOT IN DB",
        known ? "yes" : "no",
        c.total,
        c.donors.length,
        `"${c.donors.map((d) => d.email).join("; ")}"`,
      ].join(","),
    );
  }

  const outPath = csvPath.replace(/\.csv$/, "") + "-cause-funding-map.csv";
  fs.writeFileSync(outPath, outLines.join("\n"));
  console.log("Wrote:", outPath);
  console.log("\nTop funded causes:");
  summary.slice(0, 15).forEach((c) => {
    const known = knownMap.get(c.causeId);
    console.log(
      ` ${c.causeId} ${known ? "[" + (known.reconstructed ? "reconstructed" : "in-db") + "]" : "[NOT IN DB]"} - ${known?.title ?? "?"} - N${c.total.toLocaleString()} across ${c.donors.length} donations`,
    );
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
