import { Profile } from "./profile-types";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CauseStatus = "pending" | "approved" | "rejected" | "expired";
export type PetitionStatus = "pending" | "approved" | "rejected" | "expired";
export type DonationStatus = "pending" | "completed" | "failed";
export type SignatureStatus = "pending" | "signed" | "rejected";

export interface ProfileFormData {
  name: string;
  phone: string;
  profile_photo?: string | null;
  email: string;
  bio: string;
  account_type?:
    | "individual"
    | "creator"
    | "non-profit"
    | "organization"
    | "community"
    | "developer"
    | null;
  twitter_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  username?: string;
}
export interface BankDetailsFormData {
  accountNumber: string;
  bankName: string;
  accountName: string;
  sub_account_code: string;
}

// FormData removed - moved to specialized type files

export interface DonationFormData {
  amount: string | number;
  name: string;
  email: string;
  message: string;
  isAnonymous: boolean;
  tip_amount?: number;
}

export interface SignatureFormData {
  amount: string | number;
  name: string;
  email: string;
  message: string;
  isAnonymous: boolean;
}

export interface TransactionData
  extends Partial<Pick<Profile, "email" | "full_name" | "id">> {
  amount: number;
  serviceFee: number;
  tipAmount?: number;
  causeId: string;
  message: string;
  isAnonymous: boolean;
  plan?: string;
  callbackUrl?: string;
  subaccounts: {
    subaccount: string;
    share: number;
  }[];
  /** Paystack: save card for future pledge charge */
  pledgeFlow?: "authorization";
  pledgeId?: string;
  pledgeFutureAmount?: number;
  reminderDate?: string;
}

export interface ICreateSubaccount {
  bank_code: string;
  account_number: string;
  percentage_charge?: number;
  business_name: string;
}

// CauseFilterOptions removed - moved to cause-types.ts

export interface Comment {
  id: string;
  cause_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  parent_id: string | null;
  user: {
    full_name: string | null;
    profile_photo: string | null;
    username?: string | null;
  };
  replies?: Comment[];
  replies_count?: number;
}

export interface Event {
  id: string;
  user_id: string;
  event_type:
    | "comment"
    | "share"
    | "donation"
    | "login"
    | "weekly_streak"
    | "monthly_active";
  metadata: Record<string, any>;
  created_at: string;
}

export interface RewardEvent {
  type:
    | "comment"
    | "share"
    | "donation"
    | "login"
    | "weekly_streak"
    | "monthly_active";
  userId: string;
  amount?: number;
  metadata?: Record<string, any>;
}

export interface RewardTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  event_id: string;
  status: "completed" | "pending" | "failed";
  created_at: string;
  updated_at?: string;
}

export interface UserWallet {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface UserStreak {
  id: string;
  user_id: string;
  weekly_streak: number;
  is_monthly_active: boolean;
  last_active_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface subHeadings {
  id: string;
  title: string;
  cause_id?: string;
  petition_id?: string;
  created_at: string;
}

export interface subDescription {
  id: string;
  description: string;
  sub_heading_id: string;
  created_at: string;
}

export interface subHeadingWithSubDescription extends subHeadings {
  sub_description: subDescription[];
}
