"use client";
import Image from "next/image";
import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import dynamic from "next/dynamic";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Icons } from "@/components/icons";
import { useAuth } from "@/hooks/use-auth";
import { usePetition } from "@/hooks/use-petition";
import { Progress } from "@/components/ui/progress";
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
  sendPetitionUnderReviewEmail,
  sendIncompletePetitionDraftEmail,
} from "@/services/mail";
import {
  format,
  isBefore,
  differenceInDays,
  startOfDay,
  addDays,
  isAfter,
} from "date-fns";
import { CalendarIcon, Video, X, FileVideo, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { PremiumFormContainer } from "@/components/ui/premium/premium-form-container";
import { FormStepper } from "@/components/ui/premium/form-stepper";

const currencies = [{ id: "SIGNATURES", name: "Signatures" }];
const MAX_DURATION_DAYS = 180;

type FormData = {
  title: string;
  description: string;
  category: string;
  goal: string;
  coverImage: File | null;
  sections: { heading: string; description: string }[];
  startDate: Date | undefined;
  endDate: Date | undefined;
  multimedia: File[];
  videoLinks: string[];
};

type FormErrors = {
  title?: string;
  category?: string;
  goal?: string;
  coverImage?: string;
  startDate?: string;
  endDate?: string;
  multimedia?: string;
  sections?: { heading?: string; description?: string }[];
};

type PetitionFormData = {
  title: string;
  description: string;
  category: string;
  goal: string;
  coverImage: File | null;
  sections: { heading: string; description: string }[];
  startDate: Date | undefined;
  endDate: Date | undefined;
  multimedia: File[];
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

  if (!formData.goal || !formData.goal.trim()) {
    errors.goal = "Petition goal is required";
  } else {
    const goalValue = Number(formData.goal);
    if (isNaN(goalValue)) {
      errors.goal = "Goal must be a valid number";
    } else if (goalValue <= 0) {
      errors.goal = "Goal must be greater than zero";
    } else if (goalValue < 10) {
      errors.goal = "Goal must be at least 10 signatures";
    }
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
      errors.endDate = `Petition duration cannot exceed ${MAX_DURATION_DAYS} days`;
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
      ? formData.multimedia.reduce((acc, file) => acc + file.size, 0)
      : 0;
  if (totalSize > MAX_TOTAL_SIZE) {
    errors.multimedia = "Total multimedia size must be less than 100MB";
  }

  return errors;
};

export default function CreatePetitionForm() {
  const { user } = useAuth();
  const { isLoading, createPetition } = usePetition();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    category: "",
    goal: "",
    coverImage: null,
    sections: [{ heading: "", description: "" }],
    startDate: undefined,
    endDate: undefined,
    multimedia: [],
    videoLinks: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [videoLinkInput, setVideoLinkInput] = useState("");
  const [videoLinkError, setVideoLinkError] = useState<string | null>(null);

  useEffect(() => {
    const savedDraft = localStorage.getItem("petitionDraft");
    if (savedDraft) {
      const parsedDraft = JSON.parse(savedDraft);
      setFormData((prev) => ({
        ...parsedDraft,
        coverImage: prev.coverImage,
        startDate: parsedDraft.startDate
          ? new Date(parsedDraft.startDate)
          : undefined,
        endDate: parsedDraft.endDate
          ? new Date(parsedDraft.endDate)
          : undefined,
        multimedia: [],
        videoLinks: parsedDraft.videoLinks || [],
      }));
    }
  }, []);

  useEffect(() => {
    const { coverImage, multimedia, ...dataToSave } = formData;
    const serializedData = {
      ...dataToSave,
      startDate: dataToSave.startDate
        ? dataToSave.startDate.toISOString()
        : null,
      endDate: dataToSave.endDate ? dataToSave.endDate.toISOString() : null,
    };
    localStorage.setItem("petitionDraft", JSON.stringify(serializedData));
  }, [formData]);

  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;

    const setupInactivityTracking = () => {
      const hasDraft = localStorage.getItem("petitionDraft");
      const hasStartedFilling =
        formData.title || formData.category || formData.goal;

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
      const currentDraft = localStorage.getItem("petitionDraft");
      if (currentDraft && user) {
        try {
          await sendIncompletePetitionDraftEmail({
            continueUrl: `${window.location.origin}/dashboard/petitions/create`,
          });
        } catch (error) {
          console.error("Failed to send incomplete petition email:", error);
        }
      }
    };

    const cleanup = setupInactivityTracking();
    return cleanup;
  }, [formData.title, formData.category, formData.goal, user]);

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

    try {
      let fileToUpload = file;
      if (file.type.startsWith("image/")) {
        const { compressImage } = await import("@/utils/image-compression");
        fileToUpload = await compressImage(file, 1200, 0.7);
      }

      setFormData((prev) => ({ ...prev, coverImage: fileToUpload }));
      if (errors.coverImage) {
        setErrors((prev) => ({ ...prev, coverImage: undefined }));
      }
    } catch (error) {
      console.error("Compression error:", error);
      setFormData((prev) => ({ ...prev, coverImage: file }));
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

    try {
      const { compressImage } = await import("@/utils/image-compression");
      
      const processedFiles = await Promise.all(
        files.map(async (file) => {
          if (file.type.startsWith("image/")) {
            return await compressImage(file, 1000, 0.7);
          }
          return file;
        })
      );

      const currentSize =
        formData.multimedia && formData.multimedia.length > 0
          ? formData.multimedia.reduce((acc, file) => acc + file.size, 0)
          : 0;
      const newFilesSize = processedFiles.reduce((acc, file) => acc + file.size, 0);

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
      console.error("Multimedia compression error:", error);
      setFormData((prev) => ({
        ...prev,
        multimedia: Array.isArray(prev.multimedia)
          ? [...prev.multimedia, ...files]
          : [...files],
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
          !currentErrors.title && !currentErrors.category && !currentErrors.goal
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
    const petitionData: PetitionFormData = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      goal: formData.goal,
      coverImage: formData.coverImage,
      sections: formData.sections,
      startDate: formData.startDate,
      endDate: formData.endDate,
      multimedia: formData.multimedia,
      video_links: formData.videoLinks,
    };
    try {
      await sendPetitionUnderReviewEmail({
        petitionName: petitionData.title,
        reviewTimeframe: "3-5 business days",
      });
      await createPetition(user.id, petitionData);
      localStorage.removeItem("petitionDraft");
    } catch (error) {
      console.error("Error submitting petition:", error);
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
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="title"
                  className="text-base font-semibold text-gray-700"
                >
                  Petition Title
                </Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g., Justice for Peace Valley"
                  value={formData.title}
                  onChange={handleChange}
                  className={cn(
                    "h-12 text-lg premium-input",
                    errors.title ? "border-red-500" : "",
                  )}
                />
                {errors.title && (
                  <p className="text-sm text-red-500 font-medium">
                    {errors.title}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="category"
                    className="text-base font-semibold text-gray-700"
                  >
                    Category
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      handleSelectChange("category", value)
                    }
                  >
                    <SelectTrigger
                      className={cn(
                        "h-12 premium-input",
                        errors.category ? "border-red-500" : "",
                      )}
                    >
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-red-500 font-medium">
                      {errors.category}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="goal"
                    className="text-base font-semibold text-gray-700"
                  >
                    Signature Goal
                  </Label>
                  <div className="relative">
                    <Input
                      id="goal"
                      name="goal"
                      type="number"
                      placeholder="e.g., 1000"
                      value={formData.goal}
                      onChange={handleChange}
                      className={cn(
                        "h-12 pl-4 premium-input text-lg font-mono",
                        errors.goal ? "border-red-500" : "",
                      )}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-brand/40 uppercase tracking-tighter">
                      Signatures
                    </div>
                  </div>
                  {errors.goal && (
                    <p className="text-sm text-red-500 font-medium">
                      {errors.goal}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-gradient">
                  Petition Story
                </h3>
                <p className="text-sm text-gray-500">
                  Break down your petition into clear sections for better
                  readability.
                </p>
              </div>
              <Button
                type="button"
                onClick={addSection}
                variant="outline"
                className="rounded-full border-brand/20 text-brand hover:bg-brand/5"
              >
                Add Section
              </Button>
            </div>

            <div className="space-y-6">
              {formData.sections.map((section, index) => (
                <Card
                  key={index}
                  className="relative overflow-hidden border-brand/10 shadow-sm bg-white/50 backdrop-blur-sm"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center bg-brand/5 -mx-6 -mt-6 p-4 border-b border-brand/10 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-brand">
                        Section {index + 1}
                      </span>
                      {index > 0 && (
                        <Button
                          type="button"
                          onClick={() => removeSection(index)}
                          variant="ghost"
                          size="sm"
                          className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label
                          htmlFor={`section-heading-${index}`}
                          className="font-semibold text-gray-600"
                        >
                          Heading
                        </Label>
                        <Input
                          id={`section-heading-${index}`}
                          placeholder="e.g., The Current Situation"
                          value={section.heading}
                          onChange={(e) =>
                            updateSection(index, "heading", e.target.value)
                          }
                          className="premium-input border-brand/5"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor={`section-description-${index}`}
                          className="font-semibold text-gray-600"
                        >
                          Content
                        </Label>
                        <Textarea
                          id={`section-description-${index}`}
                          placeholder="Explain this specific point in detail..."
                          value={section.description}
                          onChange={(e) =>
                            updateSection(index, "description", e.target.value)
                          }
                          className="min-h-[150px] premium-input border-brand/5 resize-none"
                        />
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
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gradient">
                Petition Timeline
              </h3>
              <p className="text-sm text-gray-500">
                How long will you be collecting signatures? Max duration is 180
                days.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label className="text-base font-semibold text-gray-700 block mb-2">
                  Start Date
                </Label>
                <div className="glass-panel p-4 rounded-2xl border-brand/5">
                  <Calendar
                    mode="single"
                    selected={formData.startDate}
                    onSelect={(date) => handleDateChange(date, "startDate")}
                    disabled={(date) => isBefore(date, startOfDay(new Date()))}
                    initialFocus
                  />
                </div>
                {errors.startDate && (
                  <p className="text-sm text-red-500 font-medium">
                    {errors.startDate}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold text-gray-700 block mb-2">
                  End Date
                </Label>
                <div className="glass-panel p-4 rounded-2xl border-brand/5">
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
                    initialFocus
                  />
                </div>
                {errors.endDate && (
                  <p className="text-sm text-red-500 font-medium">
                    {errors.endDate}
                  </p>
                )}
              </div>
            </div>

            {formData.startDate && formData.endDate && (
              <div className="bg-brand/5 p-4 rounded-xl border border-brand/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand">
                    Campaign Duration:{" "}
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
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gradient">Visual Impact</h3>
              <p className="text-sm text-gray-500">
                Visuals help people connect with your cause. High-quality media
                is key.
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold text-gray-700 block">
                  Cover Image
                </Label>
                <div className="glass-panel p-6 rounded-2xl border-brand/10 transition-all hover:border-brand/30">
                  <ImageUpload onUpload={handleImageUpload} maxFiles={1} />
                  {formData.coverImage && (
                    <div className="mt-4 relative group aspect-video rounded-xl overflow-hidden shadow-sm border border-brand/10">
                      <Image
                        src={URL.createObjectURL(formData.coverImage)}
                        alt="Cover preview"
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
                          className="rounded-full h-10 w-10 p-0"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
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
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold text-gray-700 block">
                    Multimedia Support
                  </Label>
                  <span className="text-xs text-brand font-medium bg-brand/5 px-2 py-1 rounded-full border border-brand/10">
                    Max 5 files
                  </span>
                </div>
                <div className="glass-panel p-6 rounded-2xl border-brand/10">
                  <ImageUpload
                    onUpload={(files) => handleMultimediaUpload(files)}
                    maxFiles={5 - (formData.multimedia?.length || 0)}
                    description="Upload up to 5 files"
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
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold text-gray-700 block">
                  Support Links (YouTube, TikTok, etc.)
                </Label>
                <div className="space-y-3">
                  {formData.videoLinks.map((link, index) => (
                    <div
                      key={index}
                      className="flex gap-2 group animate-in slide-in-from-left-2"
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
                        placeholder="Paste video link"
                        className="premium-input bg-white group-hover:border-brand/30"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          const newLinks = formData.videoLinks.filter(
                            (_, i) => i !== index,
                          );
                          setFormData((prev) => ({
                            ...prev,
                            videoLinks: newLinks,
                          }));
                        }}
                        className="text-red-500 hover:bg-red-50 rounded-lg h-12"
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
                    className="w-full border-dashed border-2 border-gray-200 text-gray-500 hover:border-brand/30 hover:text-brand h-12 rounded-xl transition-all"
                  >
                    + Add Video Link
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{formData.title}</h3>
              <p className="text-sm text-muted-foreground">
                {categories.find((c) => c.id === formData.category)?.name}
              </p>
            </div>
            <div className="space-y-2">
              {formData.sections.map((section, index) => (
                <div key={index} className="space-y-2">
                  <h5 className="font-medium">{section.heading}</h5>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {section.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Signature Goal</h4>
              <p className="text-sm">
                {formData.goal} Signatures
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Duration</h4>
              {formData.startDate && formData.endDate && (
                <p className="text-sm">
                  {differenceInDays(formData.endDate, formData.startDate)} days:{" "}
                  {format(formData.startDate, "PPP")} -{" "}
                  {format(formData.endDate, "PPP")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Media Preview</h4>
              <MultimediaCarousel
                media={[
                  ...formData.multimedia.map((file) =>
                    URL.createObjectURL(file),
                  ),
                  ...formData.videoLinks,
                ]}
                coverImage={
                  formData.coverImage
                    ? URL.createObjectURL(formData.coverImage)
                    : undefined
                }
                title={formData.title}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const steps = ["Basic Info", "Petition Story", "Timeline", "Media", "Review"];

  return (
    <PremiumFormContainer
      title="Launch Your Movement"
      description="Create a compelling petition that inspires people to take action."
    >
      <FormStepper steps={steps} currentStep={currentStep} />

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
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex justify-between items-center pt-8 border-t border-gray-100">
          <Button
            type="button"
            variant="ghost"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="hover:bg-gray-50"
          >
            Back
          </Button>
          <div className="flex gap-4">
            {currentStep < 5 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="bg-brand text-white hover:bg-brand/90 px-8"
              >
                Continue
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isLoading || submitting}
                className="bg-brand text-white hover:bg-brand/90 px-8"
              >
                {isLoading || submitting ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Launching...
                  </>
                ) : (
                  "Launch Petition"
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </PremiumFormContainer>
  );
}
