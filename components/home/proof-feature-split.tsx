import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

interface ProofFeatureContent {
  eyebrow: string;
  headingStart: string;
  headingAccent: string;
  headingEnd?: string;
  description: string;
  bullets: Array<{ title: string; body: string }>;
  ctaLabel: string;
  ctaHref: string;
}

const sectionVariants = cva(
  "flex flex-col px-6 py-14 sm:px-10 md:px-12 lg:px-14 lg:py-20",
  {
    variants: {
      variant: {
        light: "bg-[#e8e4d8] text-[#132326]",
        dark: "bg-[#0F1422] text-[#f2efe8]",
        blue: "bg-[#1847cf] text-[#f2efe8]",
      },
    },
    defaultVariants: {
      variant: "light",
    },
  },
);

const eyebrowLineVariants = cva("h-px w-8", {
  variants: {
    variant: {
      light: "bg-[#2f5c5a]",
      dark: "bg-[#b5e02e]",
      blue: "bg-[#b5e02e]",
    },
  },
  defaultVariants: {
    variant: "light",
  },
});

const eyebrowTextVariants = cva("text-xs font-semibold uppercase tracking-[0.24em]", {
  variants: {
    variant: {
      light: "text-[#355e59]",
      dark: "text-[#b5e02e]",
      blue: "text-[#b5e02e]",
    },
  },
  defaultVariants: {
    variant: "light",
  },
});

const accentWordVariants = cva("italic", {
  variants: {
    variant: {
      light: "text-[#1847cf]",
      dark: "text-[#b5e02e]",
      blue: "text-[#b5e02e]",
    },
  },
  defaultVariants: {
    variant: "light",
  },
});

const descriptionVariants = cva("mt-6 max-w-[60ch] text-[17px] leading-8", {
  variants: {
    variant: {
      light: "text-[#2f3d40]",
      dark: "text-[#96a4c9]",
      blue: "text-[#b9c7ee]",
    },
  },
  defaultVariants: {
    variant: "light",
  },
});

const dividerVariants = cva("border-t", {
  variants: {
    variant: {
      light: "border-[#d7d2c6]",
      dark: "border-[#1c2b58]",
      blue: "border-[#3a63d8]",
    },
  },
  defaultVariants: {
    variant: "light",
  },
});

const bulletSquareVariants = cva("mt-1.5 inline-block h-2 w-2 shrink-0", {
  variants: {
    variant: {
      light: "bg-[#0f1d20]",
      dark: "bg-[#b5e02e]",
      blue: "bg-[#b5e02e]",
    },
  },
  defaultVariants: {
    variant: "light",
  },
});

const bulletTitleVariants = cva("font-semibold", {
  variants: {
    variant: {
      light: "text-[#1a272a]",
      dark: "text-[#e9edf8]",
      blue: "text-[#f2f5ff]",
    },
  },
  defaultVariants: {
    variant: "light",
  },
});

const bulletBodyVariants = cva("ml-2", {
  variants: {
    variant: {
      light: "text-[#36454a]",
      dark: "text-[#9ba8cc]",
      blue: "text-[#d0d9f6]",
    },
  },
  defaultVariants: {
    variant: "light",
  },
});

const buttonVariants = cva(
  "mt-10 inline-flex w-fit items-center gap-2 rounded-full px-8 py-4 text-base font-semibold transition-colors",
  {
    variants: {
      variant: {
        light: "bg-[#1546cc] text-white hover:bg-[#103cae]",
        dark: "bg-[#b5e02e] text-[#0d1a3c] hover:bg-[#a6d127]",
        blue: "bg-[#b5e02e] text-[#0d1a3c] hover:bg-[#a6d127]",
      },
    },
    defaultVariants: {
      variant: "light",
    },
  },
);

export interface ProofFeatureSectionProps extends VariantProps<typeof sectionVariants> {
  content: ProofFeatureContent;
  className?: string;
}

export function ProofFeatureSection({ content, variant = "light", className }: ProofFeatureSectionProps) {
  return (
    <article className={cn(sectionVariants({ variant }), className)}>
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className={eyebrowLineVariants({ variant })} />
        <p className={eyebrowTextVariants({ variant })}>{content.eyebrow}</p>
      </div>

      <h2 className="mt-6 max-w-[13ch] font-serif text-5xl leading-[1.12] sm:text-6xl">
        {content.headingStart}
        <span className={accentWordVariants({ variant })}> {content.headingAccent}</span>
        {content.headingEnd ? ` ${content.headingEnd}` : ""}
      </h2>

      <p className={descriptionVariants({ variant })}>{content.description}</p>

      <div className={cn("mt-9", dividerVariants({ variant }))}>
        {content.bullets.map((item) => (
          <div key={item.title} className={cn("grid grid-cols-[12px_1fr] gap-2 py-5", dividerVariants({ variant }))}>
            <span aria-hidden="true" className={bulletSquareVariants({ variant })} />
            <p className="text-[1.15rem] leading-7">
              <span className={bulletTitleVariants({ variant })}>{item.title}</span>
              <span className={bulletBodyVariants({ variant })}>{item.body}</span>
            </p>
          </div>
        ))}
      </div>

      <Link href={content.ctaHref} className={buttonVariants({ variant })}>
        {content.ctaLabel}
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </article>
  );
}

const leftContent: ProofFeatureContent = {
  eyebrow: "For the people who give",
  headingStart: "Proof, not",
  headingAccent: "promises.",
  description:
    "Stop wondering if your ₦50 turned into uniforms or overhead. With RefreeG you watch it become uniforms with a receipt to prove it.",
  bullets: [
    { title: "Live tracking", body: "from donation to delivery." },
    { title: "Tax-ready receipts", body: "auto-generated for every contribution." },
    { title: "Recurring giving", body: "with full visibility on each cycle." },
    { title: "Impact portfolio", body: "showing your lifetime giving on-chain." },
  ],
  ctaLabel: "Start giving",
  ctaHref: "/causes",
};

const rightContent: ProofFeatureContent = {
  eyebrow: "For the people who rally",
  headingStart: "Mobilise without",
  headingAccent: "risk",
  headingEnd: "to your name.",
  description:
    "Your audience trusts you. RefreeG hands them proof so they keep trusting you. Launch a campaign your community can audit themselves.",
  bullets: [
    { title: "Launch in 6 minutes", body: "with built-in verification." },
    { title: "Public ledger", body: "your supporters can audit themselves." },
    { title: "Embed receipts", body: "directly into posts, threads, and streams." },
    { title: "Multi-steward governance", body: "so no single party controls the funds." },
  ],
  ctaLabel: "Start a campaign",
  ctaHref: "/dashboard/causes/create",
};

export default function ProofFeatureSplit() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2">
      <ProofFeatureSection variant="light" content={leftContent} />
      <ProofFeatureSection variant="dark" content={rightContent} />
    </section>
  );
}
