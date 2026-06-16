"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const Step1 = dynamic(() => import("./step1"), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
const Step2 = dynamic(() => import("./step2"), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
const Step3 = dynamic(() => import("./step3"), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
const Step4 = dynamic(() => import("./step4"), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
const Step5 = dynamic(() => import("./step5"), {
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
} from "@/actions/profile-actions";
import { toast } from "@/components/ui/use-toast";

export default function OnboardingPage() {
  // State management for dynamic onboarding flow
  const [currentStep, setCurrentStep] = useState(1);
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
  const { data: session, status, update } = useSession();

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

          // Set the current step based on database state
          // This automatically skips completed steps ONCE on initial load
          setCurrentStep(currentStepFromDB);

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
            accountType: existingData.accountType || "",
            gender: existingData.gender,
            profile: {
              ...prev.profile,
              ...existingData.profile,
              firstName: firstName,
              lastName: lastName,
              profilePhoto: existingData.profile.profilePhoto || currentUser.image || "",
            },
          }));

          setIsLoading(false);
        } catch (error) {
          console.error("Error loading onboarding progress:", error);
          setCurrentStep(1);
          setIsLoading(false);
        }
      }
    };

    checkUser();
  }, [router, session, status, isLoading]);

  // Additional protection: Reset to step 1 if user tries to access steps 4-5 without completing step 3
  useEffect(() => {
    if (user && currentStep > 3) {
      // Check if profile data is complete (step 3 completion)
      // We need to check if the profile was actually created in the database
      // This is a fallback check - the main protection is in middleware
      const profileData = onboardingData.profile;
      const isStep3Complete = !!(
        profileData?.firstName &&
        profileData?.lastName &&
        profileData?.username &&
        profileData?.location &&
        profileData?.phone
      );

      if (!isStep3Complete) {
        setCurrentStep(1);
        toast({
          title: "Complete your profile first",
          description: "Please complete steps 1-3 before proceeding.",
          variant: "destructive",
        });
      }
    }
  }, [user, currentStep, onboardingData.profile]);

  // Note: localStorage loading removed - now using database for persistence

  const handleNext = async () => {
    if (currentStep < 5) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  // PROGRESS SAVING HANDLERS:
  // Each step now saves progress to database immediately upon completion
  // This ensures users can resume from their last incomplete step

  // Handle step 1 completion with database save
  const handleStep1Next = async (accountType: string) => {
    try {
      await saveStep1Progress(user.id, accountType);
      updateOnboardingData("accountType", accountType);
      handleNext();
    } catch (error) {
      console.error("Error saving step 1 progress:", error);
      toast({
        title: "Error saving progress",
        description: "Failed to save your account type. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle step 2 completion with database save
  const handleStep2Next = async (gender: string) => {
    try {
      await saveStep2Progress(user.id, gender);
      updateOnboardingData("gender", gender);
      handleNext();
    } catch (error) {
      console.error("Error saving step 2 progress:", error);
      toast({
        title: "Error saving progress",
        description: "Failed to save your gender. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle step 3 completion - saves complete profile to database
  const handleStep3Submit = async (profileData: any) => {
    setIsSubmitting(true);
    try {
      // Create user profile with all collected data
      // This step saves the complete profile to database
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
          gender: onboardingData.gender || "",
        },
        user.image,
      );

      // Update session immediately so middleware recognizes user as onboarded
      await update({ onboardingCompleted: true });

      // Don't clear onboarding data yet, just move to step 4
      setCurrentStep(4); // Go to KYC step
    } catch (error) {
      console.error("Error completing onboarding:", error);
      // Show error to user
      toast({
        title: "Error creating profile",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = () => {
    // Clear any remaining localStorage data
    localStorage.removeItem("onboarding_account_type");
    localStorage.removeItem("onboarding_gender");
    localStorage.removeItem("onboarding_profile");
    localStorage.removeItem("onboarding_interests");
    localStorage.removeItem("onboarding_kyc_completed");
    localStorage.removeItem("onboarding_consent");

    router.push("/dashboard");
  };

  const updateOnboardingData = (key: string, value: any) => {
    setOnboardingData((prev) => ({ ...prev, [key]: value }));
    localStorage.setItem(
      `onboarding_${key}`,
      typeof value === "string" ? value : JSON.stringify(value),
    );
  };

  if (isLoading) {
    return <NavigationLoader />;
  }

  if (!user) {
    return null;
  }

  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col items-center justify-start">
      <OnboardingNav
        currentStep={currentStep}
        onBack={handleBack}
        showUserNav={currentStep >= 4}
      />
      <div className="w-full flex-1 flex flex-col items-center justify-center px-8 py-12">
        {/* Progress indicator */}
        <div className="mb-8 flex justify-center space-x-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`h-2 w-12 rounded-full transition-colors duration-300 ${
                i < currentStep ? "bg-blue-600" : "bg-gray-200"
              }`}
            ></div>
          ))}
        </div>

        {/* Step content with smooth transitions */}
        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
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
              {currentStep === 1 && (
                <Step1
                  user={user}
                  onNext={handleStep1Next}
                  onboardingData={onboardingData}
                  updateOnboardingData={updateOnboardingData}
                />
              )}
              {currentStep === 2 && (
                <Step2
                  user={user}
                  onNext={handleStep2Next}
                  onBack={handleBack}
                  onboardingData={onboardingData}
                  updateOnboardingData={updateOnboardingData}
                />
              )}
              {currentStep === 3 && (
                <Step3
                  user={user}
                  onNext={handleStep3Submit}
                  onBack={handleBack}
                  onboardingData={onboardingData}
                  updateOnboardingData={updateOnboardingData}
                  isSubmitting={isSubmitting}
                />
              )}
              {currentStep === 4 && (
                <Step4
                  user={user}
                  onNext={handleNext}
                  onBack={handleBack}
                  onboardingData={onboardingData}
                  updateOnboardingData={updateOnboardingData}
                />
              )}
              {currentStep === 5 && (
                <Step5
                  user={user}
                  onComplete={handleComplete}
                  onboardingData={onboardingData}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
