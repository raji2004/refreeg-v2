"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Building2, Loader2, Upload } from "lucide-react";
import {
  getOrganizationWorkspace,
  updateOrganization,
} from "@/actions/users/organization-actions";
import { uploadOrganizationLogo } from "@/lib/organization-logo-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import { Field, Preference } from "./organization-fields";
import { OrganizationInviteCard } from "./organization-invite-card";
import { OrganizationTeamCard } from "./organization-team-card";
import type { Workspace } from "./organization-workspace.types";

type PreferenceKey = keyof Workspace["preferences"];

const socialFields = [
  {
    key: "websiteUrl",
    label: "Website",
    placeholder: "https://yourorganisation.org",
  },
  {
    key: "instagramUrl",
    label: "Instagram",
    placeholder: "https://instagram.com/yourorganisation",
  },
  {
    key: "twitterUrl",
    label: "Twitter / X",
    placeholder: "https://x.com/yourorganisation",
  },
  {
    key: "tiktokUrl",
    label: "TikTok",
    placeholder: "https://tiktok.com/@yourorganisation",
  },
  {
    key: "facebookUrl",
    label: "Facebook",
    placeholder: "https://facebook.com/yourorganisation",
  },
] as const;

const preferenceFields: {
  key: PreferenceKey;
  label: string;
  description: string;
}[] = [
  {
    key: "donationNotifications",
    label: "Donation notifications",
    description: "Notify organization admins about incoming donations.",
  },
  {
    key: "teamDigest",
    label: "Weekly team digest",
    description: "Receive a summary of organization activity.",
  },
  {
    key: "publicProfile",
    label: "Public organization profile",
    description: "Allow supporters to see organization information.",
  },
];

