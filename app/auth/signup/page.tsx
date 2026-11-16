"use client";

import {
  SignupScreen,
  type SignupVariant,
} from "@/components/auth/signup-screen";

const variant: SignupVariant = {
  accountType: "individual",
  prefetchPath: "/auth/signup/organization",
  brand: {
    headline: "You'll see exactly where it went.",
    subtitle:
      "Two minutes to set up. Nothing is charged until you choose a campaign and an amount.",
    checklist: [
      {
        title: "Receipts, not promises",
        description: "Organisers upload proof before the next tranche unlocks.",
      },
      {
        title: "Pledge now, pay on trigger",
        description:
          "Your card is only charged when a campaign can actually work.",
      },
      {
        title: "150 EIZA to start",
        description: "Credited once your email is verified.",
      },
    ],
    testimonial: {
      avatarInitials: "NB",
      quote: "My aunt trades at Mile-12. She got the grant. I saw the receipt.",
      author: "Ngozi B. · Lagos",
    },
  },
  title: "Create your account",
  switchPrompt: {
    text: "Registering as an organization?",
    linkLabel: "Create an organization account",
    href: "/auth/signup/organization",
  },
  divider: "Or use your email",
  emailLabel: "Email Address",
  emailPlaceholder: "name@example.com",
  submitAriaLabel: "Sign Up",
  trustNote:
    "Your email secures your account and confirms petition signatures. It is never shown publicly.",
  creating: {
    title: "Creating your account...",
    description: "Setting up your RefreeG account.",
  },
  codeSentDescription: "We've sent a 6-digit code to verify your email.",
  reviewDescription: "Correct the signup information and try again.",
  fallbackError: "Could not create account",
};

export default function SignUpPage() {
  return <SignupScreen variant={variant} />;
}
