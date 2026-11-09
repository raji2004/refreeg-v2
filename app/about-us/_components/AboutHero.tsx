import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const stickers = [
  {
    src: "/about/heart.svg",
    className: "left-0 top-[16%] w-16 -rotate-12 xl:w-20",
  },
  {
    src: "/about/trophy.svg",
    className: "left-[3%] top-[58%] w-14 rotate-6 xl:w-16",
  },
  {
    src: "/about/flag.svg",
    className: "right-0 top-[2%] w-16 rotate-12 xl:w-[72px]",
  },
  {
    src: "/about/wallet.svg",
    className: "right-[2%] top-[50%] w-14 -rotate-6 xl:w-[68px]",
  },
];

export function AboutHero() {
  return (
    <section className="bg-surface px-4 pb-12 pt-10 sm:px-6 md:pb-16 md:pt-16">
      <div className="relative mx-auto flex max-w-6xl flex-col items-center text-center">
        {stickers.map((sticker) => (
          <Image
            key={sticker.src}
            src={sticker.src}
            alt=""
            aria-hidden="true"
            width={140}
            height={140}
            className={`pointer-events-none absolute hidden h-auto select-none lg:block ${sticker.className}`}
          />
        ))}

        <span className="inline-flex items-center gap-2 rounded-full bg-lime px-3 py-1 text-xs font-medium text-ink">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-accent" />
          About Refreeg
        </span>

        <h1 className="mt-6 max-w-3xl font-fraunces lg:max-w-[46rem] text-4xl font-normal leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-6xl lg:text-7xl">
          We connect people who care with causes that{" "}
          <span className="text-blue-accent">matter.</span>
        </h1>

        <p className="mt-6 max-w-md text-sm leading-relaxed text-ink/70 md:text-base">
          Refreeg is a transparent crowdfunding platform. Every donation is
          tracked, so you can see exactly where your money lands.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/dashboard/causes/create"
            className="inline-flex items-center gap-2 rounded-full bg-blue-accent px-6 py-3 text-sm font-medium text-blue-accent-foreground transition-opacity hover:opacity-90"
          >
            Start a cause
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/causes"
            className="inline-flex items-center rounded-full border border-ink px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
          >
            Discover causes
          </Link>
        </div>
      </div>
    </section>
  );
}
