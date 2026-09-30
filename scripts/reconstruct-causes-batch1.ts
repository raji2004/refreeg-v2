/**
 * One-off recovery script for the 2026-09-03 data-loss incident.
 * Creates a placeholder "unclaimed" profile (every Cause needs a real
 * userId) and reinserts a first batch of 16 causes recovered from S3 image
 * keys + Wayback Machine archives, preserving their original cause IDs so
 * old links/bookmarks keep working. All flagged reconstructed: true.
 *
 * Run once: pnpm exec tsx scripts/reconstruct-causes-batch1.ts
 */
import { prisma } from "../lib/prisma";

const UNCLAIMED_EMAIL = "unclaimed-recovered@refreeg.internal";

type RecoveredCause = {
  id: string;
  originalUserId: string;
  imageKey: string;
  title: string;
  category: string;
  goal: number;
  location?: string;
  summary?: string;
  description?: string;
  creatorName?: string;
  createdAt?: string;
  known: boolean;
};

const causes: RecoveredCause[] = [
  {
    id: "2aab1eba-ecd0-4f1a-9ec6-9193ab541395",
    originalUserId: "a1b9a9c1-3cbc-4a3d-bc3b-38d7e369a079",
    imageKey:
      "uploads/causes/a1b9a9c1-3cbc-4a3d-bc3b-38d7e369a079/2aab1eba-ecd0-4f1a-9ec6-9193ab541395/images/2hxi76wcg6l.jpg",
    title: "Pebble AI: Building the First Screenless AI Wearable in Nigeria.",
    category: "creative",
    goal: 5000000,
    location: "Enugu",
    summary:
      "We are building a premium, voice-first AI pendant and ring to help founders beat screen distraction and boost deep work.",
    creatorName: "Adekunle Oluwatobi",
    createdAt: "2026-04-10",
    known: true,
  },
  {
    id: "35896095-8cff-40fc-b522-ffd235a613c6",
    originalUserId: "0c50e3da-c8e7-4801-b3c0-d2a112466406",
    imageKey:
      "uploads/causes/0c50e3da-c8e7-4801-b3c0-d2a112466406/35896095-8cff-40fc-b522-ffd235a613c6/images/1fiyml7ngsjj.png",
    title: "Support Us To Build the Future of Digital Education with Academia HQ",
    category: "education",
    goal: 500000,
    location: "Ibadan. Nigeria",
    summary:
      "Verified, milestone-based relief with evidence-locked releases and transparent updates.",
    creatorName: "Adebayo Sunday",
    createdAt: "2026-04-02",
    known: true,
  },
  {
    id: "604e262d-24f6-483b-bc45-7eb4e64ffd03",
    originalUserId: "f814f910-8a40-4264-a205-b73e1ddcba47",
    imageKey:
      "uploads/causes/f814f910-8a40-4264-a205-b73e1ddcba47/604e262d-24f6-483b-bc45-7eb4e64ffd03/images/sd913tnqu1j_cover.jpg",
    title: "Untitled campaign (recovered image only)",
    category: "community",
    goal: 500000,
    known: false,
  },
  {
    id: "4d40cc17-ce52-482e-be7f-fe1b047b7938",
    originalUserId: "e51daa49-0f58-4917-8ada-54577fedf5dd",
    imageKey:
      "uploads/causes/e51daa49-0f58-4917-8ada-54577fedf5dd/4d40cc17-ce52-482e-be7f-fe1b047b7938/images/4w16y80rmei_cover.jpg",
    title: "Untitled campaign (recovered image only)",
    category: "community",
    goal: 500000,
    known: false,
  },
  {
    id: "729b5529-e542-42bc-bee8-bd03445feef1",
    originalUserId: "6282e412-1d90-4164-ae45-04448856f305",
    imageKey:
      "uploads/causes/6282e412-1d90-4164-ae45-04448856f305/729b5529-e542-42bc-bee8-bd03445feef1/images/1bio76tirtz.webp",
    title: "Untitled campaign (recovered image only)",
    category: "community",
    goal: 500000,
    known: false,
  },
  {
    id: "84f38406-fa8e-4761-9087-7aae3d35e28e",
    originalUserId: "372c290c-eaf4-43d7-9d9e-fe4075aca479",
    imageKey:
      "uploads/causes/372c290c-eaf4-43d7-9d9e-fe4075aca479/84f38406-fa8e-4761-9087-7aae3d35e28e/images/70rbqrkpk98_cover.jpg",
    title: "Untitled campaign (recovered image only)",
    category: "community",
    goal: 500000,
    known: false,
  },
  {
    id: "a1b41e3a-a424-4f03-a05a-664d7e1fbd5f",
    originalUserId: "5ad74dbb-379c-4bb6-937e-42318829a0a9",
    imageKey:
      "uploads/causes/5ad74dbb-379c-4bb6-937e-42318829a0a9/a1b41e3a-a424-4f03-a05a-664d7e1fbd5f/images/yx4arogzj6_cover.jpg",
    title: "Untitled campaign (recovered image only)",
    category: "community",
    goal: 500000,
    known: false,
  },
  {
    id: "c027437a-e963-4aa3-b4a2-3612e6c5bbd8",
    originalUserId: "fa1ee411-f0f3-44d7-8c92-e7712d3edff4",
    imageKey:
      "uploads/causes/fa1ee411-f0f3-44d7-8c92-e7712d3edff4/c027437a-e963-4aa3-b4a2-3612e6c5bbd8/images/duwmlpk5vmq.jpg",
    title: "Untitled campaign (recovered image only)",
    category: "community",
    goal: 500000,
    known: false,
  },
  {
    id: "13e0bec5-04ce-463e-8bac-95fc39935ee2",
    originalUserId: "5ad74dbb-379c-4bb6-937e-42318829a0a9",
    imageKey:
      "uploads/causes/5ad74dbb-379c-4bb6-937e-42318829a0a9/13e0bec5-04ce-463e-8bac-95fc39935ee2/images/lxro5055qwa_cover.jpg",
    title: "Untitled campaign (recovered image only)",
    category: "community",
    goal: 500000,
    known: false,
  },
  {
    id: "88e4461e-568d-4881-a882-4c81332bc5d5",
    originalUserId: "03b218d3-a6a0-4665-9c84-11b9f0ceea5b",
    imageKey:
      "uploads/causes/03b218d3-a6a0-4665-9c84-11b9f0ceea5b/88e4461e-568d-4881-a882-4c81332bc5d5/images/hkw9pbl31t6_cover.jpg",
    title: "Untitled campaign (recovered image only)",
    category: "community",
    goal: 500000,
    known: false,
  },
  {
    id: "64c6b20d-09cf-4056-b1eb-25ae8562302d",
    originalUserId: "9df74e3a-f40d-45d7-a531-e385900d2524",
    imageKey:
      "uploads/causes/9df74e3a-f40d-45d7-a531-e385900d2524/64c6b20d-09cf-4056-b1eb-25ae8562302d/images/kxoalxk5cum_cover.jpg",
    title: "Untitled campaign (recovered image only)",
    category: "community",
    goal: 500000,
    known: false,
  },
  {
    id: "ea75293b-d517-4415-84cd-20fcdf46829c",
    originalUserId: "b053956d-2f65-44eb-987f-4619afef8178",
    imageKey:
      "uploads/causes/b053956d-2f65-44eb-987f-4619afef8178/ea75293b-d517-4415-84cd-20fcdf46829c/images/2imx41xvm4y.jpg",
    title: "Untitled campaign (recovered image only)",
    category: "community",
    goal: 500000,
    known: false,
  },
  {
    id: "53e53fee-cd6f-4b0c-9bb9-e4176b96694c",
    originalUserId: "dfc54a97-053f-475c-8513-315da7a5783d",
    imageKey:
      "uploads/causes/dfc54a97-053f-475c-8513-315da7a5783d/53e53fee-cd6f-4b0c-9bb9-e4176b96694c/images/qbtc3ojkzvf_cover.png",
    title: "Untitled campaign (recovered image only)",
    category: "community",
    goal: 500000,
    known: false,
  },
  {
    id: "313f0532-76e3-4642-86bb-6d270dfd00b0",
    originalUserId: "0c63fed9-4857-4282-b696-3257444fdfef",
    imageKey:
      "uploads/causes/0c63fed9-4857-4282-b696-3257444fdfef/313f0532-76e3-4642-86bb-6d270dfd00b0/images/ruzd0llh1cc_cover.jpg",
    title: "Untitled campaign (recovered image only)",
    category: "community",
    goal: 500000,
    known: false,
  },
  {
    id: "466b8b68-022a-4665-9e2c-c4afee279ffb",
    originalUserId: "f814f910-8a40-4264-a205-b73e1ddcba47",
    imageKey:
      "uploads/causes/f814f910-8a40-4264-a205-b73e1ddcba47/466b8b68-022a-4665-9e2c-c4afee279ffb/images/w8nd2jy1l1e_cover.jpg",
    title: "Untitled campaign (recovered image only)",
    category: "community",
    goal: 500000,
    known: false,
  },
  {
    id: "39c020ff-9cf1-4731-8669-405deae70e11",
    originalUserId: "b2bb1ef1-1d57-4ed0-bbfe-522e58486139",
    imageKey:
      "uploads/causes/b2bb1ef1-1d57-4ed0-bbfe-522e58486139/39c020ff-9cf1-4731-8669-405deae70e11/images/7dqnhilljof_cover.jpg",
    title: "Untitled campaign (recovered image only)",
    category: "community",
    goal: 500000,
    known: false,
  },
];

async function main() {
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
  console.log("Placeholder owner:", unclaimed.id);

  for (const c of causes) {
    const note = c.known
      ? `Recovered from public Wayback Machine archive (captured ${c.createdAt ?? "2026"}). ` +
        `Original creator: ${c.creatorName ?? "unknown"} (original account id ${c.originalUserId}). ` +
        `Story/goal/location recovered; donation history and supporter list were lost in the 2026-09-03 incident.`
      : `Recovered from S3 image only (original account id ${c.originalUserId}) — no title, story, or goal survived. ` +
        `Placeholder values below need the real creator to fill in.`;

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
        location: c.location,
        summary: c.summary,
        description: c.description ?? c.summary ?? "",
        reconstructed: true,
        reconstruction_note: note,
      },
    });
    console.log("Created cause:", c.id, "-", c.title);
  }

  console.log(`Done. ${causes.length} causes created under placeholder owner ${unclaimed.id}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
