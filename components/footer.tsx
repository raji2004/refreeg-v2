"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import {
  Linkedin,
  Youtube,
} from "lucide-react";

import {
  FaFacebookF,
  FaInstagram,
  FaTiktok,
  FaXTwitter,
} from "react-icons/fa6";

import { legalLinks, socialLinks } from "@/lib/links";

gsap.registerPlugin(ScrollTrigger);

const footerColumns = [
  {
    title: "GIVE",
    links: [
      { label: "Discover causes", href: "/causes" },
      { label: "Recurring giving", href: "/petitions" },
      { label: "Import portfolio", href: "/businesses" },
      { label: "Tax receipts", href: "/healthcare" },
    ],
  },
  {
    title: "RAISE",
    links: [
      { label: "Launch a campaign", href: "/how-it-works" },
      { label: "Steward program", href: "/#faq" },
      { label: "Verification", href: "/crowdfund/fees" },
      { label: "Embed receipts", href: "/docs/api" },
    ],
  },
  {
    title: "TRUST",
    links: [
      { label: "Block explorer", href: "/how-it-works" },
      { label: "Fee policy", href: "/#faq" },
      { label: "Smart contracts", href: "/how-it-works" },
      { label: "Audits", href: "/#faq" },
    ],
  },
  {
    title: "COMPANY",
    links: [
      { label: "About", href: "/how-it-works" },
      { label: "Press", href: "/#faq" },
      { label: "Careers", href: "/how-it-works" },
      { label: "Contact", href: "/#faq" },
    ],
  },
];

const socialItems = [
  { href: socialLinks.twitter, icon: <FaXTwitter className="h-4 w-4" /> },
  { href: socialLinks.instagram, icon: <FaInstagram className="h-4 w-4" /> },
  { href: socialLinks.linkedin, icon: <Linkedin className="h-4 w-4" /> },
  { href: socialLinks.tiktok, icon: <FaTiktok className="h-4 w-4" /> },
  { href: socialLinks.Facebook, icon: <FaFacebookF className="h-4 w-4" /> },
  { href: socialLinks.Youtube, icon: <Youtube className="h-4 w-4" /> },
];

export function Footer() {
  const year = new Date().getFullYear();
  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: footerRef.current,
          start: "top 80%",
        },
      });

      // 1. Logo (big reveal)
      tl.from(".footer-logo", {
        y: 60,
        opacity: 0,
        scale: 0.9,
        duration: 1,
        ease: "power4.out",
      })

        // 2. Brand message (soft blur + slide)
        .from(
          ".footer-brand",
          {
            y: 40,
            opacity: 0,
            filter: "blur(8px)",
            duration: 0.8,
            ease: "power3.out",
          },
          "-=0.6"
        )

        // 3. Link columns (strong stagger for visibility)
        .from(
          ".footer-columns > div",
          {
            y: 70,
            opacity: 0,
            scale: 0.9,
            rotateX: 10,
            transformOrigin: "top",
            stagger: 0.12,
            duration: 0.9,
            ease: "back.out(1.4)",
          },
          "-=0.5"
        )

        // 4. Social row (pop-in effect)
        .from(
          ".footer-social",
          {
            y: 30,
            opacity: 0,
            scale: 0.85,
            duration: 0.7,
            ease: "elastic.out(1, 0.6)",
          },
          "-=0.5"
        )

        // 5. Bottom section (clean finish)
        .from(
          ".footer-bottom",
          {
            y: 25,
            opacity: 0,
            duration: 0.6,
            ease: "power2.out",
          },
          "-=0.4"
        );

    }, footerRef);

    return () => ctx.revert();
  }, []);

  return (
    <footer ref={footerRef} className="bg-background text-black">

      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">

        {/* Logo */}
        <div className="pb-4 footer-logo">
          <Image
            src="/logo.svg"
            alt="RefreeG"
            width={1920}
            height={200}
            className="h-auto w-full"
          />
        </div>

        {/* Main Section */}
        <div className="grid items-center gap-14 py-4 lg:grid-cols-[0.25fr_0.75fr]">

          {/* Brand Message */}
          <div className="footer-brand">
            <p className="mt-4 max-w-lg text-[#0A3CB5] text-sm leading-snug">
              Global giving, on-chain. Built so every dollar is traceable from your
              wallet to the moment it lands.
            </p>
          </div>

          {/* Link Columns */}
          <div className="grid grid-cols-2 gap-10 md:grid-cols-4 footer-columns">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em]">
                  {column.title}
                </h3>

                <ul className="mt-5 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm transition-colors hover:text-[#0A3CB5]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Social + Language */}
        <div className="footer-social flex flex-col gap-6 pt-8 pb-4 md:flex-row md:items-center md:justify-between">

          <div className="flex items-center border p-2 rounded-xl gap-3 text-sm">
            <Image
              src="https://flagcdn.com/us.svg"
              width={30}
              height={20}
              unoptimized
              alt="United States"
            />
            <span>United States · English</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {socialItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border transition-all hover:-translate-y-1 hover:bg-muted"
              >
                {item.icon}
              </Link>
            ))}
          </div>
        </div>

        {/* Legal + App Stores */}
        <div className="footer-bottom w-full flex flex-col gap-8 py-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="w-3/4 flex flex-col gap-4 lg:flex-row lg:items-center">
            <p className="text-sm">
              © {year} RefreeG
            </p>

            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {legalLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.route}
                  className="text-sm transition-colors hover:text-[#0A3CB5]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="w-1/4 flex items-center gap-3">
            <Link href="/" aria-label="App Store">
              <Image
                src="/appstorebadge.svg"
                alt="App Store"
                width={140}
                height={42}
                className="h-10 w-auto"
              />
            </Link>

            <Link href="/" aria-label="Google Play">
              <Image
                src="/googleplay.svg"
                alt="Google Play"
                width={140}
                height={42}
                className="h-10 w-auto"
              />
            </Link>
          </div>

        </div>

        {/* Disclaimer */}
        <div className="pt-4">
          <p className="max-w-6xl text-xs font-medium leading-tight">
            RefreeG is a next-generation decentralized philanthropy
            infrastructure. All campaign funds are held in secure,
            milestone-locked smart contract escrows and are only released upon
            verified cryptographic or visual proof of spending.
            <br />
            <br />
            By utilizing this platform, you acknowledge that blockchain
            transactions are irreversible and that RefreeG operates as a
            technological governance layer, not a traditional financial
            institution or charitable trust.
            <br />
            <br />© 2026 RefreeG Labs Inc. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
}