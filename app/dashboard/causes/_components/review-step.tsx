import dynamic from "next/dynamic";
import { differenceInDays, format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Icons } from "@/components/layout/Icons";
import { Skeleton } from "@/components/ui/skeleton";
import { categories } from "@/lib/causes/categories";
import type { CauseFormValues } from "@/lib/schemas/cause.schema";

const MultimediaCarousel = dynamic(
  () => import("@/components/marketing/MultimediaCarousel"),
  { loading: () => <Skeleton className="h-64 w-full" /> },
);

const sidebarLabel = "text-xs font-bold uppercase tracking-wider text-gray-400";

export function CauseReviewStep({ form }: { form: CauseFormValues }) {
  const category = categories.find((c) => c.id === form.category)?.name;
  const [firstSection, ...otherSections] = form.sections;
  const { startDate, endDate } = form;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
      <div className="space-y-6 lg:col-span-2 lg:space-y-8">
        <div className="overflow-hidden rounded-2xl border border-mist bg-white">
          <MultimediaCarousel
            media={[
              ...form.multimedia.map((file) =>
                typeof file === "string" ? file : URL.createObjectURL(file),
              ),
              ...form.videoLinks,
            ]}
            coverImage={
              form.coverImage
                ? URL.createObjectURL(form.coverImage)
                : form.image || undefined
            }
            title={form.title}
          />
        </div>

        <div className="space-y-5 sm:space-y-6">
          <div>
            <h4 className="mb-2 text-xl font-extrabold text-navy-ink">
              {form.title}
            </h4>
            {(form.summary || form.location) && (
              <div className="mb-4 flex flex-wrap gap-4">
                {form.location && (
                  <div className="flex items-center gap-1.5 rounded-full border border-[#C9D9E8] bg-[#F2F7FC] px-2.5 py-1 text-sm font-medium text-blue-steel">
                    <Icons.mapPin className="h-3.5 w-3.5" />
                    {form.location}
                  </div>
                )}
                {form.category && (
                  <div className="flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-sm font-medium text-blue-600">
                    {category}
                  </div>
                )}
              </div>
            )}
            {form.summary && (
              <p className="mb-4 border-l-2 border-blue-steel py-1 pl-4 text-steel">
                &quot;{form.summary}&quot;
              </p>
            )}
            {firstSection?.heading && (
              <h5 className="mb-2 text-lg font-semibold text-gray-800">
                {firstSection.heading}
              </h5>
            )}
            <p className="whitespace-pre-line leading-relaxed text-gray-600">
              {firstSection?.description}
            </p>
          </div>

          {otherSections.map((section, index) => (
            <div key={index} className="space-y-2">
              <h5 className="text-lg font-semibold text-gray-800">
                {section.heading}
              </h5>
              <p className="whitespace-pre-line leading-relaxed text-gray-600">
                {section.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-5 rounded-2xl border border-mist bg-white px-3 py-5 sm:p-6 lg:sticky lg:top-6">
          <div className="space-y-1">
            <p className={sidebarLabel}>Target Goal</p>
            <p className="text-3xl font-extrabold text-navy-ink">
              {form.currency} {Number(form.goal).toLocaleString()}
            </p>
          </div>

          <div className="space-y-1 border-t border-gray-100 pt-4">
            <p className={sidebarLabel}>Category</p>
            <p className="text-lg font-semibold text-gray-800">{category}</p>
          </div>

          <div className="space-y-1 border-t border-gray-100 pt-4">
            <p className={sidebarLabel}>Duration</p>
            <div className="flex items-center gap-2 text-gray-700">
              <CalendarIcon className="h-4 w-4 text-brand" />
              <span className="font-medium">
                {startDate && endDate
                  ? `${differenceInDays(endDate, startDate)} Days`
                  : "Not set"}
              </span>
            </div>
            {startDate && endDate && (
              <p className="mt-1 text-xs text-gray-400">
                {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
