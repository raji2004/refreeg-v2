"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import { createPledge } from "@/actions/donations/pledge-actions";
import { usePayment } from "@/hooks/use-payment";
import { useValidator } from "@/hooks/use-validator";
import {
  getDefaultPledgeDate,
  pledgeSchema,
  type PledgeFormFields,
} from "@/lib/schemas/pledge.schema";

const SAVE_FAILED = "We could not save your pledge.";
const PAYSTACK_NOT_OPENED =
  "Your pledge was saved, but Paystack did not open. Click “Continue to Paystack” below to add your card.";

type Submission = {
  submitted: boolean;
  submitting: boolean;
  error: string | null;
  pledgeId: string | null;
  guestToken: string | null;
};

/**
 * Shared state and submit flow for the pledge page and the Discover quick
 * pledge dialog: one form object, zod validation, save the pledge, then open
 * Paystack to store the card.
 */
export function usePledgeForm({
  causeId,
  causeTitle,
  defaultName = "",
  defaultEmail = "",
}: {
  causeId: string;
  causeTitle: string;
  defaultName?: string;
  defaultEmail?: string;
}) {
  const { initializePledgeCheckout, isLoading: paymentLoading } = usePayment();

  const [form, setForm] = useState<PledgeFormFields>(() => ({
    amount: 25000,
    date: getDefaultPledgeDate(),
    name: defaultName,
    email: defaultEmail,
    note: "",
  }));
  const [amountInput, setAmountInput] = useState("25,000");
  const [submission, setSubmission] = useState<Submission>({
    submitted: false,
    submitting: false,
    error: null,
    pledgeId: null,
    guestToken: null,
  });
  const { errors, validate, clearError } = useValidator({
    store: form,
    schema: pledgeSchema,
  });

  const patchSubmission = (patch: Partial<Submission>) =>
    setSubmission((current) => ({ ...current, ...patch }));

  const setFormFields = <K extends keyof PledgeFormFields>(
    key: K,
    value: PledgeFormFields[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    patchSubmission({ submitted: false, error: null });
    clearError(key);
  };

  const handleAmountChange = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value
      .replace(/,/g, "")
      .replace(/\D/g, "")
      .slice(0, 12);
    setAmountInput(digits);
    setFormFields("amount", digits ? Number(digits) : 0);
  };

  const handleAmountBlur = () => {
    if (amountInput) setAmountInput(Number(amountInput).toLocaleString());
  };

  const handleAmountFocus = () =>
    setAmountInput((current) => current.replace(/,/g, ""));

  const handlePresetClick = (value: number) => {
    setAmountInput(value.toLocaleString());
    setFormFields("amount", value);
  };

  const handleSubmit = async () => {
    if (submission.submitting || paymentLoading) return;

    if (!validate()) {
      patchSubmission({
        error: "Add a valid amount, reminder date, name, and email.",
      });
      return;
    }

    patchSubmission({ submitting: true, error: null });

    try {
      const { data, error } = await createPledge({
        causeId,
        amount: form.amount,
        reminderDate: form.date,
        name: form.name.trim(),
        email: form.email.trim(),
        note: form.note.trim() || null,
        causeTitle,
      });

      if (error || !data?.id) {
        patchSubmission({ error: error || SAVE_FAILED, submitted: false });
        return;
      }

      patchSubmission({ pledgeId: data.id, guestToken: data.token ?? null });

      try {
        await initializePledgeCheckout({
          pledgeId: data.id,
          guestToken: data.token,
        });
      } catch {
        patchSubmission({ error: PAYSTACK_NOT_OPENED, submitted: false });
        return;
      }

      patchSubmission({ submitted: true });
    } catch (err) {
      patchSubmission({
        error: err instanceof Error ? err.message : SAVE_FAILED,
        submitted: false,
      });
    } finally {
      patchSubmission({ submitting: false });
    }
  };

  const handleRetryPaystack = async () => {
    if (!submission.pledgeId || paymentLoading) return;
    patchSubmission({ error: null });
    try {
      await initializePledgeCheckout({
        pledgeId: submission.pledgeId,
        guestToken: submission.guestToken,
      });
    } catch {
      patchSubmission({ error: "Could not open Paystack. Please try again." });
    }
  };

  return {
    form,
    setFormFields,
    amountInput,
    errors,
    submission,
    paymentLoading,
    busy: submission.submitting || paymentLoading,
    handleAmountChange,
    handleAmountBlur,
    handleAmountFocus,
    handlePresetClick,
    handleSubmit,
    handleRetryPaystack,
  };
}
