import type { DecisionSummary, RecordCheckRow } from "@/lib/didit";

export type KycStatus =
  "pending" | "in_progress" | "approved" | "rejected" | "resubmitted";

export interface KycVerification {
  id: string;
  user_id: string;
  document_type: string;
  document_url: string;
  status: KycStatus;
  verification_notes?: string;
  full_name?: string;
  dob?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal?: string;
  country?: string;
  face_match_score?: number | null;
  id_type?: string | null;
  id_number?: string | null;
  checks_passed?: number | null;
  checks_total?: number | null;
  created_at: string;
  updated_at: string;
}

export type KycQueueTab =
  "needs-review" | "resubmitted" | "approved" | "rejected";

export interface KycQueueItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  status: KycStatus;
  idLabel: string;
  idType: string | null;
  idNumber: string | null;
  faceMatchScore: number | null;
  checksPassed: number | null;
  checksTotal: number | null;
  submittedAt: string;
}

export type PendingReferralRow = {
  id_v1: string;
  referrer_id_v1: string;
};

export type AdminKycRow = {
  id: string;
  user_id: string;
  status: string;
  document_type: string;
  id_type: string | null;
  id_number: string | null;
  face_match_score: number | null;
  checks_passed: number | null;
  checks_total: number | null;
  created_at: Date | null;
  full_name: string | null;
  email: string | null;
  profile_name: string | null;
};

export interface AdminKycQueueSnapshot {
  items: KycQueueItem[];
  counts: Record<KycQueueTab, number>;
  nextReviewUserId: string | null;
  error: string | null;
}

export interface AdminKycNeighbors {
  prevUserId: string | null;
  nextUserId: string | null;
  error: string | null;
}

export interface AdminKycDetail {
  kyc: KycVerification | null;
  profile: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
    createdAt: string | null;
  } | null;
  decision: DecisionSummary | null;
  decisionError: string | null;
  attempts: number;
  recordRows: RecordCheckRow[];
  recordSource: string | null;
  error: string | null;
}
