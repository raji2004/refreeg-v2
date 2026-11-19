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
  /** Cached Didit decision fields written by the webhook for the admin queue. */
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
  faceMatchScore: number | null;
  checksPassed: number | null;
  checksTotal: number | null;
  submittedAt: string;
}
