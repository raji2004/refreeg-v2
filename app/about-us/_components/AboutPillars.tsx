import Image from "next/image";
import { Heading } from "@/components/marketing/Typography";

const pillars = [
  {
    icon: "/about/checkmark.svg",
    title: "Full transparency",
    description: "Every donation is tracked and reported.",
  },
  {
    icon: "/about/house.svg",
    title: "Grassroots first",
    description: "Local causes get the same reach as big ones.",
  },
  {
    icon: "/about/globe.svg",
    title: "No borders",
    description: "Give to any cause, from anywhere.",
  },
];

export function AboutPillars() {
  return (
    <section className="bg-blue-accent px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto max-w-6xl">
        <Heading className="text-center text-3xl leading-tight text-white">
          Built because people kept asking
          <br />
          <span className="text-lime">where did my money go?</span>
        </Heading>

        <div className="mt-14 grid gap-10 sm:grid-cols-3 md:mt-20">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="flex flex-col items-center text-center sm:items-start sm:text-left"
            >
              <Image
                src={pillar.icon}
                alt=""
                aria-hidden="true"
                width={56}
                height={56}
                className="h-14 w-14"
              />
              <h3 className="mt-5 text-base font-semibold text-lime">
                {pillar.title}
              </h3>
              <p className="mt-2 text-sm text-white/80">{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
