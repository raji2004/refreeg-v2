export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  phone: string | null;
  location?: string | null;
  account_number: string | null;
  bank_name: string | null;
  account_name: string | null;
  sub_account_code: string | null;
  profile_photo: string | null;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
  country_of_residence?: string;
  date_of_birth?: string;
  bvn?: number;
  nin?: number;
  pin?: number;
  donation_preference?: string;
  is_verified?: boolean;
  followers_count?: number;
  following_count?: number;
  causes_count?: number;
  account_type?: "individual" | "creator" | "non-profit" | "organization" | "community" | "developer";
  gender?: string | null;
  bio: string | null;
  solana_wallet?: string | null;
  social_media?: {
    twitter?: string | null;
    facebook?: string | null;
    instagram?: string | null;
    linkedin?: string | null;
  };
  twitter_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  crypto_wallets?: {
    ethereum?: string;
    solana?: string;
    [key: string]: any;
  } | null;
}

export interface OnboardingProfileData {
  firstName: string;
  lastName: string;
  username: string;
  location: string;
  phone: string;
  email: string;
  profilePhoto?: File | null;
  accountType: string;
  gender: string;
}
