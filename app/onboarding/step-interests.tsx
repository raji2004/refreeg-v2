"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";
import { interestOptions, MIN_INTERESTS_REQUIRED } from "@/lib/interest-categories";
import { getInterestOptions, saveUserInterests, type InterestOptionWithCount } from "@/actions/interest-actions";

interface StepInterestsProps {
  user: any;
  onNext: () => void;
  onBack: () => void;
  onboardingData: any;
  updateOnboardingData: (key: string, value: any) => void;
}

export default function StepInterests({
  user,
  onNext,
  onBack,
  onboardingData,
  updateOnboardingData,
}: StepInterestsProps) {
  const [options, setOptions] = useState<InterestOptionWithCount[]>(
    interestOptions.map((o) => ({ id: o.id, label: o.label, count: null })),
  );
  const [selected, setSelected] = useState<string[]>(onboardingData.interests || []);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getInterestOptions().then(setOptions);
  }, []);

  const iconFor = (id: string) => interestOptions.find((o) => o.id === id)?.icon;

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  const hasMinimum = selected.length >= MIN_INTERESTS_REQUIRED;

  const handleContinue = async () => {
    if (!hasMinimum || isSaving) return;
    setIsSaving(true);
    try {
      await saveUserInterests(user.id, { interests: selected });
      updateOnboardingData("interests", selected);
      onNext();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="py-4">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mx-auto w-full max-w-3xl"
      >
        <Eyebrow>Personalize your feed</Eyebrow>
        <h1 className="mt-3 font-fraunces text-3xl font-semibold text-ink">
          What do you want to fund?
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink/70">
          Pick at least {MIN_INTERESTS_REQUIRED} — we&apos;ll use these to show you campaigns
          worth your attention first.
        </p>

        <CalloutBanner
          className="mt-6"
          variant="gold"
          icon={<Sparkles className="mt-0.5 h-5 w-5 shrink-0" />}
          title="150 EIZA already credited"
          description="You earned that just for verifying your email — thanks for joining."
        />

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {options.map((option) => {
            const Icon = iconFor(option.id);
            const isSelected = selected.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => toggle(option.id)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-colors",
                  isSelected
                    ? "border-ink bg-ink text-ink-foreground"
                    : "border-ink/15 bg-white text-ink hover:border-ink/40",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  {Icon ? <Icon className="h-5 w-5" /> : null}
                  {isSelected ? <Check className="h-4 w-4" /> : null}
                </div>
                <span className="text-sm font-medium">{option.label}</span>
                <span
                  className={cn(
                    "text-xs",
                    isSelected ? "text-ink-foreground/70" : "text-ink/50",
                  )}
                >
                  {option.count != null ? `${option.count} campaigns` : "Coming soon"}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-ink/50">
          {selected.length} of {options.length} chosen · Minimum {MIN_INTERESTS_REQUIRED}
        </p>

        <div className="mt-8 flex flex-col gap-3 border-t border-ink/10 pt-6 sm:flex-row-reverse">
          <Button
            onClick={handleContinue}
            disabled={!hasMinimum || isSaving}
            variant="ink"
            className="h-12 flex-1"
          >
            {isSaving ? "Saving..." : "Go to my dashboard"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button onClick={onBack} variant="outline" className="h-12 flex-1">
            Back
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
