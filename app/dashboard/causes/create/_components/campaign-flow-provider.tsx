"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import {
  CampaignDraftData,
  CampaignLineItem,
  CampaignStep,
  CampaignFlowErrors,
} from "./types";

const DRAFT_STORAGE_KEY = "refreeg_campaign_draft_v2";

const DEFAULT_LINE_ITEMS: CampaignLineItem[] = [
  { id: "item-1", label: "Stall restock", quantity: 42, unitPrice: 180000 },
];

const INITIAL_DRAFT_STATE: CampaignDraftData = {
  intakeMode: "ai_chat",
  category: "Small business",
  entityType: "myself",
  locationCity: "Lagos",
  locationArea: "Ladipo",
  fullLocation: "Lagos, Ladipo",
  aiChatHistory: [
    {
      id: "msg-1",
      sender: "ai",
      text: "Who or what will the money help, and where are they?",
      options: [
        "42 market stall owners in Ladipo",
        "Displaced families in Maiduguri",
        "Community clinic in Ibadan",
      ],
      fieldKey: "summary",
    },
  ],
  currentAiQuestionIndex: 1,

  title: "Restock 42 stalls after the Ladipo fire",
  summary:
    "Forty-two women lost everything in the Ladipo market fire. We are restocking stalls with goods, tables, and working equipment.",
  sections: [
    {
      id: "sec-1",
      heading: "What happened",
      description:
        "On 18 December a fire went through the Ladipo foodstuff line. Forty-two women lost everything they were trading with, and most had no insurance.",
    },
    {
      id: "sec-2",
      heading: "How funds are spent",
      description:
        "₦180,000 restocks one stall — rice, oil, tomatoes and a table. We have a costed list from the market association and we will publish receipts as each stall reopens.",
    },
  ],
  suggestedParagraph: null,
  suggestedParagraphContext: null,

  lineItems: DEFAULT_LINE_ITEMS,
  customGoalAmount: null,
  currency: "NGN",
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
  donorPerkDescription:
    "A bag of rice and a crate of tomatoes for one stall. Shown on the campaign card.",

  coverImage: null,
  coverImagePreview: null,
  galleryImages: [],
  galleryImagePreviews: [],
  documents: [],
  documentNames: [],

  bankCode: "",
  bankName: "",
  accountNumber: "",
  accountName: "",
  agreedToTranches: false,

  diditSessionId: null,
  isIdentityVerified: false,
  identityVerificationDetails: null,
  associationLetter: null,
  associationLetterName: null,
  eventProof: null,
  eventProofName: null,
  witnessPhone1: "",
  witnessPhone2: "",

  currentStep: 1,
  lastCompletedStep: 1,
  publishedCauseId: null,
  publishedSlug: null,
};

interface CampaignFlowContextType {
  draft: CampaignDraftData;
  errors: CampaignFlowErrors;
  totalGoal: number;
  isLoaded: boolean;
  updateDraft: (updates: Partial<CampaignDraftData>) => void;
  goToStep: (step: CampaignStep) => void;
  nextStep: () => boolean;
  prevStep: () => void;
  addLineItem: (item?: Partial<CampaignLineItem>) => void;
  updateLineItem: (id: string, updates: Partial<CampaignLineItem>) => void;
  removeLineItem: (id: string) => void;
  addStorySection: (heading?: string, description?: string) => void;
  updateStorySection: (
    id: string,
    heading: string,
    description: string,
  ) => void;
  removeStorySection: (id: string) => void;
  applySuggestedParagraph: (targetSectionIndex?: number) => void;
  discardSuggestedParagraph: () => void;
  setFieldError: (field: keyof CampaignFlowErrors, error?: string) => void;
  clearErrors: () => void;
  resetDraft: () => void;
}

const CampaignFlowContext = createContext<CampaignFlowContextType | null>(null);

