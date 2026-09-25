import { getRankedPetitions } from "@/lib/petitions-ranked";
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
  const sortedPetitions = await getRankedPetitions(category);

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
