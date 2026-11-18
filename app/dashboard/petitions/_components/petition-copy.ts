import type { PetitionFormMode } from "@/lib/schemas/petition.schema";

/** Wording that differs between the create and edit wizards. */
export const petitionCopy = {
  create: {
    title: "Launch Your Movement",
    description:
      "Create a compelling petition that inspires people to take action.",
    steps: ["Basic Info", "Petition Story", "Timeline", "Media", "Review"],
    basics: null,
    titlePlaceholder: "e.g., Justice for Peace Valley",
    goalPlaceholder: "e.g., 1000",
    storyTitle: "Petition Story",
    storyText:
      "Break down your petition into clear sections for better readability.",
    headingLabel: "Heading",
    headingPlaceholder: "e.g., The Current Situation",
    contentLabel: "Content",
    contentPlaceholder: "Explain this specific point in detail...",
    removeSection: "Delete",
    timelineTitle: "Petition Timeline",
    timelineText:
      "How long will you be collecting signatures? Max duration is 180 days.",
    startLabel: "Start Date",
    mediaText:
      "Visuals help people connect with your cause. High-quality media is key.",
    galleryLabel: "Multimedia Support",
    linksLabel: "Support Links (YouTube, TikTok, etc.)",
    addLink: "+ Add Video Link",
    linkPlaceholder: "Paste video link",
    submit: "Launch Petition",
    submitting: "Launching...",
  },
  edit: {
    title: "Edit Petition",
    description:
      "Refine your campaign to reach more supporters and achieve your goal.",
    steps: ["Basic Info", "Story", "Timeline", "Media", "Review"],
    basics: {
      title: "Basic Information",
      text: "Update the core details of your petition.",
    },
    titlePlaceholder: "Enter a clear, specific title",
    goalPlaceholder: "0",
    storyTitle: "Additional Sections",
    storyText:
      "Break down your petition into clear sections for better readability.",
    headingLabel: "Sub-heading",
    headingPlaceholder: "Enter sub-heading",
    contentLabel: "Sub-description",
    contentPlaceholder: "Enter sub-description",
    removeSection: "Remove",
    timelineTitle: "Campaign Timeline",
    timelineText: "Set active window. Max 180 days.",
    startLabel: "Launch Date",
    mediaText: "Update images and videos for your campaign.",
    galleryLabel: "Multimedia (Images)",
    linksLabel: "Support Links",
    addLink: "+ Add Link",
    linkPlaceholder: "Paste video link",
    submit: "Update Petition",
    submitting: "Saving...",
  },
} satisfies Record<PetitionFormMode, unknown>;

export type PetitionCopy = (typeof petitionCopy)[PetitionFormMode];
