/**
 * One-off recovery script: pulls every subaccount from Paystack directly
 * (GET /subaccount) — this is external data, untouched by the 2026-09-03
 * DB reset. Each subaccount carries the real bank account holder's name,
 * which is a stronger identity signal than the stale April audit-log
 * matches used elsewhere in the recovery, since it's the actual payout
 * name tied to a specific cause's fund split.
 *
 * Run: pnpm exec tsx scripts/list-paystack-subaccounts.ts
 */
import fs from "fs";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

async function fetchSubaccountsPage(page: number) {
  const res = await fetch(
    `https://api.paystack.co/subaccount?perPage=50&page=${page}`,
    { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } },
  );
  if (!res.ok) {
    throw new Error(`Paystack API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  if (!PAYSTACK_SECRET_KEY) {
    console.error("PAYSTACK_SECRET_KEY not set in environment");
    process.exit(1);
  }

  const all: any[] = [];
  let page = 1;
  while (true) {
    const json = await fetchSubaccountsPage(page);
    const rows = json?.data ?? [];
    all.push(...rows);
    const total = json?.meta?.total ?? rows.length;
    console.log(`  page ${page}: ${rows.length} rows (${all.length}/${total} so far)`);
    if (all.length >= total || rows.length === 0) break;
    page++;
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`\nFetched ${all.length} subaccounts from Paystack.\n`);

  const outLines = [
    "subaccount_code,business_name,settlement_bank,account_number,percentage_charge,active,created_at",
  ];
  for (const s of all) {
    outLines.push(
      [
        s.subaccount_code,
        `"${(s.business_name || "").replace(/"/g, '""')}"`,
        `"${(s.settlement_bank || "").replace(/"/g, '""')}"`,
        s.account_number,
        s.percentage_charge,
        s.active,
        s.createdAt,
      ].join(","),
    );
  }

  const outPath = "scripts/paystack-subaccounts.csv";
  fs.writeFileSync(outPath, outLines.join("\n"));
  console.log("Wrote:", outPath);

  console.log("\nAll subaccounts:");
  all.forEach((s) => {
    console.log(
      ` ${s.subaccount_code} - ${s.business_name} - ${s.settlement_bank} ${s.account_number} - ${s.percentage_charge}% - ${s.active ? "active" : "inactive"}`,
    );
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
