"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Check, Loader2, ShieldAlert, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  formatOnboardingLocation,
  NIGERIAN_STATES,
  ONBOARDING_GENDER_OPTIONS,
  ORGANIZATION_TYPES,
  splitFullName,
  validateOnboardingDob,
  validateOnboardingFullName,
} from "@/lib/onboarding/validation";

export interface Step3SubmitPayload {
  accountType: "individual" | "organization";
  fullName: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  dateOfBirth?: string;
  gender?: string;
  state: string;
  city: string;
  location: string;
  organizationName?: string;
  organizationType?: string;
  organizationRole?: string;
}

interface Step3Props {
  user: any;
  onNext: (profileData: Step3SubmitPayload) => void;
  onBack?: () => void;
  onSkip?: () => void;
  onboardingData: any;
  updateOnboardingData: (key: string, value: any) => void;
  isSubmitting: boolean;
}

export default function Step3({
  user,
  onNext,
  onBack,
  onboardingData,
  updateOnboardingData,
  isSubmitting,
}: Step3Props) {
  const savedProfile = onboardingData?.profile || {};

  const initialAccountType: "individual" | "organization" =
    onboardingData?.accountType === "organization"
      ? "organization"
      : "individual";

  const initialFullName = useMemo(() => {
    if (savedProfile.fullName) return savedProfile.fullName;
    if (savedProfile.firstName || savedProfile.lastName) {
      return `${savedProfile.firstName || ""} ${savedProfile.lastName || ""}`.trim();
    }
    return user?.name || "";
  }, [savedProfile.fullName, savedProfile.firstName, savedProfile.lastName, user?.name]);

  const [accountType, setAccountType] = useState<"individual" | "organization">(
    initialAccountType,
  );
  const [fullName, setFullName] = useState<string>(initialFullName);
  const [displayName, setDisplayName] = useState<string>(
    savedProfile.displayName || "",
  );
  const [dateOfBirth, setDateOfBirth] = useState<string>(
    savedProfile.dateOfBirth || "",
  );
  const [gender, setGender] = useState<string>(
    onboardingData?.gender || "prefer_not_to_say",
  );
  const [stateName, setStateName] = useState<string>(
    savedProfile.state || "Lagos",
  );
  const [city, setCity] = useState<string>(savedProfile.city || "");

  const [organizationName, setOrganizationName] = useState<string>(
    savedProfile.organizationName || "",
  );
  const [organizationType, setOrganizationType] = useState<string>(
    savedProfile.organizationType || ORGANIZATION_TYPES[0],
  );
  const [organizationRole, setOrganizationRole] = useState<string>(
    savedProfile.organizationRole || "",
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (onboardingData?.accountType === "organization") {
      setAccountType("organization");
    }
  }, [onboardingData?.accountType]);

  useEffect(() => {
    if (!displayName && fullName.trim()) {
      const { firstName, lastName } = splitFullName(fullName);
      if (firstName && lastName) {
        setDisplayName(`${firstName} ${lastName.charAt(0).toUpperCase()}.`);
      } else if (firstName) {
        setDisplayName(firstName);
      }
    }
    // Only auto-suggest display name when displayName is empty on initial name entry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSelectAccountType = (nextType: "individual" | "organization") => {
    setAccountType(nextType);
    updateOnboardingData("accountType", nextType);
    setErrors({});
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};

    const nameError = validateOnboardingFullName(fullName);
    if (nameError) {
      nextErrors.fullName = nameError;
    }

    if (accountType === "individual") {
      const dobError = validateOnboardingDob(dateOfBirth);
      if (dobError) {
        nextErrors.dateOfBirth = dobError;
      }
    } else {
      if (!organizationName.trim() || organizationName.trim().length < 2) {
        nextErrors.organizationName =
          "Enter your organisation name (at least 2 characters).";
      }
      if (!organizationRole.trim()) {
        nextErrors.organizationRole = "Enter your role in the organisation.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const errorCount = Object.keys(errors).length;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

    const { firstName, lastName, fullName: normalizedFullName } =
      splitFullName(fullName);
    const location = formatOnboardingLocation({
      city,
      state: stateName,
      country: "Nigeria",
    });

    const payload: Step3SubmitPayload = {
      accountType,
      fullName: normalizedFullName,
      firstName,
      lastName,
      displayName: displayName.trim() || `${firstName} ${lastName.charAt(0)}.`,
      dateOfBirth: dateOfBirth.trim() || undefined,
      gender: accountType === "individual" ? gender : undefined,
      state: stateName,
      city: city.trim(),
      location: location || stateName,
      ...(accountType === "organization"
        ? {
            organizationName: organizationName.trim(),
            organizationType,
            organizationRole: organizationRole.trim(),
          }
        : {}),
    };

    updateOnboardingData("accountType", accountType);
    updateOnboardingData("gender", gender);
    updateOnboardingData("profile", {
      ...savedProfile,
      ...payload,
    });

    onNext(payload);
  };

  return (
    <div className="w-full py-4">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
        {/* Left Column: Context & Actions */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col justify-between lg:col-span-5"
        >
          <div>
            <h1 className="font-fraunces text-3xl font-normal tracking-tight text-neutral-900 sm:text-4xl">
              Tell us about you
            </h1>
            <p className="mt-3 text-sm leading-6 text-neutral-600 sm:text-base">
              This is how organisations see you when you give, and the name your
              receipts are issued to. It takes under a minute.
            </p>

            {/* Why we ask card */}
            <div className="mt-6 rounded-2xl border border-neutral-200 bg-[#F7F5F0] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-600">
                Why we ask
              </p>
              <p className="mt-2 text-xs leading-5 text-neutral-700 sm:text-sm">
                Your legal name and date of birth are checked against your ID if
                you ever withdraw. Getting them right now saves a failed check
                later. Gender is optional and only used in aggregate reports to
                organisations.
              </p>
            </div>
          </div>

          {/* Primary / Back Buttons (Desktop Left Column) */}
          <div className="mt-8 hidden flex-col gap-3 lg:flex">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
                className="h-12 flex-1 rounded-xl bg-[#0D1E16] text-white hover:bg-neutral-900"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
              {onBack && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  disabled={isSubmitting}
                  className="h-12 rounded-xl px-6"
                >
                  Back
                </Button>
              )}
            </div>
            {errorCount > 0 && (
              <p
                role="alert"
                className="text-xs font-medium text-[#B43E2B]"
              >
                Fix the{" "}
                {errorCount === 1
                  ? "field"
                  : errorCount === 2
                    ? "two fields"
                    : `${errorCount} fields`}{" "}
                marked in clay to continue
              </p>
            )}
          </div>
        </motion.div>

        {/* Right Column: Interactive Form Card */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8 lg:col-span-7"
        >
          {/* Account Type Selector */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
              Account type
            </Label>
            <div
              role="radiogroup"
              aria-label="Account type"
              className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              <button
                type="button"
                role="radio"
                aria-checked={accountType === "individual"}
                data-testid="account-type-individual"
                onClick={() => handleSelectAccountType("individual")}
                className={cn(
                  "flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all",
                  accountType === "individual"
                    ? "border-[#0D1E16] bg-[#F5F9F6]"
                    : "border-neutral-200 bg-white hover:border-neutral-300",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-900">
                    <User className="h-4 w-4 text-[#0D1E16]" />
                    Individual giver
                  </span>
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full border",
                      accountType === "individual"
                        ? "border-[#0D1E16] bg-[#0D1E16] text-white"
                        : "border-neutral-300",
                    )}
                  >
                    {accountType === "individual" && (
                      <Check className="h-2.5 w-2.5" />
                    )}
                  </span>
                </div>
                <span className="mt-1.5 text-xs leading-5 text-neutral-600">
                  Give, pledge, sign petitions and take on bounties
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={accountType === "organization"}
                data-testid="account-type-organization"
                onClick={() => handleSelectAccountType("organization")}
                className={cn(
                  "flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all",
                  accountType === "organization"
                    ? "border-[#0D1E16] bg-[#F5F9F6]"
                    : "border-neutral-200 bg-white hover:border-neutral-300",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-900">
                    <Building2 className="h-4 w-4 text-[#0D1E16]" />
                    Organisation
                  </span>
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full border",
                      accountType === "organization"
                        ? "border-[#0D1E16] bg-[#0D1E16] text-white"
                        : "border-neutral-300",
                    )}
                  >
                    {accountType === "organization" && (
                      <Check className="h-2.5 w-2.5" />
                    )}
                  </span>
                </div>
                <span className="mt-1.5 text-xs leading-5 text-neutral-600">
                  An NGO, school, clinic or community group raising money
                </span>
              </button>
            </div>
          </div>

          <hr className="my-6 border-neutral-200" />

          {accountType === "individual" ? (
            /* INDIVIDUAL GIVER FIELDS (W1·03b) */
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="onboarding-full-name" className="text-sm font-medium text-neutral-900">
                      Full name
                    </Label>
                    <span className="text-[11px] text-neutral-500">
                      As it appears on your ID
                    </span>
                  </div>
                  <Input
                    id="onboarding-full-name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      clearFieldError("fullName");
                    }}
                    placeholder="e.g. Amina Bello"
                    className={cn(
                      "mt-1.5 h-11 rounded-xl",
                      errors.fullName &&
                        "border-[#B43E2B] bg-[#FDF6F4] focus-visible:ring-[#B43E2B]",
                    )}
                  />
                  {errors.fullName && (
                    <p className="mt-1.5 text-xs font-medium text-[#B43E2B]">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="onboarding-display-name" className="text-sm font-medium text-neutral-900">
                      Display name
                    </Label>
                    <span className="text-[11px] text-neutral-500">
                      Shown on campaigns you back
                    </span>
                  </div>
                  <Input
                    id="onboarding-display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Amina B."
                    className="mt-1.5 h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="onboarding-dob" className="text-sm font-medium text-neutral-900">
                      Date of birth
                    </Label>
                    <span className="text-[11px] text-neutral-500">
                      Never shown publicly
                    </span>
                  </div>
                  <Input
                    id="onboarding-dob"
                    type="text"
                    inputMode="numeric"
                    value={dateOfBirth}
                    onChange={(e) => {
                      setDateOfBirth(e.target.value);
                      clearFieldError("dateOfBirth");
                    }}
                    placeholder="DD / MM / YYYY"
                    className={cn(
                      "mt-1.5 h-11 rounded-xl",
                      errors.dateOfBirth &&
                        "border-[#B43E2B] bg-[#FDF6F4] focus-visible:ring-[#B43E2B]",
                    )}
                  />
                  {errors.dateOfBirth && (
                    <p className="mt-1.5 text-xs font-medium text-[#B43E2B]">
                      {errors.dateOfBirth}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <Label className="text-sm font-medium text-neutral-900">
                      Gender · optional
                    </Label>
                  </div>
                  <div className="mt-1.5 grid grid-cols-3 gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 p-1">
                    {ONBOARDING_GENDER_OPTIONS.map((option) => {
                      const active = gender === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setGender(option.id)}
                          className={cn(
                            "h-9 rounded-lg px-2 text-xs font-medium transition-all",
                            active
                              ? "bg-[#0D1E16] text-white shadow-xs"
                              : "text-neutral-700 hover:bg-neutral-200/60",
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="onboarding-state" className="text-sm font-medium text-neutral-900">
                    State
                  </Label>
                  <select
                    id="onboarding-state"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="mt-1.5 flex h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    {NIGERIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="onboarding-city" className="text-sm font-medium text-neutral-900">
                    City or area
                  </Label>
                  <Input
                    id="onboarding-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Yaba"
                    className="mt-1.5 h-11 rounded-xl"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ORGANISATION FIELDS (W1·03b org variant) */
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="onboarding-org-name" className="text-sm font-medium text-neutral-900">
                    Organisation name
                  </Label>
                  <Input
                    id="onboarding-org-name"
                    value={organizationName}
                    onChange={(e) => {
                      setOrganizationName(e.target.value);
                      clearFieldError("organizationName");
                    }}
                    placeholder="e.g. Lagos Education Trust"
                    className={cn(
                      "mt-1.5 h-11 rounded-xl",
                      errors.organizationName &&
                        "border-[#B43E2B] bg-[#FDF6F4] focus-visible:ring-[#B43E2B]",
                    )}
                  />
                  {errors.organizationName && (
                    <p className="mt-1.5 text-xs font-medium text-[#B43E2B]">
                      {errors.organizationName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="onboarding-org-type" className="text-sm font-medium text-neutral-900">
                    Type
                  </Label>
                  <select
                    id="onboarding-org-type"
                    value={organizationType}
                    onChange={(e) => setOrganizationType(e.target.value)}
                    className="mt-1.5 flex h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    {ORGANIZATION_TYPES.map((typeOption) => (
                      <option key={typeOption} value={typeOption}>
                        {typeOption}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="onboarding-owner-full-name" className="text-sm font-medium text-neutral-900">
                      Your full name
                    </Label>
                    <span className="text-[11px] text-neutral-500">
                      As on your ID
                    </span>
                  </div>
                  <Input
                    id="onboarding-owner-full-name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      clearFieldError("fullName");
                    }}
                    placeholder="e.g. Amina Bello"
                    className={cn(
                      "mt-1.5 h-11 rounded-xl",
                      errors.fullName &&
                        "border-[#B43E2B] bg-[#FDF6F4] focus-visible:ring-[#B43E2B]",
                    )}
                  />
                  {errors.fullName && (
                    <p className="mt-1.5 text-xs font-medium text-[#B43E2B]">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="onboarding-org-role" className="text-sm font-medium text-neutral-900">
                    Your role
                  </Label>
                  <Input
                    id="onboarding-org-role"
                    value={organizationRole}
                    onChange={(e) => {
                      setOrganizationRole(e.target.value);
                      clearFieldError("organizationRole");
                    }}
                    placeholder="e.g. Programme lead"
                    className={cn(
                      "mt-1.5 h-11 rounded-xl",
                      errors.organizationRole &&
                        "border-[#B43E2B] bg-[#FDF6F4] focus-visible:ring-[#B43E2B]",
                    )}
                  />
                  {errors.organizationRole && (
                    <p className="mt-1.5 text-xs font-medium text-[#B43E2B]">
                      {errors.organizationRole}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="onboarding-org-state" className="text-sm font-medium text-neutral-900">
                    State
                  </Label>
                  <select
                    id="onboarding-org-state"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="mt-1.5 flex h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    {NIGERIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="onboarding-org-city" className="text-sm font-medium text-neutral-900">
                    City or area
                  </Label>
                  <Input
                    id="onboarding-org-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Yaba"
                    className="mt-1.5 h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs leading-5 text-amber-950">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" />
                <p>
                  A CAC certificate and one trustee are checked at Level 3
                  before the organisation can receive money. You can draft
                  campaigns while that runs.
                </p>
              </div>
            </div>
          )}

          {/* Mobile / Tablet Submit Buttons */}
          <div className="mt-6 flex flex-col gap-2 lg:hidden">
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 flex-1 rounded-xl bg-[#0D1E16] text-white hover:bg-neutral-900"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
              {onBack && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  disabled={isSubmitting}
                  className="h-12 rounded-xl px-5"
                >
                  Back
                </Button>
              )}
            </div>
            {errorCount > 0 && (
              <p className="text-xs font-medium text-[#B43E2B]">
                Fix the{" "}
                {errorCount === 1
                  ? "field"
                  : errorCount === 2
                    ? "two fields"
                    : `${errorCount} fields`}{" "}
                marked in clay to continue
              </p>
            )}
          </div>
        </motion.form>
      </div>
    </div>
  );
}
