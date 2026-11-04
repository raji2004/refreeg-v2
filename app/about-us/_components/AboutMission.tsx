import Image from "next/image";

const goals = [
  {
    icon: "/about/heart.svg",
    title: "Connect",
    description:
      "Bring together those who want to help and those who need it most.",
  },
  {
    icon: "/about/checkmark.svg",
    title: "Be accountable",
    description:
      "Track and report every donation so backers see where it goes.",
  },
  {
    icon: "/about/bar-chart.svg",
    title: "Grow communities",
    description:
      "Back causes that build socio-economic growth, starting in Africa.",
  },
];

export function AboutMission() {
  return (
    <section className="bg-surface py-16 md:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 md:grid-cols-2 md:gap-16 lg:px-8">
        <Image
          src="/about/give-kindly.png"
          alt="A hand holding RefreeG stickers that read Give Kindly"
          width={616}
          height={600}
          sizes="(max-width: 768px) 100vw, 50vw"
          className="mx-auto h-auto w-full max-w-lg"
        />

        <div className="max-w-md">
          <h2 className="font-fraunces text-4xl font-normal text-ink md:text-5xl">
            Our <span className="text-blue-accent">mission</span>
          </h2>

          <ul className="mt-8 space-y-6">
            {goals.map((goal) => (
              <li key={goal.title} className="flex items-start gap-4">
                <Image
                  src={goal.icon}
                  alt=""
                  aria-hidden="true"
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0"
                />
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    {goal.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink/70">
                    {goal.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
