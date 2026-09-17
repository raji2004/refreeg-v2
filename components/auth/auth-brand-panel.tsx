import React from "react";
import { Check } from "lucide-react";
import { AuthLogo } from "@/components/auth/auth-logo";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  title: string;
  description: string;
}

interface Testimonial {
  quote: string;
  author: string;
  avatarInitials: string;
}

interface BottomCard {
  eyebrow?: string;
  text: string;
}

interface AuthBrandPanelProps {
  headline: string;
  subtitle: string;
  checklist?: ChecklistItem[];
  testimonial?: Testimonial;
  bottomCard?: BottomCard;
  className?: string;
}

export function AuthBrandPanel({
  headline,
  subtitle,
  checklist,
  testimonial,
  bottomCard,
  className,
}: AuthBrandPanelProps) {
  return (
    <div
      className={cn(
        "hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col justify-between bg-[#0D1E16] p-10 xl:p-14 text-white relative overflow-hidden shrink-0",
        className,
      )}
    >
      {/* Background ambient lighting/gradient subtle texture */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top: Logo */}
      <div className="relative z-10">
        <AuthLogo variant="white" />
      </div>

      {/* Center: Main message and features */}
      <div className="relative z-10 my-auto py-10 max-w-lg">
        <h1 className="font-fraunces text-3xl xl:text-5xl font-normal leading-[1.15] text-white tracking-tight mb-4">
          {headline}
        </h1>
        <p className="text-emerald-100/70 text-sm xl:text-base leading-relaxed mb-8">
          {subtitle}
        </p>

        {checklist && checklist.length > 0 && (
          <div className="space-y-5">
            {checklist.map((item, index) => (
              <div key={index} className="flex items-start gap-3.5">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    {item.title}
                  </h2>
                  <p className="text-xs xl:text-sm text-emerald-100/60 mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom: Testimonial or Context Card */}
      <div className="relative z-10">
        {testimonial && (
          <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-4 xl:p-5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#84CC16] text-[#0D1E16] font-bold text-xs flex items-center justify-center shrink-0 shadow-inner">
                {testimonial.avatarInitials}
              </div>
              <div className="min-w-0">
                <p className="text-xs xl:text-sm text-white/90 font-normal leading-snug">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <p className="text-[11px] xl:text-xs text-emerald-100/60 mt-1 font-medium">
                  {testimonial.author}
                </p>
              </div>
            </div>
          </div>
        )}

        {bottomCard && (
          <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-4 xl:p-5 backdrop-blur-sm">
            {bottomCard.eyebrow && (
              <span className="block text-[10px] uppercase font-bold tracking-widest text-emerald-300/80 mb-1.5">
                {bottomCard.eyebrow}
              </span>
            )}
            <p className="text-xs xl:text-sm text-white/90 leading-relaxed">
              {bottomCard.text}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
