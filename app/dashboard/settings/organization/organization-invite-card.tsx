"use client";

import { useState } from "react";
import { Loader2, MailPlus, ShieldCheck } from "lucide-react";
import {
  inviteOrganizationMember,
  revokeOrganizationInvitation,
} from "@/actions/users/organization-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Field } from "./organization-fields";
import type { Workspace } from "./organization-workspace.types";

const emptyInvite = { email: "", role: "member" };

export function OrganizationInviteCard({
  invitations,
  onChanged,
}: {
  invitations: Workspace["invitations"];
  onChanged: () => Promise<void>;
}) {
  const [invite, setInvite] = useState(emptyInvite);
  const [isInviting, setIsInviting] = useState(false);

  const setFormFields = <K extends keyof typeof invite>(
    key: K,
    value: (typeof invite)[K],
  ) => setInvite((current) => ({ ...current, [key]: value }));

  const inviteMember = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsInviting(true);
    const result = await inviteOrganizationMember(invite);
    setIsInviting(false);

    if (result.success) {
      setFormFields("email", "");
      await onChanged();
      toast({
        title: "Invitation created",
        description: result.warning || "The team invitation was sent by email.",
      });
    } else {
      toast({
        title: "Could not invite team member",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const revokeInvitation = async (invitationId: string) => {
    const result = await revokeOrganizationInvitation(invitationId);
    if (result.success) {
      await onChanged();
      toast({ title: "Invitation revoked" });
    } else {
      toast({
        title: "Could not revoke invitation",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MailPlus className="h-5 w-5" /> Invite a teammate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={inviteMember} className="space-y-3">
          <Field label="Email address">
            <Input
              type="email"
              required
              value={invite.email}
              onChange={(event) => setFormFields("email", event.target.value)}
            />
          </Field>
          <Field label="Role">
            <Select
              value={invite.role}
              onValueChange={(role) => setFormFields("role", role)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Button type="submit" className="w-full" disabled={isInviting}>
            {isInviting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            Send invitation
          </Button>
        </form>

        {invitations.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-semibold">Pending invitations</p>
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{invitation.email}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {invitation.role}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => revokeInvitation(invitation.id)}
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
