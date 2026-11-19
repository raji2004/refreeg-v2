"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { ArrowRight, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field-error";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useValidator } from "@/hooks/use-validator";
import { resubmitKycSchema } from "@/lib/schemas/kyc-review.schema";
import { kycRedoOptions } from "@/lib/options/kyc-review.options";
import { resubmitKycRequest } from "@/actions/users/kyc-actions";

export function AskResubmitDialog({
  verificationId,
  applicantFirstName,
  messagePlaceholder,
}: {
  verificationId: string;
  applicantFirstName?: string | null;
  messagePlaceholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({
    verificationId,
    redo: ["selfie", "date_of_birth"] as string[],
    message: "",
  });

  const setFormFields = (key: "redo" | "message", value: string | string[]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const { errors, validate } = useValidator({
    store: form,
    schema: resubmitKycSchema,
  });
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const firstName = applicantFirstName || "the applicant";

  const toggleRedo = (value: string, checked: boolean) => {
    setFormFields(
      "redo",
      checked
        ? [...form.redo, value]
        : form.redo.filter((item) => item !== value),
    );
  };

  const resubmitMutation = useMutation({
    mutationFn: () =>
      resubmitKycRequest({
        verificationId: form.verificationId,
        redo: form.redo,
        message: form.message,
      }),
    onSuccess: ({ error }) => {
      if (error) {
        setSubmitError(error);
        return;
      }
      setOpen(false);
      toast({
        title: "Resubmission request sent",
        description:
          "The case stays in review until the applicant redoes the checks.",
      });
      router.replace(
        `${pathname}?flash=resubmitted&name=${encodeURIComponent(firstName)}`,
        { scroll: false },
      );
      router.refresh();
    },
    onError: (mutationError) => {
      setSubmitError(mutationError.message);
    },
  });

  const handleSubmit = () => {
    setSubmitError(null);
    if (!validate() || resubmitMutation.isPending) return;
    resubmitMutation.mutate();
  };

  const isSubmitting = resubmitMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Ask to resubmit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-lg">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gold/30 text-ink">
              <RefreshCw className="h-5 w-5" />
            </span>
            Ask {firstName} to resubmit
          </DialogTitle>
          <DialogDescription>
            Choose what needs redoing. They keep their campaign in review until
            identity is approved.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-ink">
              What should {firstName} redo?
            </legend>
            {kycRedoOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 text-sm text-ink"
              >
                <Checkbox
                  checked={form.redo.includes(option.value)}
                  onCheckedChange={(checked) =>
                    toggleRedo(option.value, checked === true)
                  }
                  aria-label={option.label}
                />
                {option.label}
              </label>
            ))}
            <FieldError message={errors.redo} />
          </fieldset>
          <div className="space-y-2">
            <label
              htmlFor="kyc-resubmit-message"
              className="text-sm font-medium text-ink"
            >
              Message
            </label>
            <Textarea
              id="kyc-resubmit-message"
              value={form.message}
              onChange={(event) => setFormFields("message", event.target.value)}
              placeholder={messagePlaceholder}
              className="min-h-[96px]"
              disabled={isSubmitting}
            />
            <FieldError message={errors.message} />
            {submitError && <FieldError message={submitError} />}
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-blue-accent/30 bg-blue-accent/10 p-3 text-sm text-blue-accent">
            <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              Their verification stays in review until identity is approved.
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="ink"
            onClick={handleSubmit}
            disabled={isSubmitting || form.redo.length === 0}
          >
            {isSubmitting ? (
              "Sending..."
            ) : (
              <>
                <ArrowRight className="mr-2 h-4 w-4" />
                Send request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
