// One-off dev utility: promote a user to admin in the `roles` table.
// Usage: npx tsx scripts/promote-admin.ts [email]
// Safe to re-run: idempotent.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] ?? "nomsounaogu@gmail.com";

  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL is not set - run this from the repo root so .env is picked up.",
    );
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user) {
    console.error(
      `No profile found with email "${email}". Check the email or create the account first.`,
    );
    process.exit(1);
  }

  const existing = await prisma.role.findFirst({
    where: { user_id: user.id },
  });

  if (existing?.role === "admin") {
    console.log(`Nothing to do: ${email} (${user.id}) is already admin.`);
  } else if (existing) {
    await prisma.role.update({
      where: { id: existing.id },
      data: { role: "admin" },
    });
    console.log(
      `Promoted ${email} (${user.id}): "${existing.role}" -> "admin".`,
    );
  } else {
    await prisma.role.create({ data: { user_id: user.id, role: "admin" } });
    console.log(
      `Promoted ${email} (${user.id}): no roles row existed, created one with "admin".`,
    );
  }

  const final = await prisma.role.findFirst({ where: { user_id: user.id } });
  console.log(`Current role: ${final?.role ?? "(none)"}`);
}

main()
  .catch((error) => {
    console.error("Failed to promote user:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
