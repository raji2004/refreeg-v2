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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { MAX_PETITION_DURATION_DAYS } from "@/lib/schemas/petition.schema";
import { FieldError } from "@/components/ui/field-error";
import type { PetitionCopy } from "./petition-copy";
import type { PetitionFormApi } from "@/hooks/use-petition-form";

const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((mod) => mod.Calendar),
  { loading: () => <Skeleton className="h-[300px] w-full" />, ssr: false },
);

type Props = Pick<PetitionFormApi, "form" | "errors" | "setFormFields"> & {
  copy: PetitionCopy;
};

export function PetitionTimelineStep({
  form,
  errors,
  setFormFields,
  copy,
}: Props) {
  const { startDate, endDate } = form;
  const today = startOfDay(new Date());

  const isEndDateDisabled = (date: Date) => {
    const start = startDate || today;
    return (
      isBefore(date, start) ||
      isAfter(date, addDays(start, MAX_PETITION_DURATION_DAYS))
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-gradient">
          {copy.timelineTitle}
        </h3>
        <p className="text-sm text-gray-500">{copy.timelineText}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Label className="text-base font-semibold text-gray-700 block mb-2">
            {copy.startLabel}
          </Label>
          <div className="glass-panel p-4 rounded-2xl border-brand/5">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(date) => setFormFields("startDate", date)}
              disabled={(date) => isBefore(date, today)}
              initialFocus
            />
          </div>
          <FieldError message={errors.startDate} />
        </div>

        <div className="space-y-4">
          <Label className="text-base font-semibold text-gray-700 block mb-2">
            End Date
          </Label>
          <div className="glass-panel p-4 rounded-2xl border-brand/5">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={(date) => setFormFields("endDate", date)}
              disabled={isEndDateDisabled}
              initialFocus
            />
          </div>
          <FieldError message={errors.endDate} />
        </div>
      </div>

      {startDate && endDate && (
        <div className="bg-brand/5 p-4 rounded-xl border border-brand/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-brand">
              Campaign Duration: {differenceInDays(endDate, startDate)} Days
            </p>
            <p className="text-xs text-gray-500">
              Running from {format(startDate, "PPP")} to{" "}
              {format(endDate, "PPP")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
