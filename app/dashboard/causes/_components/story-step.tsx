import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CauseFormErrors, CauseSection } from "@/lib/schemas/cause.schema";
import { cn } from "@/lib/utils";
import { FieldError } from "@/components/ui/field-error";

const invalidClass = "border-red-500 focus:border-red-500 focus:ring-red-100";

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
          variant="outline"
          className="h-10 w-full rounded-full border-mist-light bg-white px-4 text-sm font-bold text-navy-ink shadow-none hover:border-blue-steel hover:bg-[#F4F8FC] hover:text-navy-ink sm:w-auto"
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
              className="relative overflow-hidden rounded-2xl border-mist bg-white shadow-none"
            >
              <div className="space-y-4 px-3 py-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-blue-steel">
                    Section {index + 1}
                  </span>
                  {index > 0 && (
                    <Button
                      type="button"
                      onClick={() => onRemove(index)}
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  )}
                </div>
                <div className="space-y-4 pt-1 sm:pt-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor={`section-heading-${index}`}
                      className="text-sm font-semibold text-[#33445A]"
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
                      className="text-sm font-semibold text-[#33445A]"
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
