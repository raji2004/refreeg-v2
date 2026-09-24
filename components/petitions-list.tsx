import { listPetitions } from "@/actions/petition-actions";
import { listSignaturesForPetition } from "@/actions/signature-actions";
import { PaginationButton } from "@/components/pagination-button";
import { PetitionCard } from "./petition-card";

interface PetitionsListProps {
  category: string;
  page: number;
  pageSize: number;
}

export async function PetitionsList({
  category,
  page,
  pageSize,
}: PetitionsListProps) {
  const petitions = await listPetitions();

  const activePetitions = petitions.filter(
    (p) => (p.days_active ?? 0) > 0 && p.status !== ("expired" as any),
  );

  const categoryFiltered =
    category === "all"
      ? activePetitions
      : activePetitions.filter((p) => p.category === category);

  const petitionsWithSigners = await Promise.all(
    categoryFiltered.map(async (petition) => {
      const signers = await listSignaturesForPetition(petition.id);
      const signerCount = signers?.length || 0;
      const totalAmount = signers.reduce((sum, s) => sum + (s.amount || 0), 0);

      const percentRaised =
        petition.goal > 0
          ? Math.min(Math.round((totalAmount / petition.goal) * 100), 100)
          : 0;

      return {
        ...petition,
        image: petition.image ?? undefined,
        days_active: petition.days_active ?? undefined,
        signerCount,
        totalAmount,
        percentRaised,
      };
    }),
  );

  const sortedPetitions = petitionsWithSigners.sort((a, b) => {
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

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const totalPetitions = sortedPetitions.length;
  const totalPages = Math.ceil(totalPetitions / pageSize);
  const paginatedPetitions = sortedPetitions.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  if (paginatedPetitions.length === 0) {
    return (
      <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-300">
        <h3 className="text-xl font-semibold text-gray-900">
          No petitions found
        </h3>
        <p className="text-muted-foreground mt-2">
          Try selecting a different category or check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {paginatedPetitions.map((petition) => (
          <PetitionCard
            key={petition.id}
            petition={{
              id: petition.id,
              title: petition.title,
              image: petition.image,
              percentRaised: petition.percentRaised,
              days_active: petition.days_active,
              totalAmount: petition.totalAmount,
              goal: petition.goal,
              profiles: petition.profiles,
            }}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center pt-8 border-t border-gray-100">
          <PaginationButton currentPage={page} totalPages={totalPages} />
        </div>
      )}
    </div>
  );
}
