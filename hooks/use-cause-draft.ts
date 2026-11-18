"use client";

import type { Dispatch, SetStateAction } from "react";
import { addDays, isAfter, isBefore, startOfDay } from "date-fns";
import { useFormDraft } from "@/hooks/use-form-draft";
import type { CauseFormValues } from "@/lib/schemas/cause.schema";
import { sendIncompleteCauseSetupEmail } from "@/services/mail";

const reminder = {
  continueUrl: "/dashboard/causes/create",
  send: sendIncompleteCauseSetupEmail,
};

function restoreCauseDraft(
  draft: Record<string, any>,
  current: CauseFormValues,
): CauseFormValues {
  const today = startOfDay(new Date());
  const draftStart = draft.startDate ? new Date(draft.startDate) : undefined;
  const startDate =
    draftStart && !isBefore(draftStart, today) ? draftStart : today;
  const draftEnd = draft.endDate ? new Date(draft.endDate) : undefined;
  const endDate =
    draftEnd && isAfter(draftEnd, startDate) ? draftEnd : addDays(startDate, 7);

  return {
    ...current,
    title: draft.title ?? current.title,
    summary: draft.summary ?? current.summary,
    location: draft.location || "",
    category: draft.category ?? current.category,
    goal: draft.goal ?? current.goal,
    currency: draft.currency ?? current.currency,
    sections: draft.sections ?? current.sections,
    videoLinks: draft.videoLinks || [],
    startDate,
    endDate,
  };
}

/** Create-cause draft, saved under "causeDraft". */
export function useCauseDraft({
  form,
  setForm,
  isSignedIn,
}: {
  form: CauseFormValues;
  setForm: Dispatch<SetStateAction<CauseFormValues>>;
  isSignedIn: boolean;
}) {
  return useFormDraft({
    key: "causeDraft",
    form,
    setForm,
    restore: restoreCauseDraft,
    extraFields: { locationVerified: false },
    hasStarted: Boolean(form.title || form.category || form.goal),
    reminder,
    isSignedIn,
  });
}
