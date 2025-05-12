import type { CauseStatus } from "./common-types"

// Cause
export interface Cause {
  id: string
  user_id: string
  title: string
  description: string
  category: string
  goal: number
  raised: number
  status: CauseStatus
  rejection_reason: string | null
  created_at: string
  updated_at: string
  image?: string | null
  profiles?: {
    full_name: string
    email: string
  }
}
export interface subHeadings{
  id: string
  title: string
  cause_id: string
  created_at: string
}
export interface subDescription{
  id: string
  description: string
  sub_heading_id: string
  created_at: string
}
export interface subHeadingWithSubDescription extends subHeadings{
  sub_description: subDescription[]
}
export interface CauseWithSubHeading extends Cause{
  sub_heading: subHeadingWithSubDescription[]
}

// Cause with user information
export interface CauseWithUser extends Cause {
  user: {
    name: string
    email: string
  }
}

// Category
export interface Category {
  id: string
  name: string
}

// Cause form data
export interface CauseFormData {
  title: string
  description: string
  category: string
  goal: string | number
  currency: string
  coverImage: File | null
}

