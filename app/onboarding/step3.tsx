"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { motion } from "framer-motion";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import {
  Upload,
  MailIcon,
  PhoneIcon,
  User,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { LocationSelector } from "@/components/location-selector";
import { checkUsernameAvailability } from "@/actions/profile-actions";
import { suggestUsername } from "@/utils/username";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Step3Props {
  user: any;
  onNext: (profileData: any) => void;
  onBack: () => void;
  onboardingData: any;
  updateOnboardingData: (key: string, value: any) => void;
  isSubmitting: boolean;
}

export default function Step3({
  user,
  onNext,
  onBack,
  onboardingData,
  updateOnboardingData,
  isSubmitting,
}: Step3Props) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    location: "",
    phone: "",
    email: user?.email || "",
  });
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(
    onboardingData.profile?.profilePhoto ||
      user?.user_metadata?.avatar_url ||
      null,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isConsentChecked, setIsConsentChecked] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<
    boolean | null
  >(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  // Load saved data on mount and extract OAuth data
  useEffect(() => {
    const savedData =
      onboardingData.profile && Object.keys(onboardingData.profile).length > 0
        ? onboardingData.profile
        : {};

    // Extract OAuth data from NextAuth session
    const oauthFirstName = user?.name?.split(" ")[0] || "";
    const oauthLastName = user?.name?.split(" ").slice(1).join(" ") || "";
    const oauthPhone = user?.phone || ""; // NextAuth might not have phone unless we add it

    // Pre-fill username with a smart suggestion if empty
    const existingUsername = savedData.username || "";
    const usernameFill =
      existingUsername || suggestUsername(user?.email, user?.name);

    setFormData((prev) => ({
      ...prev,
      firstName: savedData.firstName || oauthFirstName,
      lastName: savedData.lastName || oauthLastName,
      username: usernameFill,
      location: savedData.location || "",
      phone: savedData.phone || oauthPhone,
      email: savedData.email || user?.email || prev.email,
    }));

    // Set profile photo URL prioritizing saved data, then NextAuth image
    setProfilePhotoUrl(savedData.profilePhoto || user?.image || null);

    // Load consent data
    setIsConsentChecked(onboardingData.consent || false);
  }, [onboardingData.profile, onboardingData.consent, user]);

  // Check username availability
  useEffect(() => {
    const checkUsername = async () => {
      if (formData.username.length < 3) {
        setIsUsernameAvailable(null);
        return;
      }

      setIsCheckingUsername(true);
      try {
        const isAvailable = await checkUsernameAvailability(
          formData.username,
          user?.id,
        );

        // If the username equals their current username (if they already had one), it's available for them
        // (NextAuth user objects in onboarding might not have a username assigned yet, but just in case)
        if (isAvailable) {
          setIsUsernameAvailable(true); // Username is available
          setErrors((prev) => ({ ...prev, username: "" }));
        } else {
          setIsUsernameAvailable(false); // Username is taken
          setErrors((prev) => ({
            ...prev,
            username: "Username is already taken",
          }));
        }
      } catch (error) {
        console.error("Error checking username:", error);
      } finally {
        setIsCheckingUsername(false);
      }
    };

    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.username, user?.id]);

  const handleChange = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    // Update onboarding data immediately
    updateOnboardingData("profile", newFormData);

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        setErrors((prev) => ({
          ...prev,
          profilePhoto: "File size must be less than 5MB",
        }));
        return;
      }

      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({
          ...prev,
          profilePhoto: "Please select an image file",
        }));
        return;
      }

      try {
        // Compress the image before storing it
        const { compressImage } = await import("@/utils/image-compression");
        const compressedFile = await compressImage(file, 800, 0.8);
        setProfilePhoto(compressedFile);

        const photoUrl = URL.createObjectURL(compressedFile);
        setProfilePhotoUrl(photoUrl);
        setErrors((prev) => ({ ...prev, profilePhoto: "" }));

        // Update onboarding data with photo info
        updateOnboardingData("profile", {
          ...formData,
          profilePhoto: photoUrl,
        });
      } catch (error) {
        console.error("Error compressing image:", error);
        setErrors((prev) => ({
          ...prev,
          profilePhoto: "Error processing the image",
        }));
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username =
        "Username can only contain letters, numbers, and underscores";
    } else if (isUsernameAvailable === false) {
      newErrors.username = "Username is already taken";
    } else if (isCheckingUsername) {
      newErrors.username = "Checking username availability...";
    }

    if (!formData.location.trim()) {
      newErrors.location = "Location is required";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (!isConsentChecked) {
      newErrors.consent = "You must agree to the terms and conditions";
    }

    if (!profilePhoto && !profilePhotoUrl) {
      newErrors.profilePhoto = "Profile photo is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const errorCount = useMemo(
    () => Object.values(errors).filter(Boolean).length,
    [errors],
  );

  const handleSubmit = () => {
    if (!validateForm()) {
      // Scroll to the error summary at the top of the form
      document
        .getElementById("error-summary")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Save form data to onboarding data
    updateOnboardingData("profile", formData);

    // Call the parent's submit handler
    onNext({
      ...formData,
      profilePhoto,
    });
  };

  const isOrg = onboardingData.accountType === "organization";

  return (
    <div
      className={`flex h-full items-center justify-center ${
        isOrg ? "bg-transparent px-0" : "bg-white px-6"
      }`}
    >
      <div
        className={`grid w-full grid-cols-1 items-center ${
          isOrg
            ? "max-w-3xl"
            : "max-w-6xl gap-12 md:grid-cols-2"
        }`}
      >
        {/* Left Section: Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full"
        >
          <h1 className="mb-2 text-3xl font-semibold text-gray-900">
            {isOrg
              ? "Set up your workspace owner"
              : "Create your RefreeG account"}
          </h1>
          <p className="text-gray-500 mb-8">
            {isOrg
              ? "Enter the details of the primary administrator for this organisation."
              : "It takes less than a minute to create an account"}
          </p>

          {isOrg && (
            <div className="mb-7 border-l-2 border-blue-700 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              The workspace owner can manage organisation settings, invite team members, and access verification and payout controls.
            </div>
          )}

          {/* Inline error summary */}
          {errorCount > 0 && (
            <div
              id="error-summary"
              className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                Please fix {errorCount} issue{errorCount > 1 ? "s" : ""} below
              </span>
            </div>
          )}

          <div className="space-y-5">
            {/* Profile Photo + First + Last Name */}
            <div className="flex flex-col md:flex-row md:items-center md:space-x-6 space-y-6 md:space-y-0">
              {/* Profile Photo Upload */}
              <div className="flex flex-col items-start space-y-2">
                <div className="relative">
                  <label
                    htmlFor="file-upload"
                    className="w-20 h-20 flex items-center justify-center rounded-full border-2 border-dashed border-gray-300 hover:border-blue-500 cursor-pointer transition-all duration-200 overflow-hidden"
                  >
                    {profilePhotoUrl ? (
                      <Image
                        src={getMediaUrl(profilePhotoUrl)}
                        alt="Profile preview"
                        width={80}
                        height={80}
                        className="w-full h-full object-cover rounded-full"
                        unoptimized={isProxyMediaUrl(
                          getMediaUrl(profilePhotoUrl),
                        )}
                      />
                    ) : (
                      <Upload className="w-8 h-8 text-gray-400" />
                    )}
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </div>
                {errors.profilePhoto && (
                  <p className="text-sm text-red-500">{errors.profilePhoto}</p>
                )}
              </div>

              {/* First + Last Name Inputs */}
              <div className="flex flex-col md:flex-row md:space-x-4 w-full">
                <div className="flex flex-col space-y-2 flex-1">
                  <Label htmlFor="firstName">
                    {isOrg ? "Owner First Name" : "First Name"}
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2 w-6 h-6 text-gray-400" />
                    <Input
                      id="firstName"
                      placeholder="Enter your first name"
                      value={formData.firstName}
                      onChange={(e) =>
                        handleChange("firstName", e.target.value)
                      }
                      className={`pl-10 ${
                        errors.firstName ? "border-red-500" : ""
                      }`}
                    />
                  </div>
                  {errors.firstName && (
                    <p className="text-sm text-red-500">{errors.firstName}</p>
                  )}
                </div>

                <div className="flex flex-col space-y-2 flex-1 mt-4 md:mt-0">
                  <Label htmlFor="lastName">
                    {isOrg ? "Owner Last Name" : "Last Name"}
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2 w-6 h-6 text-gray-400" />
                    <Input
                      id="lastName"
                      placeholder="Enter your last name"
                      value={formData.lastName}
                      onChange={(e) => handleChange("lastName", e.target.value)}
                      className={`pl-10 ${
                        errors.lastName ? "border-red-500" : ""
                      }`}
                    />
                  </div>
                  {errors.lastName && (
                    <p className="text-sm text-red-500">{errors.lastName}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Username */}
              <div className="flex flex-col space-y-2">
                <Label htmlFor="username">
                  Username<span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 w-6 h-6">
                    @
                  </span>
                  <Input
                    id="username"
                    placeholder="Choose a unique username"
                    value={formData.username}
                    onChange={(e) => handleChange("username", e.target.value)}
                    className={`pl-10 pr-10 text-gray-900 placeholder:text-gray-400 ${
                      errors.username
                        ? "border-red-500 bg-red-50 text-gray-900"
                        : ""
                    }`}
                  />

                  {/* Loading spinner while checking */}
                  {isCheckingUsername && (
                    <div className="absolute right-3 top-2.5 text-blue-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  )}

                  {/* ✅ Username available */}
                  {isUsernameAvailable === true &&
                    formData.username.length >= 3 &&
                    !isCheckingUsername && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="absolute right-3 top-2.5 text-green-500 cursor-help">
                              <CheckCircle className="w-5 h-5" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Username is available</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                  {/* ❌ Username taken */}
                  {isUsernameAvailable === false && !isCheckingUsername && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="absolute right-3 top-2.5 text-red-500 cursor-help">
                            <XCircle className="w-5 h-5" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Username is already taken</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                {errors.username && (
                  <p className="text-sm text-red-500 mt-1">{errors.username}</p>
                )}
              </div>

              {/* Location */}
              <div className="flex flex-col space-y-2">
                <LocationSelector
                  selected={formData.location}
                  onChange={(value) => handleChange("location", value)}
                  mode="country"
                  label="Location"
                  placeholder="Select your country"
                />
                {errors.location && (
                  <p className="text-sm text-red-500">{errors.location}</p>
                )}
              </div>
            </div>
            {/* Phone & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-2">
                <Label htmlFor="phone">
                  Phone Number<span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-2 w-5 h-5 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className={`pl-10 ${errors.phone ? "border-red-500" : ""}`}
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone}</p>
                )}
              </div>
              <div className="flex flex-col space-y-2">
                <Label htmlFor="email">
                  Email<span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <MailIcon className="absolute left-3 top-2 w-6 h-6 text-gray-400" />
                  <Input
                    disabled
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={formData.email}
                    className="pl-10 bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Checkbox */}
            <div className="flex items-start space-x-2 mt-2">
              <Checkbox
                id="confirm"
                checked={isConsentChecked}
                onCheckedChange={(checked) => {
                  const newChecked = checked as boolean;
                  setIsConsentChecked(newChecked);
                  updateOnboardingData("consent", newChecked);
                  setErrors((current) => ({
                    ...current,
                    consent: "",
                  }));
                }}
                className="border-gray-400 mt-1"
              />
              <Label
                htmlFor="confirm"
                className="text-sm text-gray-600 leading-relaxed"
              >
                I confirm that the information provided is accurate and consent
                to my data being verified securely.
              </Label>
            </div>
            {errors.consent && (
              <p className="text-sm text-red-500">{errors.consent}</p>
            )}

            {/* Button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full mt-4 bg-blue-600 text-white py-6 text-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting
                ? "Saving owner profile..."
                : isOrg
                  ? "Continue to organisation details"
                  : "Proceed"}
            </Button>
          </div>
        </motion.div>

        {/* Right Section: Image + Info */}
        {!isOrg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="relative hidden flex-col items-center justify-center md:flex"
          >
            <Image
              src="/onboardingform.svg"
              alt="Sign up illustration"
              width={400}
              height={400}
              className="rounded-lg object-contain"
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
