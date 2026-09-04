import type {
  PetitionStatus,
  Category,
  subHeadings,
  subHeadingWithSubDescription,
} from "./common-types";

export interface Petition {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  goal: number;
  raised: number;
  signatures?: number;
  status: PetitionStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  image?: string | null;
  days_active?: number | null;
  profiles?: {
    full_name: string;
    email: string;
    profile_photo?: string | null;
    is_verified?: boolean;
  };
  sections?: { heading: string; description: string }[];
  multimedia?: string[];
  video_links?: string[];
}
export interface PetitionWithUser extends Petition {
  user: {
    name: string;
    email: string;
    sub_account_code?: string;
  };
}

export interface PetitionFormData {
  title: string;
  description: string;
  category: string;
  goal: string | number;
  coverImage: File | null;
  image?: string;
  multimedia?: File[];
  sections?: { heading: string; description: string }[];
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  video_links?: string[];
}
export interface PetitionFilterOptions {
  category?: string;
  status?: PetitionStatus;
  userId?: string;
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: "recommended" | "latest" | "most-funded" | "ending-soon";
  verifiedOnly?: boolean;
}
