import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PetitionCopy } from "./petition-copy";
import type { PetitionFormApi } from "@/hooks/use-petition-form";

type Props = Pick<
  PetitionFormApi,
  "form" | "addSection" | "removeSection" | "updateSection"
> & { copy: PetitionCopy };

export function PetitionStoryStep({
  form,
  addSection,
  removeSection,
  updateSection,
  copy,
}: Props) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-gradient">{copy.storyTitle}</h3>
          <p className="text-sm text-gray-500">{copy.storyText}</p>
        </div>
        <Button
          type="button"
          onClick={addSection}
          variant="outline"
          className="rounded-full border-brand/20 text-brand hover:bg-brand/5"
        >
          Add Section
        </Button>
      </div>

      <div className="space-y-6">
        {form.sections.map((section, index) => (
          <Card
            key={index}
            className="relative overflow-hidden border-brand/10 shadow-sm bg-white/50 backdrop-blur-sm"
          >
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center bg-brand/5 -mx-6 -mt-6 p-4 border-b border-brand/10 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brand">
                  Section {index + 1}
                </span>
                {index > 0 && (
                  <Button
                    type="button"
                    onClick={() => removeSection(index)}
                    variant="ghost"
                    size="sm"
                    className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                  >
                    {copy.removeSection}
                  </Button>
                )}
              </div>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label
                    htmlFor={`section-heading-${index}`}
                    className="font-semibold text-gray-600"
                  >
                    {copy.headingLabel}
                  </Label>
                  <Input
                    id={`section-heading-${index}`}
                    placeholder={copy.headingPlaceholder}
                    value={section.heading}
                    onChange={(e) =>
                      updateSection(index, "heading", e.target.value)
                    }
                    className="premium-input border-brand/5"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor={`section-description-${index}`}
                    className="font-semibold text-gray-600"
                  >
                    {copy.contentLabel}
                  </Label>
                  <Textarea
                    id={`section-description-${index}`}
                    placeholder={copy.contentPlaceholder}
                    value={section.description}
                    onChange={(e) =>
                      updateSection(index, "description", e.target.value)
                    }
                    className="min-h-[150px] premium-input border-brand/5 resize-none"
                  />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
