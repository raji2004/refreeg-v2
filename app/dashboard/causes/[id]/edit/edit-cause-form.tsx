"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { isProxyMediaUrl } from "@/lib/s3/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
import type { Cause } from "@/types";
import { categories } from "@/lib/categories";
import { motion, AnimatePresence } from "framer-motion";
import { PremiumFormContainer } from "@/components/ui/premium/premium-form-container";
import { FormStepper } from "@/components/ui/premium/form-stepper";
import {
  format,
  addDays,
  isAfter,
  isBefore,
  differenceInDays,
  startOfDay,
} from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { sendCauseEditedEmail } from "@/services/mail";
import { useToast } from "@/hooks/use-toast";
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

const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((mod) => mod.Calendar),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full" />,
  },
);
const ImageUpload = dynamic(
  () => import("@/components/ui/image-upload").then((mod) => mod.ImageUpload),
  {
    ssr: false,
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
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />,
  },
);

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
  image: string;
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

type EditCauseFormProps = {
  cause: Cause & {
    startDate?: string;
    endDate?: string;
  };
};

export default function EditCauseForm({ cause }: EditCauseFormProps) {
  const { user } = useAuth();
  const { isLoading, updateCause } = useCause();
  const { toast } = useToast();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    title: cause.title,
    summary: (cause as any).summary || "",
    location: (cause as any).location || "",
    category: cause.category,
    goal: cause.goal.toString(),
    currency: "NGN",
    coverImage: null,
    image: cause.image || "",
    sections: cause.sections || [{ heading: "", description: "" }],
    startDate: new Date(),
    endDate: cause.days_active != null 
      ? new Date(Date.now() + cause.days_active * 24 * 60 * 60 * 1000) 
      : undefined,
    multimedia: cause.multimedia || [],
    videoLinks: (cause as any).video_links || [],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [videoLinkInput, setVideoLinkInput] = useState("");
  const [videoLinkError, setVideoLinkError] = useState<string | null>(null);


  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
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

  const handleImageUpload = async (files: File[]) => {
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    const file = files[0];

    if (file && file.size > MAX_FILE_SIZE) {
      setErrors((prev) => ({
        ...prev,
        coverImage: "Cover image must be less than 100MB",
      }));
      return;
    }

    if (file) {
      const validationError = await validateCauseCoverImage(file);
      if (validationError) {
        setFormData((prev) => ({ ...prev, coverImage: null }));
        setErrors((prev) => ({ ...prev, coverImage: validationError }));
        return;
      }
      setFormData((prev) => ({ ...prev, coverImage: file }));
    }

    if (errors.coverImage) {
      setErrors((prev) => ({ ...prev, coverImage: undefined }));
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

    const existingVideoCount = (formData.multimedia || []).filter(isVideoFile)
      .length;
    const incomingVideos = files.filter((f) => f.type.startsWith("video/"));
    if (existingVideoCount + incomingVideos.length > MAX_VIDEOS_PER_CAUSE) {
      setErrors((prev) => ({
        ...prev,
        multimedia: `You can upload at most ${MAX_VIDEOS_PER_CAUSE} videos per cause`,
      }));
      return;
    }

    const processedFiles: (File | string)[] = [];
    const { compressImage } = await import("@/utils/image-compression");
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
        try {
          processedFiles.push(await compressImage(file, 1600, 0.8));
        } catch (err) {
          console.error("Compression error:", err);
          processedFiles.push(file);
        }
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
            (acc, item) => acc + (typeof item === "string" ? 0 : item.size),
            0,
          )
        : 0;
    const newFilesSize = processedFiles.reduce(
      (acc, item) => acc + (typeof item === "string" ? 0 : item.size),
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
      return;
    }

    const causeData: Partial<FormData> & { video_links?: string[]; summary?: string; location?: string } = {
      title: formData.title,
      summary: formData.summary,
      location: formData.location,
      category: formData.category,
      goal: formData.goal,
      coverImage: formData.coverImage,
      image: !formData.coverImage ? cause.image || undefined : undefined,
      sections: formData.sections,
      startDate: formData.startDate,
      endDate: formData.endDate,
      multimedia: formData.multimedia,
      video_links: formData.videoLinks,
    };

    try {
      causeData.multimedia = await resolveMultimediaForSubmit(
        formData.multimedia || [],
        { entityType: "causes", entityId: cause.id },
      );

      await updateCause(cause.id, user.id, causeData);
      await sendCauseEditedEmail({
        causeName: formData.title,
        reviewTimeframe: "3-5 business days",
        dashboardUrl: `${window.location.origin}/dashboard/causes`,
      });

      toast({
        title: "Success",
        description: "Your changes have been submitted for review.",
      });

      router.push("/dashboard/causes");
    } catch (error: any) {
      console.error("Error updating cause:", error);
      const message =
        error?.message ||
        "Something went wrong while saving your changes. Please try again.";
      setErrors((prev) => ({ ...prev, multimedia: message }));
      toast({
        title: "Update Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
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
                  Cause Title
                </Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g., Clean Water for Owerri Community"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="summary" className="text-base font-semibold text-gray-700">
                    Short Summary <span className="text-gray-400 font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="summary"
                    name="summary"
                    placeholder="One-line description shown on the cause hero"
                    value={formData.summary}
                    onChange={handleChange}
                    maxLength={200}
                    className={cn(
                      "h-12 premium-input",
                      errors.summary ? "border-red-500" : ""
                    )}
                  />
                  {errors.summary && (
                    <p className="text-sm text-red-500 font-medium">
                      {errors.summary}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-base font-semibold text-gray-700">
                    Location <span className="text-gray-400 font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="location"
                    name="location"
                    placeholder="e.g., Lagos, Nigeria"
                    value={formData.location}
                    onChange={handleChange}
                    className={cn(
                      "h-12 premium-input",
                      errors.location ? "border-red-500" : ""
                    )}
                  />
                  {errors.location && (
                    <p className="text-sm text-red-500 font-medium">
                      {errors.location}
                    </p>
                  )}
                </div>
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
                      <SelectValue placeholder="What's this about?" />
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

                <div className="grid grid-cols-3 gap-4 lg:grid-cols-3">
                  <div className="col-span-2 space-y-2">
                    <Label
                      htmlFor="goal"
                      className="text-base font-semibold text-gray-700"
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
                          "h-12 pl-12 premium-input text-lg font-mono",
                          errors.goal ? "border-red-500" : "",
                        )}
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
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
                      className="text-base font-semibold text-gray-700"
                    >
                      Currency
                    </Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) =>
                        handleSelectChange("currency", value)
                      }
                    >
                      <SelectTrigger className="h-12 premium-input font-bold">
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
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-gradient">Your Story</h3>
                <p className="text-sm text-gray-500">
                  Update your sections to keep your supporters informed.
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
                          placeholder="e.g., The Challenge"
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
                          Story Content
                        </Label>
                        <Textarea
                          id={`section-description-${index}`}
                          placeholder="Provide details about this specific part of your project..."
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
                Campaign Timeline
              </h3>
              <p className="text-sm text-gray-500">
                Adjust your campaign duration. Max duration remains 180 days
                from start.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label htmlFor="start-date" className="text-base font-semibold text-gray-700 block mb-2">
                  Start Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="start-date"
                      variant="outline"
                      className={cn(
                        "w-full h-14 justify-start text-left font-normal premium-input rounded-2xl border-brand/10",
                        !formData.startDate && "text-muted-foreground",
                        errors.startDate && "border-red-500",
                      )}
                    >
                      <CalendarIcon className="mr-3 h-5 w-5 text-brand" />
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
                      disabled={(date) => isBefore(date, startOfDay(new Date()))}
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

              <div className="space-y-4">
                <Label htmlFor="end-date" className="text-base font-semibold text-gray-700 block mb-2">
                  End Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="end-date"
                      variant="outline"
                      className={cn(
                        "w-full h-14 justify-start text-left font-normal premium-input rounded-2xl border-brand/10",
                        !formData.endDate && "text-muted-foreground",
                        errors.endDate && "border-red-500",
                      )}
                    >
                      <CalendarIcon className="mr-3 h-5 w-5 text-brand" />
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
              <div className="bg-brand/5 p-4 rounded-xl border border-brand/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand">
                    New Duration:{" "}
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
                Update your visuals. High-quality media significantly increases
                engagement.
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold text-gray-700 block">
                  Cover Image
                </Label>
                <div className="glass-panel p-6 rounded-2xl border-brand/10 transition-all hover:border-brand/30">
                  <div className="relative group aspect-video rounded-xl overflow-hidden shadow-sm border border-brand/10 mb-4 ">
                    <Image
                      src={
                        formData.coverImage
                          ? URL.createObjectURL(formData.coverImage)
                          : formData.image || "/placeholder-image.jpg"
                      }
                      alt="Cover preview"
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      unoptimized={
                        !!formData.coverImage ||
                        isProxyMediaUrl(formData.image || "")
                      }
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {formData.coverImage && (
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
                          <Icons.close className="h-5 w-5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <ImageUpload
                    onUpload={handleImageUpload}
                    maxFiles={1}
                    accept={CAUSE_COVER_ACCEPT}
                    enableCrop
                    cropAspect={16 / 9}
                    cropRequired
                    cropOutputWidth={CAUSE_COVER_WIDTH}
                    cropOutputHeight={CAUSE_COVER_HEIGHT}
                    description={`${CAUSE_COVER_DESCRIPTION} · up to 100MB`}
                  />
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
                    Multimedia Gallery
                  </Label>
                  <span className="text-xs text-brand font-medium bg-brand/5 px-2 py-1 rounded-full border border-brand/10">
                    Max 5 files · 2 videos (MP4/WebM, 50MB, 90s)
                  </span>
                </div>
                <div className="glass-panel p-6 rounded-2xl border-brand/10">
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
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold text-gray-700 block">
                  Video Links (YouTube, TikTok, etc.)
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
                        className="premium-input bg-white"
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
                    className="h-12 w-full rounded-xl border-2 border-dashed border-gray-200 bg-transparent text-gray-500 transition-colors hover:border-brand/30 hover:bg-brand/5 hover:text-brand"
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
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2 border-b border-gray-100 pb-6">
              <h3 className="text-2xl font-bold text-gradient">
                Review Your Changes
              </h3>
              <p className="text-gray-500">
                Review how your updated cause will look. Changes will be
                submitted for review.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Visual Preview */}
                <div className="glass-panel overflow-hidden rounded-3xl">
                  <MultimediaCarousel
                    media={[
                      ...(formData.multimedia?.map((item) =>
                        typeof item === "string" ? item : URL.createObjectURL(item),
                      ) || []),
                      ...(formData.videoLinks || []),
                    ]}
                    coverImage={
                      formData.coverImage
                        ? URL.createObjectURL(formData.coverImage)
                        : cause.image || undefined
                    }
                    title={formData.title}
                  />
                </div>

                {/* Content Review */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xl font-bold mb-2">{formData.title}</h4>
                    {(formData.summary || formData.location) && (
                      <div className="flex flex-wrap gap-4 mb-4">
                        {formData.location && (
                          <div className="flex items-center gap-1.5 text-sm font-medium text-brand bg-brand/5 px-2.5 py-1 rounded-full border border-brand/10">
                            <Icons.mapPin className="w-3.5 h-3.5" />
                            {formData.location}
                          </div>
                        )}
                        {formData.category && (
                          <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                            {categories.find((c) => c.id === formData.category)?.name}
                          </div>
                        )}
                      </div>
                    )}
                    {formData.summary && (
                      <p className="text-gray-500 italic mb-4 border-l-4 border-brand/20 pl-4 py-1">
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
                <div className="glass-panel p-6 rounded-3xl border-brand/10 space-y-6 sticky top-6">
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Target Goal
                    </p>
                    <p className="text-3xl font-black text-brand">
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

  return (
    <PremiumFormContainer
      title="Edit Cause"
      description="Refine your project to reach more donors and achieve your impact."
    >
      <FormStepper steps={steps} currentStep={currentStep} />

      <main className="max-w-4xl mx-auto mt-12">
        <form 
          className="space-y-12"
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

          <div className="flex justify-between items-center pt-8 border-t border-brand/10">
            <Button
              type="button"
              variant="ghost"
              onClick={prevStep}
              disabled={currentStep === 1 || isLoading}
              className="premium-button-secondary h-12 px-8"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={currentStep === 5 ? (e: any) => handleSubmit(e) : nextStep}
              disabled={isLoading}
              className="premium-button-primary h-12 px-10 min-w-[160px]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Icons.spinner className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : currentStep === 5 ? (
                "Update Cause"
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </form>
      </main>
    </PremiumFormContainer>
  );
}

function validateForm(formData: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!formData.title.trim()) {
    errors.title = "Title is required";
  } else if (formData.title.length < 5) {
    errors.title = "Title must be at least 5 characters long";
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

  if (!formData.category) {
    errors.category = "Category is required";
  }

  if (formData.summary && formData.summary.length > 200) {
    errors.summary = "Summary must be less than 200 characters";
  }

  if (formData.location && formData.location.length > 100) {
    errors.location = "Location must be less than 100 characters";
  }

  if (!formData.goal) {
    errors.goal = "Goal amount is required";
  } else if (Number(formData.goal) <= 0) {
    errors.goal = "Goal amount must be greater than 0";
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

  return errors;
}
