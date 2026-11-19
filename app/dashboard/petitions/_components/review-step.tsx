import dynamic from "next/dynamic";
import { differenceInDays, format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useObjectUrl, useObjectUrls } from "@/hooks/use-object-urls";
import { petitionCategoryOptions } from "@/lib/options/petition.options";
import type { PetitionFormFields } from "@/lib/schemas/petition.schema";

const MultimediaCarousel = dynamic(
  () => import("@/components/marketing/MultimediaCarousel"),
  { loading: () => <Skeleton className="h-64 w-full" /> },
);

export function PetitionReviewStep({ form }: { form: PetitionFormFields }) {
  const coverUrl = useObjectUrl(form.coverImage);
  const mediaUrls = useObjectUrls(form.multimedia);
  const category = petitionCategoryOptions.find(
    (option) => option.value === form.category,
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{form.title}</h3>
        <p className="text-sm text-muted-foreground">{category?.label}</p>
      </div>

      <div className="space-y-2">
        {form.sections.map((section, index) => (
          <div key={index} className="space-y-2">
            <h5 className="font-medium">{section.heading}</h5>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {section.description}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Signature Goal</h4>
        <p className="text-sm">{form.goal} Signatures</p>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Duration</h4>
        {form.startDate && form.endDate && (
          <p className="text-sm">
            {differenceInDays(form.endDate, form.startDate)} days:{" "}
            {format(form.startDate, "PPP")} - {format(form.endDate, "PPP")}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Media Preview</h4>
        <MultimediaCarousel
          media={[...mediaUrls, ...form.videoLinks]}
          coverImage={coverUrl || form.image || undefined}
          title={form.title}
        />
      </div>

      {form.multimedia.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Multimedia Files</h4>
          <div className="grid grid-cols-2 gap-4">
            {form.multimedia.map((file, index) => (
              <div key={index} className="flex flex-col">
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {file.type.startsWith("image/") ? "Image file" : "Video file"}{" "}
                  - {Math.round(file.size / 1024)} KB
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
