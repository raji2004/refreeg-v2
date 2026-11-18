import { CampaignCategorySelect } from "@/components/campaign-category-select";
import { CampaignLocationAutocomplete } from "@/components/campaign-location-autocomplete";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatFundingGoalInput,
  normalizeFundingGoalInput,
} from "@/lib/funding-goal";
import { causeCurrencyOptions } from "@/lib/options/cause.options";
import type {
  CauseFormErrors,
  CauseFormMode,
  CauseFormValues,
} from "@/lib/schemas/cause.schema";
import { cn } from "@/lib/utils";
import { FieldError } from "@/components/ui/field-error";

const labelClass = "text-sm font-semibold text-ink sm:text-base";

type Props = {
  /** New causes type a location; existing ones pick from place suggestions. */
  mode: CauseFormMode;
  form: CauseFormValues;
  errors: CauseFormErrors;
  setFormFields: <K extends keyof CauseFormValues>(
    key: K,
    value: CauseFormValues[K],
  ) => void;
};

export function CauseBasicsStep({ mode, form, errors, setFormFields }: Props) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title" className={labelClass}>
          Cause Title
        </Label>
        <Input
          id="title"
          name="title"
          placeholder="e.g., Clean Water for Owerri Community"
          value={form.title}
          onChange={(e) => setFormFields("title", e.target.value)}
          className={cn(
            "h-11 text-base premium-input sm:h-12 sm:text-lg",
            errors.title && "border-rust",
          )}
        />
        <FieldError message={errors.title} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="summary" className={labelClass}>
            Short Summary{" "}
            <span className="font-normal text-ink/50">(optional)</span>
          </Label>
          <Input
            id="summary"
            name="summary"
            placeholder="One-line description shown on the cause hero"
            value={form.summary}
            onChange={(e) => setFormFields("summary", e.target.value)}
            maxLength={200}
            className={cn(
              "h-11 premium-input sm:h-12",
              errors.summary && "border-rust",
            )}
          />
          <FieldError message={errors.summary} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location" className={labelClass}>
            Location <span className="text-rust">*</span>
          </Label>
          {mode === "edit" ? (
            <CampaignLocationAutocomplete
              value={form.location}
              invalid={Boolean(errors.location)}
              onChange={(location) => setFormFields("location", location)}
              className="h-11 premium-input sm:h-12"
            />
          ) : (
            <Input
              id="location"
              name="location"
              value={form.location}
              onChange={(e) => setFormFields("location", e.target.value)}
              placeholder="City, state, country"
              maxLength={100}
              aria-invalid={Boolean(errors.location)}
              className={cn(
                "h-11 premium-input sm:h-12",
                errors.location && "border-rust",
              )}
            />
          )}
          <p className="text-xs text-ink/60">
            {mode === "edit"
              ? "Type at least two letters, then select a place from the list."
              : "Enter the city, state, and country where your cause is based."}
          </p>
          <FieldError message={errors.location} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        <div className="space-y-2">
          <Label htmlFor="category" className={labelClass}>
            Category
          </Label>
          <CampaignCategorySelect
            value={form.category}
            onValueChange={(value) => setFormFields("category", value)}
            invalid={Boolean(errors.category)}
          />
          <FieldError message={errors.category} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="goal" className={labelClass}>
              Funding Goal
            </Label>
            <div className="relative">
              <Input
                id="goal"
                name="goal"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={formatFundingGoalInput(form.goal)}
                onChange={(e) => {
                  const goal = normalizeFundingGoalInput(e.target.value);
                  if (goal !== null) setFormFields("goal", goal);
                }}
                className={cn(
                  "h-11 pl-11 premium-input font-mono text-base sm:h-12 sm:pl-12 sm:text-lg",
                  errors.goal && "border-rust",
                )}
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-ink/50 sm:left-4">
                ₦
              </span>
            </div>
            <FieldError message={errors.goal} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency" className={labelClass}>
              Currency
            </Label>
            <Select
              value={form.currency}
              onValueChange={(value) => setFormFields("currency", value)}
            >
              <SelectTrigger className="h-11 premium-input font-bold sm:h-12">
                <SelectValue placeholder="NGN" />
              </SelectTrigger>
              <SelectContent>
                {causeCurrencyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
