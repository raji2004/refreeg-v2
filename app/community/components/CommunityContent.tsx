"use client";

import Link from "next/link";
import { FaTelegramPlane } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { motion, useInView, Variants } from "framer-motion";
import { useEffect, useState, useRef } from "react";

const COMMUNITY_LINK = "https://t.me/+ibsgFy6SL0AwYmE8";
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.15, ease: "easeOut" },
  }),
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

function AnimatedCounter({ value, label }: { value: string; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const numericValue = parseInt(value.replace(/[^0-9]/g, ""));
  const suffix = value.replace(/[0-9]/g, "");

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const duration = 2000;
      const stepTime = Math.abs(Math.floor(duration / numericValue));

      const timer = setInterval(() => {
        start += 1;
        setCount(start);
        if (start >= numericValue) {
          clearInterval(timer);
          setCount(numericValue);
        }
      }, 30);

      return () => clearInterval(timer);
    }
  }, [isInView, numericValue]);

  return (
    <div ref={ref} className="text-center space-y-2">
      <div className="text-4xl md:text-5xl font-bold text-[#0C4A85] font-fraunces">
        {count}
        {suffix}
      </div>
      <div className="text-sm md:text-base text-gray-600 font-medium uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

export default function CommunityContent() {
  return (
    <div className="min-h-screen bg-white font-montserrat">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-[#0C4A85]/5 -z-10" />
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <motion.h1
            custom={0}
            variants={fadeInUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight text-[#0C4A85] leading-[1.1] font-fraunces"
          >
            Your Community Is Your <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0C4A85] to-blue-500">
              Funding Engine
            </span>
          </motion.h1>

          <motion.p
            custom={1}
            variants={fadeInUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed"
          >
            On RefreeG, funding doesn’t comes from people. Join our Telegram
            community to connect with donors, share your story, and turn
            supporters into funders.
          </motion.p>

          <motion.div
            custom={2}
            variants={fadeInUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
          >
            <Button
              asChild
              size="lg"
              className="bg-[#0088cc] hover:bg-[#0077b5] text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3"
            >
              <Link
                href={COMMUNITY_LINK}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaTelegramPlane className="w-5 h-5" />
                Join Our Telegram Community
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="px-8 py-6 text-lg rounded-full border-[#0C4A85] text-[#0C4A85] hover:bg-[#0C4A85]/5"
            >
              <Link href="/causes/create">Start a Campaign</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={containerVariants}
            className="bg-[#0C4A85] text-white rounded-[32px] md:rounded-[40px] p-8 md:p-14 shadow-sm"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold font-fraunces mb-4">
                How the Community Helps You Get Funded
              </h2>
              <p className="text-lg text-blue-100 max-w-2xl mx-auto">
                Successful campaigns on RefreeG aren nurtured. Here’s how our
                community accelerates your fundraising journey.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: "Amplify Your Cause",
                  description:
                    "Share your campaign with a built-in audience of active donors. Word-of-mouth is the #1 driver of successful fundraisers.",
                },
                {
                  title: "Build Trust & Credibility",
                  description:
                    "Engage directly with potential backers and showcase transparency. An active presence increases donor confidence significantly.",
                },
                {
                  title: "Get Feedback & Mentorship",
                  description:
                    "Learn from experienced campaigners. Get actionable advice on storytelling and milestone planning before you launch.",
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  custom={index + 1}
                  variants={fadeInUp}
                  className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20 hover:bg-white/20 transition-colors"
                >
                  <h3 className="text-xl font-semibold mb-3 font-fraunces">
                    {item.title}
                  </h3>
                  <p className="text-blue-100 leading-relaxed">
                    {item.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-bold text-[#0C4A85] font-fraunces"
          >
            Real Impact, Powered by People
          </motion.h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <AnimatedCounter value="100+" label="Active Members" />
            <AnimatedCounter value="20+" label="Campaigns Shared" />
            <AnimatedCounter value="1000+" label="Donor Connections" />
            <AnimatedCounter value="3x" label="Success Rate Boost" />
          </div>
        </div>
      </section>

      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-5xl font-bold leading-tight text-[#0C4A85] font-fraunces"
          >
            Don’t Fundraise Alone.
            <br />
            Let the Community Carry You.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-slate-600 max-w-2xl mx-auto"
          >
            Whether you’re launching your first campaign or scaling an existing
            one, the RefreeG community is ready to support, share, and fund your
            vision.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Button
              asChild
              size="lg"
              className="bg-[#0C4A85] text-white hover:bg-[#0a3a6a] px-10 py-6 text-xl rounded-full shadow-lg hover:shadow-xl transition-all duration-300 inline-flex items-center gap-3"
            >
              <Link
                href={COMMUNITY_LINK}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaTelegramPlane className="w-6 h-6" />
                Join Now — It’s Free
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
