import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function run() {
  const data = await prisma.kyc_verifications.findFirst({
    where: { document_type: "didit", status: "pending" },
    orderBy: { created_at: "desc" },
  });

  if (!data || !data.document_url) {
    console.log("No pending didit session found.");
    return;
  }

  console.log("Found session URL:", data.document_url);
  const sessionId = data.document_url.split('/').pop();
  console.log("Session ID:", sessionId);

  const apiKey = process.env.DIDIT_API_KEY || process.env.DIDIT_CLIENT_SECRET || "";
  const res = await fetch(`https://verification.didit.me/v3/session/${sessionId}`, {
    headers: { "x-api-key": apiKey }
  });

  console.log("Status Code:", res.status);
  const json = await res.json();
  console.log("Response:", JSON.stringify(json, null, 2));
}

run().finally(() => prisma.$disconnect());
