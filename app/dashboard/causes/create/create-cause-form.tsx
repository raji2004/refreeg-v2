"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampaignLocationAutocomplete } from "@/components/campaign-location-autocomplete";
import { CampaignCategorySelect } from "@/components/campaign-category-select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { PremiumFormContainer } from "@/components/ui/premium/premium-form-container";
import { FormStepper } from "@/components/ui/premium/form-stepper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dynamic from "next/dynamic";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Icons } from "@/components/icons";
import { useAuth } from "@/hooks/use-auth";
import { useCause } from "@/hooks/use-cause";
import { Skeleton } from "@/components/ui/skeleton";

const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((mod) => mod.Calendar),
  {
    loading: () => <Skeleton className="h-[300px] w-full" />,
    ssr: false,
  },
);

const ImageUpload = dynamic(
  () => import("@/components/ui/image-upload").then((mod) => mod.ImageUpload),
  {
    loading: () => <Skeleton className="h-40 w-full" />,
  },
);

const SelectedMediaCarousel = dynamic(
  () =>
    import("@/components/ui/premium/selected-media-carousel").then(
      (mod) => mod.SelectedMediaCarousel,
    ),
  {
    loading: () => <Skeleton className="h-[200px] w-full" />,
    ssr: false,
  },
);

const MultimediaCarousel = dynamic(
  () => import("@/components/MultimediaCarousel"),
  {
    loading: () => <Skeleton className="h-64 w-full" />,
  },
);
import { categories } from "@/lib/categories";
import {
  sendCauseUnderReviewEmail,
  sendIncompleteCauseSetupEmail,
} from "@/services/mail";
import {
  format,
  addDays,
  isAfter,
  isBefore,
  differenceInDays,
  startOfDay,
} from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  CalendarIcon,
  LockKeyhole,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isVideoFile,
  MAX_VIDEOS_PER_CAUSE,
  validateGalleryVideo,
} from "@/lib/media/video";
import { resolveMultimediaForSubmit } from "@/lib/s3/upload-client";
import {
  CAUSE_COVER_ACCEPT,
  CAUSE_COVER_DESCRIPTION,
  CAUSE_COVER_HEIGHT,
  CAUSE_COVER_WIDTH,
  validateCauseCoverImage,
  validateCauseGalleryImage,
} from "@/lib/media/cause-cover";

const currencies = [{ id: "NGN", name: "Naira (₦)" }];
const MAX_DURATION_DAYS = 180;

const GALLERY_ACCEPT = {
  ...CAUSE_COVER_ACCEPT,
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
};

type FormData = {
  title: string;
  summary: string;
  location: string;
  category: string;
  goal: string;
  currency: string;
  coverImage: File | null;
  sections: { heading: string; description: string }[];
  startDate: Date | undefined;
  endDate: Date | undefined;
  multimedia: (File | string)[];
  videoLinks: string[];
};

type FormErrors = {
  title?: string;
  summary?: string;
  location?: string;
  category?: string;
  goal?: string;
  coverImage?: string;
  startDate?: string;
  endDate?: string;
  multimedia?: string;
  sections?: { heading?: string; description?: string }[];
};

type CauseFormData = {
  title: string;
  summary: string;
  location: string;
  category: string;
  goal: string;
  currency: string;
  coverImage: File | null;
  sections: { heading: string; description: string }[];
  startDate: Date | undefined;
  endDate: Date | undefined;
  multimedia: (File | string)[];
  video_links: string[];
};

