import Link from "next/link";
import { Bookmark } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SavedGrid } from "@/components/saved/SavedGrid";
import {
  isClosingSoon,
  toSavedItems,
  type SavedListSummary,
} from "@/lib/saved";

export default async function SavedPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <EmptyState
        variant="page"
        className="py-24"
        icon={<Bookmark className="h-7 w-7" />}
        title="Sign in to save campaigns"
        description="Your shortlist lives with your account, so it follows you across devices."
      />
    );
  }

  const [bookmarks, lists, alertPrefs] = await Promise.all([
    prisma.bookmark.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      select: { id: true, target_id: true, target_type: true, list_id: true },
    }),
    prisma.savedList.findMany({
      where: { user_id: userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
    prisma.userAlertPrefs.findUnique({ where: { user_id: userId } }),
  ]);

  // target_id is polymorphic, so fetch each kind by id and join in code.
  const causeIds = bookmarks
    .filter((b) => b.target_type === "cause")
    .map((b) => b.target_id);
  const petitionIds = bookmarks
    .filter((b) => b.target_type === "petition")
    .map((b) => b.target_id);

  const [causes, petitions] = await Promise.all([
    prisma.cause.findMany({
      where: { id: { in: causeIds } },
      select: {
        id: true,
        title: true,
        image: true,
        goal: true,
        raised: true,
        status: true,
        end_date: true,
        paused: true,
        compliance_paused: true,
      },
    }),
    prisma.petitions.findMany({
      where: { id: { in: petitionIds } },
      select: { id: true, title: true, image: true, goal: true, raised: true },
    }),
  ]);

  const items = toSavedItems(bookmarks, causes, petitions);

  if (items.length === 0) {
    return (
      <EmptyState
        variant="page"
        className="py-24"
        icon={<Bookmark className="h-7 w-7" />}
        title="A shortlist you can act on"
        description="Bookmark anything in Discover and it lands here with how close it is and how long it has left. Group them into lists when there are more than a handful."
        action={
          <Button asChild variant="ink" className="rounded-xl">
            <Link href="/causes">Browse Discover</Link>
          </Button>
        }
      />
    );
  }

  const listSummaries: SavedListSummary[] = lists.map((l) => ({
    ...l,
    count: items.filter((i) => i.listId === l.id).length,
  }));

  const closingSoon = items.filter(isClosingSoon).length;
  const closed = items.filter((i) => i.status === "closed").length;

  return (
    <div className="min-h-screen bg-cream">
      <main className="mx-auto max-w-7xl p-6 lg:p-10">
        <header className="mb-6">
          <h1 className="mb-2 font-fraunces text-4xl font-semibold text-ink">
            {items.length} saved
          </h1>
          <p className="text-ink/60">
            {closingSoon} close within a week · {closed} already closed
          </p>
        </header>

        <SavedGrid
          items={items}
          lists={listSummaries}
          alertPrefs={
            alertPrefs
              ? {
                  closing_3d: alertPrefs.closing_3d,
                  reached_80pct: alertPrefs.reached_80pct,
                  delivered: alertPrefs.delivered,
                  weekly_digest: alertPrefs.weekly_digest,
                }
              : undefined
          }
          user={{
            name: session.user.name ?? "",
            email: session.user.email ?? "",
          }}
        />
      </main>
    </div>
  );
}
