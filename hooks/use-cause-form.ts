"use client";

import { useState } from "react";
import {
  hasCauseErrors,
  stepHasErrors,
  validateCauseForm,
  type CauseFormErrors,
  type CauseFormMode,
  type CauseFormValues,
  type CauseSection,
} from "@/lib/schemas/cause.schema";
import { prepareCoverImage, prepareGalleryFiles } from "@/lib/cause-media";

export const LAST_CAUSE_STEP = 5;

/**
 * State for the create and edit cause wizards: one form object, zod
 * validation, step navigation, and the media and section helpers both share.
 */
export function useCauseForm({
  initialValues,
  mode,
}: {
  initialValues: CauseFormValues;
  mode: CauseFormMode;
}) {
  const [form, setForm] = useState(initialValues);
  const [errors, setErrors] = useState<CauseFormErrors>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null);

  const setError = (key: keyof CauseFormErrors, message: string | undefined) =>
    setErrors((current) => ({ ...current, [key]: message }));

  const setFormFields = <K extends keyof CauseFormValues>(
    key: K,
    value: CauseFormValues[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key in errors) setError(key as keyof CauseFormErrors, undefined);
  };

  const uploadCover = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const result = await prepareCoverImage(file);
    if (!result.ok) {
      if (!result.keepCurrent) {
        setForm((current) => ({ ...current, coverImage: null }));
      }
      setError("coverImage", result.error);
      return;
    }
    setFormFields("coverImage", result.value);
  };

  const uploadGallery = async (files: File[]) => {
    const result = await prepareGalleryFiles(files, form.multimedia, {
      keepOriginalOnCompressError: mode === "edit",
    });
    if (!result.ok) {
      setError("multimedia", result.error);
      return;
    }
    setFormFields("multimedia", [...form.multimedia, ...result.value]);
  };

  const clearCover = () =>
    setForm((current) => ({ ...current, coverImage: null }));

  const removeMedia = (index: number) =>
    setForm((current) => ({
      ...current,
      multimedia: current.multimedia.filter((_, i) => i !== index),
    }));

  const addSection = () =>
    setForm((current) => ({
      ...current,
      sections: [...current.sections, { heading: "", description: "" }],
    }));

  const removeSection = (index: number) =>
    setForm((current) => ({
      ...current,
      sections: current.sections.filter((_, i) => i !== index),
    }));

  const updateSection = (
    index: number,
    field: keyof CauseSection,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, i) =>
        i === index ? { ...section, [field]: value } : section,
      ),
    }));
    if (errors.sections?.[index]?.[field]) {
      setErrors((current) => ({
        ...current,
        sections: current.sections?.map((sectionErrors, i) =>
          i === index
            ? { ...sectionErrors, [field]: undefined }
            : sectionErrors,
        ),
      }));
    }
  };

  const nextStep = () => {
    setAttemptedStep(currentStep);
    const found = validateCauseForm(form, mode);
    setErrors(found);
    if (currentStep < LAST_CAUSE_STEP && !stepHasErrors(found, currentStep)) {
      setCurrentStep((step) => step + 1);
    }
  };

  const prevStep = () => setCurrentStep((step) => Math.max(1, step - 1));

  /** Validates everything; returns true when the form can be submitted. */
  const validateAll = () => {
    const found = validateCauseForm(form, mode);
    if (!hasCauseErrors(found)) return true;
    setErrors(found);
    return false;
  };

  return {
    form,
    setForm,
    setFormFields,
    errors,
    setError,
    currentStep,
    setCurrentStep,
    attemptedStep,
    uploadCover,
    clearCover,
    uploadGallery,
    removeMedia,
    addSection,
    removeSection,
    updateSection,
    nextStep,
    prevStep,
    validateAll,
  };
}
