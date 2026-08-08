"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import { motion } from "framer-motion";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import {
  Upload,
  Building2,
  Phone,
  MapPin,
  Briefcase,
  Globe2,
  Instagram,
  Loader2,
  AtSign,
} from "lucide-react";
import { FaFacebookF, FaTiktok } from "react-icons/fa6";
import { FaWhatsapp } from "react-icons/fa";
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
  bio: string;
  websiteUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  tiktokUrl: string;
  facebookUrl: string;
  whatsappNumber: string;
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
    bio: "",
    websiteUrl: "",
    instagramUrl: "",
    twitterUrl: "",
    tiktokUrl: "",
    facebookUrl: "",
    whatsappNumber: "",
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
            bio: orgData.bio || "",
            websiteUrl: orgData.websiteUrl || "",
            instagramUrl: orgData.instagramUrl || "",
            twitterUrl: orgData.twitterUrl || "",
            tiktokUrl: orgData.tiktokUrl || "",
            facebookUrl: orgData.facebookUrl || "",
            whatsappNumber: orgData.whatsappNumber || "",
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

  const handleSubmit = async (includePublicProfile: boolean) => {
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
        ...(includePublicProfile
          ? {
              bio: formData.bio.trim(),
              websiteUrl: formData.websiteUrl.trim(),
              instagramUrl: formData.instagramUrl.trim(),
              twitterUrl: formData.twitterUrl.trim(),
              tiktokUrl: formData.tiktokUrl.trim(),
              facebookUrl: formData.facebookUrl.trim(),
              whatsappNumber: formData.whatsappNumber.trim(),
            }
          : {}),
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
    <div className="flex h-full items-center justify-center bg-transparent px-0">
      <div className="w-full max-w-3xl">
        {/* Left Section: Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full"
        >
          <h1 className="mb-2 text-3xl font-semibold text-gray-900">
            Organisation details
          </h1>
          <p className="text-gray-500 mb-8">
            Confirm your public identity and choose the notifications your team needs.
          </p>

          <div className="space-y-6">
            {/* Organization Logo */}
            <div className="flex flex-col items-start space-y-2">
              <Label>Organisation Logo <span className="text-gray-400 text-xs font-normal">(optional)</span></Label>
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
                      className="h-full w-full rounded-2xl object-cover"
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
                Organisation Name<span className="text-red-500">*</span>
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

            {/* Optional public profile */}
            <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Public profile
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Help supporters understand your mission and find your organisation online. Add only the channels you use.
                  </p>
                </div>
                <span className="mt-1 w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  Optional
                </span>
              </div>

              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="orgBio">Organisation bio</Label>
                  <span className="text-xs text-slate-400">
                    {formData.bio.length}/600
                  </span>
                </div>
                <Textarea
                  id="orgBio"
                  value={formData.bio}
                  maxLength={600}
                  rows={4}
                  placeholder="Describe your mission, who you serve, and the impact you create."
                  onChange={(event) => handleChange("bio", event.target.value)}
                  className="resize-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col space-y-2">
                  <Label htmlFor="orgWebsite">Website</Label>
                  <div className="relative">
                    <Globe2 className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                    <Input
                      id="orgWebsite"
                      value={formData.websiteUrl}
                      inputMode="url"
                      placeholder="yourorganisation.org"
                      onChange={(event) =>
                        handleChange("websiteUrl", event.target.value)
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  <Label htmlFor="orgInstagram">Instagram</Label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                    <Input
                      id="orgInstagram"
                      value={formData.instagramUrl}
                      inputMode="url"
                      placeholder="instagram.com/yourorganisation"
                      onChange={(event) =>
                        handleChange("instagramUrl", event.target.value)
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  <Label htmlFor="orgTwitter">X / Twitter</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                    <Input
                      id="orgTwitter"
                      value={formData.twitterUrl}
                      inputMode="url"
                      placeholder="x.com/yourorganisation"
                      onChange={(event) =>
                        handleChange("twitterUrl", event.target.value)
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  <Label htmlFor="orgTiktok">TikTok</Label>
                  <div className="relative">
                    <FaTiktok className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                    <Input
                      id="orgTiktok"
                      value={formData.tiktokUrl}
                      inputMode="url"
                      placeholder="tiktok.com/@yourorganisation"
                      onChange={(event) =>
                        handleChange("tiktokUrl", event.target.value)
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  <Label htmlFor="orgFacebook">Facebook</Label>
                  <div className="relative">
                    <FaFacebookF className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                    <Input
                      id="orgFacebook"
                      value={formData.facebookUrl}
                      inputMode="url"
                      placeholder="facebook.com/yourorganisation"
                      onChange={(event) =>
                        handleChange("facebookUrl", event.target.value)
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  <Label htmlFor="orgWhatsapp">WhatsApp number</Label>
                  <div className="relative">
                    <FaWhatsapp className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                    <Input
                      id="orgWhatsapp"
                      type="tel"
                      value={formData.whatsappNumber}
                      inputMode="tel"
                      placeholder="+234 801 234 5678"
                      onChange={(event) =>
                        handleChange("whatsappNumber", event.target.value)
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={isSaving || externalSubmitting}
                className="inline-flex h-12 items-center justify-center rounded-md border border-slate-300 bg-white text-sm font-medium text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                Skip for now
              </button>
              <Button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={isSaving || externalSubmitting}
                className="h-12 bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save & continue"
                )}
              </Button>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
