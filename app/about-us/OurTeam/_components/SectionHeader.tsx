"use client";

import { motion } from "framer-motion";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.2, ease: "easeOut" as any },
  }),
};

type SectionHeaderProps = {
  title: string;
  highlight?: string;
  subtitle?: string;
  align?: "left" | "center" | "right";
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
};

export default function SectionHeader({
  title,
  highlight,
  subtitle,
  align = "center",
  className = "",
  titleClassName = "",
  subtitleClassName = "",
}: SectionHeaderProps) {
  const alignment =
    align === "left"
      ? "items-start text-left"
      : align === "right"
        ? "items-end text-right"
        : "items-center text-center";

  return (
    <div
      className={`flex flex-col ${alignment} justify-center gap-[15px] ${className}`}
    >
      <motion.h2
        className={`text-[64px] font-montserrat font-bold ${titleClassName}`}
        custom={0}
        variants={fadeInUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
      >
        {title}
        {highlight ? <span className="text-gray-400"> {highlight}</span> : null}
      </motion.h2>
      {subtitle ? (
        <motion.p
          className={`text-2xl ${subtitleClassName}`}
          custom={1}
          variants={fadeInUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {subtitle}
        </motion.p>
      ) : null}
    </div>
  );
}
