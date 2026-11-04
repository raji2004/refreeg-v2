import Image from "next/image";
import Link from "next/link";
import { FaTelegramPlane } from "react-icons/fa";

import { COMMUNITY_LINK } from "../_data/community";

const stickers = [
  {
    src: "/about/heart.svg",
    className: "left-0 top-[12%] w-16 -rotate-12 xl:w-20",
  },
  {
    src: "/about/globe.svg",
    className: "left-[4%] top-[60%] w-14 rotate-6 xl:w-16",
  },
  {
    src: "/about/house.svg",
    className: "right-0 top-[4%] w-16 rotate-12 xl:w-[72px]",
  },
  {
    src: "/about/bar-chart.svg",
    className: "right-[3%] top-[54%] w-14 -rotate-6 xl:w-[68px]",
  },
];

export function CommunityHero() {
  return (
    <section className="bg-surface px-4 pb-14 pt-10 sm:px-6 md:pb-20 md:pt-16">
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
          <span className="h-1.5 w-1.5 rounded-full bg-brand-blue" />
          RefreeG community
        </span>

        <h1 className="mt-6 max-w-3xl font-fraunces text-4xl font-normal leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-6xl lg:max-w-[46rem] lg:text-7xl">
          Your community is your{" "}
          <span className="text-brand-blue">funding engine.</span>
        </h1>

        <p className="mt-6 max-w-md text-sm leading-relaxed text-ink/70 md:text-base">
          On RefreeG, funding comes from people. Join our Telegram community to
          meet donors, share your story and turn supporters into backers.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <a
            href={COMMUNITY_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-brand-blue px-6 py-3 text-sm font-medium text-brand-blue-foreground transition-opacity hover:opacity-90"
          >
            <FaTelegramPlane className="h-4 w-4" aria-hidden="true" />
            Join on Telegram
          </a>
          <Link
            href="/dashboard/causes/create"
            className="inline-flex items-center rounded-full border border-ink px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
          >
            Start a cause
          </Link>
        </div>
      </div>
    </section>
  );
}
