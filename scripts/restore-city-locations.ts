/**
 * Restore missing city lookup records without overwriting existing IDs.
 * Source: https://github.com/dr5hn/countries-states-cities-database (ODbL-1.0).
 * Download json-cities.json.gz from that project's GitHub releases, then run:
 * pnpm exec tsx scripts/restore-city-locations.ts /path/to/json-cities.json.gz
 * Add --apply to insert after reviewing the dry-run counts.
 * Uses DATABASE_URL from the environment, then .env.local / .env as fallbacks.
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { config } from "dotenv";
import { PrismaClient, type Prisma } from "@prisma/client";
import { z } from "zod";

config({ path: [".env.local", ".env"], quiet: true });

const coordinate = (min: number, max: number) =>
  z.union([z.number(), z.string().trim().min(1)])
    .pipe(z.coerce.number().finite().min(min).max(max));
const citySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1),
  state_id: z.number().int().positive(),
  state_code: z.string(),
  state_name: z.string(),
  country_id: z.number().int().positive(),
  country_code: z.string().length(2),
  country_name: z.string().trim().min(1),
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
  wikiDataId: z.string().nullish(),
});

async function main() {
  const file = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  if (!file) throw new Error("Provide a cities JSON or JSON.gz file, optionally followed by --apply");
  const bytes = readFileSync(file);
  const source: unknown = JSON.parse(
    (file.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString("utf8"),
  );
  if (!Array.isArray(source) || !source.length) throw new Error("Expected a non-empty cities array");
  const rows: Prisma.CityCreateManyInput[] = [];
  let skipped = 0;
  for (const item of source) {
    const result = citySchema.safeParse(item);
    if (!result.success) { skipped++; continue; }
    const { state_id, ...city } = result.data;
    rows.push({ ...city, stateId: state_id });
  }
  if (!rows.length) throw new Error("No valid city records with coordinates found");

  const db = new PrismaClient();
  try {
    const before = await db.city.count();
    console.log(JSON.stringify({ existing: before, validSourceRows: rows.length, invalidSourceRows: skipped }));
    if (!process.argv.includes("--apply")) {
      console.log("Dry run complete. Add --apply to insert missing IDs; existing records are preserved.");
      return;
    }
    let inserted = 0;
    for (let offset = 0; offset < rows.length; offset += 1000) {
      const result = await db.city.createMany({ data: rows.slice(offset, offset + 1000), skipDuplicates: true });
      inserted += result.count;
      if (offset % 20000 === 0) console.log(`Inserted ${inserted} cities...`);
    }
    console.log(JSON.stringify({ inserted, total: await db.city.count() }));
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "City restore failed");
  process.exitCode = 1;
});
