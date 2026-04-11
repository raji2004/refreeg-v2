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
import type { Petition } from "@/types";
import { categories } from "@/lib/categories";
import {
  format,
  addDays,
  isAfter,
  isBefore,
  differenceInDays,
  startOfDay,
} from "date-fns";
import { CalendarIcon, Video, X, FileVideo, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { PremiumFormContainer } from "@/components/ui/premium/premium-form-container";
import { FormStepper } from "@/components/ui/premium/form-stepper";

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

const currencies = [{ id: "SIGNATURES", name: "Signatures" }];
const MAX_DURATION_DAYS = 180;

type FormData = {
  title: string;
  category: string;
  goal: string;
  coverImage: File | null;
  image: string;
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
  sections?: { heading?: string; description?: string }[];
  multimedia?: string;
};

type EditPetitionFormProps = {
  petition: Petition & {
    startDate?: string;
    endDate?: string;
  };
};

export default function EditPetitionForm({ petition }: EditPetitionFormProps) {
  const { user } = useAuth();
  const { isLoading, updatePetition } = usePetition();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    title: petition.title,
    category: petition.category,
    goal: petition.goal.toString(),
    coverImage: null,
    image: petition.image || "",
    sections: petition.sections || [{ heading: "", description: "" }],
    startDate: petition.days_active ? new Date() : undefined,
    endDate: petition.days_active
      ? new Date(Date.now() + petition.days_active * 24 * 60 * 60 * 1000)
      : undefined,
    multimedia: [],
    videoLinks: (petition as any).video_links || [],
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
      try {
        const { compressImage } = await import("@/utils/image-compression");
        const compressed = await compressImage(file, 1200, 0.7);
        setFormData((prev) => ({ ...prev, coverImage: compressed }));
      } catch (err) {
        console.error("Compression failed, using original:", err);
        setFormData((prev) => ({ ...prev, coverImage: file }));
      }
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

    // Process and compress each file if it's an image
    const processedFiles: File[] = [];
    const { compressImage } = await import("@/utils/image-compression");

    for (const file of files) {
      if (file.type.startsWith("image/")) {
        try {
          const compressed = await compressImage(file, 1000, 0.7);
          processedFiles.push(compressed);
        } catch (err) {
          processedFiles.push(file);
        }
      } else {
        processedFiles.push(file);
      }
    }

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
      case 5:
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (currentStep < 6 && validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (currentStep < 6) {
      nextStep();
      return;
    }

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

    const petitionData: Partial<FormData> & { video_links?: string[] } = {
      title: formData.title,
      category: formData.category,
      goal: formData.goal,
      coverImage: formData.coverImage,
      image: !formData.coverImage ? petition.image || undefined : undefined,
      sections: formData.sections,
      startDate: formData.startDate,
      endDate: formData.endDate,
      multimedia: formData.multimedia,
      video_links: formData.videoLinks,
    };

    try {
      await updatePetition(petition.id, user.id, petitionData);
    } catch (error) {
      console.error("Error updating petition:", error);
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
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gradient">
                Basic Information
              </h3>
              <p className="text-sm text-gray-500">
                Update the core details of your petition.
              </p>
            </div>

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
                  placeholder="Enter a clear, specific title"
                  value={formData.title}
                  onChange={handleChange}
                  className={cn(
                    "h-12 premium-input",
                    errors.title ? "border-red-500" : "",
                  )}
                />
                {errors.title && (
                  <p className="text-sm text-red-500 font-medium mt-1">
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
                    <p className="text-sm text-red-500 font-medium mt-1">
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
                  <div className="relative group">
                    <Input
                      id="goal"
                      name="goal"
                      type="number"
                      placeholder="0"
                      value={formData.goal}
                      onChange={handleChange}
                      className={cn(
                        "h-12 premium-input pl-4",
                        errors.goal ? "border-red-500" : "",
                      )}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-brand/40 uppercase tracking-tighter">
                      Signatures
                    </div>
                  </div>
                  {errors.goal && (
                    <p className="text-sm text-red-500 font-medium mt-1">
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
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Additional Sections</h3>
              <Button type="button" onClick={addSection} variant="outline">
                Add Section
              </Button>
            </div>

            {formData.sections.map((section, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium">Section {index + 1}</h4>
                    {index > 0 && (
                      <Button
                        type="button"
                        onClick={() => removeSection(index)}
                        variant="ghost"
                        size="sm"
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`section-heading-${index}`}>
                      Sub-heading
                    </Label>
                    <Input
                      id={`section-heading-${index}`}
                      value={section.heading}
                      onChange={(e) =>
                        updateSection(index, "heading", e.target.value)
                      }
                      placeholder="Enter sub-heading"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`section-description-${index}`}>
                      Sub-description
                    </Label>
                    <Textarea
                      id={`section-description-${index}`}
                      value={section.description}
                      onChange={(e) =>
                        updateSection(index, "description", e.target.value)
                      }
                      placeholder="Enter sub-description"
                    />
                  </div>
                </div>
              </Card>
            ))}
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
                Set active window. Max <strong>{MAX_DURATION_DAYS} days</strong>
                .
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label className="text-base font-semibold text-gray-700 block">
                  Launch Date
                </Label>
                <div className="glass-panel p-4 rounded-2xl border-brand/10">
                  <Calendar
                    mode="single"
                    selected={formData.startDate}
                    onSelect={(date) => handleDateChange(date, "startDate")}
                    disabled={(date) => isBefore(date, startOfDay(new Date()))}
                    className="rounded-xl border-none mx-auto"
                  />
                </div>
                {errors.startDate && (
                  <p className="mt-2 text-sm text-red-500 font-medium">
                    {errors.startDate}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold text-gray-700 block">
                  End Date
                </Label>
                <div className="glass-panel p-4 rounded-2xl border-brand/10">
                  <Calendar
                    mode="single"
                    selected={formData.endDate}
                    onSelect={(date) => handleDateChange(date, "endDate")}
                    disabled={(date) =>
                      formData.startDate
                        ? isBefore(date, formData.startDate) ||
                          isAfter(
                            date,
                            addDays(formData.startDate, MAX_DURATION_DAYS),
                          )
                        : isBefore(date, startOfDay(new Date()))
                    }
                    className="rounded-xl border-none mx-auto"
                  />
                </div>
                {errors.endDate && (
                  <p className="mt-2 text-sm text-red-500 font-medium">
                    {errors.endDate}
                  </p>
                )}
              </div>
            </div>

            {formData.startDate && formData.endDate && (
              <div className="bg-brand/5 p-6 rounded-2xl border border-brand/10 animate-in zoom-in-95 duration-500">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                    <CalendarIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">
                      Total Duration
                    </p>
                    <p className="text-xl font-bold text-brand">
                      {differenceInDays(formData.endDate, formData.startDate)}{" "}
                      Days
                    </p>
                  </div>
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
                Update images and videos for your campaign.
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
                      unoptimized={!!formData.coverImage}
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
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <ImageUpload onUpload={handleImageUpload} maxFiles={1} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold text-gray-700 block">
                    Multimedia (Images)
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
                  Support Links
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
                    className="w-full border-dashed border-2 border-gray-200 text-gray-500 hover:border-brand/30 hover:text-brand h-12 rounded-xl"
                  >
                    + Add Link
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
                  <p className="text-sm whitespace-pre-line">
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
                    : petition.image || undefined
                }
                title={formData.title}
              />
            </div>

            {formData.multimedia &&
              Array.isArray(formData.multimedia) &&
              formData.multimedia.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Multimedia Files</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {formData.multimedia.map((file, index) => (
                      <div key={index} className="flex flex-col">
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.type.startsWith("image/")
                            ? "Image file"
                            : "Video file"}{" "}
                          - {Math.round(file.size / 1024)} KB
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        );

      default:
        return null;
    }
  };

  const steps = ["Basic Info", "Story", "Timeline", "Media", "Review"];

  return (
    <PremiumFormContainer
      title="Edit Petition"
      description="Refine your campaign to reach more supporters and achieve your goal."
    >
      <FormStepper steps={steps} currentStep={currentStep} />

      <main className="max-w-4xl mx-auto mt-12">
        <form onSubmit={handleSubmit} className="space-y-12">
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
              type="submit"
              disabled={isLoading}
              className="premium-button-primary h-12 px-10 min-w-[160px]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Icons.spinner className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : currentStep === 5 ? (
                "Update Petition"
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
      errors.endDate = `Petition duration cannot exceed ${MAX_DURATION_DAYS} days`;
    }
    if (daysDiff < 1) {
      errors.endDate = "End date must be after start date";
    }
  }

  return errors;
}
