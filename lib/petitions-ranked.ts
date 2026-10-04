import { unstable_cache } from "next/cache";
import { listPetitions } from "@/actions/petition-actions";
import { getPetitionSignatureTotals } from "@/actions/signature-actions";
import {
  DISCOVER_CACHE_SECONDS,
  DISCOVER_CACHE_TAG,
} from "@/lib/discover-constants";

async function rankPetitions(category: string) {
  const petitions = await listPetitions({ category });

  const active = petitions.filter(
    (p) => (p.days_active ?? 0) > 0 && p.status !== ("expired" as any),
  );

  const totals = await getPetitionSignatureTotals(active.map((p) => p.id));

  return active
    .map((petition) => {
      const { signerCount = 0, totalAmount = 0 } = totals[petition.id] ?? {};

      const percentRaised =
        petition.goal > 0
          ? Math.min(Math.round((totalAmount / petition.goal) * 100), 100)
          : 0;

      // These objects are handed to client components, so drop the owner's
      // email rather than shipping it in the public page payload.
      const {
        user: _owner,
        profiles,
        ...rest
      } = petition as typeof petition & {
        user?: unknown;
      };

      return {
        ...rest,
        profiles: profiles ? { ...profiles, email: "" } : profiles,
        image: petition.image ?? undefined,
        days_active: petition.days_active ?? undefined,
        signerCount,
        totalAmount,
        percentRaised,
      };
    })
    .sort((a, b) => {
      if (a.percentRaised === 0 && b.percentRaised !== 0) return 1;
      if (b.percentRaised === 0 && a.percentRaised !== 0) return -1;

      if (b.percentRaised !== a.percentRaised) {
        return b.percentRaised - a.percentRaised;
      }

      if (b.signerCount !== a.signerCount) {
        return b.signerCount - a.signerCount;
      }

      if (b.totalAmount !== a.totalAmount) {
        return b.totalAmount - a.totalAmount;
      }

      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
}

// Shared by the home carousel and /petitions so both do the same two queries
// at most once a minute. Approving or rejecting a petition busts it via the
// discover tag.
export const getRankedPetitions = unstable_cache(
  rankPetitions,
  ["ranked-petitions"],
  { revalidate: DISCOVER_CACHE_SECONDS, tags: [DISCOVER_CACHE_TAG] },
);
