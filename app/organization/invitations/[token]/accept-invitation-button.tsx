"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { acceptOrganizationInvitation } from "@/actions/organization-actions";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

export function AcceptInvitationButton({ token }: { token: string }) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);

  const accept = async () => {
    setIsAccepting(true);
    const result = await acceptOrganizationInvitation(token);
    if (result.success) {
      toast({ title: "Invitation accepted", description: "Welcome to the organization workspace." });
      router.push("/dashboard/settings/organization");
      router.refresh();
      return;
    }

    setIsAccepting(false);
    toast({ title: "Could not accept invitation", description: result.error, variant: "destructive" });
  };

  return (
    <Button className="w-full" disabled={isAccepting} onClick={accept}>
      {isAccepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Accept invitation
    </Button>
  );
}
