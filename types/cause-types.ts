import type {
  CauseStatus,
  Category,
  subHeadings,
  subHeadingWithSubDescription,
} from "./common-types";

export interface Cause {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  goal: number;
  raised: number;
  status: CauseStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  image?: string | null;
  days_active?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  multimedia?: string[];
  video_links?: string[];
  sections?: { heading: string; description: string }[];
  trust_score?: {
    impact: string;
    readability: string;
    transparency: string;
  };
  verified_status?: "verified" | "in_review" | "pending";
  summary?: string | null;
  location?: string | null;
  faqs?: { question: string; answer: string }[];
  profiles?: {
    full_name: string;
    email: string;
    profile_photo: string | null;
  };
}
export interface CauseWithSubHeading extends Cause {
  sub_heading: subHeadingWithSubDescription[];
}

export interface CauseWithUser extends Cause {
  user: {
    name: string;
    email: string;
    sub_account_code?: string;
    username: string;
    profile_photo?: string | null;
  };
  isFollowing?: boolean;
}

export interface CauseFormData {
  title: string;
  description?: string;
  category: string;
  goal: string | number;
  currency: string;
  coverImage: File | null;
  image?: string;
  sections?: { heading: string; description: string }[];
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  multimedia: (File | string)[];
  video_links?: string[];
  summary?: string | null;
  location?: string | null;
}
export interface CauseFilterOptions {
  category?: string;
  status?: CauseStatus;
  userId?: string;
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: "recommended" | "latest" | "most-funded" | "ending-soon";
}
