"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Icons } from "@/components/icons"
import { useAuth } from "@/hooks/use-auth"
import { useCause } from "@/hooks/use-cause"
import { Progress } from "@/components/ui/progress"
import { ImageUpload } from "@/components/ui/image-upload"

// Mock categories
const categories = [
    { id: "education", name: "Education" },
    { id: "health", name: "Healthcare" },
    { id: "environment", name: "Environment" },
    { id: "community", name: "Community" },
    { id: "disaster", name: "Disaster Relief" },
    { id: "animals", name: "Animal Welfare" },
]

const currencies = [
    { id: "NGN", name: "Naira (₦)" },
]

type FormData = {
    title: string
    description: string
    category: string
    goal: string
    currency: string
    coverImage: File | null
    sections: { heading: string; description: string }[]
}

type FormErrors = {
    title?: string
    description?: string
    category?: string
    goal?: string
    coverImage?: string
}

type CauseFormData = {
    title: string
    description: string
    category: string
    goal: string
    currency: string
    coverImage: File | null
    sections: { heading: string; description: string }[]
}

const validateForm = (formData: FormData): FormErrors => {
    const errors: FormErrors = {}

    if (!formData.title.trim()) {
        errors.title = "Title is required"
    } else if (formData.title.length < 5) {
        errors.title = "Title must be at least 5 characters long"
    }

    if (!formData.description.trim()) {
        errors.description = "Description is required"
    } else if (formData.description.length < 50) {
        errors.description = "Description must be at least 50 characters long"
    }

    if (!formData.category) {
        errors.category = "Category is required"
    }

    if (!formData.goal) {
        errors.goal = "Funding goal is required"
    } else if (isNaN(Number(formData.goal)) || Number(formData.goal) <= 0) {
        errors.goal = "Please enter a valid amount"
    }

    if (!formData.coverImage) {
        errors.coverImage = "Cover image is required"
    }

    return errors
}

