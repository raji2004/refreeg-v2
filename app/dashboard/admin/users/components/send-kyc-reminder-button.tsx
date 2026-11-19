"use client";

import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { sendKycReminderToUnverifiedUsers } from "@/actions/kyc-actions";

export function SendKycReminderButton() {
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      const result = await sendKycReminderToUnverifiedUsers();

      if (result.error) {
        toast({
          title: "Failed to Send Reminders",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "KYC Reminders Sent",
        description: `Sent ${result.sent} reminder${result.sent !== 1 ? "s" : ""}${result.skipped > 0 ? `, ${result.skipped} skipped (already in KYC process)` : ""}${result.failed > 0 ? `, ${result.failed} failed` : ""}.`,
      });
    } catch (error) {
      toast({
        title: "Failed to Send Reminders",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Button
      onClick={handleSend}
      disabled={isSending}
      variant="outline"
      className="gap-2"
    >
      <Mail className="h-4 w-4" />
      {isSending ? "Sending..." : "Send KYC Reminders"}
    </Button>
  );
}