export function OrganizationSettingsForm({
  initialWorkspace,
}: {
  initialWorkspace: Workspace;
}) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshWorkspace = async () => {
    const result = await getOrganizationWorkspace();
    if (result.success) setWorkspace(result.workspace);
  };

  const setWorkspaceFields = <K extends keyof Workspace>(
    key: K,
    value: Workspace[K],
  ) => setWorkspace((current) => ({ ...current, [key]: value }));

  const setPreference = (key: PreferenceKey, checked: boolean) =>
    setWorkspaceFields("preferences", {
      ...workspace.preferences,
      [key]: checked,
    });

  const saveOrganization = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    const result = await updateOrganization({
      name: workspace.name,
      adminEmail: workspace.adminEmail,
      phone: workspace.phone,
      address: workspace.address,
      industry: workspace.industry,
      bio: workspace.bio,
      websiteUrl: workspace.websiteUrl,
      instagramUrl: workspace.instagramUrl,
      twitterUrl: workspace.twitterUrl,
      tiktokUrl: workspace.tiktokUrl,
      facebookUrl: workspace.facebookUrl,
      whatsappNumber: workspace.whatsappNumber,
      preferences: workspace.preferences,
    });
    setIsSaving(false);

    toast(
      result.success
        ? { title: "Organization settings saved" }
        : {
            title: "Could not save settings",
            description: result.error,
            variant: "destructive",
          },
    );
  };

  const uploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const result = await uploadOrganizationLogo(file);
    setIsUploading(false);

    if (result.success) {
      setWorkspace((current) => ({ ...current, logoUrl: result.logoUrl }));
      toast({ title: "Organization logo updated" });
    } else {
      toast({
        title: "Could not upload logo",
        description: result.error,
        variant: "destructive",
      });
    }
    event.target.value = "";
  };

  const logoSrc = getMediaUrl(workspace.logoUrl);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Workspace profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={saveOrganization}>
              <div className="flex flex-col gap-4 rounded-xl border bg-slate-50 p-4 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-white">
                  {logoSrc ? (
                    <Image
                      src={logoSrc}
                      alt={`${workspace.name} logo`}
                      width={80}
                      height={80}
                      className="h-full w-full object-contain p-1"
                      unoptimized={isProxyMediaUrl(logoSrc)}
                    />
                  ) : (
                    <Building2 className="h-9 w-9 text-slate-400" />
                  )}
                </div>
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!workspace.canManage || isUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload logo
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, or WebP. Maximum 2 MB.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={uploadLogo}
                    className="sr-only"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Organization name">
                  <Input
                    value={workspace.name}
                    disabled={!workspace.canManage}
                    onChange={(event) =>
                      setWorkspaceFields("name", event.target.value)
                    }
                  />
                </Field>
                <Field label="Admin email">
                  <Input
                    type="email"
                    value={workspace.adminEmail}
                    disabled={!workspace.canManage}
                    onChange={(event) =>
                      setWorkspaceFields("adminEmail", event.target.value)
                    }
                  />
                </Field>
                <Field label="Industry">
                  <Input
                    value={workspace.industry}
                    disabled={!workspace.canManage}
                    onChange={(event) =>
                      setWorkspaceFields("industry", event.target.value)
                    }
                  />
                </Field>
                <Field label="Phone number">
                  <Input
                    type="tel"
                    value={workspace.phone}
                    disabled={!workspace.canManage}
                    onChange={(event) =>
                      setWorkspaceFields("phone", event.target.value)
                    }
                  />
                </Field>
              </div>
              <Field label="Address">
                <Textarea
                  value={workspace.address}
                  disabled={!workspace.canManage}
                  onChange={(event) =>
                    setWorkspaceFields("address", event.target.value)
                  }
                />
              </Field>

              <div className="space-y-5 rounded-xl border border-slate-200 p-4 sm:p-5">
                <div>
                  <h3 className="font-semibold text-slate-950">
                    Public profile
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tell supporters about the organisation and where they can
                    find it online.
                  </p>
                </div>

                <Field label="Organisation bio">
                  <Textarea
                    value={workspace.bio}
                    disabled={!workspace.canManage}
                    maxLength={600}
                    rows={5}
                    placeholder="Describe your mission, the communities you serve, and the impact you create."
                    onChange={(event) =>
                      setWorkspaceFields("bio", event.target.value)
                    }
                  />
                  <p className="text-right text-xs text-muted-foreground">
                    {workspace.bio.length}/600
                  </p>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  {socialFields.map((field) => (
                    <Field key={field.key} label={field.label}>
                      <Input
                        value={workspace[field.key]}
                        disabled={!workspace.canManage}
                        inputMode="url"
                        placeholder={field.placeholder}
                        onChange={(event) =>
                          setWorkspaceFields(field.key, event.target.value)
                        }
                      />
                    </Field>
                  ))}
                  <Field label="WhatsApp number">
                    <Input
                      value={workspace.whatsappNumber}
                      disabled={!workspace.canManage}
                      type="tel"
                      inputMode="tel"
                      placeholder="+234 801 234 5678"
                      onChange={(event) =>
                        setWorkspaceFields("whatsappNumber", event.target.value)
                      }
                    />
                  </Field>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border p-4">
                <h3 className="font-semibold">Preferences</h3>
                {preferenceFields.map((field) => (
                  <Preference
                    key={field.key}
                    label={field.label}
                    description={field.description}
                    checked={workspace.preferences[field.key]}
                    disabled={!workspace.canManage}
                    onCheckedChange={(checked) =>
                      setPreference(field.key, checked)
                    }
                  />
                ))}
              </div>

              {workspace.canManage && (
                <Button type="submit" disabled={isSaving}>
                  {isSaving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save organization
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <OrganizationTeamCard
          workspace={workspace}
          onChanged={refreshWorkspace}
        />
        {workspace.canManage && (
          <OrganizationInviteCard
            invitations={workspace.invitations}
            onChanged={refreshWorkspace}
          />
        )}
      </div>
    </div>
  );
}
