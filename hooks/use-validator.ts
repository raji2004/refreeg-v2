"use client";

import { useState } from "react";
import type { z } from "zod";

type FieldErrors<T extends z.ZodTypeAny> = Partial<
  Record<keyof z.infer<T> & string, string>
>;

/**
 * Validates one form-state object against a zod schema and keeps the first
 * message per field. `validate()` returns true when the store is valid.
 */
export function useValidator<T extends z.ZodTypeAny>({
  store,
  schema,
}: {
  store: unknown;
  schema: T;
}) {
  const [errors, setErrors] = useState<FieldErrors<T>>({});

  const validate = () => {
    const result = schema.safeParse(store);
    if (result.success) {
      setErrors({});
      return true;
    }
    const next: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !next[key]) next[key] = issue.message;
    }
    setErrors(next as FieldErrors<T>);
    return false;
  };

  const clearError = (key: keyof FieldErrors<T>) =>
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });

  return { errors, validate, clearError };
}
