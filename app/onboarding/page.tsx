"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Check } from "lucide-react";

const Step1 = dynamic(() => import("./step1"), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
const Step2 = dynamic(() => import("./step2"), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
const Step3 = dynamic(() => import("./step3"), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
const Step3BOrgSetup = dynamic(() => import("./step3b-org-setup"), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
const Step3CInviteTeam = dynamic(() => import("./step3c-invite-team"), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
const Step4 = dynamic(() => import("./step4"), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
const Step5 = dynamic(() => import("./step5"), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
const StepInterests = dynamic(() => import("./step-interests"), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
import NavigationLoader from "@/components/NavigationLoader";
import OnboardingNav from "./onboardingNav";
import {
  hasCompletedOnboarding,
  createOnboardingProfile,
  getCurrentOnboardingStep,
  getOnboardingData,
  saveStep1Progress,
  saveStep2Progress,
  completeOnboarding,
} from "@/actions/profile-actions";
import { toast } from "@/components/ui/use-toast";

// ---------------------------------------------------------------------------
// Step identifiers — each account type uses a different ordered subset.
// ---------------------------------------------------------------------------
type StepId =
  | "account-type"
  | "gender"
  | "profile"
  | "org-setup"
  | "invite-team"
  | "kyc"
  | "interests"
  | "complete";

const INDIVIDUAL_STEPS: StepId[] = [
  "account-type",
  "gender",
  "profile",
  "kyc",
  "interests",
  "complete",
];

const ORGANIZATION_STEPS: StepId[] = [
  "account-type",
  "profile",
  "org-setup",
  "invite-team",
  "kyc",
  "interests",
  "complete",
];

const ORGANIZATION_STEP_DETAILS = [
  {
    id: "account-type" as const,
    label: "Account type",
  },
  {
    id: "profile" as const,
    label: "Owner profile",
  },
  {
    id: "org-setup" as const,
    label: "Organisation",
  },
  {
    id: "invite-team" as const,
    label: "Team",
  },
  {
    id: "kyc" as const,
    label: "Verification",
  },
  {
    id: "interests" as const,
    label: "Interests",
  },
  {
    id: "complete" as const,
    label: "Complete",
  },
];

/**
 * Map the numeric value returned by `getCurrentOnboardingStep` (which may
 * include 3.5 for org-setup) to the appropriate StepId.
 */
function dbStepToStepId(dbStep: number, accountType: string): StepId {
  if (dbStep <= 1) return "account-type";
  if (dbStep === 2) return accountType === "organization" ? "profile" : "gender";
  if (dbStep === 3) return "profile";
  if (dbStep === 3.5) return "org-setup";
  // dbStep >= 4 means profile + org-setup are done → KYC
  return "kyc";
}

export default function OnboardingPage() {
  // State management for dynamic onboarding flow
  const [currentStepId, setCurrentStepId] = useState<StepId>("account-type");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [direction, setDirection] = useState(1);

  // Onboarding data state - now prefilled from database
  const [onboardingData, setOnboardingData] = useState({
    accountType: "",
    gender: "",
    profile: {
      firstName: "",
      lastName: "",
      username: "",
      bio: "",
      location: "",
      website: "",
      phone: "",
    },
    interests: [],
    kycCompleted: false,
    consent: false,
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update } = useSession();
  const completionDestinationRef = useRef<string | null>(null);

  // Derive step sequence based on account type
  const isOrg = onboardingData.accountType === "organization";
  const stepSequence = useMemo(
    () => (isOrg ? ORGANIZATION_STEPS : INDIVIDUAL_STEPS),
    [isOrg],
  );

  const currentStepIndex = stepSequence.indexOf(currentStepId);
  const totalSteps = stepSequence.length;

  // Navigation helpers
  const goToStep = (stepId: StepId, dir: 1 | -1 = 1) => {
    setDirection(dir);
    setCurrentStepId(stepId);
  };

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < totalSteps) {
      goToStep(stepSequence[nextIndex], 1);
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      goToStep(stepSequence[prevIndex], -1);
    }
  };

  // ──── Auth & resume logic ───────────────────────────────────────────
  useEffect(() => {
    const checkUser = async () => {
      if (status === "loading") return;

      if (status === "unauthenticated" || !session?.user) {
        router.push("/auth/signin");
        return;
      }

      const currentUser = session.user;

      // Check the flag from the JWT session first (most reliable and fastest)
      const isCompletedInSession = (currentUser as any).onboardingCompleted;
      
      if (isCompletedInSession === true) {
        // handleComplete owns navigation while it refreshes the session. Without
        // this guard, this effect can race it and send KYC users to /dashboard.
        if (completionDestinationRef.current) return;
        router.push("/dashboard");
        return;
      }

      // Check if user has already completed onboarding via DB
      const hasCompleted = await hasCompletedOnboarding(currentUser.id as string);
      if (hasCompleted) {
        // If DB says completed but session says no, update the session to fix the loop
        if (isCompletedInSession === false) {
          await update({ onboardingCompleted: true });
        }
        router.push("/dashboard");
        return;
      }

      setUser(currentUser);

      // Only fetch and set initial state if we haven't loaded yet
      if (isLoading) {
        try {
          const [currentStepFromDB, existingData] = await Promise.all([
            getCurrentOnboardingStep(currentUser.id as string),
            getOnboardingData(currentUser.id as string),
          ]);

          const accountType = existingData.accountType || "";

          // Handle Google OAuth name splitting if firstName/lastName are missing
          let firstName = existingData.profile.firstName || "";
          let lastName = existingData.profile.lastName || "";
          
          if (!firstName && !lastName && currentUser.name) {
            const nameParts = currentUser.name.split(" ");
            firstName = nameParts[0] || "";
            lastName = nameParts.slice(1).join(" ") || "";
          }

          // Prefill onboarding data with existing database data or session data
          setOnboardingData((prev) => ({
            ...prev,
            accountType,
            gender: existingData.gender,
            profile: {
              ...prev.profile,
              ...existingData.profile,
              firstName: firstName,
              lastName: lastName,
              profilePhoto: existingData.profile.profilePhoto || currentUser.image || "",
            },
          }));

          // Set the current step based on database state
          const resumeStepId = dbStepToStepId(currentStepFromDB, accountType);
          setCurrentStepId(resumeStepId);

          setIsLoading(false);
        } catch (error) {
          console.error("Error loading onboarding progress:", error);
          setCurrentStepId("account-type");
          setIsLoading(false);
        }
      }
    };

    checkUser();
  }, [router, session, status, isLoading, update]);

  // Additional protection: Reset to step 1 if user tries to access late
  // steps without completing the profile step
  useEffect(() => {
    if (!user) return;
    const lateSteps: StepId[] = ["kyc", "interests", "complete"];
    if (!lateSteps.includes(currentStepId)) return;

    const profileData = onboardingData.profile;
    const isProfileComplete = !!(
      profileData?.firstName &&
      profileData?.lastName &&
      profileData?.username &&
      profileData?.location &&
      profileData?.phone
    );

    if (!isProfileComplete) {
      setCurrentStepId("account-type");
      toast({
        title: "Complete your profile first",
        description: "Please complete earlier steps before proceeding.",
        variant: "destructive",
      });
    }
  }, [user, currentStepId, onboardingData.profile]);

  // ──── Step handlers ─────────────────────────────────────────────────

  const handleStep1Next = async (accountType: string) => {
    try {
      await saveStep1Progress(user.id, accountType);
      updateOnboardingData("accountType", accountType);

      // Organization → skip gender, go to profile
      if (accountType === "organization") {
        setDirection(1);
        setCurrentStepId("profile");
      } else {
        setDirection(1);
        setCurrentStepId("gender");
      }
    } catch (error) {
      console.error("Error saving step 1 progress:", error);
      toast({
        title: "Error saving progress",
        description: "Failed to save your account type. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStep2Next = async (gender: string) => {
    try {
      await saveStep2Progress(user.id, gender);
      updateOnboardingData("gender", gender);
      goToStep("profile", 1);
    } catch (error) {
      console.error("Error saving step 2 progress:", error);
      toast({
        title: "Error saving progress",
        description: "Failed to save your gender. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStep3Submit = async (profileData: any) => {
    setIsSubmitting(true);
    try {
      await createOnboardingProfile(
        user.id,
        {
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          username: profileData.username,
          location: profileData.location,
          phone: profileData.phone,
          email: user.email || "",
          profilePhoto: profileData.profilePhoto,
          accountType: onboardingData.accountType || "individual",
          gender: onboardingData.gender || undefined,
        },
        user.image,
      );

      // Org → go to org setup. Individual → go to KYC.
      if (onboardingData.accountType === "organization") {
        goToStep("org-setup", 1);
      } else {
        goToStep("kyc", 1);
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast({
        title: "Error creating profile",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOrgSetupNext = () => {
    goToStep("invite-team", 1);
  };

  const handleInviteTeamNext = () => {
    goToStep("kyc", 1);
  };

  const handleComplete = async (destination?: string) => {
    const requestedRedirect = searchParams.get("redirect");
    const safeRedirect =
      requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
        ? requestedRedirect
        : null;
    const target = destination || safeRedirect || "/dashboard";

    completionDestinationRef.current = target;
    setIsSubmitting(true);

    try {
      await completeOnboarding(user.id);
      await update({ onboardingCompleted: true });

      localStorage.removeItem("onboarding_account_type");
      localStorage.removeItem("onboarding_gender");
      localStorage.removeItem("onboarding_profile");
      localStorage.removeItem("onboarding_interests");
      localStorage.removeItem("onboarding_kyc_completed");
      localStorage.removeItem("onboarding_consent");

      // A full navigation guarantees the refreshed auth cookie is used by the
      // dashboard route guard before the KYC page is rendered.
      window.location.assign(target);
    } catch (error) {
      completionDestinationRef.current = null;
      setIsSubmitting(false);
      toast({
        title: "Could not complete onboarding",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleKycSkipOrSubmit = async () => {
    goToStep("interests", 1);
  };

  const handleKyc = async () => {
    await handleComplete("/dashboard/settings/kyc-setup");
  };

  const updateOnboardingData = (key: string, value: any) => {
    setOnboardingData((prev) => ({ ...prev, [key]: value }));
    localStorage.setItem(
      `onboarding_${key}`,
      typeof value === "string" ? value : JSON.stringify(value),
    );
  };

  // ──── Render ────────────────────────────────────────────────────────

  if (isLoading) {
    return <NavigationLoader />;
  }

  if (!user) {
    return null;
  }

  const stepVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  // Progress bar: how many segments are "filled"
  const filledSteps = currentStepIndex + 1;

  const stepContent = (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={currentStepId}
        custom={direction}
        variants={stepVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: "spring", stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        }}
        className="w-full"
      >
        {currentStepId === "account-type" && (
          <Step1
            user={user}
            onNext={handleStep1Next}
            onboardingData={onboardingData}
            updateOnboardingData={updateOnboardingData}
          />
        )}
        {currentStepId === "gender" && (
          <Step2
            user={user}
            onNext={handleStep2Next}
            onBack={goBack}
            onboardingData={onboardingData}
            updateOnboardingData={updateOnboardingData}
          />
        )}
        {currentStepId === "profile" && (
          <Step3
            user={user}
            onNext={handleStep3Submit}
            onBack={goBack}
            onboardingData={onboardingData}
            updateOnboardingData={updateOnboardingData}
            isSubmitting={isSubmitting}
          />
        )}
        {currentStepId === "org-setup" && (
          <Step3BOrgSetup
            user={user}
            onNext={handleOrgSetupNext}
            onBack={goBack}
            onboardingData={onboardingData}
            isSubmitting={isSubmitting}
          />
        )}
        {currentStepId === "invite-team" && (
          <Step3CInviteTeam
            user={user}
            onNext={handleInviteTeamNext}
            onBack={goBack}
            onboardingData={onboardingData}
          />
        )}
        {currentStepId === "kyc" && (
          <Step4
            user={user}
            onNext={handleKycSkipOrSubmit}
            onKyc={handleKyc}
            onBack={goBack}
            onboardingData={onboardingData}
            updateOnboardingData={updateOnboardingData}
          />
        )}
        {currentStepId === "interests" && (
          <StepInterests
            user={user}
            onNext={goNext}
            onBack={goBack}
            onboardingData={onboardingData}
            updateOnboardingData={updateOnboardingData}
          />
        )}
        {currentStepId === "complete" && (
          <Step5
            user={user}
            onComplete={handleComplete}
            onboardingData={onboardingData}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div
      className={`flex min-h-screen w-full flex-col items-center justify-start ${
        isOrg ? "bg-slate-50" : "bg-white"
      }`}
    >
      <OnboardingNav
        currentStep={currentStepIndex + 1}
        onBack={goBack}
        showUserNav={
          currentStepId === "kyc" ||
          currentStepId === "interests" ||
          currentStepId === "complete"
        }
        organizationMode={isOrg}
      />
      {isOrg ? (
        <main className="flex w-full max-w-7xl flex-1 px-3 py-4 sm:px-6 sm:py-7">
          <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-200 px-5 py-5 sm:px-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                    Organisation onboarding
                  </p>
                  <h1 className="mt-1 text-base font-semibold text-slate-950">
                    {ORGANIZATION_STEP_DETAILS[currentStepIndex]?.label}
                  </h1>
                </div>
                <p className="text-sm text-slate-500">
                  Step {currentStepIndex + 1} of {totalSteps}
                </p>
              </div>

              <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-700 transition-all duration-300"
                  style={{
                    width: `${((currentStepIndex + 1) / totalSteps) * 100}%`,
                  }}
                />
              </div>

              <ol className="mt-4 hidden grid-cols-6 gap-3 sm:grid">
                {ORGANIZATION_STEP_DETAILS.map((step, index) => {
                  const isCurrent = step.id === currentStepId;
                  const isComplete = index < currentStepIndex;

                  return (
                    <li
                      key={step.id}
                      aria-current={isCurrent ? "step" : undefined}
                      className={`flex items-center gap-2 text-xs font-medium ${
                        isCurrent
                          ? "text-slate-950"
                          : isComplete
                            ? "text-blue-700"
                            : "text-slate-400"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                          isCurrent
                            ? "border-blue-700 bg-blue-700 text-white"
                            : isComplete
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-slate-200 text-slate-400"
                        }`}
                      >
                        {isComplete ? <Check className="h-3 w-3" /> : index + 1}
                      </span>
                      <span className="truncate">{step.label}</span>
                    </li>
                  );
                })}
              </ol>
            </header>

            <section className="min-w-0 px-5 py-7 sm:px-8 sm:py-10">
              <div className="relative overflow-hidden">{stepContent}</div>
            </section>
          </div>
        </main>
      ) : (
        <div className="flex w-full flex-1 flex-col items-center justify-center px-8 py-12">
          <div className="mb-8 flex justify-center space-x-2">
            {[...Array(totalSteps)].map((_, i) => (
              <div
                key={i}
                className={`h-2 w-12 rounded-full transition-colors duration-300 ${
                  i < filledSteps ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          <div className="relative overflow-hidden">{stepContent}</div>
        </div>
      )}
    </div>
  );
}
