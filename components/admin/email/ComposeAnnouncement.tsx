"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AnnouncementPreview } from "@/components/admin/email/AnnouncementPreview";
import { AudienceField } from "@/components/admin/email/AudienceField";
import { LinkField } from "@/components/admin/email/LinkField";
import { SendTimingField } from "@/components/admin/email/SendTimingField";
import { ConfirmSendDialog } from "@/components/admin/email/confirm-send-dialog";
import {
  createAnnouncement,
  sendTestAnnouncement,
} from "@/actions/admin/email-actions";
import { useAnnouncements, useAudienceReach } from "@/hooks/use-email-admin";
import { useToast } from "@/hooks/use-toast";
import { useValidator } from "@/hooks/use-validator";
import {
  emailAudienceOptions,
  type EmailAudience,
} from "@/lib/options/email-audience.options";
import { NO_LINK } from "@/lib/options/email-link.options";
import {
  announcementSchema,
  MESSAGE_MAX,
  TITLE_MAX,
} from "@/lib/schemas/email-announcement.schema";
import { Heading } from "@/components/marketing/Typography";

const emptyForm = {
  audience: "all_users" as EmailAudience,
  title: "",
  message: "",
  linkPath: NO_LINK as string,
  sendLater: false,
  sendAt: "",
};

const formatWhen = (value: string) =>
  new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

export function ComposeAnnouncement() {
  const [form, setForm] = useState(emptyForm);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const setFormFields = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const { errors, validate, clearError } = useValidator({
    store: form,
    schema: announcementSchema,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { count: reach } = useAudienceReach(form.audience);
  const { announcements } = useAnnouncements();

  const audienceLabel =
    emailAudienceOptions.find((o) => o.value === form.audience)?.label ?? "";
  const scheduledFor =
    form.sendLater && form.sendAt ? formatWhen(form.sendAt) : null;

  const sendMutation = useMutation({
    mutationFn: () =>
      createAnnouncement({
        ...form,
        sendAt: form.sendLater ? new Date(form.sendAt).toISOString() : "",
      }),
    onSuccess: ({ success, error }) => {
      setConfirmOpen(false);
      if (!success) {
        setSubmitError(error ?? "Could not send");
        return;
      }
      toast({
        title: scheduledFor
          ? "Announcement scheduled"
          : "Announcement is sending",
        description: "Follow its progress on the History tab.",
      });
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["email-announcements"] });
    },
    onError: (error) => {
      setConfirmOpen(false);
      setSubmitError(error.message);
    },
  });

  const testMutation = useMutation({
    mutationFn: () => sendTestAnnouncement(form),
    onSuccess: ({ success, error, data }) =>
      toast(
        success
          ? { title: `Test sent to ${data?.email}` }
          : { title: error, variant: "destructive" },
      ),
    onError: (error) => toast({ title: error.message, variant: "destructive" }),
  });

  const handleSend = () => {
    setSubmitError(null);
    if (!validate() || sendMutation.isPending) return;
    setConfirmOpen(true);
  };

  const handleTest = () => {
    setSubmitError(null);
    if (!validate() || testMutation.isPending) return;
    testMutation.mutate();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card>
        <CardContent className="space-y-5 p-6">
          <Heading as="h2" size="subsection" className="text-xl md:text-2xl">
            New announcement
          </Heading>

          <AudienceField
            value={form.audience}
            reach={reach}
            error={errors.audience}
            onChange={(audience) => setFormFields("audience", audience)}
          />

          <div className="space-y-1.5">
            <Label htmlFor="announcement-title">Title</Label>
            <Input
              id="announcement-title"
              value={form.title}
              maxLength={TITLE_MAX}
              onChange={(event) => {
                setFormFields("title", event.target.value);
                clearError("title");
              }}
            />
            <FieldError message={errors.title} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="announcement-message">Message</Label>
            <Textarea
              id="announcement-message"
              rows={5}
              value={form.message}
              maxLength={MESSAGE_MAX}
              onChange={(event) => {
                setFormFields("message", event.target.value);
                clearError("message");
              }}
            />
            <FieldError message={errors.message} />
          </div>

          <LinkField
            value={form.linkPath}
            onChange={(linkPath) => setFormFields("linkPath", linkPath)}
          />

          <SendTimingField
            sendLater={form.sendLater}
            sendAt={form.sendAt}
            error={errors.sendAt}
            onModeChange={(sendLater) =>
              setForm((current) => ({ ...current, sendLater, sendAt: "" }))
            }
            onTimeChange={(sendAt) => {
              setFormFields("sendAt", sendAt);
              clearError("sendAt");
            }}
          />

          <FieldError message={submitError ?? undefined} />

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testMutation.isPending}
            >
              {testMutation.isPending ? "Sending test…" : "Send test to me"}
            </Button>
            <Button onClick={handleSend} disabled={sendMutation.isPending}>
              {form.sendLater ? "Schedule" : "Send now"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AnnouncementPreview
        title={form.title}
        message={form.message}
        recentlySent={announcements
          .filter((a) => a.status === "sent")
          .slice(0, 3)}
      />

      <ConfirmSendDialog
        open={confirmOpen}
        reach={reach}
        audienceLabel={audienceLabel}
        scheduledFor={scheduledFor}
        pending={sendMutation.isPending}
        onConfirm={() => sendMutation.mutate()}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
