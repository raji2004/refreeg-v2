"use client";

import { useRef, useState } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, Eye } from "lucide-react";
import { Icons } from "@/components/icons";
import { SocialMedia } from "@/components/social-media";
import type { ProfileFormData } from "@/types";
import { useProfile } from "@/hooks/use-profile";
import Link from "next/link";
import { compressImage } from "@/utils/image-compression";
import { getMediaUrl } from "@/lib/s3/media";

type AccountType =
  | "individual"
  | "creator"
  | "non-profit"
  | "organization"
  | "community"
  | "developer";

const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: "individual", label: "Individual" },
  { value: "creator", label: "Creator" },
  { value: "non-profit", label: "Non-profit" },
  { value: "organization", label: "Organisation" },
  { value: "community", label: "Community" },
  { value: "developer", label: "Developer" },
];

interface ProfileFormProps {
  profile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    profile_photo: string | null;
    bio: string | null;
    username?: string | null;
    account_type?: AccountType | null;
    twitter_url?: string | null;
    facebook_url?: string | null;
    instagram_url?: string | null;
    linkedin_url?: string | null;
  };
  user: {
    id: string;
    email: string;
  };
}

export function ProfileForm({ profile, user }: ProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    phone?: string;
    full_name?: string;
    username?: string;
  }>({});
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    email: profile?.email || user?.email || "",
    account_type: (profile?.account_type || "individual") as AccountType,
    phone: profile?.phone || "",
    bio: profile?.bio || "",
    username: profile?.username || "",
    twitter_url: profile?.twitter_url || "",
    facebook_url: profile?.facebook_url || "",
    instagram_url: profile?.instagram_url || "",
    linkedin_url: profile?.linkedin_url || "",
  });
  const [socialErrors, setSocialErrors] = useState({
    twitter: false,
    facebook: false,
    instagram: false,
    linkedin: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateProfile, updateProfilePhoto, isUploading } = useProfile(
    user?.id,
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAccountTypeChange = (value: AccountType) => {
    setFormData((prev) => ({ ...prev, account_type: value }));
  };

  const handleSocialMediaChange = (platform: string, value: string) => {
    setFormData((prev) => ({ ...prev, [`${platform}_url`]: value }));
    try {
      if (value && !/^https?:\/\//i.test(value)) {
        setSocialErrors((prev) => ({ ...prev, [platform]: true }));
      } else {
        setSocialErrors((prev) => ({ ...prev, [platform]: false }));
      }
    } catch {
      setSocialErrors((prev) => ({ ...prev, [platform]: true }));
    }
  };

  const isValidNigerianPhone = (phone: string) => {
    const nigerianPattern = /^(?:070|080|081|090|091|071)\d{8}$/;
    return nigerianPattern.test(phone);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasErrors = Object.values(socialErrors).some((error) => error);
    if (hasErrors) return;

    if (formData.phone && !isValidNigerianPhone(formData.phone)) {
      setFormErrors({
        phone: "Enter a valid Nigerian phone number (e.g. 08012345678)",
      });
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    const updatedProfile: ProfileFormData = {
      name: formData.full_name,
      email: formData.email,
      phone: formData.phone,
      bio: formData.bio,
      username: formData.username,
      account_type: formData.account_type,
      twitter_url: formData.twitter_url,
      facebook_url: formData.facebook_url,
      instagram_url: formData.instagram_url,
      linkedin_url: formData.linkedin_url,
    };

    await updateProfile(updatedProfile);
    setIsSubmitting(false);
  };

  const handlePhotoClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedFile = await compressImage(file, 800, 0.7);
        await updateProfilePhoto(compressedFile);
      } catch (error) {
        console.error("Compression failed, uploading original:", error);
        await updateProfilePhoto(file);
      }
    }
  };

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
    }
    return user?.email
      ? user.email
          .split("@")[0]
          .split(".")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
      : "U";
  };

  const username = formData.username;

  const hasSocialErrors = [
    ["twitter_url", "twitter"],
    ["facebook_url", "facebook"],
    ["instagram_url", "instagram"],
    ["linkedin_url", "linkedin"],
  ].some(
    ([urlKey, errorKey]) =>
      !!formData[urlKey as keyof typeof formData] &&
      socialErrors[errorKey as keyof typeof socialErrors],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start md:flex-row flex-col gap-2">
          <div>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your personal information.</CardDescription>
          </div>
          {username && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/${username}`} className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                View Public Profile
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Profile Photo */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar
                className="h-24 w-24 cursor-pointer"
                onClick={handlePhotoClick}
              >
                <AvatarImage
                  src={getMediaUrl(profile?.profile_photo) || ""}
                  alt={profile?.full_name || user?.email || ""}
                />
                <AvatarFallback className="text-lg">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div
                className="absolute bottom-0 right-0 rounded-full bg-secondary p-1 cursor-pointer"
                onClick={handlePhotoClick}
              >
                <Camera className="h-4 w-4 text-secondary-foreground" />
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePhotoClick}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Change Photo
                </>
              )}
            </Button>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              name="full_name"
              placeholder="Your full name"
              value={formData.full_name}
              onChange={handleChange}
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              placeholder="Your username"
              value={formData.username}
              onChange={handleChange}
            />
            <p className="text-xs text-muted-foreground">
              This will be used in your profile URL: refreeg.com/
              {formData.username || "username"}
            </p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Your email cannot be changed.
            </p>
          </div>

          {/* Account Type - now a Select dropdown */}
          <div className="space-y-2">
            <Label htmlFor="account_type">Account Type</Label>
            <Select
              value={formData.account_type}
              onValueChange={handleAccountTypeChange}
            >
              <SelectTrigger id="account_type">
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose the account type that best describes you.
            </p>
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              disabled
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              Phone number cannot be changed.
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              placeholder="Tell others about yourself and your causes"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              This will be displayed on your public profile.
            </p>
          </div>

          {/* Social Media Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Social Media</h3>
            <p className="text-sm text-muted-foreground">
              Add links to your social media profiles (must start with http://
              or https://)
            </p>
            <SocialMedia
              mode="edit"
              twitter={formData.twitter_url}
              facebook={formData.facebook_url}
              instagram={formData.instagram_url}
              linkedin={formData.linkedin_url}
              onChange={handleSocialMediaChange}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting || hasSocialErrors}>
            {isSubmitting ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
