import { listCauses } from "@/actions";
import CategoryCausesSection from "@/components/categoryBasedCauses";

export default async function FeaturedCauses() {
  const causes = await listCauses();

  const grouped = causes.reduce((acc, cause) => {
    if (!acc[cause.category]) acc[cause.category] = [];
    acc[cause.category].push(cause);
    return acc;
  }, {} as Record<string, typeof causes>);

  return (
    <div className="w-full mx-auto px-6 py-10">
      {Object.entries(grouped).map(([category, causes]) => (
        <CategoryCausesSection key={category} title={category} causes={causes} />
      ))}
    </div>
  );
}
