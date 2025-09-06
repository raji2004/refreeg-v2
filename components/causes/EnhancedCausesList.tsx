"use client";

import React, { useState } from "react";
import { EnhancedCauseCard } from "./EnhancedCauseCard";
import { PaginationButton } from "@/components/pagination-button";
import { getCurrentUser, getProfile } from "@/actions";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

interface Cause {
  id: string;
  title: string;
  description: string;
  category: string;
  goal: number;
  raised: number;
  image?: string | null;
  days_active?: number | null;
  status: string;
  user: {
    full_name: string;
    sub_account_code?: string;
  };
}

interface EnhancedCausesListProps {
  causes: Cause[];
  currentPage: number;
  totalPages: number;
}

export function EnhancedCausesList({ 
  causes, 
  currentPage, 
  totalPages 
}: EnhancedCausesListProps) {
  const { user, isLoading: userLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Fetch user profile when user is available
  React.useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const userProfile = await getProfile(user.id);
          setProfile(userProfile);
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      }
      setProfileLoading(false);
    };

    fetchProfile();
  }, [user]);

  if (userLoading || profileLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array(6).fill(null).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-[200px] w-full rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (causes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">📋</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No causes found</h3>
        <p className="text-gray-500">
          Try adjusting your filters or check back later for new causes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {causes.map((cause) => (
          <EnhancedCauseCard
            key={cause.id}
            cause={cause}
            profile={profile}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center pt-6">
          <PaginationButton currentPage={currentPage} totalPages={totalPages} />
        </div>
      )}
    </div>
  );
}
