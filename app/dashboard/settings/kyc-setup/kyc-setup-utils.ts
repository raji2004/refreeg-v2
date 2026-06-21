import type { KycVerification } from "@/types/kyc-types";

export type KycFormData = {
  firstName: string;
  lastName: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postal: string;
  country: string;
};

export const EMPTY_KYC_FORM: KycFormData = {
  firstName: "",
  lastName: "",
  dobDay: "",
  dobMonth: "",
  dobYear: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  postal: "",
  country: "",
};

export type KycDraftState = {
  formData: KycFormData;
  selectedDoc: string;
  step: number;
};

export function buildFormDataFromRejectedKyc(
  status: KycVerification,
): KycFormData {
  const dobString = status.dob || "";
  const dobParts = dobString.split("-");
  const year = dobParts[0] || "";
  const month = dobParts[1] ? parseInt(dobParts[1], 10).toString() : "";
  const day = dobParts[2] ? parseInt(dobParts[2], 10).toString() : "";

  const fullName = status.full_name || "";
  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  return {
    firstName,
    lastName,
    dobDay: day,
    dobMonth: month,
    dobYear: year,
    phone: status.phone || "",
    address: status.address || "",
    city: status.city || "",
    state: status.state || "",
    postal: status.postal || "",
    country: status.country || "",
  };
}

export function loadKycDraftFromStorage(): KycDraftState | null {
  if (typeof window === "undefined") return null;

  try {
    const draft = localStorage.getItem("kycDraft");
    if (!draft) return null;

    if (draft.includes('{"name":')) {
      console.warn("[KYC Setup] Detected corrupted KYC draft, clearing...");
      localStorage.removeItem("kycDraft");
      return null;
    }

    const parsedDraft = JSON.parse(draft);
    if (!parsedDraft || typeof parsedDraft !== "object") return null;

    const nextFormData = { ...EMPTY_KYC_FORM, ...(parsedDraft.formData ?? {}) };
    if (
      nextFormData.country &&
      typeof nextFormData.country === "object"
    ) {
      nextFormData.country =
        (nextFormData.country as { name?: string }).name || "";
    }

    return {
      formData: nextFormData,
      selectedDoc: parsedDraft.selectedDoc || "",
      step: typeof parsedDraft.step === "number" ? parsedDraft.step : 0,
    };
  } catch (err) {
    console.error("[KYC Setup] Failed to parse kycDraft from localStorage:", err);
    localStorage.removeItem("kycDraft");
    return null;
  }
}

export function persistKycDraft(draft: KycDraftState) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    "kycDraft",
    JSON.stringify({
      ...draft,
      timestamp: new Date().toISOString(),
    }),
  );
}

export function clearKycDraft() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("kycDraft");
}

export function resolveInitialKycState(
  rejectedKyc: KycVerification | null,
): KycDraftState {
  const savedDraft = loadKycDraftFromStorage();
  if (savedDraft) {
    console.log("[KYC Setup] Loaded draft from localStorage:", savedDraft);
    return savedDraft;
  }

  if (rejectedKyc) {
    const rejectedState = {
      formData: buildFormDataFromRejectedKyc(rejectedKyc),
      selectedDoc: rejectedKyc.document_type || "",
      step: 0,
    };
    console.log("[KYC Setup] Prefilled from rejected KYC submission:", {
      rejectedKyc,
      rejectedState,
    });
    return rejectedState;
  }

  console.log("[KYC Setup] No draft or rejected KYC data, using empty form");
  return {
    formData: EMPTY_KYC_FORM,
    selectedDoc: "",
    step: 0,
  };
}
