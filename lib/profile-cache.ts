import { cache } from "react";
import { getProfile } from "@/actions/profile-actions";

export const getCachedProfile = cache(getProfile);
