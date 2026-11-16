"use client";

import { useState } from "react";
import { useValidator } from "@/hooks/use-validator";
import {
  MAX_PETITION_FILES,
  MAX_PETITION_MEDIA_BYTES,
  mediaBytes,
  petitionSchemas,
  stepHasErrors,
  type PetitionFormFields,
  type PetitionFormMode,
  type PetitionSection,
} from "@/lib/schemas/petition.schema";

export const LAST_PETITION_STEP = 5;

type MediaErrors = { coverImage?: string; multimedia?: string };

/**
 * State for the create and edit petition wizards: one form object, zod
 * validation, step navigation, and the media and section helpers both share.
 */
export function usePetitionForm({
  initialValues,
  mode,
}: {
  initialValues: PetitionFormFields;
  mode: PetitionFormMode;
}) {
  const [form, setForm] = useState(initialValues);
  const [currentStep, setCurrentStep] = useState(1);
  const [mediaErrors, setMediaErrors] = useState<MediaErrors>({});
  const {
    errors: fieldErrors,
    validate: validateFields,
    clearError,
  } = useValidator({ store: form, schema: petitionSchemas[mode] });

  const errors = { ...fieldErrors, ...mediaErrors };

  const validate = () => {
    setMediaErrors({});
    return validateFields();
  };

  const setFormFields = <K extends keyof PetitionFormFields>(
    key: K,
    value: PetitionFormFields[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key in fieldErrors) clearError(key as keyof typeof fieldErrors);
  };

  const uploadCover = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (file.size > MAX_PETITION_MEDIA_BYTES) {
      setMediaErrors((current) => ({
        ...current,
        coverImage: "Cover image must be less than 100MB",
      }));
      return;
    }
    setMediaErrors((current) => ({ ...current, coverImage: undefined }));
    setFormFields("coverImage", file);
  };

  const uploadGallery = async (files: File[]) => {
    if (form.multimedia.length + files.length > MAX_PETITION_FILES) {
      setMediaErrors((current) => ({
        ...current,
        multimedia: `You can only upload a total of ${MAX_PETITION_FILES} files`,
      }));
      return;
    }

    const { compressImage } = await import("@/utils/image-compression");
    const processed = await Promise.all(
      files.map(async (file) => {
        if (!file.type.startsWith("image/")) return file;
        try {
          return await compressImage(file, 1000, 0.7);
        } catch {
          return file;
        }
      }),
    );

    if (
      mediaBytes(form.multimedia) + mediaBytes(processed) >
      MAX_PETITION_MEDIA_BYTES
    ) {
      setMediaErrors((current) => ({
        ...current,
        multimedia: "Total multimedia size must be less than 100MB",
      }));
      return;
    }

    setMediaErrors((current) => ({ ...current, multimedia: undefined }));
    setForm((current) => ({
      ...current,
      multimedia: [...current.multimedia, ...processed],
    }));
  };

  const removeCover = () =>
    setForm((current) => ({ ...current, coverImage: null }));

  const removeGalleryFile = (index: number) =>
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
    field: keyof PetitionSection,
    value: string,
  ) =>
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, i) =>
        i === index ? { ...section, [field]: value } : section,
      ),
    }));

  const setVideoLink = (index: number, value: string) =>
    setFormFields(
      "videoLinks",
      form.videoLinks.map((link, i) => (i === index ? value : link)),
    );

  const addVideoLink = () =>
    setFormFields("videoLinks", [...form.videoLinks, ""]);

  const removeVideoLink = (index: number) =>
    setFormFields(
      "videoLinks",
      form.videoLinks.filter((_, i) => i !== index),
    );

  const nextStep = () => {
    validate();
    if (
      currentStep < LAST_PETITION_STEP &&
      !stepHasErrors(form, mode, currentStep)
    ) {
      setCurrentStep((step) => step + 1);
    }
  };

  const prevStep = () => setCurrentStep((step) => Math.max(1, step - 1));

  return {
    form,
    setForm,
    setFormFields,
    errors,
    currentStep,
    uploadCover,
    removeCover,
    uploadGallery,
    removeGalleryFile,
    addSection,
    removeSection,
    updateSection,
    setVideoLink,
    addVideoLink,
    removeVideoLink,
    validate,
    nextStep,
    prevStep,
  };
}

export type PetitionFormApi = ReturnType<typeof usePetitionForm>;
