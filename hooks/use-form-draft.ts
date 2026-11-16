"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

const SAVE_DELAY_MS = 1000;
const REMINDER_DELAY_MS = 24 * 60 * 60 * 1000;
const ACTIVITY_EVENTS = ["input", "change", "click", "keydown"];

type DraftReminder = {
  continueUrl: string;
  send: (input: { continueUrl: string }) => Promise<unknown>;
};

type DraftForm = { startDate?: Date | null; endDate?: Date | null };

/**
 * Local draft for a create form: restores it from localStorage once, saves
 * the text fields as they change (only after the restore, so an empty form
 * never overwrites a saved draft), and emails a reminder after a day of
 * inactivity. Files and previews are not saved.
 */
export function useFormDraft<T extends DraftForm>({
  key,
  enabled = true,
  form,
  setForm,
  restore,
  extraFields,
  hasStarted,
  reminder,
  isSignedIn,
}: {
  key: string;
  enabled?: boolean;
  form: T;
  setForm: Dispatch<SetStateAction<T>>;
  /** Merge a parsed draft into the current form. */
  restore: (draft: Record<string, any>, current: T) => T;
  extraFields?: Record<string, unknown>;
  hasStarted: boolean;
  reminder: DraftReminder;
  isSignedIn: boolean;
}) {
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const saved = localStorage.getItem(key);
    if (saved) {
      const draft = JSON.parse(saved);
      setForm((current) => restore(draft, current));
    }
    setRestored(true);
    // restore is a stable per-form function; run once per key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, setForm]);

  useEffect(() => {
    if (!enabled || !restored) return;
    const timer = setTimeout(() => {
      const { coverImage, multimedia, image, ...fields } = form as T &
        Record<string, unknown>;
      localStorage.setItem(
        key,
        JSON.stringify({
          ...fields,
          ...extraFields,
          startDate: form.startDate ? form.startDate.toISOString() : null,
          endDate: form.endDate ? form.endDate.toISOString() : null,
        }),
      );
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // extraFields is a per-form constant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, restored, form, key]);

  useEffect(() => {
    if (!enabled) return;
    if (!localStorage.getItem(key) && !hasStarted) return;

    let timer: ReturnType<typeof setTimeout>;
    const sendReminder = async () => {
      if (!localStorage.getItem(key) || !isSignedIn) return;
      try {
        await reminder.send({
          continueUrl: `${window.location.origin}${reminder.continueUrl}`,
        });
      } catch (error) {
        console.error(`Failed to send ${key} reminder email:`, error);
      }
    };
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(sendReminder, REMINDER_DELAY_MS);
    };

    ACTIVITY_EVENTS.forEach((event) =>
      document.addEventListener(event, resetTimer, { passive: true }),
    );
    resetTimer();

    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((event) =>
        document.removeEventListener(event, resetTimer),
      );
    };
    // reminder is a per-form constant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, hasStarted, isSignedIn, key]);

  const clearDraft = () => localStorage.removeItem(key);

  return { clearDraft };
}
