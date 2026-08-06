"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { motion } from "framer-motion";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import {
  Upload,
  Building2,
  Phone,
  MapPin,
  Briefcase,
  Loader2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  getOrganizationOnboardingData,
} from "@/actions/profile-actions";
import {
  updateOrganization,
  updateOrganizationLogo,
} from "@/actions/organization-actions";
import { toast } from "@/components/ui/use-toast";

interface Step3BProps {
  user: any;
  onNext: () => void;
  onBack: () => void;
  onboardingData: any;
  isSubmitting: boolean;
}

interface OrgFormData {
  name: string;
  phone: string;
  address: string;
  industry: string;
}

interface OrgPreferences {
  donationNotifications: boolean;
  teamDigest: boolean;
  publicProfile: boolean;
}

const DEFAULT_PREFERENCES: OrgPreferences = {
  donationNotifications: true,
  teamDigest: true,
  publicProfile: true,
};

export default function Step3BOrgSetup({
  user,
  onNext,
  onBack,
  onboardingData,
  isSubmitting: externalSubmitting,
}: Step3BProps) {
  const [formData, setFormData] = useState<OrgFormData>({
    name: "",
    phone: "",
    address: "",
    industry: "",
  });
  const [preferences, setPreferences] =
    useState<OrgPreferences>(DEFAULT_PREFERENCES);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch existing org data
  useEffect(() => {
    const loadOrgData = async () => {
      if (!user?.id) return;
      try {
        const orgData = await getOrganizationOnboardingData(user.id);
        if (orgData) {
          setFormData({
            name: orgData.name || "",
            phone: orgData.phone || "",
            address: orgData.address || "",
            industry: orgData.industry || "",
          });
          if (orgData.logoUrl) {
            setLogoPreviewUrl(orgData.logoUrl);
          }
          if (
            orgData.preferences &&
            Object.keys(orgData.preferences).length > 0
          ) {
            setPreferences({
              donationNotifications:
                orgData.preferences.donationNotifications !== false,
              teamDigest: orgData.preferences.teamDigest !== false,
              publicProfile: orgData.preferences.publicProfile !== false,
            });
          }
        }
      } catch (error) {
        console.error("Error loading org data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrgData();
  }, [user?.id]);

  const handleChange = (field: keyof OrgFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      setErrors((prev) => ({
        ...prev,
        logo: "Logo must be a JPG, PNG, or WebP image.",
      }));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        logo: "Logo must be smaller than 2 MB.",
      }));
      return;
    }

    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, logo: "" }));
  };

  const handleToggle = (key: keyof OrgPreferences) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = "Organization name must be at least 2 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      // Upload logo if a new one was selected
      if (logoFile) {
        const logoResult = await updateOrganizationLogo(logoFile);
        if (!logoResult.success) {
          toast({
            title: "Logo upload failed",
            description: logoResult.error,
            variant: "destructive",
          });
          // Continue anyway — logo is optional
        }
      }

      // Save org details + preferences
      const updateResult = await updateOrganization({
        name: formData.name.trim(),
        adminEmail: user.email || "",
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        industry: formData.industry.trim() || undefined,
        preferences,
      });

      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }

      onNext();
    } catch (error) {
      console.error("Error saving organization setup:", error);
      toast({
        title: "Error saving organization",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center bg-white px-6">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left Section: Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full"
        >
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Set up your organization
          </h1>
          <p className="text-gray-500 mb-8">
            Add your branding and customize how your workspace works.
          </p>

          <div className="space-y-6">
            {/* Organization Logo */}
            <div className="flex flex-col items-start space-y-2">
              <Label>Organization Logo <span className="text-gray-400 text-xs font-normal">(optional)</span></Label>
              <div className="flex items-center gap-4">
                <label
                  htmlFor="logo-upload"
                  className="w-20 h-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 hover:border-blue-500 cursor-pointer transition-all duration-200 overflow-hidden bg-gray-50"
                >
                  {logoPreviewUrl ? (
                    <Image
                      src={
                        logoPreviewUrl.startsWith("blob:")
                          ? logoPreviewUrl
                          : getMediaUrl(logoPreviewUrl)
                      }
                      alt="Org logo preview"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover rounded-2xl"
                      unoptimized={
                        logoPreviewUrl.startsWith("blob:")
                          ? false
                          : isProxyMediaUrl(getMediaUrl(logoPreviewUrl))
                      }
                    />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <Upload className="w-6 h-6" />
                    </div>
                  )}
                </label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <div className="text-sm text-gray-500">
                  <p>JPG, PNG, or WebP</p>
                  <p>Max 2 MB</p>
                </div>
              </div>
              {errors.logo && (
                <p className="text-sm text-red-500">{errors.logo}</p>
              )}
            </div>

            {/* Organization Name */}
            <div className="flex flex-col space-y-2">
              <Label htmlFor="orgName">
                Organization Name<span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <Input
                  id="orgName"
                  placeholder="Your organization's display name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className={`pl-10 ${errors.name ? "border-red-500" : ""}`}
                />
              </div>
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Phone + Industry */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-2">
                <Label htmlFor="orgPhone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <Input
                    id="orgPhone"
                    type="tel"
                    placeholder="+234 801 234 5678"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <Label htmlFor="orgIndustry">Industry</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <Input
                    id="orgIndustry"
                    placeholder="Healthcare, Education..."
                    value={formData.industry}
                    onChange={(e) => handleChange("industry", e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="flex flex-col space-y-2">
              <Label htmlFor="orgAddress">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <Input
                  id="orgAddress"
                  placeholder="Street, city, country"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Preferences */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-semibold text-gray-700">
                Notification Preferences
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Donation notifications
                    </p>
                    <p className="text-xs text-gray-500">
                      Get notified when your organization receives donations
                    </p>
                  </div>
                  <Switch
                    checked={preferences.donationNotifications}
                    onCheckedChange={() =>
                      handleToggle("donationNotifications")
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Team digest
                    </p>
                    <p className="text-xs text-gray-500">
                      Weekly summary of team activity
                    </p>
                  </div>
                  <Switch
                    checked={preferences.teamDigest}
                    onCheckedChange={() => handleToggle("teamDigest")}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Public profile
                    </p>
                    <p className="text-xs text-gray-500">
                      Allow others to discover your organization
                    </p>
                  </div>
                  <Switch
                    checked={preferences.publicProfile}
                    onCheckedChange={() => handleToggle("publicProfile")}
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={isSaving || externalSubmitting}
              className="w-full mt-4 bg-blue-600 text-white py-6 text-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Continue"}
            </Button>
          </div>
        </motion.div>

        {/* Right Section: Illustration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="hidden md:flex flex-col items-center justify-center relative"
        >
          <div className="w-[350px] h-[350px] bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl flex flex-col items-center justify-center p-8 border border-blue-100">
            <Building2 className="w-24 h-24 text-blue-600 mb-6" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
              Your workspace is ready
            </h3>
            <p className="text-sm text-gray-500 text-center">
              Add your branding and preferences to make it yours. You can always
              update these in Settings.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
