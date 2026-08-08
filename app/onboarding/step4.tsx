"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Clock3,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import { getProfile } from "@/actions/profile-actions";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";

interface Step4Props {
  user: any;
  onNext: () => void;
  onKyc: () => void | Promise<void>;
  onBack: () => void;
  onboardingData: any;
  updateOnboardingData: (key: string, value: any) => void;
}

export default function Step4({
  user,
  onNext,
  onKyc,
  onBack,
  onboardingData,
  updateOnboardingData,
}: Step4Props) {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingKyc, setIsStartingKyc] = useState(false);

  // Fetch profile data using the same method as UserNav
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      try {
        const profileData = await getProfile(user.id);
        setProfile(profileData);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id]);

  const handleSkip = () => {
    updateOnboardingData("kycCompleted", false);
    // Clear all onboarding data and go to success page
    localStorage.removeItem("onboarding_account_type");
    localStorage.removeItem("onboarding_gender");
    localStorage.removeItem("onboarding_profile");
    localStorage.removeItem("onboarding_interests");
    localStorage.removeItem("onboarding_kyc_completed");
    localStorage.removeItem("onboarding_consent");
    onNext();
  };

  const handleKyc = async () => {
    if (isStartingKyc) return;

    setIsStartingKyc(true);
    updateOnboardingData("kycCompleted", false);

    try {
      await onKyc();
    } finally {
      setIsStartingKyc(false);
    }
  };

  const isOrg = onboardingData.accountType === "organization";

  if (isOrg) {
    return (
      <div className="py-2">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mx-auto w-full max-w-3xl"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="mt-5 text-3xl font-semibold leading-tight text-slate-950">
            Verify the organisation owner
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Owner verification is required before the organisation can fundraise or receive payouts. It helps protect the workspace and builds trust with supporters.
          </p>

          <div className="mt-8 grid overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:grid-cols-2">
            <div className="p-5 sm:border-r sm:border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900">What you will need</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>A valid government-issued ID</li>
                <li>A clear live identity check</li>
              </ul>
            </div>
            <div className="border-t border-slate-200 p-5 sm:border-t-0">
              <h2 className="text-sm font-semibold text-slate-900">What to expect</h2>
              <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                <Clock3 className="h-4 w-4 text-blue-700" />
                The process usually takes a few minutes.
              </p>
              <p className="mt-2 text-sm text-slate-600">Your information is encrypted and handled securely.</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row-reverse">
            <Button
              onClick={handleKyc}
              disabled={isStartingKyc}
              className="h-12 flex-1 bg-blue-700 text-white hover:bg-blue-800"
            >
              {isStartingKyc ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening verification...
                </>
              ) : (
                <>
                  Start verification
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            <Button
              onClick={handleSkip}
              variant="outline"
              className="h-12 flex-1 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Do this later
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="py-4">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className=" max-w-none md:max-w-4xl mx-auto"
      >
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center pb-8">
            <div className="flex flex-col items-center space-y-4">
              {isLoading ? (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-blue-200">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : profile?.profile_photo || user?.user_metadata?.avatar_url ? (
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-200">
                  <Image
                    src={getMediaUrl(
                      profile?.profile_photo || user?.user_metadata?.avatar_url,
                    )}
                    alt="Your profile"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                    unoptimized={isProxyMediaUrl(
                      getMediaUrl(
                        profile?.profile_photo ||
                          user?.user_metadata?.avatar_url,
                      ),
                    )}
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-blue-200">
                  <span className="text-2xl font-semibold text-gray-500">
                    {profile?.full_name?.charAt(0) ||
                      onboardingData.profile?.firstName?.charAt(0) ||
                      "U"}
                  </span>
                </div>
              )}
            </div>

            <CardTitle className="text-3xl font-bold text-gray-900 mb-4">
              Secure Your RefreeG Account
            </CardTitle>
            <CardDescription className="text-lg text-gray-600 text-center w-full max-w-none leading-relaxed">
              To keep our community safe and transparent, we need to verify your
              identity. Completing your KYC (Know Your Customer) helps us:
              Protect your donations and withdrawals, Build trust with donors
              and supporters, Keep causes safe from fraud
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                onClick={handleSkip}
                variant="outline"
                className="flex-1 h-12 text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-700"
              >
                Skip
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                onClick={handleKyc}
                className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
              >
                Submit KYC
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
