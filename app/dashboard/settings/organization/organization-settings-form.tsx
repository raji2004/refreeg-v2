"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  Building2,
  Loader2,
  MailPlus,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import {
  getOrganizationWorkspace,
  inviteOrganizationMember,
  removeOrganizationMember,
  revokeOrganizationInvitation,
  updateOrganization,
  updateOrganizationLogo,
} from "@/actions/organization-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";

type Workspace = Extract<
  Awaited<ReturnType<typeof getOrganizationWorkspace>>,
  { success: true }
>["workspace"];

export function OrganizationSettingsForm({
  initialWorkspace,
}: {
  initialWorkspace: Workspace;
}) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshWorkspace = async () => {
    const result = await getOrganizationWorkspace();
    if (result.success) setWorkspace(result.workspace);
  };

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
        : { title: "Could not save settings", description: result.error, variant: "destructive" },
    );
  };

  const uploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const result = await updateOrganizationLogo(file);
    setIsUploading(false);

    if (result.success) {
      setWorkspace((current) => ({ ...current, logoUrl: result.logoUrl }));
      toast({ title: "Organization logo updated" });
    } else {
      toast({ title: "Could not upload logo", description: result.error, variant: "destructive" });
    }
    event.target.value = "";
  };

  const inviteMember = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsInviting(true);
    const result = await inviteOrganizationMember({ email: inviteEmail, role: inviteRole });
    setIsInviting(false);

    if (result.success) {
      setInviteEmail("");
      await refreshWorkspace();
      toast({
        title: "Invitation created",
        description: result.warning || "The team invitation was sent by email.",
      });
    } else {
      toast({ title: "Could not invite team member", description: result.error, variant: "destructive" });
    }
  };

  const revokeInvitation = async (invitationId: string) => {
    const result = await revokeOrganizationInvitation(invitationId);
    if (result.success) {
      await refreshWorkspace();
      toast({ title: "Invitation revoked" });
    } else {
      toast({ title: "Could not revoke invitation", description: result.error, variant: "destructive" });
    }
  };

  const removeMember = async (memberId: string) => {
    const result = await removeOrganizationMember(memberId);
    if (result.success) {
      await refreshWorkspace();
      toast({ title: "Team member removed" });
    } else {
      toast({ title: "Could not remove team member", description: result.error, variant: "destructive" });
    }
  };

  const logoSrc = getMediaUrl(workspace.logoUrl);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Workspace profile</CardTitle></CardHeader>
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
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Upload logo
                  </Button>
                  <p className="text-xs text-muted-foreground">JPG, PNG, or WebP. Maximum 2 MB.</p>
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
                    onChange={(event) => setWorkspace((current) => ({ ...current, name: event.target.value }))}
                  />
                </Field>
                <Field label="Admin email">
                  <Input
                    type="email"
                    value={workspace.adminEmail}
                    disabled={!workspace.canManage}
                    onChange={(event) => setWorkspace((current) => ({ ...current, adminEmail: event.target.value }))}
                  />
                </Field>
                <Field label="Industry">
                  <Input
                    value={workspace.industry}
                    disabled={!workspace.canManage}
                    onChange={(event) => setWorkspace((current) => ({ ...current, industry: event.target.value }))}
                  />
                </Field>
                <Field label="Phone number">
                  <Input
                    type="tel"
                    value={workspace.phone}
                    disabled={!workspace.canManage}
                    onChange={(event) => setWorkspace((current) => ({ ...current, phone: event.target.value }))}
                  />
                </Field>
              </div>
              <Field label="Address">
                <Textarea
                  value={workspace.address}
                  disabled={!workspace.canManage}
                  onChange={(event) => setWorkspace((current) => ({ ...current, address: event.target.value }))}
                />
              </Field>

              <div className="space-y-5 rounded-xl border border-slate-200 p-4 sm:p-5">
                <div>
                  <h3 className="font-semibold text-slate-950">Public profile</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tell supporters about the organisation and where they can find it online.
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
                      setWorkspace((current) => ({
                        ...current,
                        bio: event.target.value,
                      }))
                    }
                  />
                  <p className="text-right text-xs text-muted-foreground">
                    {workspace.bio.length}/600
                  </p>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Website">
                    <Input
                      value={workspace.websiteUrl}
                      disabled={!workspace.canManage}
                      inputMode="url"
                      placeholder="https://yourorganisation.org"
                      onChange={(event) =>
                        setWorkspace((current) => ({
                          ...current,
                          websiteUrl: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Instagram">
                    <Input
                      value={workspace.instagramUrl}
                      disabled={!workspace.canManage}
                      inputMode="url"
                      placeholder="https://instagram.com/yourorganisation"
                      onChange={(event) =>
                        setWorkspace((current) => ({
                          ...current,
                          instagramUrl: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Twitter / X">
                    <Input
                      value={workspace.twitterUrl}
                      disabled={!workspace.canManage}
                      inputMode="url"
                      placeholder="https://x.com/yourorganisation"
                      onChange={(event) =>
                        setWorkspace((current) => ({
                          ...current,
                          twitterUrl: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="TikTok">
                    <Input
                      value={workspace.tiktokUrl}
                      disabled={!workspace.canManage}
                      inputMode="url"
                      placeholder="https://tiktok.com/@yourorganisation"
                      onChange={(event) =>
                        setWorkspace((current) => ({
                          ...current,
                          tiktokUrl: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Facebook">
                    <Input
                      value={workspace.facebookUrl}
                      disabled={!workspace.canManage}
                      inputMode="url"
                      placeholder="https://facebook.com/yourorganisation"
                      onChange={(event) =>
                        setWorkspace((current) => ({
                          ...current,
                          facebookUrl: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="WhatsApp number">
                    <Input
                      value={workspace.whatsappNumber}
                      disabled={!workspace.canManage}
                      type="tel"
                      inputMode="tel"
                      placeholder="+234 801 234 5678"
                      onChange={(event) =>
                        setWorkspace((current) => ({
                          ...current,
                          whatsappNumber: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border p-4">
                <h3 className="font-semibold">Preferences</h3>
                <Preference
                  label="Donation notifications"
                  description="Notify organization admins about incoming donations."
                  checked={workspace.preferences.donationNotifications}
                  disabled={!workspace.canManage}
                  onCheckedChange={(checked) => setWorkspace((current) => ({
                    ...current,
                    preferences: { ...current.preferences, donationNotifications: checked },
                  }))}
                />
                <Preference
                  label="Weekly team digest"
                  description="Receive a summary of organization activity."
                  checked={workspace.preferences.teamDigest}
                  disabled={!workspace.canManage}
                  onCheckedChange={(checked) => setWorkspace((current) => ({
                    ...current,
                    preferences: { ...current.preferences, teamDigest: checked },
                  }))}
                />
                <Preference
                  label="Public organization profile"
                  description="Allow supporters to see organization information."
                  checked={workspace.preferences.publicProfile}
                  disabled={!workspace.canManage}
                  onCheckedChange={(checked) => setWorkspace((current) => ({
                    ...current,
                    preferences: { ...current.preferences, publicProfile: checked },
                  }))}
                />
              </div>

              {workspace.canManage && (
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save organization
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {workspace.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{member.user.fullName || member.user.email || "Team member"}</p>
                  <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
                  <p className="mt-1 text-xs font-medium capitalize text-blue-700">{member.role}</p>
                </div>
                {workspace.canManage && member.role !== "owner" && (
                  <Button type="button" size="icon" variant="ghost" aria-label="Remove member" onClick={() => removeMember(member.id)}>
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {workspace.canManage && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MailPlus className="h-5 w-5" /> Invite a teammate</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <form onSubmit={inviteMember} className="space-y-3">
                <Field label="Email address"><Input type="email" required value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} /></Field>
                <Field label="Role">
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Button type="submit" className="w-full" disabled={isInviting}>
                  {isInviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  Send invitation
                </Button>
              </form>

              {workspace.invitations.length > 0 && (
                <div className="space-y-2 border-t pt-4">
                  <p className="text-sm font-semibold">Pending invitations</p>
                  {workspace.invitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm">{invitation.email}</p>
                        <p className="text-xs capitalize text-muted-foreground">{invitation.role}</p>
                      </div>
                      <Button type="button" size="sm" variant="ghost" onClick={() => revokeInvitation(invitation.id)}>Revoke</Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function Preference({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div><Label>{label}</Label><p className="text-xs text-muted-foreground">{description}</p></div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}
