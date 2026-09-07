import { prisma } from "@/lib/prisma";

/**
 * True when the session's issue time predates the account's
 * sessions_invalidated_after cutoff — i.e. this session was issued before
 * we decided to force a fresh sign-in for this specific account (see
 * scripts/invalidate-incident-sessions.ts). Does a Prisma read, so this is
 * Node-runtime only — call it from server components/route handlers, not
 * middleware.ts (which runs on Edge and can't reach Prisma; see that file's
 * note on admin-role checks being deferred to Node-runtime pages for the
 * same reason).
 */
export async function isSessionInvalidated(
  userId: string,
  sessionIssuedAt: number | undefined,
): Promise<boolean> {
  if (!sessionIssuedAt) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sessions_invalidated_after: true },
  });

  if (!user?.sessions_invalidated_after) return false;

  return sessionIssuedAt < user.sessions_invalidated_after.getTime();
}
