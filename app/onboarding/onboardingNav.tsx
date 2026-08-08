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
  organizationMode?: boolean;
}

export default function OnboardingNav({
  currentStep,
  onBack,
  showUserNav = false,
  organizationMode = false,
}: OnboardingNavProps) {
  return (
    <nav
      className={`sticky top-0 z-50 w-full border-b px-4 py-3 backdrop-blur-md backdrop-saturate-150 ${
        organizationMode
          ? "border-slate-200 bg-white/90"
          : "border-transparent bg-white/30 shadow-sm supports-[backdrop-filter]:bg-white/40"
      }`}
    >
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
            <Logo />
          </Link>
          {organizationMode && (
            <>
              <div className="hidden h-7 w-px bg-slate-200 sm:block" />
              <p className="hidden text-sm font-medium text-slate-700 sm:block">
                Organisation setup
              </p>
            </>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {currentStep > 1 && currentStep <= 5 && onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              className={`flex items-center rounded-full ${
                organizationMode
                  ? "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                  : ""
              }`}
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
