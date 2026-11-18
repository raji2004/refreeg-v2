import { z } from "zod";
import { differenceInDays } from "date-fns";

export const MAX_PETITION_DURATION_DAYS = 180;
export const MAX_PETITION_FILES = 5;
export const MAX_PETITION_MEDIA_BYTES = 100 * 1024 * 1024;

export type PetitionFormMode = "create" | "edit";

export type PetitionSection = { heading: string; description: string };

export type PetitionFormFields = {
  title: string;
  category: string;
  goal: string;
  coverImage: File | null;
  /** Saved cover on an existing petition; empty when creating. */
  image: string;
  sections: PetitionSection[];
  startDate: Date | undefined;
  endDate: Date | undefined;
  multimedia: File[];
  videoLinks: string[];
};

export function mediaBytes(files: File[]) {
  return files.reduce((total, file) => total + file.size, 0);
}

function goalSchema(mode: PetitionFormMode) {
  return z.string().superRefine((value, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });

    if (mode === "edit") {
      if (!value) return fail("Goal amount is required");
      if (Number(value) <= 0) return fail("Goal amount must be greater than 0");
      return;
    }

    if (!value.trim()) return fail("Petition goal is required");
    const goal = Number(value);
    if (Number.isNaN(goal)) return fail("Goal must be a valid number");
    if (goal <= 0) return fail("Goal must be greater than zero");
    if (goal < 10) return fail("Goal must be at least 10 signatures");
  });
}

function petitionSchema(mode: PetitionFormMode) {
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
      goal: goalSchema(mode),
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
          heading: z
            .string()
            .refine((value) => value.trim(), "Heading is required"),
          description: z
            .string()
            .refine((value) => value.trim(), "Sub-description is required"),
        }),
      ),
      multimedia: z
        .array(z.custom<File>())
        .refine(
          (files) =>
            mode === "edit" || mediaBytes(files) <= MAX_PETITION_MEDIA_BYTES,
          "Total multimedia size must be less than 100MB",
        ),
    })
    .superRefine((values, ctx) => {
      const days = differenceInDays(values.endDate, values.startDate);
      if (days > MAX_PETITION_DURATION_DAYS) {
        ctx.addIssue({
          code: "custom",
          path: ["endDate"],
          message: `Petition duration cannot exceed ${MAX_PETITION_DURATION_DAYS} days`,
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

export const petitionSchemas = {
  create: petitionSchema("create"),
  edit: petitionSchema("edit"),
};

/** Fields that block each wizard step (the review step has none). */
const stepFields: Record<number, string[]> = {
  1: ["title", "category", "goal"],
  2: ["sections"],
  3: ["startDate", "endDate"],
  4: ["coverImage"],
};

export function stepHasErrors(
  values: PetitionFormFields,
  mode: PetitionFormMode,
  step: number,
) {
  const result = petitionSchemas[mode].safeParse(values);
  if (result.success) return false;
  const failed = new Set(result.error.issues.map((issue) => issue.path[0]));
  return (stepFields[step] ?? []).some((field) => failed.has(field));
}
