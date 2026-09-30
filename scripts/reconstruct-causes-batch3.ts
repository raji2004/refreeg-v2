/**
 * Part 3 of the 2026-09-03 data-loss recovery: creates the remaining causes
 * discovered from the full S3 image listing, excluding the confirmed spam
 * account (f80d2c41...), skipping causes already reconstructed in batches
 * 1-2, applying real titles/goals for the ones matched against Wayback
 * Machine archives, and backfilling real donations for any that have
 * confirmed Paystack funding history (via the cached transaction data).
 *
 * Run: pnpm exec tsx scripts/reconstruct-causes-batch3.ts <path-to-tx-cache.json>
 */
import fs from "fs";
import { prisma } from "../lib/prisma";

const UNCLAIMED_EMAIL = "unclaimed-recovered@refreeg.internal";
const SPAM_USER_ID = "f80d2c41-3970-4295-8daf-32e0d2fa689c";

type RawRow = { causeId: string; userId: string; filename: string };

// causeId,userId,filename — parsed from the full S3 uploads/causes/ listing
const rawRows: RawRow[] = [
  { causeId: "1f670024-a4d8-4075-9d45-ae2de1b8bba2", userId: "3e710902-cdc1-4026-a456-a6db51c11e3e", filename: "t30q99aptc_cover.jpg" },
  { causeId: "3d8e3353-e08c-4f12-b33d-e63a9f1fde26", userId: "5ad74dbb-379c-4bb6-937e-42318829a0a9", filename: "o63ssezce6h.jpeg" },
  { causeId: "94247016-cba6-4d8f-a1bd-603b448e6604", userId: "f814f910-8a40-4264-a205-b73e1ddcba47", filename: "rjq344x2h3_cover.png" },
  { causeId: "e6fef262-0beb-417c-bb0d-0fbdc8601b13", userId: "c029d35f-861b-4046-bba2-011166111221", filename: "o0st53xa69h_cover.jpg" },
  { causeId: "fa72ba8e-32ad-4927-82fa-e2b835fb8f5d", userId: "d85aec1a-21c2-47cf-85f7-63786e4c3e52", filename: "1huophi14mj_cover.jpg" },
  { causeId: "122a994f-7ad8-4996-928a-af6ded237e7f", userId: "69c6d0f6-dbf5-4b32-a3c0-cf71bc951374", filename: "m0306my99v.jpg" },
  { causeId: "c7afae4a-4920-4aa5-96ef-c1c5ceb88637", userId: "ee2e4564-1a0c-4925-ae24-2d5cd0dbd6e2", filename: "3mc7w86s3w7.jpg" },
  { causeId: "ad1e9feb-e196-47c3-a6d9-731077c4c864", userId: "073ceb31-2c16-45fa-a83c-97f957bdfd57", filename: "1i1dqmv8c0o_cover.png" },
  { causeId: "e25ddd71-6ce6-4be2-82f2-0456f5b1c522", userId: "c029d35f-861b-4046-bba2-011166111221", filename: "qqdgwub11a_cover.jpg" },
  { causeId: "eed9d56b-28d6-446e-956f-2ad87b47f9ca", userId: "84d664b6-5fdc-413c-ac7c-01d54a1f0481", filename: "99aqvm3u7kr.jpg" },
  { causeId: "19647484-0202-4ba1-bbd5-a1762f855a2b", userId: "c029d35f-861b-4046-bba2-011166111221", filename: "3jtatzb1o5_cover.jpg" },
  { causeId: "7324ec5b-85eb-4e60-8ecc-09f045a3bb77", userId: "5ad74dbb-379c-4bb6-937e-42318829a0a9", filename: "pvo70z6t9za_cover.jpg" },
  { causeId: "3740aed7-9dd0-485d-a4f4-4403b04d8986", userId: "30f595a9-75fa-42bc-9939-a5db8bb7053c", filename: "4nm2ybhdma8.jpg" },
  { causeId: "cda1dedb-508b-4a77-b39d-43187fafa7b6", userId: "d67ead90-300d-4fad-9299-00eba062dd81", filename: "bvqk5uuetrh_cover.png" },
  { causeId: "c1c4cc00-fae0-4f16-b3d2-e621caf80d32", userId: "dfa6d666-088f-4132-8682-7c8d8724c031", filename: "e88wd3xuid6_cover.jpg" },
  { causeId: "43023967-47c9-45d2-8d60-09ac4d216040", userId: "8f2e9d82-ec7a-4496-91bf-9918e291a470", filename: "nzmeq8f3ex.jpg" },
  { causeId: "745c5d26-6f0e-498f-ab4e-d8b90697e6c5", userId: "5d48464f-f24a-447b-9ec8-ebaf2bc52f58", filename: "25q5qba60x3_cover.jpg" },
  { causeId: "02556c6b-410d-401f-b8e5-924ff862a1f8", userId: "c700abc6-2d9f-4269-9123-15db2008da71", filename: "a1hpmda364r.jpg" },
  { causeId: "05ee7a86-0d10-45a3-9f76-81410b8d1b0e", userId: "a7adb8ca-5323-4ef3-9844-537620f2f1eb", filename: "66n38vvj8yh_cover.jpg" },
  { causeId: "53e6fd70-6427-47b0-bb43-1b5dee87cae9", userId: "b374bdf6-69ea-402e-a3b3-ab20213c9fd8", filename: "ondk9gwknt8_cover.jpg" },
  { causeId: "0e1e55ff-88f2-42a4-a576-88d7199899d4", userId: "8bea6108-00fd-4084-899e-e195fcb27069", filename: "8hj353hppor.jpg" },
  { causeId: "0f1128bb-ae26-4c9f-a303-c5370023fb73", userId: "ad235018-b850-418e-88ef-5aa8c932c0a8", filename: "m8kzz4hbt4c.jpg" },
  { causeId: "013b6b65-8342-4198-9ddb-cb55d30a0a1d", userId: "372c290c-eaf4-43d7-9d9e-fe4075aca479", filename: "u4q9f5p4zpr_cover.jpg" },
  { causeId: "96e436e7-dba6-491f-8e09-1391fe5b9d1f", userId: "e50eb05a-7b83-42aa-8a00-daf061990b4a", filename: "3no35bghwao.jpg" },
  { causeId: "a0b2fa32-f74a-4943-a864-e91ea81484f1", userId: "602af57c-f8c8-4169-a86e-1205cdc0eb13", filename: "5khra9t457l.jpg" },
  { causeId: "326d4186-e074-4af6-9820-22b28a84604d", userId: "28b469fa-be9b-46fd-a31a-8dd5238ce6df", filename: "9bzh6tlsqnq.jpg" },
  { causeId: "3f310cd7-26d6-404b-84cf-02adde2f3b3d", userId: "9946b641-153b-407f-8187-e11fc4f7194c", filename: "prtl20hmxah.png" },
  { causeId: "39706227-10d6-4a0b-a206-44eb967741d6", userId: "c74cb8a8-3891-4742-be1c-c37fce62744d", filename: "1jtxhaba1qh.jpg" },
  { causeId: "1244c77e-af17-4d70-80f3-8038456c3787", userId: "c029d35f-861b-4046-bba2-011166111221", filename: "gnazakypuz4_cover.jpg" },
  { causeId: "254604db-f8cf-4e06-8a9f-c693a3ed758e", userId: "f9729447-9e0b-44cb-aba1-00f1924a2ab8", filename: "k0dyfvw2rw_cover.jpg" },
  { causeId: "1213fd23-f896-4d82-a571-f15108fe5bae", userId: "c029d35f-861b-4046-bba2-011166111221", filename: "oy3hfdfre8l_cover.jpg" },
  { causeId: "6ef1d2b7-0512-4ef2-8b78-40404a9aeeb3", userId: "03b218d3-a6a0-4665-9c84-11b9f0ceea5b", filename: "q5m0g3r35d_cover.jpg" },
  { causeId: "d8213232-a874-4386-965b-c03bcf673555", userId: "91d466f6-25b5-4cec-92be-42b7da277d97", filename: "dmzu7chb4ge.jpg" },
  { causeId: "243381a5-e90d-49f3-a345-5614038e0ee7", userId: "35cb8f59-31da-458a-aa67-165532c11d75", filename: "h5djw04pdpj.jpeg" },
  { causeId: "b57376a5-33e5-4735-a43a-0366a1c878f9", userId: "89863274-df02-4c8e-b6f8-a69e28e35d48", filename: "wnaxb71v73f_cover.jpg" },
  { causeId: "0afe72cf-4c5c-43e3-a6bb-c25f5604aaea", userId: "9946b641-153b-407f-8187-e11fc4f7194c", filename: "1hpmiwbjhemi.jpg" },
  { causeId: "feae2b10-34d2-40c1-93f6-3ad8284f1c18", userId: "f814f910-8a40-4264-a205-b73e1ddcba47", filename: "7rln899yx6s_cover.png" },
  { causeId: "6c1466ca-2d84-41a8-9976-b8cbf974138b", userId: "c520d623-a83f-4afa-b0a8-e54e49d54887", filename: "lrrp17abldo.jpg" },
  { causeId: "4ac0c3ed-4080-4f6d-a492-b09e9b62a861", userId: "602af57c-f8c8-4169-a86e-1205cdc0eb13", filename: "vrbhs85xxsc_cover.webp" },
  { causeId: "4a31b7eb-9dcc-474a-b6a5-912186047eac", userId: "7a041316-b52a-4007-841c-11d13f208e75", filename: "3vgnzqvn8ch.jpg" },
  { causeId: "52fce989-0484-48db-a5f4-6c85fb8d2490", userId: "8f2e9d82-ec7a-4496-91bf-9918e291a470", filename: "e5s9wmejobr.jpg" },
  { causeId: "eb2e2925-bbb3-4884-8d90-bb83d0f90c54", userId: "0d86f7bb-995d-47f1-bba0-45c343e36929", filename: "e31yu8y9nf4_cover.jpg" },
  { causeId: "6b420556-b83c-4c69-93d5-5d33d4dd04c6", userId: "b0ef603f-b9de-40d9-96c4-dbed4b8146b9", filename: "uq3qtid5bcp_cover.jpg" },
  { causeId: "19d3f973-6ff4-4394-90c6-809143c5e391", userId: "6282e412-1d90-4164-ae45-04448856f305", filename: "yvlpmdkovnm.png" },
  { causeId: "c3e0372d-d637-4066-849d-fc1b8914bedd", userId: "3a9f3f6c-ab14-4bd4-a919-543903944562", filename: "338lgjk5o64.jpg" },
];

