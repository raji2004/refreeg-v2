"use client";

import React from "react";
import Image from "next/image";

export function RoutedOnChain() {
  return (
    <>
        <section className="relative h-screen w-full overflow-hidden mt-8 md:mt-12 lg:mt-16 rounded-lg shadow-lg">
        {/* Background Image */}
        <Image
            src="/routed-funds.svg"
            alt="Routed on chain illustration"
            fill
            priority
            className="object-cover"
        />

        {/* Optional Dark Overlay */}
        <div className="absolute inset-0" />

        {/* Content */}
        <div className="relative z-10 flex h-full items-center justify-center px-6">
            <div className="max-w-4xl text-center">
            <h2 className="text-3xl md:text-5xl lg:text-7xl font-medium leading-tight">
                $48.2M routed <br /> on-chain. Zero <br />lost in translation.
            </h2>
            </div>
        </div>
        </section>

        <section className="flex w-full space-x-8 py-16">
            <div className="w-1/2 px-4">
                <Image
                    src="/trust-with-proof.svg"
                    alt="For the people illustration"
                    width={1200}
                    height={1200}
                    className="w-full rounded-lg"
                />
            </div>
            <div className="w-1/2">
                <div className="mb-4 text-2xl font-semibold">
                    We replaced trust with proof.<br /> Every action produces a verifiable<br /> artifact you own.
                </div>
                <div className="border-b pb-4 mb-8">
                   <div className="flex items-start gap-4 w-11/12">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border">
                        1
                    </div>

                    <div className="space-y-3">
                        <div className="font-semibold text-lg">
                        Pick a vetted cause.
                        </div>

                        <div className="text-sm">
                        Every campaign is identity-verified, KYB-checked, and signed by a steward.
                        Browse education, climate, medical, and disaster relief.
                        </div>
                    </div>
                </div>
                </div>

                <div className="border-b pb-4 mb-8">
                   <div className="flex items-start gap-4 w-11/12">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border">
                        2
                    </div>

                    <div className="space-y-3">
                        <div className="font-semibold text-lg">
                        Send. It settles in seconds
                        </div>

                        <div className="text-sm">
                            Pay with card, bank, or wallet. Funds land in an on-chain escrow, releasing only on milestones, 
                            and trigger a receipt minted to your name.
                        </div>
                    </div>
                </div>
                </div>

                <div className="border-b pb-4 mb-8">
                   <div className="flex items-start gap-4 w-11/12">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border">
                        3
                    </div>

                    <div className="space-y-3">
                        <div className="font-semibold text-lg">
                            Follow it all the way home.
                        </div>

                        <div className="text-sm">
                        Photo proof. Vendor receipts. Field updates. Every milestone is timestamped on-chain and pushed 
                        to your inbox so you see exactly where your money landed.
                        </div>
                    </div>
                </div>
                </div>                

                
            </div>
        </section>
    </>
  );
}