export default function CreateCauseForm() {
    const { user } = useAuth()
    const { isLoading, createCause } = useCause()
    const [currentStep, setCurrentStep] = useState(1)
    const [formData, setFormData] = useState<FormData>({
        title: "",
        description: "",
        category: "",
        goal: "",
        currency: "NGN",
        coverImage: null,
        sections: [{ heading: "", description: "" }],
    })
    const [errors, setErrors] = useState<FormErrors>({})

    // Auto-save draft to localStorage
    useEffect(() => {
        const savedDraft = localStorage.getItem("causeDraft")
        if (savedDraft) {
            const parsedDraft = JSON.parse(savedDraft)
            // Don't restore files from localStorage
            setFormData(prev => ({
                ...parsedDraft,
                coverImage: prev.coverImage,
            }))
        }
    }, [])

    useEffect(() => {
        // Don't save files to localStorage
        const { coverImage, ...dataToSave } = formData
        localStorage.setItem("causeDraft", JSON.stringify(dataToSave))
    }, [formData])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
        // Clear error when user starts typing
        if (errors[name as keyof FormErrors]) {
            setErrors((prev) => ({ ...prev, [name]: undefined }))
        }
    }

    const handleSelectChange = (name: string, value: string) => {
        setFormData((prev) => ({ ...prev, [name]: value }))
        // Clear error when user makes a selection
        if (errors[name as keyof FormErrors]) {
            setErrors((prev) => ({ ...prev, [name]: undefined }))
        }
    }

    const handleImageUpload = (files: File[]) => {
        setFormData((prev) => ({ ...prev, coverImage: files[0] }))
        if (errors.coverImage) {
            setErrors((prev) => ({ ...prev, coverImage: undefined }))
        }
    }

    const validateStep = (step: number): boolean => {
        const currentErrors = validateForm(formData)
        setErrors(currentErrors)

        switch (step) {
            case 1:
                return !currentErrors.title && !currentErrors.description && !currentErrors.category && !currentErrors.goal
            case 2:
                return formData.sections.every(section => section.heading.trim() !== "" && section.description.trim() !== "")
            case 3:
                return !currentErrors.coverImage
            default:
                return true
        }
    }

    const nextStep = () => {
        if (currentStep < 4 && validateStep(currentStep)) {
            setCurrentStep((prev) => prev + 1)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        const validationErrors = validateForm(formData)
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors)
            return
        }

        // Create FormData object for file uploads
        const formDataToSubmit = new FormData()
        Object.entries(formData).forEach(([key, value]) => {
            if (key === "coverImage" && value) {
                formDataToSubmit.append(key, value as File)
            } else {
                formDataToSubmit.append(key, value as string)
            }
        })

        const causeData: CauseFormData = {
            title: formData.title,
            description: formData.description,
            category: formData.category,
            goal: formData.goal,
            currency: formData.currency,
            coverImage: formData.coverImage,
            sections: formData.sections,
        }

        await createCause(user.id, causeData)
        localStorage.removeItem("causeDraft")
    }

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep((prev) => prev - 1)
    }

    const addSection = () => {
        setFormData(prev => ({
            ...prev,
            sections: [...prev.sections, { heading: "", description: "" }]
        }))
    }

    const removeSection = (index: number) => {
        setFormData(prev => ({
            ...prev,
            sections: prev.sections.filter((_, i) => i !== index)
        }))
    }

    const updateSection = (index: number, field: 'heading' | 'description', value: string) => {
        setFormData(prev => ({
            ...prev,
            sections: prev.sections.map((section, i) =>
                i === index ? { ...section, [field]: value } : section
            )
        }))
    }

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Cause Title</Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="Enter a clear, specific title"
                                value={formData.title}
                                onChange={handleChange}
                                className={errors.title ? "border-red-500" : ""}
                            />
                            {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Describe your cause, why it matters, and how the funds will be used"
                                rows={5}
                                value={formData.description}
                                onChange={handleChange}
                                className={errors.description ? "border-red-500" : ""}
                            />
                            {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(value) => handleSelectChange("category", value)}
                            >
                                <SelectTrigger className={errors.category ? "border-red-500" : ""}>
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
                            {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="goal">Funding Goal</Label>
                                <Input
                                    id="goal"
                                    name="goal"
                                    type="number"
                                    placeholder="Enter amount"
                                    value={formData.goal}
                                    onChange={handleChange}
                                    className={errors.goal ? "border-red-500" : ""}
                                />
                                {errors.goal && <p className="text-sm text-red-500">{errors.goal}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="currency">Currency</Label>
                                <Select
                                    value={formData.currency}
                                    onValueChange={(value) => handleSelectChange("currency", value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currencies.map((currency) => (
                                            <SelectItem key={currency.id} value={currency.id}>
                                                {currency.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                )

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
                                        <Label htmlFor={`section-heading-${index}`}>Sub-heading</Label>
                                        <Input
                                            id={`section-heading-${index}`}
                                            value={section.heading}
                                            onChange={(e) => updateSection(index, 'heading', e.target.value)}
                                            placeholder="Enter sub-heading"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor={`section-description-${index}`}>Sub-description</Label>
                                        <Textarea
                                            id={`section-description-${index}`}
                                            value={section.description}
                                            onChange={(e) => updateSection(index, 'description', e.target.value)}
                                            placeholder="Enter sub-description"
                                        />
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )

            case 3:
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Cover Image</Label>
                            <ImageUpload
                                onUpload={(files) => handleImageUpload(files)}
                                maxFiles={1}
                                accept="image/*"
                            />
                            {errors.coverImage && <p className="text-sm text-red-500">{errors.coverImage}</p>}
                            {formData.coverImage && (
                                <div className="mt-2">
                                    <img
                                        src={URL.createObjectURL(formData.coverImage)}
                                        alt="Cover preview"
                                        className="h-32 w-full object-cover rounded-md"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )

            case 4:
                return (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold">{formData.title}</h3>
                            <p className="text-sm text-muted-foreground">
                                {categories.find((c) => c.id === formData.category)?.name}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-medium">Description</h4>
                            <p className="text-sm">{formData.description}</p>
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
                            <h4 className="font-medium">Images</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {formData.coverImage && (
                                    <div>
                                        <p className="text-sm font-medium mb-2">Cover Image</p>
                                        <img
                                            src={URL.createObjectURL(formData.coverImage)}
                                            alt="Cover preview"
                                            className="h-48 w-full object-cover rounded-md"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                       
                    </div>
                )

            default:
                return null
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create a New Cause</CardTitle>
                <CardDescription>
                    Fill out the form below to create a new fundraising cause. All causes require approval before going
                    live.
                </CardDescription>
                <Progress value={(currentStep / 4) * 100} className="mt-4" />
            </CardHeader>
            <form onSubmit={handleSubmit} className="space-y-8">
                <CardContent className="space-y-4">
                    {renderStep()}
                </CardContent>

                <CardFooter className="flex justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={prevStep}
                        disabled={currentStep === 1}
                    >
                        Back
                    </Button>
                    {currentStep < 4 ? (
                        <Button type="button" onClick={nextStep}>
                            Next
                        </Button>
                    ) : (
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                "Submit Cause"
                            )}
                        </Button>
                    )}
                </CardFooter>
            </form>
        </Card>
    )
} 