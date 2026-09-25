import { cache } from "react";
import { auth } from "@/lib/auth/auth";

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
}

// Identity straight from the signed session, with no database read. Use it
// where only the user's id is needed; getCurrentUser() is for callers that
// need the stored profile row.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    name: user.name ?? null,
  };
});