export function CampaignFlowProvider({
  children,
  initialUserKyc,
  initialBankInfo,
}: {
  children: React.ReactNode;
  initialUserKyc?: { isVerified: boolean; details?: any };
  initialBankInfo?: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
  };
}) {
  const [draft, setDraft] = useState<CampaignDraftData>(INITIAL_DRAFT_STATE);
  const [errors, setErrors] = useState<CampaignFlowErrors>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Hydrate from localStorage once on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setDraft((prev) => ({
          ...prev,
          ...parsed,
          // Retain server-verified status if available
          isIdentityVerified:
            initialUserKyc?.isVerified ?? parsed.isIdentityVerified ?? false,
          identityVerificationDetails:
            initialUserKyc?.details ??
            parsed.identityVerificationDetails ??
            null,
          bankName: initialBankInfo?.bankName || parsed.bankName || "",
          accountNumber:
            initialBankInfo?.accountNumber || parsed.accountNumber || "",
          accountName: initialBankInfo?.accountName || parsed.accountName || "",
        }));
      } else {
        if (initialUserKyc?.isVerified) {
          setDraft((prev) => ({
            ...prev,
            isIdentityVerified: true,
            identityVerificationDetails: initialUserKyc.details,
          }));
        }
        if (initialBankInfo) {
          setDraft((prev) => ({
            ...prev,
            bankName: initialBankInfo.bankName || "",
            accountNumber: initialBankInfo.accountNumber || "",
            accountName: initialBankInfo.accountName || "",
          }));
        }
      }
    } catch (e) {
      console.warn("Failed to load campaign draft from localStorage", e);
    } finally {
      setIsLoaded(true);
    }
  }, [initialUserKyc, initialBankInfo]);

  // Autosave to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      // Exclude File objects from JSON persistence
      const {
        coverImage,
        galleryImages,
        documents,
        associationLetter,
        eventProof,
        ...serializable
      } = draft;
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(serializable));
    } catch (e) {
      console.warn("Failed to save campaign draft to localStorage", e);
    }
  }, [draft, isLoaded]);

  const updateDraft = useCallback((updates: Partial<CampaignDraftData>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  }, []);

  const totalGoal = useMemo(() => {
    if (draft.customGoalAmount && draft.customGoalAmount > 0) {
      return draft.customGoalAmount;
    }
    if (draft.lineItems && draft.lineItems.length > 0) {
      return draft.lineItems.reduce(
        (acc, item) => acc + item.quantity * item.unitPrice,
        0,
      );
    }
    return 0;
  }, [draft.customGoalAmount, draft.lineItems]);

  const setFieldError = useCallback(
    (field: keyof CampaignFlowErrors, error?: string) => {
      setErrors((prev) => ({ ...prev, [field]: error }));
    },
    [],
  );

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const validateCurrentStep = useCallback((): boolean => {
    const errs: CampaignFlowErrors = {};
    const step = draft.currentStep;

    if (step === 1) {
      if (!draft.category) errs.category = "Please select a category";
      if (!draft.locationCity) errs.location = "City is required";
    } else if (step === 2) {
      if (!draft.title.trim() || draft.title.length < 5) {
        errs.title = "Title must be at least 5 characters long";
      }
      if (
        draft.sections.length === 0 ||
        !draft.sections[0].description.trim()
      ) {
        errs.story = "Please provide story details for donors";
      }
    } else if (step === 3) {
      if (totalGoal <= 0) {
        errs.goal = "Please specify target costs or a funding goal";
      }
    } else if (step === 4) {
      if (!draft.coverImage && !draft.coverImagePreview) {
        errs.coverImage = "A cover photo is required for your campaign card";
      }
    } else if (step === 5) {
      if (!draft.accountNumber) {
        errs.payout = "Please provide receiving account details";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [draft, totalGoal]);

  const goToStep = useCallback((targetStep: CampaignStep) => {
    setDraft((prev) => ({
      ...prev,
      currentStep: targetStep,
      lastCompletedStep: Math.max(prev.lastCompletedStep, targetStep),
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const nextStep = useCallback((): boolean => {
    if (!validateCurrentStep()) return false;
    if (draft.currentStep < 8) {
      goToStep((draft.currentStep + 1) as CampaignStep);
      return true;
    }
    return true;
  }, [draft.currentStep, validateCurrentStep, goToStep]);

  const prevStep = useCallback(() => {
    if (draft.currentStep > 1) {
      goToStep((draft.currentStep - 1) as CampaignStep);
    }
  }, [draft.currentStep, goToStep]);

  const addLineItem = useCallback((item?: Partial<CampaignLineItem>) => {
    const newItem: CampaignLineItem = {
      id: `item-${Date.now()}`,
      label: item?.label || "New expense item",
      quantity: item?.quantity || 1,
      unitPrice: item?.unitPrice || 10000,
    };
    setDraft((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem],
    }));
  }, []);

  const updateLineItem = useCallback(
    (id: string, updates: Partial<CampaignLineItem>) => {
      setDraft((prev) => ({
        ...prev,
        lineItems: prev.lineItems.map((item) =>
          item.id === id ? { ...item, ...updates } : item,
        ),
      }));
    },
    [],
  );

  const removeLineItem = useCallback((id: string) => {
    setDraft((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((item) => item.id !== id),
    }));
  }, []);

  const addStorySection = useCallback(
    (heading = "Additional information", description = "") => {
      const newSec = {
        id: `sec-${Date.now()}`,
        heading,
        description,
      };
      setDraft((prev) => ({
        ...prev,
        sections: [...prev.sections, newSec],
      }));
    },
    [],
  );

  const updateStorySection = useCallback(
    (id: string, heading: string, description: string) => {
      setDraft((prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === id ? { ...s, heading, description } : s,
        ),
      }));
    },
    [],
  );

  const removeStorySection = useCallback((id: string) => {
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== id),
    }));
  }, []);

  const applySuggestedParagraph = useCallback(
    (targetSectionIndex = 0) => {
      if (!draft.suggestedParagraph) return;
      setDraft((prev) => {
        const updated = [...prev.sections];
        if (updated[targetSectionIndex]) {
          updated[targetSectionIndex] = {
            ...updated[targetSectionIndex],
            description:
              `${updated[targetSectionIndex].description}\n\n${prev.suggestedParagraph}`.trim(),
          };
        } else {
          updated.push({
            id: `sec-${Date.now()}`,
            heading: "Contingency & Transparency",
            description: prev.suggestedParagraph!,
          });
        }
        return {
          ...prev,
          sections: updated,
          suggestedParagraph: null,
          suggestedParagraphContext: null,
        };
      });
    },
    [draft.suggestedParagraph],
  );

  const discardSuggestedParagraph = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      suggestedParagraph: null,
      suggestedParagraphContext: null,
    }));
  }, []);

  const resetDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setDraft(INITIAL_DRAFT_STATE);
    setErrors({});
  }, []);

  return (
    <CampaignFlowContext.Provider
      value={{
        draft,
        errors,
        totalGoal,
        isLoaded,
        updateDraft,
        goToStep,
        nextStep,
        prevStep,
        addLineItem,
        updateLineItem,
        removeLineItem,
        addStorySection,
        updateStorySection,
        removeStorySection,
        applySuggestedParagraph,
        discardSuggestedParagraph,
        setFieldError,
        clearErrors,
        resetDraft,
      }}
    >
      {children}
    </CampaignFlowContext.Provider>
  );
}

export function useCampaignFlow() {
  const context = useContext(CampaignFlowContext);
  if (!context) {
    throw new Error(
      "useCampaignFlow must be used within a CampaignFlowProvider",
    );
  }
  return context;
}
