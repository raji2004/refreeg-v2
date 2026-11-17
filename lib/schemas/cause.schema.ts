import { z } from "zod";
import { differenceInDays } from "date-fns";

export const MAX_DURATION_DAYS = 180;
export const MAX_TOTAL_MEDIA_BYTES = 100 * 1024 * 1024;
export const MAX_GALLERY_FILES = 5;

export type CauseFormMode = "create" | "edit";

export type CauseSection = { heading: string; description: string };

export type CauseFormValues = {
  title: string;
  summary: string;
  location: string;
  category: string;
  goal: string;
  currency: string;
  coverImage: File | null;
  /** Saved cover on an existing cause; empty when creating. */
  image: string;
  sections: CauseSection[];
  startDate: Date | undefined;
  endDate: Date | undefined;
  multimedia: (File | string)[];
  videoLinks: string[];
};

export type CauseFormErrors = Partial<
  Record<
    | "title"
    | "summary"
    | "location"
    | "category"
    | "goal"
    | "coverImage"
    | "startDate"
    | "endDate"
    | "multimedia",
    string
  >
> & { sections?: Partial<CauseSection>[] };

const messages = {
  create: {
    location: "Enter your location to continue",
    goalRequired: "Funding goal is required",
    goalInvalid: "Please enter a valid amount",
  },
  edit: {
    location: "Select a valid location from the suggestions",
    goalRequired: "Goal amount is required",
    goalInvalid: "Goal amount must be greater than 0",
  },
} as const;

export function mediaBytes(items: (File | string)[]) {
  return items.reduce(
    (total, item) => total + (typeof item === "string" ? 0 : item.size),
    0,
  );
}

function causeSchema(mode: CauseFormMode) {
  const text = messages[mode];
  return z
    .object({
      title: z
        .string()
        .refine((value) => value.trim(), "Title is required")
        .refine(
          (value) => value.length >= 5,
          "Title must be at least 5 characters long",
        ),
      category: z.string().min(1, "Category is required"),
      summary: z.string().max(200, "Summary must be less than 200 characters"),
      location: z
        .string()
        .refine((value) => value.trim(), text.location)
        .refine(
          (value) => value.trim().length <= 100,
          "Location must be less than 100 characters",
        ),
      goal: z
        .string()
        .min(1, text.goalRequired)
        .refine((value) => Number(value) > 0, text.goalInvalid),
      coverImage: z
        .custom<File | null>()
        .refine(
          (value) => mode === "edit" || Boolean(value),
          "Cover image is required",
        ),
      startDate: z.date({ message: "Start date is required" }),
      endDate: z.date({ message: "End date is required" }),
      sections: z.array(
        z.object({
          heading: z.string().refine((v) => v.trim(), "Heading is required"),
          description: z
            .string()
            .refine((v) => v.trim(), "Sub-description is required"),
        }),
      ),
      multimedia: z
        .array(z.custom<File | string>())
        .refine(
          (items) => mediaBytes(items) <= MAX_TOTAL_MEDIA_BYTES,
          "Total multimedia size must be less than 100MB",
        ),
    })
    .superRefine((values, ctx) => {
      const days = differenceInDays(values.endDate, values.startDate);
      if (days > MAX_DURATION_DAYS) {
        ctx.addIssue({
          code: "custom",
          path: ["endDate"],
          message: `Cause duration cannot exceed ${MAX_DURATION_DAYS} days`,
        });
      }
      if (days < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["endDate"],
          message: "End date must be after start date",
        });
      }
    });
}

const schemas = { create: causeSchema("create"), edit: causeSchema("edit") };

/** Validates the whole form and returns the first message per field. */
export function validateCauseForm(
  values: CauseFormValues,
  mode: CauseFormMode,
): CauseFormErrors {
  const result = schemas[mode].safeParse(values);
  if (result.success) return {};

  const errors: CauseFormErrors = {};
  for (const issue of result.error.issues) {
    const [key, index, field] = issue.path;
    if (key === "sections" && typeof index === "number") {
      const sections = (errors.sections ??= values.sections.map(
        (): Partial<CauseSection> => ({}),
      ));
      sections[index][field as keyof CauseSection] ??= issue.message;
    } else if (typeof key === "string") {
      const name = key as Exclude<keyof CauseFormErrors, "sections">;
      errors[name] ??= issue.message;
    }
  }
  return errors;
}

export function hasCauseErrors(errors: CauseFormErrors) {
  return Object.entries(errors).some(([key, value]) =>
    key === "sections"
      ? (value as Partial<CauseSection>[]).some(
          (section) => Object.keys(section).length > 0,
        )
      : value !== undefined,
  );
}

/** Which error keys block each wizard step (steps 5 has none). */
export const stepErrorKeys: Record<number, (keyof CauseFormErrors)[]> = {
  1: ["title", "location", "category", "goal"],
  2: ["sections"],
  3: ["startDate", "endDate"],
  4: ["coverImage"],
};

export function stepHasErrors(errors: CauseFormErrors, step: number) {
  return (stepErrorKeys[step] ?? []).some((key) =>
    key === "sections"
      ? (errors.sections ?? []).some((s) => s.heading || s.description)
      : errors[key],
  );
}
