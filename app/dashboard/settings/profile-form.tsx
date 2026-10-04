"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, Eye, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import type { ProfileFormData } from "@/types";
import { useProfile } from "@/hooks/use-profile";
import { compressImage } from "@/utils/image-compression";
import { getMediaUrl } from "@/lib/s3/media";
import { cn } from "@/lib/utils";
import { interestOptions } from "@/lib/interest-categories";
import { ChangeEmailModal } from "./change-email-modal";
import {
  SettingsCancelButton,
  SettingsSaveButton,
} from "./components/settings-action-buttons";

type AppearanceMode = "named" | "anonymous";
type EditableField =
  "full_name" | "display_name" | "phone" | "location" | "interests" | null;

type FormState = {
  full_name: string;
  email: string;
  phone: string;
  bio: string;
  username: string;
  display_name: string;
  location: string;
  interests: string[];
};

interface ProfileFormProps {
  profile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    profile_photo: string | null;
    bio: string | null;
    username?: string | null;
    display_name?: string | null;
    location?: string | null;
    donation_preference?: string | null;
    account_type?: string | null;
    interests?: string[] | null;
    created_at?: string | null;
    causes_count?: number | null;
  };
  user: {
    id: string;
    email: string;
  };
}

function shortDisplayName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "You";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function formatGivingSince(createdAt?: string | null) {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function interestLabel(id: string) {
  return interestOptions.find((o) => o.id === id)?.label ?? id;
}

export function ProfileForm({ profile, user }: ProfileFormProps) {
  const [savingField, setSavingField] = useState<EditableField>(null);
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [editingField, setEditingField] = useState<EditableField>(null);
  const [editSnapshot, setEditSnapshot] = useState<Partial<FormState>>({});
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<{ phone?: string }>({});
  const [appearance, setAppearance] = useState<AppearanceMode>(
    profile.donation_preference === "anonymous" ? "anonymous" : "named",
  );
  const [formData, setFormData] = useState<FormState>({
    full_name: profile?.full_name || "",
    email: profile?.email || user?.email || "",
    phone: profile?.phone || "",
    bio: profile?.bio || "",
    username: profile?.username || "",
    display_name:
      profile?.display_name || shortDisplayName(profile?.full_name || "") || "",
    location: profile?.location || "",
    interests: profile?.interests ?? [],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateProfile, updateProfilePhoto, isUploading } = useProfile(
    user?.id,
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleInterest = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(id)
        ? prev.interests.filter((x) => x !== id)
        : [...prev.interests, id],
    }));
  };

  const isValidNigerianPhone = (phone: string) => {
    const nigerianPattern = /^(?:070|080|081|090|091|071)\d{8}$/;
    return nigerianPattern.test(phone);
  };

  const startEditing = (field: NonNullable<EditableField>) => {
    setFormErrors({});
    setEditSnapshot({
      full_name: formData.full_name,
      display_name: formData.display_name,
      phone: formData.phone,
      location: formData.location,
      interests: [...formData.interests],
    });
    setEditingField(field);
  };

  const cancelEditing = () => {
    setFormData((prev) => ({
      ...prev,
      full_name: editSnapshot.full_name ?? prev.full_name,
      display_name: editSnapshot.display_name ?? prev.display_name,
      phone: editSnapshot.phone ?? prev.phone,
      location: editSnapshot.location ?? prev.location,
      interests: editSnapshot.interests
        ? [...editSnapshot.interests]
        : prev.interests,
    }));
    setFormErrors({});
    setEditingField(null);
  };

  const buildProfilePayload = (
    data: FormState,
    donationPreference: AppearanceMode = appearance,
  ): ProfileFormData => {
    const displayName =
      data.display_name.trim() || shortDisplayName(data.full_name || "You");

    return {
      name: data.full_name,
      email: data.email,
      phone: data.phone,
      bio: data.bio,
      username: data.username || undefined,
      display_name: displayName,
      location: data.location,
      donation_preference: donationPreference,
      interests: data.interests,
      ...(profile.account_type
        ? {
            account_type: profile.account_type as NonNullable<
              ProfileFormData["account_type"]
            >,
          }
        : {}),
    };
  };

  const saveField = async (field: NonNullable<EditableField>) => {
    if (
      field === "phone" &&
      formData.phone &&
      !isValidNigerianPhone(formData.phone)
    ) {
      setFormErrors({
        phone: "Enter a valid Nigerian phone number (e.g. 08012345678)",
      });
      return;
    }

    setFormErrors({});
    setSavingField(field);

    const displayName =
      formData.display_name.trim() ||
      shortDisplayName(formData.full_name || "You");
    const nextData = { ...formData, display_name: displayName };

    try {
      await updateProfile(buildProfilePayload(nextData));
      setFormData(nextData);
      setEditingField(null);
    } finally {
      setSavingField(null);
    }
  };

  const selectAppearance = async (mode: AppearanceMode) => {
    if (mode === appearance || savingAppearance || editingField) return;
    setAppearance(mode);
    setSavingAppearance(true);
    try {
      await updateProfile(buildProfilePayload(formData, mode));
    } catch {
      setAppearance(appearance);
    } finally {
      setSavingAppearance(false);
    }
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
    if (formData.full_name) {
      return formData.full_name
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

  const previewName =
    formData.display_name.trim() ||
    shortDisplayName(formData.full_name || "You");
  const givingSince = formatGivingSince(profile.created_at);
  const campaignsCount = profile.causes_count ?? 0;
  const publicProfileHref = formData.username
    ? profile.account_type === "organization"
      ? `/${formData.username}?view=personal`
      : `/${formData.username}`
    : "";

  const namedPreview = formData.location
    ? `${previewName}, ${formData.location}`
    : previewName;

  const displayNameHelper = `Shown on the ${campaignsCount} campaign${campaignsCount === 1 ? "" : "s"} you have funded. Changing it updates all of them.`;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-fraunces text-3xl font-semibold text-ink sm:text-4xl">
              Settings
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-ink/60">
              Editing one row at a time — switches apply on flip.
            </p>
          </div>
          {publicProfileHref ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-ink/20"
            >
              <Link
                href={publicProfileHref}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                View public profile
              </Link>
            </Button>
          ) : null}
        </div>

        <Card className="overflow-hidden rounded-2xl border border-hairline bg-white shadow-none">
          <CardContent className="space-y-0 p-0">
            <div className="flex flex-col gap-4 border-b border-hairline px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-hairline">
                  <AvatarImage
                    src={getMediaUrl(profile?.profile_photo) || ""}
                    alt={formData.full_name || user.email}
                  />
                  <AvatarFallback className="bg-forest text-lg font-semibold text-forest-foreground">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold text-ink">
                    {formData.full_name || "Your name"}
                  </p>
                  <p className="text-sm text-ink/55">
                    {[
                      givingSince ? `Giving since ${givingSince}` : null,
                      `${campaignsCount} campaign${campaignsCount === 1 ? "" : "s"}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>
              <div>
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
                  className="rounded-lg border-ink/80 bg-white text-ink hover:bg-cream-muted"
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
                      Change photo
                    </>
                  )}
                </Button>
              </div>
            </div>

            <ProfileRow
              label="Full name"
              editing={editingField === "full_name"}
              idleActionLabel="Edit"
              onIdleAction={() => startEditing("full_name")}
              onSave={() => saveField("full_name")}
              onCancel={cancelEditing}
              saving={savingField === "full_name"}
            >
              {editingField === "full_name" ? (
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="h-11 rounded-lg border-hairline bg-white text-ink focus-visible:border-azure focus-visible:ring-azure/30"
                  autoFocus
                />
              ) : (
                <p className="text-[15px] leading-6 text-ink">
                  {formData.full_name || (
                    <span className="text-ink/40">Not added</span>
                  )}
                </p>
              )}
            </ProfileRow>

            <ProfileRow
              label="Display name"
              editing={editingField === "display_name"}
              idleActionLabel="Edit"
              onIdleAction={() => startEditing("display_name")}
              onSave={() => saveField("display_name")}
              onCancel={cancelEditing}
              saving={savingField === "display_name"}
            >
              {editingField === "display_name" ? (
                <div className="space-y-1.5">
                  <Input
                    id="display_name"
                    name="display_name"
                    value={formData.display_name}
                    onChange={handleChange}
                    placeholder="How you appear publicly"
                    className="h-11 rounded-lg border-azure bg-white text-ink focus-visible:border-azure focus-visible:ring-azure/30"
                    autoFocus
                  />
                  <p className="text-xs leading-5 text-ink/50">
                    {displayNameHelper}
                  </p>
                </div>
              ) : (
                <p className="text-[15px] leading-6 text-ink">
                  {formData.display_name || (
                    <span className="text-ink/40">Not added</span>
                  )}
                </p>
              )}
            </ProfileRow>

            <ProfileRow
              label="Email"
              idleActionLabel="Change"
              onIdleAction={() => setEmailModalOpen(true)}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[15px] leading-6 text-ink">
                  {formData.email}
                </p>
                <span className="rounded-md bg-verified-soft px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-forest">
                  VERIFIED
                </span>
              </div>
            </ProfileRow>

            <ProfileRow
              label="Phone"
              editing={editingField === "phone"}
              idleActionLabel={formData.phone ? "Edit" : "Add"}
              onIdleAction={() => startEditing("phone")}
              onSave={() => saveField("phone")}
              onCancel={cancelEditing}
              saving={savingField === "phone"}
            >
              {editingField === "phone" ? (
                <div className="space-y-1">
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="08012345678"
                    className="h-11 rounded-lg border-azure bg-white text-ink focus-visible:border-azure focus-visible:ring-azure/30"
                    autoFocus
                  />
                  {formErrors.phone ? (
                    <p className="text-xs text-destructive">
                      {formErrors.phone}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p
                  className={cn(
                    "text-[15px] leading-6",
                    formData.phone ? "text-ink" : "text-ink/40",
                  )}
                >
                  {formData.phone || "Not added"}
                </p>
              )}
            </ProfileRow>

            <ProfileRow
              label="State"
              editing={editingField === "location"}
              idleActionLabel="Edit"
              onIdleAction={() => startEditing("location")}
              onSave={() => saveField("location")}
              onCancel={cancelEditing}
              saving={savingField === "location"}
            >
              {editingField === "location" ? (
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Lagos"
                  className="h-11 rounded-lg border-hairline bg-white text-ink focus-visible:border-azure focus-visible:ring-azure/30"
                  autoFocus
                />
              ) : (
                <p
                  className={cn(
                    "text-[15px] leading-6",
                    formData.location ? "text-ink" : "text-ink/40",
                  )}
                >
                  {formData.location || "Not added"}
                </p>
              )}
            </ProfileRow>

            <ProfileRow
              label="Skills for bounties"
              editing={editingField === "interests"}
              idleActionLabel="Edit"
              onIdleAction={() => startEditing("interests")}
              onSave={() => saveField("interests")}
              onCancel={cancelEditing}
              saving={savingField === "interests"}
              last
            >
              {editingField === "interests" ? (
                <div className="flex flex-wrap gap-2">
                  {interestOptions.map((option) => {
                    const selected = formData.interests.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleInterest(option.id)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          selected
                            ? "border-ink bg-ink text-ink-foreground"
                            : "border-hairline bg-cream-muted text-ink hover:border-ink/30",
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : formData.interests.length > 0 ? (
                <p className="text-[15px] leading-6 text-ink">
                  {formData.interests.map(interestLabel).join(" · ")}
                </p>
              ) : (
                <p className="text-[15px] leading-6 text-ink/40">Not added</p>
              )}
            </ProfileRow>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-hairline bg-white shadow-none">
          <CardContent className="space-y-4 p-5 sm:p-6">
            <div>
              <h2 className="text-base font-semibold text-ink">
                How you appear on campaigns you fund
              </h2>
              <p className="mt-1 text-sm text-ink/55">
                Applies to every gift, past and future. Amounts are never shown
                publicly.
              </p>
            </div>

            <div className="space-y-3">
              <AppearanceOption
                selected={appearance === "named"}
                onSelect={() => selectAppearance("named")}
                title={namedPreview}
                description="Display name and state"
                disabled={savingAppearance || !!editingField}
              />
              <AppearanceOption
                selected={appearance === "anonymous"}
                onSelect={() => selectAppearance("anonymous")}
                title="Anonymous"
                description="The NGO still gets a receipt, without your name"
                disabled={savingAppearance || !!editingField}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <ChangeEmailModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        currentEmail={formData.email}
      />
    </>
  );
}

function ProfileRow({
  label,
  children,
  editing,
  idleActionLabel,
  onIdleAction,
  onSave,
  onCancel,
  saving,
  last,
}: {
  label: string;
  children: ReactNode;
  editing?: boolean;
  idleActionLabel?: string;
  onIdleAction?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  saving?: boolean;
  last?: boolean;
}) {
  return (
    <div
      data-profile-row={label}
      className={cn("px-5 py-5 sm:px-6", !last && "border-b border-hairline")}
    >
      {editing ? (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-ink/55">{label}</Label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">{children}</div>
            <div className="flex shrink-0 items-center gap-2 sm:pt-0.5">
              <SettingsSaveButton saving={saving} onClick={onSave} />
              <SettingsCancelButton onClick={onCancel} disabled={saving} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label className="text-sm font-medium text-ink/55">{label}</Label>
            {children}
          </div>
          {idleActionLabel ? (
            <button
              type="button"
              onClick={onIdleAction}
              className="shrink-0 pt-0.5 text-sm font-medium text-azure hover:text-azure/80"
            >
              {idleActionLabel}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function AppearanceOption({
  selected,
  onSelect,
  title,
  description,
  disabled,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-60",
        selected
          ? "border-azure bg-white"
          : "border-hairline bg-white hover:border-ink/25",
      )}
    >
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-xs text-ink/55">{description}</p>
      </div>
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
          selected
            ? "border-azure bg-azure text-azure-foreground"
            : "border-hairline bg-transparent",
        )}
      >
        {selected ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
    </button>
  );
}