const validateForm = (formData: FormData): FormErrors => {
  const errors: FormErrors = {};

  if (!formData.title.trim()) {
    errors.title = "Title is required";
  } else if (formData.title.length < 5) {
    errors.title = "Title must be at least 5 characters long";
  }

  if (!formData.category) {
    errors.category = "Category is required";
  }

  if (formData.summary && formData.summary.length > 200) {
    errors.summary = "Summary must be less than 200 characters";
  }

  if (!formData.location.trim()) {
    errors.location = "Select a valid location from the suggestions";
  } else if (formData.location.trim().length > 100) {
    errors.location = "Location must be less than 100 characters";
  }

  if (!formData.goal) {
    errors.goal = "Funding goal is required";
  } else if (isNaN(Number(formData.goal)) || Number(formData.goal) <= 0) {
    errors.goal = "Please enter a valid amount";
  }

  if (!formData.coverImage) {
    errors.coverImage = "Cover image is required";
  }

  if (!formData.startDate) {
    errors.startDate = "Start date is required";
  }

  if (!formData.endDate) {
    errors.endDate = "End date is required";
  } else if (formData.startDate && formData.endDate) {
    const daysDiff = differenceInDays(formData.endDate, formData.startDate);
    if (daysDiff > MAX_DURATION_DAYS) {
      errors.endDate = `Cause duration cannot exceed ${MAX_DURATION_DAYS} days`;
    }
    if (daysDiff < 1) {
      errors.endDate = "End date must be after start date";
    }
  }

  if (formData.sections && formData.sections.length > 0) {
    const sectionErrorsArray = formData.sections.map((section) => {
      const sectionErrors: { heading?: string; description?: string } = {};
      if (!section.heading.trim())
        sectionErrors.heading = "Heading is required";
      if (!section.description || !section.description.trim())
        sectionErrors.description = "Sub-description is required";
      return sectionErrors;
    });

    if (sectionErrorsArray.some((err) => Object.keys(err).length > 0)) {
      errors.sections = sectionErrorsArray;
    }
  }

  const MAX_TOTAL_SIZE = 100 * 1024 * 1024;
  const totalSize =
    formData.multimedia && formData.multimedia.length > 0
      ? formData.multimedia.reduce(
          (acc, file) => acc + (typeof file === "string" ? 0 : file.size),
          0,
        )
      : 0;
  if (totalSize > MAX_TOTAL_SIZE) {
    errors.multimedia = "Total multimedia size must be less than 100MB";
  }

  return errors;
};