// Real content recovered from Wayback Machine for a handful of these
const knownContent: Record<string, { title: string; category: string; goal: number; location?: string; summary?: string; description?: string; creatorName?: string }> = {
  "fa72ba8e-32ad-4927-82fa-e2b835fb8f5d": {
    title: "Pad a Girl Project",
    category: "community",
    goal: 1400000,
    location: "Kaduna, Nigeria",
    summary: "Join us in empowering students in Kaduna State by providing sexual health education, sanitary products, and essential school supplies through our Pad a Girl Project.",
    creatorName: "Reflect + Revive Community",
  },
  "3740aed7-9dd0-485d-a4f4-4403b04d8986": {
    title: "Take them off the dangers of the street",
    category: "community",
    goal: 5700000,
    location: "Location on request",
    summary: "sponsoring a skill center like the small branding and clothing firm that I started sometimes ago whereby few kids were invited for training from the streets to become useful instead of menace to society",
    creatorName: "Akindilureni Alex",
  },
  "02556c6b-410d-401f-b8e5-924ff862a1f8": {
    title: "AI-Powered Housing Transparency Platform for Nigeria",
    category: "business",
    goal: 500000,
    location: "Lagos, Nigeria",
    summary: "We are building a technology-driven platform to reduce housing scams, improve property verification, and make finding trusted homes in Nigeria easier, safer, and more transparent.",
    creatorName: "Ayomide Oladosu",
  },
  "96e436e7-dba6-491f-8e09-1391fe5b9d1f": {
    title: "Operation register Omini tech",
    category: "business",
    goal: 500000,
    location: "Abuja, Nigeria",
    summary: "Verified, milestone-based relief with evidence-locked releases and transparent updates.",
    creatorName: "Chimda Innocent",
  },
  "326d4186-e074-4af6-9820-22b28a84604d": {
    title: "Support My Husband's Dream to Complete His Studies.",
    category: "education",
    goal: 9000000,
    location: "Abuja",
    summary: "Support my husband's education as we raise £4,666 for his next tuition payment.",
    creatorName: "Marvelous Okonkwo",
  },
  "d8213232-a874-4386-965b-c03bcf673555": {
    title: "AI-Powered Blueprint Generator for Smart Building design",
    category: "business",
    goal: 1500000,
    location: "Abuja",
    summary: "We're building an AI tool that lets anyone generate building blueprints instantly—no architectural experience needed.",
    creatorName: "Fawaz Yusuf",
  },
  "6c1466ca-2d84-41a8-9976-b8cbf974138b": {
    title: "The Thrive Project",
    category: "community",
    goal: 500000,
    location: "Enugu, Nigeria",
    summary: "Helping people (especially young children) not just survive, but thrive through support, skills, and opportunities.",
    creatorName: "Bethel Osondu",
  },
  "c3e0372d-d637-4066-849d-fc1b8914bedd": {
    title: "From Waste to Water: A Community Stream Restoration Driving Child Health and Sustainable Development",
    category: "environment",
    goal: 500000,
    location: "Ibadan",
    summary: "Verified, milestone-based relief with evidence-locked releases and transparent updates.",
    creatorName: "Ibrahim Diekola",
  },
};

