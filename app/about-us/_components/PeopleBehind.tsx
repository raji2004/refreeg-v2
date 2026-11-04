import Image from "next/image";
import { ArrowRight } from "lucide-react";

const TEAM_LINK = "https://t.me/+ibsgFy6SL0AwYmE8";

export function PeopleBehind() {
  return (
    <section className="relative aspect-[4/5] overflow-hidden rounded-xl sm:aspect-[1312/680]">
      <Image
        src="/about/people-behind.jpg"
        alt="Members of the RefreeG team smiling together"
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between md:p-10">
        <h2 className="font-fraunces text-3xl font-normal leading-tight text-white md:text-5xl">
          The people behind <span className="text-lime">RefreeG</span>
        </h2>
        <a
          href={TEAM_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-blue-accent px-5 py-2.5 text-sm font-medium text-blue-accent-foreground transition-opacity hover:opacity-90"
        >
          Join the team
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}
