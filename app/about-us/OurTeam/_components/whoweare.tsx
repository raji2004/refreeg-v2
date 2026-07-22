"use client";

import React from "react";
import TeamMember from "./TeamMember";
import SectionHeader from "./SectionHeader";
import { motion, useAnimation } from "framer-motion";
import { useAnimateInView } from "@/hooks/use-animate-In-view";

const TEAM = [
  {
    imageSrc: "/images/tega.png",
    name: "Oghenetega Victor Gbiyede",
    role: "COO",
    location: "Abuja, NG",
  },
  {
    imageSrc: "/images/ayo.png",
    name: "David Ayomikun Akintunde",
    role: "UI/UX Designer",
    location: "Abuja, NG",
  },
  {
    imageSrc: "/images/nomso.png",
    name: "Nomso",
    role: "CFO",
    location: "Lagos, NG",
  },
];

const CARD_GAP = 24;
const CARD_WIDTH = 250;
const SLIDER_SPEED = 50;

function MobileTeamSlider() {
  const { ref, isInView } = useAnimateInView({ once: true, margin: "-50px" });
  const sliderControls = useAnimation();
  // TEAM is a fixed-size module-level constant, so calling useAnimation()
  // a fixed number of times here (rather than inside TEAM.map) keeps hook
  // calls unconditional and in the same order on every render.
  const teamControl0 = useAnimation();
  const teamControl1 = useAnimation();
  const teamControl2 = useAnimation();
  const itemControls = [teamControl0, teamControl1, teamControl2].slice(
    0,
    TEAM.length,
  );

  if (isInView) {
    (async () => {
      await Promise.all(
        itemControls.map((c) =>
          c.start({
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, ease: "easeOut" },
          }),
        ),
      );

      const totalWidth = TEAM.length * (CARD_WIDTH + CARD_GAP);
      sliderControls.start({
        x: -totalWidth,
        transition: {
          repeat: Infinity,
          repeatType: "loop",
          duration: SLIDER_SPEED,
          ease: "linear",
        },
      });
    })();
  }

  return (
    <motion.div
      ref={ref}
      className="flex gap-6 w-max"
      animate={sliderControls}
      initial={{ x: 0 }}
    >
      {[...TEAM, ...TEAM, ...TEAM].map((m, idx) => (
        <motion.div
          key={`${m.name}-${idx}`}
          className="flex-shrink-0 flex justify-center items-center"
          style={{ width: CARD_WIDTH, height: CARD_WIDTH + 70 }}
          initial={{ opacity: 0, y: 30 }}
          animate={itemControls[idx % TEAM.length]}
        >
          <TeamMember
            imageSrc={m.imageSrc}
            name={m.name}
            role={m.role}
            location={m.location}
            width={250}
            height={250}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

function DesktopTeamGrid() {
  const { ref, isInView } = useAnimateInView({ once: true, margin: "-50px" });

  const getGridCols = (teamSize: number) => {
    if (teamSize <= 2) return "grid-cols-1 md:grid-cols-2";
    if (teamSize === 3) return "grid-cols-1 md:grid-cols-3";
    if (teamSize === 4) return "grid-cols-2 md:grid-cols-2";
    if (teamSize <= 6) return "grid-cols-2 md:grid-cols-3";
    return "grid-cols-2 md:grid-cols-4";
  };

  return (
    <div className="hidden md:block w-full max-w-6xl mx-auto mt-10">
      <motion.div
        ref={ref}
        className={`grid ${getGridCols(
          TEAM.length,
        )} gap-8 items-center justify-items-center`}
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8 }}
      >
        {TEAM.map((member, index) => (
          <motion.div
            key={member.name}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <TeamMember
              imageSrc={member.imageSrc}
              name={member.name}
              role={member.role}
              location={member.location}
              width={280}
              height={280}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export default function WhoWeAre() {
  return (
    <div className="flex items-center flex-col justify-center px-6 md:px-10 py-16 text-black ">
      <SectionHeader
        title="Who are"
        highlight="We"
        subtitle="Meet the minds behind RefreeG"
      />

      <div className="md:hidden mt-10 w-full overflow-hidden h-fit py-5">
        <MobileTeamSlider />
      </div>

      <DesktopTeamGrid />
    </div>
  );
}
