"use client";

import { useRouter } from "nextjs-toploader/app";
import { useAuth } from "@/hooks/use-auth";
import { useCause } from "@/hooks/use-cause";
import { useCauseForm } from "@/hooks/use-cause-form";
import { useToast } from "@/hooks/use-toast";
import { editCauseStepMeta } from "@/lib/options/cause.options";
import type { CauseFormValues } from "@/lib/schemas/cause.schema";
import {
  resolveMultimediaForSubmit,
  uploadFileWithPresign,
} from "@/lib/s3/upload-client";
import { sendCauseEditedEmail } from "@/services/mail";
import type { Cause } from "@/types";
import { CauseBasicsStep } from "../../_components/basics-step";
import { CauseMediaStep } from "../../_components/media-step";
import { CauseReviewStep } from "../../_components/review-step";
import { CauseStoryStep } from "../../_components/story-step";
import { CauseTimelineStep } from "../../_components/timeline-step";
import { CauseWizard } from "../../_components/cause-wizard";

type EditCauseFormProps = {
  cause: Cause & {
    startDate?: string;
    endDate?: string;
  };
};

const initialValues = (cause: Cause): CauseFormValues => ({
  title: cause.title,
  summary: cause.summary || "",
  location: cause.location || "",
  category: cause.category,
  goal: cause.goal.toString(),
  currency: "NGN",
  coverImage: null,
  image: cause.image || "",
  sections: cause.sections || [{ heading: "", description: "" }],
  startDate: new Date(),
  endDate:
    cause.days_active != null
      ? new Date(Date.now() + cause.days_active * 24 * 60 * 60 * 1000)
      : undefined,
  multimedia: cause.multimedia || [],
  videoLinks: cause.video_links || [],
});

export default function EditCauseForm({ cause }: EditCauseFormProps) {
  const { user } = useAuth();
  const { isLoading, updateCause } = useCause();
  const { toast } = useToast();
  const router = useRouter();
  const wizard = useCauseForm({
    initialValues: initialValues(cause),
    mode: "edit",
  });
  const { form, errors, setFormFields, currentStep } = wizard;

  const handleSubmit = async () => {
    if (!user || !wizard.validateAll()) return;

    try {
      let coverImage: File | string | null = form.coverImage;
      if (form.coverImage instanceof File) {
        const { key } = await uploadFileWithPresign(form.coverImage, {
          entityType: "causes",
          entityId: cause.id,
          mediaType: "images",
        });
        coverImage = key;
      }

      const multimedia = await resolveMultimediaForSubmit(form.multimedia, {
        entityType: "causes",
        entityId: cause.id,
      });

      await updateCause(cause.id, user.id, {
        title: form.title,
        summary: form.summary,
        location: form.location,
        category: form.category,
        goal: form.goal,
        coverImage,
        image: form.coverImage ? undefined : cause.image || undefined,
        sections: form.sections,
        startDate: form.startDate,
        endDate: form.endDate,
        multimedia,
        video_links: form.videoLinks,
      });
      await sendCauseEditedEmail({
        causeName: form.title,
        reviewTimeframe: "3-5 business days",
        dashboardUrl: `${window.location.origin}/dashboard/causes`,
      });

      toast({
        title: "Success",
        description: "Your changes have been submitted for review.",
      });
      router.push("/dashboard/causes");
    } catch (error) {
      console.error("Error updating cause:", error);
      const message =
        (error instanceof Error && error.message) ||
        "Something went wrong while saving your changes. Please try again.";
      wizard.setError("multimedia", message);
      toast({
        title: "Update Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <CauseWizard
      title="Edit Cause"
      description="Refine your project to reach more donors and achieve your impact."
      stepMeta={editCauseStepMeta}
      currentStep={currentStep}
      onStepSelect={wizard.setCurrentStep}
      onBack={wizard.prevStep}
      onNext={wizard.nextStep}
      onSubmit={handleSubmit}
      submitLabel="Update Cause"
      busyLabel="Saving..."
      busy={isLoading}
    >
      {currentStep === 1 && (
        <CauseBasicsStep
          mode="edit"
          form={form}
          errors={errors}
          setFormFields={setFormFields}
        />
      )}
      {currentStep === 2 && (
        <CauseStoryStep
          sections={form.sections}
          errors={errors}
          showErrors={wizard.attemptedStep === 2}
          onAdd={wizard.addSection}
          onRemove={wizard.removeSection}
          onUpdate={wizard.updateSection}
        />
      )}
      {currentStep === 3 && (
        <CauseTimelineStep
          startDate={form.startDate}
          endDate={form.endDate}
          errors={errors}
          setFormFields={setFormFields}
        />
      )}
      {currentStep === 4 && (
        <CauseMediaStep
          form={form}
          errors={errors}
          setFormFields={setFormFields}
          onCoverUpload={wizard.uploadCover}
          onCoverRemove={wizard.clearCover}
          onGalleryUpload={wizard.uploadGallery}
          onGalleryRemove={wizard.removeMedia}
        />
      )}
      {currentStep === 5 && <CauseReviewStep form={form} />}
    </CauseWizard>
  );
}
