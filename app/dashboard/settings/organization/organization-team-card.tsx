"use client";

import { Trash2, Users } from "lucide-react";
import { removeOrganizationMember } from "@/actions/organization-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import type { Workspace } from "./organization-workspace.types";

export function OrganizationTeamCard({
  workspace,
  onChanged,
}: {
  workspace: Workspace;
  onChanged: () => Promise<void>;
}) {
  const removeMember = async (memberId: string) => {
    const result = await removeOrganizationMember(memberId);
    if (result.success) {
      await onChanged();
      toast({ title: "Team member removed" });
    } else {
      toast({
        title: "Could not remove team member",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" /> Team
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {workspace.members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {member.user.fullName || member.user.email || "Team member"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {member.user.email}
              </p>
              <p className="mt-1 text-xs font-medium capitalize text-blue-700">
                {member.role}
              </p>
            </div>
            {workspace.canManage && member.role !== "owner" && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Remove member"
                onClick={() => removeMember(member.id)}
              >
                <Trash2 className="h-4 w-4 text-rose-600" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
