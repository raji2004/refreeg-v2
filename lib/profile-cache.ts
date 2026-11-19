import { cache } from "react";
import { getProfile } from "@/actions/users/profile-actions";

export const getCachedProfile = cache(getProfile);
