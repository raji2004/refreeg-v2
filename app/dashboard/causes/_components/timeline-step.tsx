import dynamic from "next/dynamic";
import {
  addDays,
  differenceInDays,
  format,
  isAfter,
  isBefore,
  startOfDay,
} from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MAX_DURATION_DAYS,
  type CauseFormErrors,
  type CauseFormValues,
} from "@/lib/schemas/cause.schema";
import { cn } from "@/lib/utils";
import { FieldError } from "@/components/ui/field-error";

const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((mod) => mod.Calendar),
  { loading: () => <Skeleton className="h-[300px] w-full" />, ssr: false },
);

type DateField = "startDate" | "endDate";

type Props = {
  startDate: Date | undefined;
  endDate: Date | undefined;
  errors: CauseFormErrors;
  setFormFields: <K extends keyof CauseFormValues>(
    key: K,
    value: CauseFormValues[K],
  ) => void;
};

export function CauseTimelineStep({
  startDate,
  endDate,
  errors,
  setFormFields,
}: Props) {
  const today = startOfDay(new Date());

  const datePicker = (field: DateField, label: string, id: string) => {
    const value = field === "startDate" ? startDate : endDate;
    const isDisabled = (date: Date) => {
      if (field === "startDate") return isBefore(date, today);
      const start = startDate || today;
      return (
        isBefore(date, start) ||
        isAfter(date, addDays(start, MAX_DURATION_DAYS))
      );
    };

    return (
      <div className="space-y-3 rounded-xl border border-hairline bg-surface px-3 py-4 sm:p-5">
        <Label htmlFor={id} className="block text-sm font-semibold text-ink">
          {label}
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id={id}
              variant="outline"
              className={cn(
                "h-12 w-full justify-start rounded-xl text-left font-normal premium-input",
                !value && "text-muted-foreground",
                errors[field] && "border-rust",
              )}
            >
              <CalendarIcon className="mr-3 h-4 w-4 text-forest" />
              {value ? format(value, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value}
              onSelect={(date) => setFormFields(field, date)}
              disabled={isDisabled}
              defaultMonth={
                value ||
                (field === "endDate" ? startDate : undefined) ||
                new Date()
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <FieldError message={errors[field]} />
      </div>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-8">
        {datePicker("startDate", "Start Date", "start-date")}
        {datePicker("endDate", "End Date", "end-date")}
      </div>

      {startDate && endDate && (
        <CalloutBanner
          variant="forest"
          icon={
            <CalendarIcon className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
          }
          title={`Duration: ${differenceInDays(endDate, startDate)} days`}
          description={`Running from ${format(startDate, "PPP")} to ${format(endDate, "PPP")}`}
        />
      )}
    </div>
  );
}
