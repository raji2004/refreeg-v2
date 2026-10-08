export type CampaignStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface CampaignLineItem {
  id: string;
  label: string;
  quantity: number;
  unitPrice: number;
}

export interface CampaignStorySection {
  id: string;
  heading: string;
  description: string;
}

export interface CampaignAiChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  options?: string[];
  fieldKey?: keyof CampaignDraftData;
}

export interface CampaignDraftData {
  // Step 1: Cause
  intakeMode: "ai_chat" | "manual";
  category: string;
  entityType: "myself" | "organization" | "community";
  locationCity: string;
  locationArea: string;
  fullLocation: string;
  aiChatHistory: CampaignAiChatMessage[];
  currentAiQuestionIndex: number;

  // Step 2: Story
  title: string;
  summary: string;
  sections: CampaignStorySection[];
  suggestedParagraph: string | null;
  suggestedParagraphContext: string | null;

  // Step 3: Target & Timeline
  lineItems: CampaignLineItem[];
  customGoalAmount: number | null;
  currency: string;
  startDate: string;
  endDate: string;
  donorPerkDescription: string;

  // Step 4: Photos & Documents
  coverImage: File | string | null;
  coverImagePreview: string | null;
  galleryImages: (File | string)[];
  galleryImagePreviews: string[];
  documents: (File | string)[];
  documentNames: string[];

  // Step 5: Payout
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  agreedToTranches: boolean;

  // Step 6: Proof & Verification
  diditSessionId: string | null;
  isIdentityVerified: boolean;
  identityVerificationDetails: {
    level: number;
    confirmedAt?: string;
    ninLastDigits?: string;
  } | null;
  associationLetter: File | string | null;
  associationLetterName: string | null;
  eventProof: File | string | null;
  eventProofName: string | null;
  witnessPhone1: string;
  witnessPhone2: string;

  // Flow State
  currentStep: number;
  lastCompletedStep: number;
  publishedCauseId: string | null;
  publishedSlug: string | null;
}

export interface CampaignFlowErrors {
  category?: string;
  location?: string;
  title?: string;
  story?: string;
  goal?: string;
  coverImage?: string;
  payout?: string;
  proof?: string;
}
