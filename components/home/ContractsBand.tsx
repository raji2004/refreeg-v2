import Image from "next/image";
import Link from "next/link";

const proofs = [
  {
    label: "Public block explorer",
    href: "/how-it-works",
    icon: "/faq/book.svg",
  },
  {
    label: "2.4s median settlement",
    href: "/how-it-works",
    icon: "/faq/clock.svg",
  },
  {
    label: "Our fee policy",
    href: "/crowdfund/fees",
    icon: "/faq/currency.svg",
  },
];

export function ContractsBand() {
  return (
    <section className="relative overflow-hidden bg-brand-blue">
      <div
        aria-hidden="true"
        className="absolute -top-[clamp(3rem,10vw,9rem)] left-1/2 h-[clamp(5rem,16vw,14rem)] w-[160%] -translate-x-1/2 rounded-[50%] bg-surface"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-[clamp(3rem,10vw,9rem)] left-1/2 h-[clamp(5rem,16vw,14rem)] w-[160%] -translate-x-1/2 rounded-[50%] bg-surface"
      />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 py-[clamp(7rem,20vw,16rem)] text-center sm:px-6">
        <h2 className="max-w-2xl font-fraunces text-4xl font-normal leading-[1.1] text-brand-blue-foreground sm:text-5xl md:text-6xl">
          Powered by audited <span className="text-lime">smart contracts.</span>
        </h2>

        <ul className="mt-14 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-12 md:mt-20">
          {proofs.map(({ label, href, icon }) => (
            <li key={label}>
              <Link
                href={href}
                className="group flex items-center gap-4 text-sm text-lime"
              >
                <Image
                  src={icon}
                  alt=""
                  aria-hidden="true"
                  width={72}
                  height={72}
                  className="h-14 w-14 shrink-0 md:h-16 md:w-16"
                />
                <span className="group-hover:underline">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
