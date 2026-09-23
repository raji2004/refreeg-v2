"use client";

import Image from "next/image";
import React from "react";
import { Button } from "../ui/button";

export default function HelpCreators() {
  const steps = [
    {
      id: 1,
      img: "/star1.png",
      title: "Smart Discovery",
      text: "Your unique tag and URL make you searchable and shareable across RefreeG and beyond — helping more supporters find you faster.",
    },
    {
      id: 2,
      img: "/star2.png",
      title: " Built-In Promotion Tools",
      text: "Share updates, add media, and use our one-click social sharing features to spread your cause everywhere.",
    },
    {
      id: 3,
      img: "/star3.png",
      title: "Stronger Donor Trust",
      text: "Our transparent verification system gives supporters the confidence to give more, knowing your cause is authentic and safe.",
    },
    {
      id: 4,
      img: "/star4.png",
      title: "Global Donations, Multiple Currencies",
      text: "Accept contributions in local currency, dollars, or crypto — removing barriers and letting anyone in the world support you instantly.",
    },
    {
      id: 5,
      img: "/star5.png",
      title: " Creator Insights",
      text: "Track donations, monitor growth, and see what works best with built-in analytics to refine your strategy and maximize funding.",
    },
    {
      id: 6,
      img: "/star6.png",
      title: "Don’t Just Raise Money — Grow It.",
      text: "With RefreeG Boost, creators can stake part of their raised funds in secure liquidity pools and earn yield — making every donation work harder for them.",
    },
  ];

  return (
    <div className="w-full px-10 py-12 flex flex-col items-center text-center">
      {}
      <div className="mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
          Designed to help creators{" "}
          <span className="text-gray-500"> earn more</span>
        </h2>
        <p className="text-gray-600 text-lg leading-relaxed">
          With RefreeG, you’re never alone. Claim your tag, share your story,
          and watch your community grow in just a few simple steps.
          <br />
          Our step-by-step process makes your cause transparent, trustworthy,
          and ready to attract real support.
        </p>
      </div>

      {}
      <div className="w-full flex flex-wrap justify-between gap-y-10 ">
        {steps.map((step) => (
          <div
            key={step.id}
            className="flex items-start gap-4 w-full md:w-[48%] text-left"
          >
            <Image
              src={step.img}
              width={70}
              height={70}
              alt={step.title}
              className="flex-shrink-0"
            />
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {step.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">{step.text}</p>
            </div>
          </div>
        ))}
      </div>
      <Button className="mt-12 bg-secondary hover:bg-blue-500 text-white px-8 py-4 rounded-full flex items-center gap-2">
        <Image
          src="/images/plasticpricetag.png"
          height={20}
          width={20}
          alt="get started"
          className="ml-2"
        />
        Claim your tag today
        <Image
          src="/images/chevronRight3.svg"
          height={16}
          width={16}
          alt="get started"
          className="ml-2"
        />
      </Button>
    </div>
  );
}
