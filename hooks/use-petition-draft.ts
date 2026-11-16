"use client";

import type { Dispatch, SetStateAction } from "react";
import { useFormDraft } from "@/hooks/use-form-draft";
import type { PetitionFormFields } from "@/lib/schemas/petition.schema";
import { sendIncompletePetitionDraftEmail } from "@/services/mail";

const reminder = {
  continueUrl: "/dashboard/petitions/create",
  send: sendIncompletePetitionDraftEmail,
};

function restorePetitionDraft(
  draft: Record<string, any>,
  current: PetitionFormFields,
): PetitionFormFields {
  return {
    ...current,
    title: draft.title ?? current.title,
    category: draft.category ?? current.category,
    goal: draft.goal ?? current.goal,
    sections: draft.sections ?? current.sections,
    startDate: draft.startDate ? new Date(draft.startDate) : undefined,
    endDate: draft.endDate ? new Date(draft.endDate) : undefined,
    videoLinks: draft.videoLinks || [],
  };
}

/** Create-petition draft, saved under "petitionDraft". */
export function usePetitionDraft({
  enabled,
  form,
  setForm,
  isSignedIn,
}: {
  enabled: boolean;
  form: PetitionFormFields;
  setForm: Dispatch<SetStateAction<PetitionFormFields>>;
  isSignedIn: boolean;
}) {
  return useFormDraft({
    key: "petitionDraft",
    enabled,
    form,
    setForm,
    restore: restorePetitionDraft,
    hasStarted: Boolean(form.title || form.category || form.goal),
    reminder,
    isSignedIn,
  });
}
