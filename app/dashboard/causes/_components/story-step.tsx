import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CauseFormErrors, CauseSection } from "@/lib/schemas/cause.schema";
import { cn } from "@/lib/utils";
import { FieldError } from "@/components/ui/field-error";

const invalidClass = "border-rust focus:border-rust focus:ring-rust/15";

type Props = {
  sections: CauseSection[];
  errors: CauseFormErrors;
  /** Section messages only show once the person has tried to continue. */
  showErrors: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof CauseSection, value: string) => void;
};

export function CauseStoryStep({
  sections,
  errors,
  showErrors,
  onAdd,
  onRemove,
  onUpdate,
}: Props) {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={onAdd}
          variant="surface"
          className="h-10 w-full rounded-full px-4 text-sm font-semibold sm:w-auto"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add section
        </Button>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {sections.map((section, index) => {
          const sectionErrors = errors.sections?.[index];
          return (
            <Card
              key={index}
              variant="surface"
              className="relative overflow-hidden shadow-none"
            >
              <div className="space-y-4 px-3 py-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <Eyebrow className="text-forest">Section {index + 1}</Eyebrow>
                  {index > 0 && (
                    <Button
                      type="button"
                      onClick={() => onRemove(index)}
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-full text-rust hover:bg-rust/10 hover:text-rust"
                    >
                      Delete
                    </Button>
                  )}
                </div>
                <div className="space-y-4 pt-1 sm:pt-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor={`section-heading-${index}`}
                      className="text-sm font-semibold text-ink"
                    >
                      Heading
                    </Label>
                    <Input
                      id={`section-heading-${index}`}
                      placeholder="e.g. Why this matters"
                      value={section.heading}
                      onChange={(e) =>
                        onUpdate(index, "heading", e.target.value)
                      }
                      className={cn(
                        "h-11 premium-input sm:h-12",
                        sectionErrors?.heading && invalidClass,
                      )}
                    />
                    {showErrors && (
                      <FieldError message={sectionErrors?.heading} />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor={`section-description-${index}`}
                      className="text-sm font-semibold text-ink"
                    >
                      Story Content
                    </Label>
                    <Textarea
                      id={`section-description-${index}`}
                      placeholder="Share the problem, who it affects, and how this campaign helps."
                      value={section.description}
                      onChange={(e) =>
                        onUpdate(index, "description", e.target.value)
                      }
                      className={cn(
                        "min-h-[120px] resize-none premium-input sm:min-h-[140px]",
                        sectionErrors?.description && invalidClass,
                      )}
                    />
                    {showErrors && sectionErrors?.description && (
                      <FieldError message="Something has to be written here." />
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
