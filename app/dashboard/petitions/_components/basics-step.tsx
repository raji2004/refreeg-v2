import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { petitionCategoryOptions } from "@/lib/options/petition.options";
import { cn } from "@/lib/utils";
import { FieldError } from "@/components/ui/field-error";
import type { PetitionCopy } from "./petition-copy";
import type { PetitionFormApi } from "@/hooks/use-petition-form";

const labelClass = "text-base font-semibold text-gray-700";

type Props = Pick<PetitionFormApi, "form" | "errors" | "setFormFields"> & {
  copy: PetitionCopy;
};

export function PetitionBasicsStep({
  form,
  errors,
  setFormFields,
  copy,
}: Props) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {copy.basics && (
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-gradient">
            {copy.basics.title}
          </h3>
          <p className="text-sm text-gray-500">{copy.basics.text}</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title" className={labelClass}>
            Petition Title
          </Label>
          <Input
            id="title"
            name="title"
            placeholder={copy.titlePlaceholder}
            value={form.title}
            onChange={(e) => setFormFields("title", e.target.value)}
            className={cn(
              "h-12 text-lg premium-input",
              errors.title && "border-red-500",
            )}
          />
          <FieldError message={errors.title} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="category" className={labelClass}>
              Category
            </Label>
            <Select
              value={form.category}
              // Radix reports "" when a restored draft value is applied after mount.
              onValueChange={(value) =>
                value && setFormFields("category", value)
              }
            >
              <SelectTrigger
                className={cn(
                  "h-12 premium-input",
                  errors.category && "border-red-500",
                )}
              >
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {petitionCategoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.category} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal" className={labelClass}>
              Signature Goal
            </Label>
            <div className="relative">
              <Input
                id="goal"
                name="goal"
                type="number"
                placeholder={copy.goalPlaceholder}
                value={form.goal}
                onChange={(e) => setFormFields("goal", e.target.value)}
                className={cn(
                  "h-12 pl-4 premium-input text-lg font-mono",
                  errors.goal && "border-red-500",
                )}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-brand/40 uppercase tracking-tighter">
                Signatures
              </div>
            </div>
            <FieldError message={errors.goal} />
          </div>
        </div>
      </div>
    </div>
  );
}
