import Image from "next/image";

import { perks } from "../_data/community";
import { Heading } from "@/components/marketing/Typography";

export function CommunityPerks() {
  return (
    <section className="bg-brand-blue px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto max-w-6xl">
        <Heading className="text-center text-3xl leading-tight text-brand-blue-foreground">
          Funded causes aren&apos;t lucky.
          <br />
          <span className="text-lime">They&apos;re backed by people.</span>
        </Heading>

        <div className="mt-14 grid gap-10 sm:grid-cols-3 md:mt-20">
          {perks.map((perk) => (
            <div
              key={perk.title}
              className="flex flex-col items-center text-center sm:items-start sm:text-left"
            >
              <Image
                src={perk.icon}
                alt=""
                aria-hidden="true"
                width={56}
                height={56}
                className="h-14 w-14"
              />
              <h3 className="mt-5 text-base font-semibold text-lime">
                {perk.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-blue-foreground/80">
                {perk.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
