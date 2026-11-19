"use client";

import {
  SignupScreen,
  type SignupVariant,
} from "@/components/auth/signup-screen";

const variant: SignupVariant = {
  accountType: "organization",
  prefetchPath: "/auth/signup",
  markOrganizationIntent: true,
  brand: {
    headline: "Built for verified, transparent impact.",
    subtitle:
      "Give your organization verifiable disbursement milestones and real-time public accounting.",
    checklist: [
      {
        title: "Transparent accountability",
        description: "Publish proof of impact before project tranches unlock.",
      },
      {
        title: "Community trust & pledges",
        description: "Pledges are only charged when milestones are verified.",
      },
      {
        title: "Instant verification",
        description:
          "Admin workspace ready immediately after email confirmation.",
      },
    ],
    testimonial: {
      avatarInitials: "HI",
      quote:
        "RefreeG gave our NGO the transparency we needed to raise funds with absolute credibility.",
      author: "Hope Initiative · Abuja",
    },
  },
  title: "Create an organization account",
  switchPrompt: {
    text: "Signing up as an individual?",
    linkLabel: "Sign up here",
    href: "/auth/signup",
  },
  divider: "Or register with Org email",
  emailLabel: "Org Email Address",
  emailPlaceholder: "admin@organization.org",
  submitAriaLabel: "Create organization account",
  trustNote:
    "Your email secures your workspace and verifies organization actions. It is never shown publicly.",
  creating: {
    title: "Creating organization account...",
    description: "Setting up your workspace.",
  },
  codeSentDescription: "We've sent a 6-digit code to verify your admin email.",
  reviewDescription: "Correct the organization details and try again.",
  fallbackError: "Could not create organization account",
};

export default function OrganizationSignUpPage() {
  return <SignupScreen variant={variant} />;
}