export default function CreateCauseForm() {
  const { user } = useAuth();
  const { isLoading, createCause } = useCause();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const flowTopRef = useRef<HTMLDivElement>(null);
  const previousStepRef = useRef(currentStep);
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    summary: "",
    location: "",
    category: "",
    goal: "",
    currency: "NGN",
    coverImage: null,
    sections: [{ heading: "", description: "" }],
    startDate: startOfDay(new Date()),
    endDate: addDays(startOfDay(new Date()), 7),
    multimedia: [],
    videoLinks: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const hasStartedFilling = Boolean(
    formData.title || formData.category || formData.goal,
  );

  useEffect(() => {
    if (previousStepRef.current === currentStep) return;
    previousStepRef.current = currentStep;

    window.requestAnimationFrame(() => {
      flowTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [currentStep]);

  useEffect(() => {
    const savedDraft = localStorage.getItem("causeDraft");
    if (savedDraft) {
      const parsedDraft = JSON.parse(savedDraft);
      const today = startOfDay(new Date());
      const loadedStartDate = parsedDraft.startDate
        ? new Date(parsedDraft.startDate)
        : undefined;

      // Ensure start date is not in the past
      const startDate =
        loadedStartDate && !isBefore(loadedStartDate, today)
          ? loadedStartDate
          : today;

      const loadedEndDate = parsedDraft.endDate
        ? new Date(parsedDraft.endDate)
        : undefined;

      // Ensure end date is after start date, default to 7 days if invalid
      const endDate =
        loadedEndDate && isAfter(loadedEndDate, startDate)
          ? loadedEndDate
          : addDays(startDate, 7);

      setFormData((prev) => ({
        ...parsedDraft,
        location: parsedDraft.locationVerified
          ? parsedDraft.location || ""
          : "",
        coverImage: prev.coverImage,
        startDate,
        endDate,
        multimedia: [],
        videoLinks: parsedDraft.videoLinks || [],
      }));
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const { coverImage, multimedia, ...dataToSave } = formData;
      const serializedData = {
        ...dataToSave,
        locationVerified: Boolean(dataToSave.location),
        startDate: dataToSave.startDate
          ? dataToSave.startDate.toISOString()
          : null,
        endDate: dataToSave.endDate ? dataToSave.endDate.toISOString() : null,
      };
      localStorage.setItem("causeDraft", JSON.stringify(serializedData));
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData]);

  const hasTitle = formData.title ? true : false;
  const hasCategory = formData.category ? true : false;
  const hasGoal = formData.goal ? true : false;

  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;

    const setupInactivityTracking = () => {
      const hasDraft = localStorage.getItem("causeDraft");
      const hasStartedFilling = hasTitle || hasCategory || hasGoal;

      if (hasDraft || hasStartedFilling) {
        const resetTimer = () => {
          clearTimeout(inactivityTimer);
          inactivityTimer = setTimeout(sendReminder, 24 * 60 * 60 * 1000);
        };

        const events = ["input", "change", "click", "keydown"];
        events.forEach((event) => {
          document.addEventListener(event, resetTimer, { passive: true });
        });

        resetTimer();

        return () => {
          clearTimeout(inactivityTimer);
          events.forEach((event) => {
            document.removeEventListener(event, resetTimer);
          });
        };
      }
    };

    const sendReminder = async () => {
      const currentDraft = localStorage.getItem("causeDraft");
      if (currentDraft && user) {
        try {
          await sendIncompleteCauseSetupEmail({
            continueUrl: `${window.location.origin}/dashboard/causes/create`,
          });
        } catch (error) {
          console.error("Failed to send incomplete cause email:", error);
        }
      }
    };

    const cleanup = setupInactivityTracking();
    return cleanup;
  }, [hasTitle, hasCategory, hasGoal, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleDateChange = (
    date: Date | undefined,
    field: "startDate" | "endDate",
  ) => {
    setFormData((prev) => ({ ...prev, [field]: date }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleImageUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setErrors((prev) => ({
        ...prev,
        coverImage: "Cover image must be less than 100MB",
      }));
      return;
    }

    const validationError = await validateCauseCoverImage(file);
    if (validationError) {
      setFormData((prev) => ({ ...prev, coverImage: null }));
      setErrors((prev) => ({ ...prev, coverImage: validationError }));
      return;
    }

    setFormData((prev) => ({ ...prev, coverImage: file }));
    if (errors.coverImage) {
      setErrors((prev) => ({ ...prev, coverImage: undefined }));
    }
  };

  const handleMultimediaUpload = async (files: File[]) => {
    const MAX_FILES = 5;
    const MAX_TOTAL_SIZE = 100 * 1024 * 1024;

    const currentFilesCount = formData.multimedia?.length || 0;
    if (currentFilesCount + files.length > MAX_FILES) {
      setErrors((prev) => ({
        ...prev,
        multimedia: `You can only upload a total of ${MAX_FILES} files`,
      }));
      return;
    }

    const existingVideoCount = (formData.multimedia || []).filter(
      isVideoFile,
    ).length;
    const incomingVideos = files.filter((f) => f.type.startsWith("video/"));
    if (existingVideoCount + incomingVideos.length > MAX_VIDEOS_PER_CAUSE) {
      setErrors((prev) => ({
        ...prev,
        multimedia: `You can upload at most ${MAX_VIDEOS_PER_CAUSE} videos per cause`,
      }));
      return;
    }

    try {
      const { compressImage } = await import("@/utils/image-compression");
      const processedFiles: File[] = [];
      let videoSlot = existingVideoCount;

      for (const file of files) {
        if (file.type.startsWith("video/")) {
          const videoError = await validateGalleryVideo(file, {
            existingVideoCount: videoSlot,
          });
          if (videoError) {
            setErrors((prev) => ({ ...prev, multimedia: videoError }));
            return;
          }
          videoSlot += 1;
          processedFiles.push(file);
          continue;
        }

        if (file.type.startsWith("image/")) {
          const imageError = await validateCauseGalleryImage(file);
          if (imageError) {
            setErrors((prev) => ({ ...prev, multimedia: imageError }));
            return;
          }
          processedFiles.push(await compressImage(file, 1600, 0.8));
        } else {
          setErrors((prev) => ({
            ...prev,
            multimedia: "Only images (any) and videos (MP4/WebM) are allowed",
          }));
          return;
        }
      }

      const currentSize =
        formData.multimedia && formData.multimedia.length > 0
          ? formData.multimedia.reduce(
              (acc, file) => acc + (typeof file === "string" ? 0 : file.size),
              0,
            )
          : 0;
      const newFilesSize = processedFiles.reduce(
        (acc, file) => acc + file.size,
        0,
      );

      if (currentSize + newFilesSize > MAX_TOTAL_SIZE) {
        setErrors((prev) => ({
          ...prev,
          multimedia: "Total multimedia size must be less than 100MB",
        }));
        return;
      }

      setFormData((prev) => ({
        ...prev,
        multimedia: Array.isArray(prev.multimedia)
          ? [...prev.multimedia, ...processedFiles]
          : [...processedFiles],
      }));

      if (errors.multimedia) {
        setErrors((prev) => ({ ...prev, multimedia: undefined }));
      }
    } catch (error) {
      console.error("Multimedia processing error:", error);
      setErrors((prev) => ({
        ...prev,
        multimedia: "Failed to process media. Please try again.",
      }));
    }
  };

  const removeMultimedia = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      multimedia: Array.isArray(prev.multimedia)
        ? prev.multimedia.filter((_, i) => i !== index)
        : [],
    }));
  };

  const validateStep = (step: number): boolean => {
    const currentErrors = validateForm(formData);
    setErrors(currentErrors);

    switch (step) {
      case 1:
        return (
          !currentErrors.title &&
          !currentErrors.location &&
          !currentErrors.category &&
          !currentErrors.goal
        );
      case 2:
        if (currentErrors.sections) {
          return !currentErrors.sections.some(
            (err) => err.heading || err.description,
          );
        }

        return formData.sections.every(
          (section) =>
            section.heading.trim() !== "" && section.description.trim() !== "",
        );
      case 3:
        return !currentErrors.startDate && !currentErrors.endDate;
      case 4:
        return !currentErrors.coverImage;
      default:
        return true;
    }
  };

  const nextStep = () => {
    setAttemptedStep(currentStep);
    if (currentStep < 5 && validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (currentStep < 5) {
      nextStep();
      return;
    }

    setSubmitting(true);
    const validationErrors = validateForm(formData);

    const hasErrors = Object.keys(validationErrors).some((key) => {
      if (key === "sections" && validationErrors.sections) {
        return validationErrors.sections.some(
          (section) => Object.keys(section).length > 0,
        );
      }
      return validationErrors[key as keyof FormErrors] !== undefined;
    });

    if (hasErrors) {
      setErrors(validationErrors);
      setSubmitting(false);
      return;
    }
    const causeData: CauseFormData = {
      title: formData.title,
      summary: formData.summary,
      location: formData.location,
      category: formData.category,
      goal: formData.goal,
      currency: formData.currency,
      coverImage: formData.coverImage,
      sections: formData.sections,
      startDate: formData.startDate,
      endDate: formData.endDate,
      multimedia: formData.multimedia,
      video_links: formData.videoLinks,
    };
    try {
      // Videos go direct to S3 via presign; images stay as Files for server action
      const draftEntityId = crypto.randomUUID();
      causeData.multimedia = await resolveMultimediaForSubmit(
        formData.multimedia || [],
        { entityType: "causes", entityId: draftEntityId },
      );

      await createCause(user.id, causeData);
      localStorage.removeItem("causeDraft");

      sendCauseUnderReviewEmail({
        causeName: causeData.title,
        reviewTimeframe: "3-5 business days",
        dashboardUrl: `${window.location.origin}/dashboard/causes`,
      }).catch((error) => {
        console.error("Failed to send cause-under-review email:", error);
      });

      router.push("/dashboard/causes");
    } catch (error) {
      console.error("Error submitting cause:", error);
      setErrors((prev) => ({
        ...prev,
        multimedia:
          error instanceof Error
            ? error.message
            : "Failed to upload media or create cause",
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  const addSection = () => {
    setFormData((prev) => ({
      ...prev,
      sections: [...prev.sections, { heading: "", description: "" }],
    }));
  };

  const removeSection = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
  };

  const updateSection = (
    index: number,
    field: "heading" | "description",
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) =>
        i === index ? { ...section, [field]: value } : section,
      ),
    }));

    if (errors.sections?.[index]?.[field]) {
      setErrors((prev) => ({
        ...prev,
        sections: prev.sections?.map((sectionError, i) =>
          i === index ? { ...sectionError, [field]: undefined } : sectionError,
        ),
      }));
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 sm:space-y-8">
            <div className="space-y-5 sm:space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="title"
                  className="text-sm font-semibold text-gray-700 sm:text-base"
                >
                  Cause Title
                </Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g., Clean Water for Owerri Community"
                  value={formData.title}
                  onChange={handleChange}
                  className={cn(
                    "h-11 text-base premium-input sm:h-12 sm:text-lg",
                    errors.title ? "border-red-500" : "",
                  )}
                />
                {errors.title && (
                  <p className="text-sm text-red-500 font-medium">
                    {errors.title}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="summary"
                    className="text-sm font-semibold text-gray-700 sm:text-base"
                  >
                    Short Summary{" "}
                    <span className="text-gray-400 font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="summary"
                    name="summary"
                    placeholder="One-line description shown on the cause hero"
                    value={formData.summary}
                    onChange={handleChange}
                    maxLength={200}
                    className={cn(
                      "h-11 premium-input sm:h-12",
                      errors.summary ? "border-red-500" : "",
                    )}
                  />
                  {errors.summary && (
                    <p className="text-sm text-red-500 font-medium">
                      {errors.summary}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="location"
                    className="text-sm font-semibold text-gray-700 sm:text-base"
                  >
                    Location <span className="text-red-500">*</span>
                  </Label>
                  <CampaignLocationAutocomplete
                    value={formData.location}
                    invalid={Boolean(errors.location)}
                    onChange={(location) => {
                      setFormData((current) => ({ ...current, location }));
                      if (location) {
                        setErrors((current) => ({
                          ...current,
                          location: undefined,
                        }));
                      }
                    }}
                    className="h-11 premium-input sm:h-12"
                  />
                  <p className="text-xs text-slate-500">
                    Type at least two letters, then select a place from the list.
                  </p>
                  {errors.location && (
                    <p className="text-sm text-red-500 font-medium">
                      {errors.location}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="category"
                    className="text-sm font-semibold text-gray-700 sm:text-base"
                  >
                    Category
                  </Label>
                  <CampaignCategorySelect
                    value={formData.category}
                    onValueChange={(value) =>
                      handleSelectChange("category", value)
                    }
                    invalid={Boolean(errors.category)}
                  />
                  {errors.category && (
                    <p className="text-sm text-red-500 font-medium">
                      {errors.category}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-3">
                  <div className="space-y-2 sm:col-span-2">
                    <Label
                      htmlFor="goal"
                      className="text-sm font-semibold text-gray-700 sm:text-base"
                    >
                      Funding Goal
                    </Label>
                    <div className="relative">
                      <Input
                        id="goal"
                        name="goal"
                        type="number"
                        placeholder="0.00"
                        value={formData.goal}
                        onChange={handleChange}
                        className={cn(
                          "h-11 pl-11 premium-input text-base font-mono sm:h-12 sm:pl-12 sm:text-lg",
                          errors.goal ? "border-red-500" : "",
                        )}
                      />
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold sm:left-4">
                        ₦
                      </span>
                    </div>
                    {errors.goal && (
                      <p className="text-sm text-red-500 font-medium">
                        {errors.goal}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="currency"
                      className="text-sm font-semibold text-gray-700 sm:text-base"
                    >
                      Currency
                    </Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) =>
                        handleSelectChange("currency", value)
                      }
                    >
                      <SelectTrigger className="h-11 premium-input font-bold sm:h-12">
                        <SelectValue placeholder="NGN" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.id} value={currency.id}>
                            {currency.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 sm:space-y-8">
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={addSection}
                variant="outline"
                className="h-10 w-full rounded-full border-[#D8E0E8] bg-white px-4 text-sm font-bold text-[#10233F] shadow-none hover:border-[#235DA7] hover:bg-[#F4F8FC] hover:text-[#10233F] sm:w-auto"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add section
              </Button>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {formData.sections.map((section, index) => (
                <Card
                  key={index}
                  className="relative overflow-hidden rounded-2xl border-[#DDE3EA] bg-white shadow-none"
                >
                  <div className="space-y-4 px-3 py-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#235DA7]">
                        Section {index + 1}
                      </span>
                      {index > 0 && (
                        <Button
                          type="button"
                          onClick={() => removeSection(index)}
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                    <div className="space-y-4 pt-1 sm:pt-2">
                      <div className="space-y-2">
                        <Label
                          htmlFor={`section-heading-${index}`}
                          className="text-sm font-semibold text-[#33445A]"
                        >
                          Heading
                        </Label>
                        <Input
                          id={`section-heading-${index}`}
                          placeholder="e.g. Why this matters"
                          value={section.heading}
                          onChange={(e) =>
                            updateSection(index, "heading", e.target.value)
                          }
                          className={cn(
                            "h-11 premium-input sm:h-12",
                            errors.sections?.[index]?.heading &&
                              "border-red-500 focus:border-red-500 focus:ring-red-100",
                          )}
                        />
                        {attemptedStep === 2 &&
                          errors.sections?.[index]?.heading && (
                            <p className="text-sm font-medium text-red-500">
                              {errors.sections[index]?.heading}
                            </p>
                          )}
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor={`section-description-${index}`}
                          className="text-sm font-semibold text-[#33445A]"
                        >
                          Story Content
                        </Label>
                        <Textarea
                          id={`section-description-${index}`}
                          placeholder="Share the problem, who it affects, and how this campaign helps."
                          value={section.description}
                          onChange={(e) =>
                            updateSection(index, "description", e.target.value)
                          }
                          className={cn(
                            "min-h-[120px] resize-none premium-input sm:min-h-[140px]",
                            errors.sections?.[index]?.description &&
                              "border-red-500 focus:border-red-500 focus:ring-red-100",
                          )}
                        />
                        {attemptedStep === 2 &&
                          errors.sections?.[index]?.description && (
                            <p className="text-sm font-medium text-red-500">
                              Something has to be written here.
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-8">
              <div className="space-y-3 rounded-2xl border border-[#DDE3EA] bg-white px-3 py-4 sm:p-5">
                <Label
                  htmlFor="start-date"
                  className="block text-sm font-semibold text-[#33445A]"
                >
                  Start Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="start-date"
                      variant="outline"
                      className={cn(
                        "h-12 w-full justify-start rounded-xl text-left font-normal premium-input",
                        !formData.startDate && "text-muted-foreground",
                        errors.startDate && "border-red-500",
                      )}
                    >
                      <CalendarIcon className="mr-3 h-4 w-4 text-[#235DA7]" />
                      {formData.startDate ? (
                        format(formData.startDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.startDate}
                      onSelect={(date) => handleDateChange(date, "startDate")}
                      disabled={(date) =>
                        isBefore(date, startOfDay(new Date()))
                      }
                      defaultMonth={formData.startDate || new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.startDate && (
                  <p className="text-sm text-red-500 font-medium">
                    {errors.startDate}
                  </p>
                )}
              </div>

              <div className="space-y-3 rounded-2xl border border-[#DDE3EA] bg-white px-3 py-4 sm:p-5">
                <Label
                  htmlFor="end-date"
                  className="block text-sm font-semibold text-[#33445A]"
                >
                  End Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="end-date"
                      variant="outline"
                      className={cn(
                        "h-12 w-full justify-start rounded-xl text-left font-normal premium-input",
                        !formData.endDate && "text-muted-foreground",
                        errors.endDate && "border-red-500",
                      )}
                    >
                      <CalendarIcon className="mr-3 h-4 w-4 text-[#235DA7]" />
                      {formData.endDate ? (
                        format(formData.endDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.endDate}
                      onSelect={(date) => handleDateChange(date, "endDate")}
                      disabled={(date) => {
                        const today = startOfDay(new Date());
                        const start = formData.startDate || today;
                        const maxEnd = addDays(start, MAX_DURATION_DAYS);
                        return isBefore(date, start) || isAfter(date, maxEnd);
                      }}
                      defaultMonth={
                        formData.endDate || formData.startDate || new Date()
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.endDate && (
                  <p className="text-sm text-red-500 font-medium">
                    {errors.endDate}
                  </p>
                )}
              </div>
            </div>

            {formData.startDate && formData.endDate && (
              <div className="flex items-start gap-3 rounded-xl border border-[#C9D9E8] bg-[#F2F7FC] px-3 py-4 sm:p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DCEAF7] text-[#235DA7]">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#10233F]">
                    Duration:{" "}
                    {differenceInDays(formData.endDate, formData.startDate)}{" "}
                    Days
                  </p>
                  <p className="text-xs text-gray-500">
                    Running from {format(formData.startDate, "PPP")} to{" "}
                    {format(formData.endDate, "PPP")}
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 sm:space-y-8">
            <div className="space-y-5 sm:space-y-6">
              <div className="space-y-4">
                <Label className="block text-sm font-semibold text-gray-700 sm:text-base">
                  Cover Image
                </Label>
                <div className="rounded-2xl border border-[#DDE3EA] bg-white px-3 py-4 sm:p-6">
                  <ImageUpload
                    onUpload={(files) => handleImageUpload(files)}
                    maxFiles={1}
                    accept={CAUSE_COVER_ACCEPT}
                    enableCrop
                    cropAspect={16 / 9}
                    cropRequired
                    cropOutputWidth={CAUSE_COVER_WIDTH}
                    cropOutputHeight={CAUSE_COVER_HEIGHT}
                    description={`${CAUSE_COVER_DESCRIPTION} · up to 100MB`}
                  />
                  {formData.coverImage && (
                    <div className="mt-4 relative group aspect-video rounded-xl overflow-hidden shadow-sm border border-brand/10">
                      <Image
                        src={URL.createObjectURL(formData.coverImage)}
                        alt="Cover Preview"
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        unoptimized
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            coverImage: null,
                          }))
                        }
                        className="absolute right-3 top-3 h-9 w-9 rounded-full border border-white/60 p-0 shadow-sm"
                        aria-label="Remove cover image"
                      >
                        <Icons.trash className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {errors.coverImage && (
                    <p className="mt-2 text-sm text-red-500 font-medium">
                      {errors.coverImage}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Label className="block text-sm font-semibold text-gray-700 sm:text-base">
                    Multimedia Gallery
                  </Label>
                  <span className="w-fit rounded-full border border-[#D8E0E8] bg-[#F8FAFC] px-2.5 py-1 text-xs font-semibold text-[#53647A]">
                    Max 5 files · 2 videos (MP4/WebM, 50MB, 90s)
                  </span>
                </div>
                <div className="rounded-2xl border border-[#DDE3EA] bg-white px-3 py-4 sm:p-6">
                  <ImageUpload
                    onUpload={(files) => handleMultimediaUpload(files)}
                    maxFiles={5 - (formData.multimedia?.length || 0)}
                    accept={GALLERY_ACCEPT}
                    enableCrop
                    cropAspect={16 / 9}
                    cropOutputWidth={CAUSE_COVER_WIDTH}
                    cropOutputHeight={CAUSE_COVER_HEIGHT}
                    description="Select up to 5 images and crop each one, or keep its original framing; videos may be MP4/WebM (max 50MB / 90s each)"
                  />
                  {errors.multimedia && (
                    <p className="mt-2 text-sm text-red-500 font-medium">
                      {errors.multimedia}
                    </p>
                  )}
                  {formData.multimedia && formData.multimedia.length > 0 && (
                    <div className="mt-6">
                      <SelectedMediaCarousel
                        files={formData.multimedia}
                        onRemove={removeMultimedia}
                        variant="refreeg"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="block text-sm font-semibold text-gray-700 sm:text-base">
                  Video Links (Optional)
                </Label>
                <div className="space-y-3">
                  {formData.videoLinks.map((link, index) => (
                    <div
                      key={index}
                      className="group flex flex-col gap-2 animate-in slide-in-from-left-2 sm:flex-row"
                    >
                      <Input
                        value={link}
                        onChange={(e) => {
                          const newLinks = [...formData.videoLinks];
                          newLinks[index] = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            videoLinks: newLinks,
                          }));
                        }}
                        placeholder="YouTube or Vimeo link"
                        className="h-11 premium-input bg-white sm:h-12"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const newLinks = formData.videoLinks.filter(
                            (_, i) => i !== index,
                          );
                          setFormData((prev) => ({
                            ...prev,
                            videoLinks: newLinks,
                          }));
                        }}
                        className="h-11 shrink-0 rounded-xl border-[#E7B9B5] bg-white px-5 font-semibold text-[#B42318] shadow-none hover:border-[#D77A72] hover:bg-[#FFF4F2] hover:text-[#912018] sm:h-12"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        videoLinks: [...prev.videoLinks, ""],
                      }))
                    }
                    variant="outline"
                    className="h-11 w-full rounded-xl border border-dashed border-[#B8C5D3] bg-white text-[#53647A] shadow-none hover:border-[#235DA7] hover:bg-[#F4F8FC] hover:text-[#235DA7] sm:h-12"
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add video link
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
              <div className="space-y-6 lg:col-span-2 lg:space-y-8">
                {/* Visual Preview */}
                <div className="overflow-hidden rounded-2xl border border-[#DDE3EA] bg-white">
                  <MultimediaCarousel
                    media={[
                      ...(formData.multimedia?.map((file) =>
                        typeof file === "string"
                          ? file
                          : URL.createObjectURL(file),
                      ) || []),
                      ...(formData.videoLinks || []),
                    ]}
                    coverImage={
                      formData.coverImage
                        ? URL.createObjectURL(formData.coverImage)
                        : undefined
                    }
                    title={formData.title}
                  />
                </div>

                {/* Content Review */}
                <div className="space-y-5 sm:space-y-6">
                  <div>
                    <h4 className="mb-2 text-xl font-extrabold text-[#10233F]">
                      {formData.title}
                    </h4>
                    {(formData.summary || formData.location) && (
                      <div className="flex flex-wrap gap-4 mb-4">
                        {formData.location && (
                          <div className="flex items-center gap-1.5 rounded-full border border-[#C9D9E8] bg-[#F2F7FC] px-2.5 py-1 text-sm font-medium text-[#235DA7]">
                            <Icons.mapPin className="w-3.5 h-3.5" />
                            {formData.location}
                          </div>
                        )}
                        {formData.category && (
                          <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                            {
                              categories.find((c) => c.id === formData.category)
                                ?.name
                            }
                          </div>
                        )}
                      </div>
                    )}
                    {formData.summary && (
                      <p className="mb-4 border-l-2 border-[#235DA7] py-1 pl-4 text-[#53647A]">
                        &quot;{formData.summary}&quot;
                      </p>
                    )}
                    {formData.sections[0]?.heading && (
                      <h5 className="text-lg font-semibold text-gray-800 mb-2">
                        {formData.sections[0].heading}
                      </h5>
                    )}
                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                      {formData.sections[0]?.description}
                    </p>
                  </div>

                  {formData.sections.slice(1).map((section, index) => (
                    <div key={index} className="space-y-2">
                      <h5 className="text-lg font-semibold text-gray-800">
                        {section.heading}
                      </h5>
                      <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                        {section.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-6">
                <div className="space-y-5 rounded-2xl border border-[#DDE3EA] bg-white px-3 py-5 sm:p-6 lg:sticky lg:top-6">
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Target Goal
                    </p>
                    <p className="text-3xl font-extrabold text-[#10233F]">
                      {formData.currency}{" "}
                      {Number(formData.goal).toLocaleString()}
                    </p>
                  </div>

                  <div className="space-y-1 border-t border-gray-100 pt-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Category
                    </p>
                    <p className="text-lg font-semibold text-gray-800">
                      {categories.find((c) => c.id === formData.category)?.name}
                    </p>
                  </div>

                  <div className="space-y-1 border-t border-gray-100 pt-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Duration
                    </p>
                    <div className="flex items-center gap-2 text-gray-700">
                      <CalendarIcon className="w-4 h-4 text-brand" />
                      <span className="font-medium">
                        {formData.startDate && formData.endDate
                          ? `${differenceInDays(formData.endDate, formData.startDate)} Days`
                          : "Not set"}
                      </span>
                    </div>
                    {formData.startDate && formData.endDate && (
                      <p className="text-xs text-gray-400 mt-1">
                        {format(formData.startDate, "MMM d")} -{" "}
                        {format(formData.endDate, "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const steps = ["Basic Info", "Story", "Timeline", "Media", "Review"];
  const stepMeta = [
    {
      title: "Start with the basics",
      description:
        "Give supporters a clear snapshot of what you are raising money for.",
    },
    {
      title: "Tell your story",
      description:
        "Add sections so supporters understand who this helps and why.",
    },
    {
      title: "Set your timeline",
      description:
        "Choose when fundraising starts and ends. Campaigns can run for up to 180 days.",
    },
    {
      title: "Add campaign media",
      description:
        "Choose a strong cover image, then add photos or short videos that build trust.",
    },
    {
      title: "Review your cause",
      description:
        "Check the details supporters will see before sending your cause for review.",
    },
  ] as const;
  const activeStep = stepMeta[currentStep - 1];

  return (
    <PremiumFormContainer
      title="Create a cause"
      description="Set up your campaign, explain the need, and submit it for review. Your progress is saved as you go."
      variant="refreeg"
    >
      <div ref={flowTopRef} className="scroll-mt-28 space-y-4">
        <FormStepper
          steps={steps}
          currentStep={currentStep}
          variant="refreeg"
          onStepSelect={(step) => {
            if (step < currentStep) setCurrentStep(step);
          }}
        />

        <section className="overflow-hidden rounded-2xl border border-[#D6DEE7] bg-white shadow-[0_18px_45px_-38px_rgba(16,35,63,0.55)]">
          <div className="border-b border-[#E1E7ED] bg-[#FBFCFD] px-3 py-4 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#235DA7]">
              {steps[currentStep - 1]}
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-[22px] font-extrabold tracking-[-0.015em] text-[#10233F] sm:text-2xl">
                  {activeStep.title}
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#53647A]">
                  {activeStep.description}
                </p>
              </div>
              <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-lg border border-[#C9D9E8] bg-[#EEF5FB] px-3 py-2 text-[10px] font-bold text-[#274C72]">
                <LockKeyhole className="h-3.5 w-3.5" />
                Milestone protected
              </div>
            </div>
          </div>

          <form
            className="cause-flow space-y-6 px-3 py-4 sm:space-y-8 sm:p-6"
            autoComplete="off"
            onKeyDown={(e) => {
              if (
                currentStep === 5 &&
                e.key === "Enter" &&
                e.target instanceof HTMLElement &&
                e.target.tagName !== "TEXTAREA" &&
                e.target.tagName !== "BUTTON"
              ) {
                e.preventDefault();
              }
            }}
          >
            <div className="min-h-[320px] sm:min-h-[400px]">
              <div
                key={currentStep}
                className="animate-in fade-in duration-200"
              >
                {renderStep()}
              </div>
            </div>

            <div className="sticky bottom-0 z-10 -mx-3 -mb-4 flex items-center justify-between gap-3 border-t border-[#DDE3EA] bg-white px-3 py-4 sm:static sm:-mx-6 sm:-mb-6 sm:px-6 sm:py-5">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="h-11 rounded-xl border-[#D8E0E8] bg-white px-4 font-bold text-[#10233F] shadow-none hover:border-[#9FB1C5] hover:bg-[#F8FAFC] hover:text-[#10233F] disabled:!border-[#D8E0E8] disabled:!bg-[#F4F6F8] disabled:!text-[#8795A8] disabled:opacity-100 sm:px-5"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="flex gap-3">
                {currentStep < 5 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="h-11 rounded-xl bg-[#235DA7] px-5 font-bold text-white shadow-none hover:bg-[#1B4E8C] sm:px-7"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={isLoading || submitting}
                    onClick={handleSubmit}
                    className="h-11 rounded-xl bg-[#235DA7] px-5 font-bold text-white shadow-none hover:bg-[#1B4E8C] sm:px-7"
                  >
                    {isLoading || submitting ? (
                      <>
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                        Launching...
                      </>
                    ) : (
                      "Launch Cause"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </section>
      </div>
    </PremiumFormContainer>
  );
}
