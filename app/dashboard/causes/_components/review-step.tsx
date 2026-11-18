import dynamic from "next/dynamic";
import { differenceInDays, format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Icons } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Skeleton } from "@/components/ui/skeleton";
import { categories } from "@/lib/categories";
import type { CauseFormValues } from "@/lib/schemas/cause.schema";

const MultimediaCarousel = dynamic(
  () => import("@/components/MultimediaCarousel"),
  { loading: () => <Skeleton className="h-64 w-full" /> },
);

const chipClass =
  "flex items-center gap-1.5 rounded-full border border-hairline bg-bone px-2.5 py-1 text-sm font-medium text-ink";

export function CauseReviewStep({ form }: { form: CauseFormValues }) {
  const category = categories.find((c) => c.id === form.category)?.name;
  const [firstSection, ...otherSections] = form.sections;
  const { startDate, endDate } = form;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
      <div className="space-y-6 lg:col-span-2 lg:space-y-8">
        <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
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
            <h3 className="mb-3 font-fraunces text-2xl font-medium text-ink">
              {form.title}
            </h3>
            {(form.location || form.category) && (
              <div className="mb-4 flex flex-wrap gap-2">
                {form.location && (
                  <div className={chipClass}>
                    <Icons.mapPin className="h-3.5 w-3.5 text-forest" />
                    {form.location}
                  </div>
                )}
                {form.category && <div className={chipClass}>{category}</div>}
              </div>
            )}
            {form.summary && (
              <p className="mb-4 border-l-2 border-forest py-1 pl-4 text-ink/70">
                &quot;{form.summary}&quot;
              </p>
            )}
            {firstSection?.heading && (
              <h4 className="mb-2 text-lg font-semibold text-ink">
                {firstSection.heading}
              </h4>
            )}
            <p className="whitespace-pre-line leading-relaxed text-ink/70">
              {firstSection?.description}
            </p>
          </div>

          {otherSections.map((section, index) => (
            <div key={index} className="space-y-2">
              <h4 className="text-lg font-semibold text-ink">
                {section.heading}
              </h4>
              <p className="whitespace-pre-line leading-relaxed text-ink/70">
                {section.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <Card
          variant="surface"
          className="space-y-5 px-4 py-5 shadow-none sm:p-6 lg:sticky lg:top-6"
        >
          <div className="space-y-1">
            <Eyebrow>Target goal</Eyebrow>
            <p className="font-fraunces text-3xl font-medium text-ink">
              {form.currency} {Number(form.goal).toLocaleString()}
            </p>
          </div>

          <div className="space-y-1 border-t border-hairline pt-4">
            <Eyebrow>Category</Eyebrow>
            <p className="text-lg font-semibold text-ink">{category}</p>
          </div>

          <div className="space-y-1 border-t border-hairline pt-4">
            <Eyebrow>Duration</Eyebrow>
            <div className="flex items-center gap-2 text-ink">
              <CalendarIcon className="h-4 w-4 text-forest" />
              <span className="font-medium">
                {startDate && endDate
                  ? `${differenceInDays(endDate, startDate)} Days`
                  : "Not set"}
              </span>
            </div>
            {startDate && endDate && (
              <p className="mt-1 text-xs text-ink/50">
                {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
