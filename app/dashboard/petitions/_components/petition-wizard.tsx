"use client";

import type { FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Icons } from "@/components/layout/Icons";
import { Button } from "@/components/ui/button";
import { FormStepper } from "@/components/ui/premium/form-stepper";
import { PremiumFormContainer } from "@/components/ui/premium/premium-form-container";
import { useAuth } from "@/hooks/use-auth";
import { usePetition } from "@/hooks/use-petition";
import { usePetitionDraft } from "@/hooks/use-petition-draft";
import { LAST_PETITION_STEP, usePetitionForm } from "@/hooks/use-petition-form";
import type { PetitionFormFields } from "@/lib/schemas/petition.schema";
import { sendPetitionUnderReviewEmail } from "@/services/mail";
import type { Petition } from "@/types";
import { PetitionBasicsStep } from "./basics-step";
import { PetitionMediaStep } from "./media-step";
import { petitionCopy } from "./petition-copy";
import { PetitionReviewStep } from "./review-step";
import { PetitionStoryStep } from "./story-step";
import { PetitionTimelineStep } from "./timeline-step";

const emptyValues: PetitionFormFields = {
  title: "",
  category: "",
  goal: "",
  coverImage: null,
  image: "",
  sections: [{ heading: "", description: "" }],
  startDate: undefined,
  endDate: undefined,
  multimedia: [],
  videoLinks: [],
};

function valuesFromPetition(petition: Petition): PetitionFormFields {
  const startDate = petition.days_active ? new Date() : undefined;
  return {
    ...emptyValues,
    title: petition.title,
    category: petition.category,
    goal: petition.goal.toString(),
    image: petition.image || "",
    sections: petition.sections || emptyValues.sections,
    startDate,
    endDate: startDate
      ? new Date(Date.now() + petition.days_active! * 24 * 60 * 60 * 1000)
      : undefined,
    videoLinks: petition.video_links || [],
  };
}

type Props =
  | { mode: "create"; petition?: undefined }
  | { mode: "edit"; petition: Petition };

/** The five-step petition wizard shared by the create and edit pages. */
export function PetitionWizard({ mode, petition }: Props) {
  const copy = petitionCopy[mode];
  const { user } = useAuth();
  const { isLoading, createPetition, updatePetition } = usePetition();
  const [submitting, setSubmitting] = useState(false);
  const wizard = usePetitionForm({
    mode,
    initialValues: petition ? valuesFromPetition(petition) : emptyValues,
  });
  const { form, currentStep } = wizard;
  const { clearDraft } = usePetitionDraft({
    enabled: mode === "create",
    form,
    setForm: wizard.setForm,
    isSignedIn: Boolean(user),
  });

  const submit = async () => {
    if (!user || !wizard.validate()) return;

    const data = {
      title: form.title,
      category: form.category,
      goal: form.goal,
      coverImage: form.coverImage,
      sections: form.sections,
      startDate: form.startDate,
      endDate: form.endDate,
      multimedia: form.multimedia,
      video_links: form.videoLinks.map((link) => link.trim()).filter(Boolean),
    };

    setSubmitting(true);
    try {
      if (petition) {
        await updatePetition(petition.id, user.id, {
          ...data,
          image: form.coverImage ? undefined : petition.image || undefined,
        });
      } else {
        await sendPetitionUnderReviewEmail({
          petitionName: form.title,
          reviewTimeframe: "3-5 business days",
        });
        await createPetition(user.id, { ...data, description: "" });
        clearDraft();
      }
    } catch (error) {
      console.error(
        `Error ${petition ? "updating" : "submitting"} petition:`,
        error,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    if (currentStep < LAST_PETITION_STEP) wizard.nextStep();
    else void submit();
  };

  const busy = isLoading || submitting;

  return (
    <PremiumFormContainer title={copy.title} description={copy.description}>
      <FormStepper steps={copy.steps} currentStep={currentStep} />

      <form className="space-y-8" onSubmit={handleSubmit}>
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 1 && (
                <PetitionBasicsStep {...wizard} copy={copy} />
              )}
              {currentStep === 2 && (
                <PetitionStoryStep {...wizard} copy={copy} />
              )}
              {currentStep === 3 && (
                <PetitionTimelineStep {...wizard} copy={copy} />
              )}
              {currentStep === 4 && (
                <PetitionMediaStep {...wizard} copy={copy} />
              )}
              {currentStep === 5 && <PetitionReviewStep form={form} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex justify-between items-center pt-8 border-t border-gray-100">
          <Button
            type="button"
            variant="ghost"
            onClick={wizard.prevStep}
            disabled={currentStep === 1 || busy}
            className="hover:bg-gray-50"
          >
            Back
          </Button>
          {currentStep < LAST_PETITION_STEP ? (
            <Button
              type="button"
              onClick={wizard.nextStep}
              className="bg-brand text-white hover:bg-brand/90 px-8"
            >
              Continue
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={busy}
              className="bg-brand text-white hover:bg-brand/90 px-8"
            >
              {busy ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  {copy.submitting}
                </>
              ) : (
                copy.submit
              )}
            </Button>
          )}
        </div>
      </form>
    </PremiumFormContainer>
  );
}