async function main() {
  const cachePath = process.argv[2];
  const cache: Record<string, any> = cachePath && fs.existsSync(cachePath)
    ? JSON.parse(fs.readFileSync(cachePath, "utf8"))
    : {};

  const byCauseFromCache = new Map<string, any[]>();
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const tx of Object.values(cache)) {
    const causeId = (tx as any)?.metadata?.cause_id;
    if (!causeId || !UUID_RE.test(causeId)) continue;
    if (!byCauseFromCache.has(causeId)) byCauseFromCache.set(causeId, []);
    byCauseFromCache.get(causeId)!.push(tx);
  }

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

  const rows = rawRows.filter((r) => r.userId !== SPAM_USER_ID);
  console.log(`Processing ${rows.length} causes (excluded ${rawRows.length - rows.length} spam-account rows)`);

  let created = 0;
  let skipped = 0;
  for (const row of rows) {
    const existing = await prisma.cause.findUnique({ where: { id: row.causeId } });
    if (existing) {
      skipped++;
      continue;
    }

    const known = knownContent[row.causeId];
    const imageKey = `uploads/causes/${row.userId}/${row.causeId}/images/${row.filename}`;
    const funding = byCauseFromCache.get(row.causeId) || [];
    const fundedTotal = funding.reduce((sum, tx) => sum + tx.amount / 100, 0);

    const note = known
      ? `Recovered from public Wayback Machine archive. Original creator: ${known.creatorName} (original account id ${row.userId}). Story/goal/location recovered; donation history and supporter list were lost in the 2026-09-03 incident${funding.length ? ", except donations confirmed via Paystack below." : "."}`
      : `Recovered from S3 image only (original account id ${row.userId}) — no title, story, or goal survived. Placeholder values below need the real creator to fill in.`;

    await prisma.cause.create({
      data: {
        id: row.causeId,
        userId: unclaimed.id,
        title: known?.title || "Untitled campaign (recovered image only)",
        category: known?.category || "community",
        goal: known?.goal || Math.max(500000, Math.ceil(fundedTotal * 1.5)),
        raised: fundedTotal,
        status: "approved",
        image: imageKey,
        location: known?.location,
        summary: known?.summary,
        description: known?.description ?? known?.summary ?? "",
        reconstructed: true,
        reconstruction_note: note,
      },
    });
    created++;

    for (const tx of funding) {
      const existingDonation = await prisma.donation.findUnique({
        where: { paystack_reference: tx.reference },
      });
      if (existingDonation) continue;
      await prisma.donation.create({
        data: {
          causeId: row.causeId,
          amount: tx.amount / 100,
          name: tx.metadata?.customer_name || tx.customer?.first_name || "Anonymous",
          email: tx.customer?.email || tx.metadata?.email,
          message: tx.metadata?.message || null,
          is_anonymous: !!tx.metadata?.is_anonymous,
          status: "completed",
          paystack_reference: tx.reference,
          payment_provider: "paystack",
          createdAt: new Date(tx.paid_at || tx.created_at),
        },
      });
    }

    console.log(`Created ${row.causeId} - ${known?.title || "(untitled)"} ${funding.length ? `[${funding.length} real donations, N${fundedTotal.toLocaleString()}]` : ""}`);
  }

  console.log(`\nDone. ${created} causes created, ${skipped} already existed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
