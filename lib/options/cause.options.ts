import type { Option } from "@/types/options";

export const causeCurrencyOptions = [
  { label: "Naira (₦)", value: "NGN" },
] as const satisfies readonly Option[];

export const causeSteps = [
  "Basic Info",
  "Story",
  "Timeline",
  "Media",
  "Review",
];

export const createCauseStepMeta = [
  {
    title: "Start with the basics",
    description:
      "Give supporters a clear snapshot of what you are raising money for.",
  },
  {
    title: "Tell your story",
    description:
      "Add sections so supporters understand who this helps and why.",
  },
  {
    title: "Set your timeline",
    description:
      "Choose when fundraising starts and ends. Campaigns can run for up to 180 days.",
  },
  {
    title: "Add campaign media",
    description:
      "Choose a strong cover image, then add photos or short videos that build trust.",
  },
  {
    title: "Review your cause",
    description:
      "Check the details supporters will see before sending your cause for review.",
  },
] as const;

export const editCauseStepMeta = [
  {
    title: "Basic information",
    description: "Update the essentials supporters see first.",
  },
  {
    title: "Your story",
    description: "Update your sections to keep your supporters informed.",
  },
  {
    title: "Campaign timeline",
    description:
      "Adjust your campaign duration. Max duration remains 180 days from start.",
  },
  {
    title: "Visual impact",
    description:
      "Update your visuals. High-quality media significantly increases engagement.",
  },
  {
    title: "Review your changes",
    description:
      "Review how your updated cause will look. Changes will be submitted for review.",
  },
] as const;
