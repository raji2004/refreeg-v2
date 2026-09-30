import { useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Share2, CheckCheck, Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SupportErrorCta } from "@/components/support-error-cta";
import { followCampaign } from "@/actions/cause-actions";
import type { Donor } from "../types/types";
import { fadeUp } from "../types/types";

export function CampaignHealthCard({
  donors,
  causeId,
  causePath,
  currentUserId,
  isFollowing,
}: {
  donors: Donor[];
  causeId: string;
  causePath: string;
  currentUserId?: string;
  isFollowing?: boolean;
}) {
  const recentDonors = useMemo(
    () =>
      donors.map((donor) => ({
        id: donor.id,
        name: donor.name || "Anonymous",
        amount: donor.amount || 0,
      })),
    [donors],
  );

  const [followed, setFollowed] = useState(isFollowing || false);
  const [followError, setFollowError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleFollow = () => {
    if (!currentUserId) {
      setShowLoginModal(true);
      return;
    }
    startTransition(async () => {
      setFollowError(null);
      const result = await followCampaign(causeId);
      if (result.error && result.error !== "unauthenticated") {
        setFollowError(result.error);
        setShowSupportModal(true);
      } else if (result.error === "unauthenticated") {
        setShowLoginModal(true);
      } else {
        setFollowed(true);
      }
    });
  };

  return (
    <motion.div
      className="rounded-[20px] border border-[#DDE3EA] bg-white p-6"
      variants={fadeUp}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
          Recent donors
        </p>
        <Share2 className="h-4 w-4 text-slate-400" />
      </div>
      <div className="mt-3 grid gap-3 text-sm text-slate-600">
        {recentDonors.length > 0 ? (
          <>
            {recentDonors.slice(0, 3).map((donor) => (
              <div key={donor.id} className="flex items-center justify-between">
                <span className="truncate pr-2">{donor.name}</span>
                <span className="shrink-0 font-medium text-emerald-600">
                  ₦{Number(donor.amount).toLocaleString()}
                </span>
              </div>
            ))}
            {recentDonors.length > 3 && (
              <details className="group border-t border-slate-100 pt-3">
                <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-bold text-[#235DA7]">
                  View all donors
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-3 grid gap-3">
                  {recentDonors.slice(3).map((donor) => (
                    <div
                      key={donor.id}
                      className="flex items-center justify-between"
                    >
                      <span className="truncate pr-2">{donor.name}</span>
                      <span className="shrink-0 font-medium text-emerald-600">
                        ₦{Number(donor.amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        ) : (
          <div className="text-sm text-slate-500">Be the first to donate.</div>
        )}
      </div>

      {followed ? (
        <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-[#C5E6A0] bg-[#EFF9E3] px-4 py-3 text-sm font-semibold text-[#31551A]">
          <CheckCheck className="h-4 w-4" />
          Following this campaign
        </div>
      ) : (
        <button
          type="button"
          onClick={handleFollow}
          disabled={isPending}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#235DA7] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2563EB] disabled:opacity-50"
        >
          <Bell className="h-3 w-3" />
          {isPending ? "Following..." : "Follow campaign"}
        </button>
      )}

      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in to follow</DialogTitle>
            <DialogDescription>
              Create a free account or sign in to follow this campaign and
              receive updates when milestones are reached.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-3">
            <Button
              className="w-full rounded-full bg-[#0F172A] text-white hover:bg-[#1E293B]"
              onClick={() => {
                setShowLoginModal(false);
                window.location.href = `/login?redirect=${encodeURIComponent(causePath)}`;
              }}
            >
              Sign in
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-full"
              onClick={() => {
                setShowLoginModal(false);
                window.location.href = `/register?redirect=${encodeURIComponent(causePath)}`;
              }}
            >
              Create account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSupportModal} onOpenChange={setShowSupportModal}>
        <DialogContent className="border-0 bg-transparent p-0 shadow-none sm:max-w-2xl">
          <SupportErrorCta
            compact
            title="We couldn't follow this campaign"
            description="For customer support, follow us on X and join our Telegram community. Our team can help you there."
            errorMessage={followError}
            onRetry={() => {
              setShowSupportModal(false);
              handleFollow();
            }}
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
