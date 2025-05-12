import { Profile } from "./profile-types";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Status types
export type CauseStatus = "pending" | "approved" | "rejected";
export type DonationStatus = "pending" | "completed" | "failed";

// Form data types
export interface ProfileFormData {
  name: string;
  phone: string;
  profile_photo?: string | null;
  email: string;
}

export interface BankDetailsFormData {
  accountNumber: string;
  bankName: string;
  accountName: string;
  sub_account_code: string;
}

export interface CauseSection {
  heading: string;
  description: string;
}

export interface CauseFormData {
  title: string;
  description: string;
  category: string;
  goal: string | number;
  coverImage: File | null;
  image?: string;
  sections: CauseSection[];
}

export interface DonationFormData {
  amount: string | number;
  name: string;
  email: string;
  message: string;
  isAnonymous: boolean;
}

export interface TransactionData
  extends Pick<Profile, "email" | "full_name" | "id"> {
  amount: number;
  serviceFee: number;
  causeId: string;
  message: string;
  isAnonymous: boolean;
  subaccounts: {
    subaccount: string;
    share: number;
  }[];
}

export interface ICreateSubaccount {
  bank_code: string;
  account_number: string;
  percentage_charge?: number;
  business_name: string;
}

// Filter options
export interface CauseFilterOptions {
  category?: string;
  status?: CauseStatus;
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface Cause {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  goal: number;
  raised: number;
  status: CauseStatus;
  image: string | null;
  created_at: string;
  updated_at: string;
  sections?: CauseSection[];
}

export interface CauseWithUser extends Cause {
  user: {
    name: string;
    email: string;
  };
  sections: CauseSection[];
}
