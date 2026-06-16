"use client";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/user-nav";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface OnboardingNavProps {
  currentStep: number;
  onBack?: () => void;
  showUserNav?: boolean;
}

export default function OnboardingNav({
  currentStep,
  onBack,
  showUserNav = false,
}: OnboardingNavProps) {
  return (
    <nav className="sticky top-0 z-50 bg-white/30 backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-white/40 py-2 px-4 shadow-sm w-full">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
            <Logo />
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {currentStep > 1 && currentStep <= 5 && onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              className="flex items-center rounded-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go back
            </Button>
          )}
          {showUserNav && <UserNav />}
        </div>
      </div>
    </nav>
  );
}
