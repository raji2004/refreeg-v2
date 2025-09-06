"use client";

import type React from "react";
import { useState, useEffect } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Icons } from "@/components/icons";
import { useAuth } from "@/hooks/use-auth";
import { usePetition } from "@/hooks/use-petition";
import { Progress } from "@/components/ui/progress";
import { ImageUpload } from "@/components/ui/image-upload";
import type { Petition } from "@/types";
import { categories } from "@/lib/categories";
import { format, addDays, isAfter, isBefore, differenceInDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const currencies = [{ id: "SIGNATURES", name: "Signatures" }];

type FormData = {
  title: string;
  category: string;
  goal: string;
  currency: string;
  coverImage: File | null;
  image: string;
  sections: { heading: string; description: string }[];
  startDate: Date | undefined;
  endDate: Date | undefined;
};

type FormErrors = {
  title?: string;
  category?: string;
  goal?: string;
  coverImage?: string;
  startDate?: string;
  endDate?: string;
  sections?: { heading?: string; description?: string }[];
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
    currency: "NGN",
    coverImage: null,
    image: petition.image || "",
    sections: petition.sections || [{ heading: "", description: "" }],
    startDate: petition.startDate ? new Date(petition.startDate) : undefined,
    endDate: petition.endDate ? new Date(petition.endDate) : undefined,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  console.log(petition.startDate, petition.endDate);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user makes a selection
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleImageUpload = (files: File[]) => {
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
    const file = files[0];

    if (file && file.size > MAX_FILE_SIZE) {
      setErrors((prev) => ({
        ...prev,
        coverImage: "Cover image must be less than 100MB",
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, coverImage: file }));
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
    field: "startDate" | "endDate"
  ) => {
    setFormData((prev) => ({ ...prev, [field]: date }));
    // Clear error when user selects a date
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
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) =>
        i === index ? { ...section, [field]: value } : section
      ),
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
        // Check for section errors
        if (currentErrors.sections) {
          // If there are section errors, check if any sections have errors
          return !currentErrors.sections.some(
            (err) => err.heading || err.description
          );
        }
        // If there are no section errors in the currentErrors object, validate directly
        return formData.sections.every(
          (section) =>
            section.heading.trim() !== "" && section.description.trim() !== ""
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

    // Check if there are any validation errors
    const hasErrors = Object.keys(validationErrors).some((key) => {
      if (key === "sections" && validationErrors.sections) {
        // For sections, check if any section has actual errors
        return validationErrors.sections.some(
          (section) => Object.keys(section).length > 0
        );
      }
      return validationErrors[key as keyof FormErrors] !== undefined;
    });

    if (hasErrors) {
      setErrors(validationErrors);
      return;
    }

    const petitionData: Partial<FormData> = {
      title: formData.title,
      category: formData.category,
      goal: formData.goal,
      coverImage: formData.coverImage,
      sections: formData.sections,
      startDate: formData.startDate,
      endDate: formData.endDate,
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
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Petition Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Enter a clear, specific title"
                value={formData.title}
                onChange={handleChange}
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleSelectChange("category", value)}
              >
                <SelectTrigger
                  className={errors.category ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select a category" />
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
                <p className="text-sm text-red-500">{errors.category}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal">Signature Goal</Label>
              <Input
                id="goal"
                name="goal"
                type="number"
                placeholder="Enter your signature goal"
                value={formData.goal}
                onChange={handleChange}
                className={errors.goal ? "border-red-500" : ""}
              />
              {errors.goal && (
                <p className="text-sm text-red-500">{errors.goal}</p>
              )}
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
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Petition Duration</h3>
              <p className="text-sm text-muted-foreground">
                Select when your petition should start and end. Maximum duration
                is 60 days.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.startDate && "text-muted-foreground",
                        errors.startDate && "border-red-500"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
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
                      disabled={(date) => isBefore(date, new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.startDate && (
                  <p className="text-sm text-red-500">{errors.startDate}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.endDate && "text-muted-foreground",
                        errors.endDate && "border-red-500"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
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
                      disabled={(date) =>
                        formData.startDate
                          ? isBefore(date, formData.startDate)
                          : isBefore(date, new Date())
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.endDate && (
                  <p className="text-sm text-red-500">{errors.endDate}</p>
                )}
              </div>
            </div>

            {formData.startDate && formData.endDate && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">
                  <span className="font-medium">Duration:</span>{" "}
                  {differenceInDays(formData.endDate, formData.startDate)} days
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(formData.startDate, "PPP")} -{" "}
                  {format(formData.endDate, "PPP")}
                </p>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cover Image</Label>
              {petition.image && (
                <div className="mb-4">
                  <img
                    src={
                      formData.coverImage
                        ? URL.createObjectURL(formData.coverImage)
                        : petition.image
                    }
                    alt="Current cover"
                    className="h-32 w-full object-cover rounded-md"
                  />
                </div>
              )}
              <div
                className={errors.coverImage ? "border-red-500" : ""}
                onClick={handleImageClick}
              >
                <ImageUpload
                  onUpload={handleImageUpload}
                  maxFiles={1}
                  accept="image/*"
                />
              </div>
              {errors.coverImage && (
                <p className="text-sm text-red-500">{errors.coverImage}</p>
              )}
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
                  <p className="text-sm">{section.description}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Funding Goal</h4>
              <p className="text-sm">
                {formData.currency} {formData.goal}
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
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Petition</CardTitle>
        <CardDescription>
          Update your petition details below. All changes will require
          re-approval before going live.
        </CardDescription>
        <Progress value={(currentStep / 5) * 100} className="mt-4" />
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">{renderStep()}</CardContent>
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            Back
          </Button>
          {currentStep != 5 ? (
            <Button type="button" onClick={nextStep}>
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Petition"
              )}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}

function validateForm(formData: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!formData.title.trim()) {
    errors.title = "Title is required";
  } else if (formData.title.length < 5) {
    errors.title = "Title must be at least 5 characters long";
  }

  // Validate sections
  if (formData.sections && formData.sections.length > 0) {
    const sectionErrorsArray = formData.sections.map((section) => {
      const sectionErrors: { heading?: string; description?: string } = {};
      if (!section.heading.trim())
        sectionErrors.heading = "Heading is required";
      if (!section.description || !section.description.trim())
        sectionErrors.description = "Sub-description is required";
      return sectionErrors;
    });

    // Only add sections errors if there are actual errors
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
    if (daysDiff > 60) {
      errors.endDate = "Petition duration cannot exceed 60 days";
    }
    if (daysDiff < 1) {
      errors.endDate = "End date must be after start date";
    }
  }

  return errors;
}
