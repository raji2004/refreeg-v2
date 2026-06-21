"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Icons } from "@/components/icons";
import { useAuth } from "@/hooks/use-auth";
import { useDonation } from "@/hooks/use-donation";
import { useProfile } from "@/hooks/use-profile";
import { calculateServiceFee } from "@/lib/utils";
import paystack from "@/services/paystack";
import { usePayment } from "@/hooks/use-payment";
import { sendUnfinishedDonationEmail } from "@/services/mail";

const MIN_DONATION_AMOUNT = 100;

interface DonationFormProps {
  causeId: string;
  profile: {
    email?: string;
    name?: string;
    id?: string;
  };
  subaccount?: string;
  status: "pending" | "rejected" | "approved" | "expired";
  causeName?: string; // Add causeName prop
  causeUrl?: string; // Add causeUrl prop for the continue link
  recurring?: "one_time" | "weekly" | "monthly";
  tip?: number;
  initialAmount?: number;
}

export function DonationForm({
  causeId,
  profile,
  status,
  subaccount,
  causeName = "this cause", // Default value
  causeUrl = "/causes", // Default value
  recurring = "one_time",
  tip = 0,
  initialAmount = 0,
}: DonationFormProps) {
  const { initializePayment, isLoading } = usePayment();
  const [formData, setFormData] = useState({
    amount: "",
    name: profile?.name || "",
    email: profile?.email || "",
    message: "",
    isAnonymous: false,
  });
  const [amountError, setAmountError] = useState("");
  const [submitError, setSubmitError] = useState("");

  // Sync internal amount with prop when prop changes
  useEffect(() => {
    if (initialAmount > 0) {
      setFormData((prev) => ({ ...prev, amount: initialAmount.toString() }));
    }
  }, [initialAmount]);

  // Track donation attempt progress
  const [donationAttempt, setDonationAttempt] = useState({
    hasStarted: false,
    startTime: null as number | null,
  });

  // Note: Donations can continue even after the goal is reached
  // The form is only disabled if the cause status is pending or rejected
  const isDisabled =
    status === "pending" || status === "rejected" || status === "expired"
      ? true
      : false;

  // Track when user starts filling donation form
  useEffect(() => {
    const hasStartedFilling =
      formData.amount || formData.name || formData.email;

    if (hasStartedFilling && !donationAttempt.hasStarted) {
      setDonationAttempt({
        hasStarted: true,
        startTime: Date.now(),
      });

      // Save donation attempt to localStorage
      localStorage.setItem(
        "donationAttempt",
        JSON.stringify({
          causeId,
          causeName,
          causeUrl,
          formData: {
            amount: formData.amount,
            // Don't save sensitive info like name/email for privacy
          },
          timestamp: Date.now(),
        }),
      );
    }
  }, [
    formData.amount,
    formData.name,
    formData.email,
    causeId,
    causeName,
    causeUrl,
  ]);

  // Track inactivity and send reminder
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;

    const setupInactivityTracking = () => {
      const savedAttempt = localStorage.getItem("donationAttempt");
      const hasStartedFilling =
        formData.amount || formData.name || formData.email;

      if ((savedAttempt || hasStartedFilling) && !isLoading) {
        // Reset timer on any form interaction
        const resetTimer = () => {
          clearTimeout(inactivityTimer);
          inactivityTimer = setTimeout(sendReminder, 1 * 60 * 60 * 1000); // 1 hour for donations
        };

        // Set up event listeners for form interactions
        const events = ["input", "change", "click", "keydown"];
        events.forEach((event) => {
          document.addEventListener(event, resetTimer, { passive: true });
        });

        // Start the initial timer
        resetTimer();

        // Cleanup function
        return () => {
          clearTimeout(inactivityTimer);
          events.forEach((event) => {
            document.removeEventListener(event, resetTimer);
          });
        };
      }
    };

    const sendReminder = async () => {
      const currentAttempt = localStorage.getItem("donationAttempt");

      if (!currentAttempt || isLoading) return;

      if (profile?.email) {
        try {
          const attemptData = JSON.parse(currentAttempt);
          await sendUnfinishedDonationEmail({
            causeName: attemptData.causeName || causeName,
            continueUrl: `${window.location.origin}${attemptData.causeUrl || causeUrl}`,
          });

          localStorage.removeItem("donationAttempt");
        } catch (error) {
          console.error("Failed to send unfinished donation email:", error);
        }
      }
    };

    const cleanup = setupInactivityTracking();
    return cleanup;
  }, [
    formData.amount,
    formData.name,
    formData.email,
    isLoading,
    profile?.email,
    causeName,
    causeUrl,
  ]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    if (name === "amount" && amountError) {
      setAmountError("");
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isAnonymous: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (Number(formData.amount) < MIN_DONATION_AMOUNT) {
      setAmountError(`Minimum donation is ₦${MIN_DONATION_AMOUNT}.`);
      return;
    }

    // Clear donation attempt when user successfully submits
    localStorage.removeItem("donationAttempt");

    // Map recurring to Paystack Plan IDs
    let plan: string | undefined = undefined;
    if (recurring === "weekly") {
      plan = process.env.NEXT_PUBLIC_PAYSTACK_PLAN_ID_WEEKLY;
    } else if (recurring === "monthly") {
      plan = process.env.NEXT_PUBLIC_PAYSTACK_PLAN_ID_MONTHLY;
    }

    try {
      await initializePayment({
        email: formData.email,
        amount: Number(formData.amount),
        causeId: causeId,
        id: profile.id || undefined,
        full_name: formData.name,
        serviceFee: serviceFee,
        tipAmount: tip,
        plan: plan,
        subaccounts: [
          {
            subaccount: subaccount || "",
            share: Number(formData.amount) * 100,
          },
        ],
        message: formData.message,
        isAnonymous: formData.isAnonymous,
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to initialize payment. Please try again.",
      );
    }
  };

  const donationAmount = Number(formData.amount) || 0;
  const serviceFee = calculateServiceFee(donationAmount);
  const totalAmount = donationAmount + serviceFee + tip;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Make a Donation</CardTitle>
        <CardDescription>
          Your contribution helps make a difference
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Donation Amount (₦)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              placeholder="Enter amount in Naira"
              value={formData.amount}
              onChange={handleChange}
              min={MIN_DONATION_AMOUNT}
              required
            />
            {amountError ? (
              <p className="text-xs font-medium text-rose-600">{amountError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Minimum donation is ₦{MIN_DONATION_AMOUNT}.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Enter your name"
              value={formData.name}
              onChange={handleChange}
              required={!formData.isAnonymous}
              disabled={formData.isAnonymous}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              name="message"
              placeholder="Leave a message of support"
              value={formData.message}
              onChange={handleChange}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="anonymous"
              checked={formData.isAnonymous}
              onCheckedChange={handleSwitchChange}
            />
            <Label htmlFor="anonymous">Donate anonymously</Label>
          </div>

          {submitError ? (
            <p className="text-sm font-medium text-rose-600">{submitError}</p>
          ) : null}

          {donationAmount > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Donation Amount</span>
                <span>₦{donationAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service Fee</span>
                <span>₦{serviceFee.toLocaleString()}</span>
              </div>
              {tip > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform Tip</span>
                  <span>₦{tip.toLocaleString()}</span>
                </div>
              )}
              {recurring !== "one_time" && (
                <div className="flex justify-between text-sm font-medium text-blue-600">
                  <span className="text-muted-foreground">Schedule</span>
                  <span className="capitalize">{recurring}</span>
                </div>
              )}
              <div className="flex justify-between font-medium pt-2 border-t">
                <span>Total Amount</span>
                <span>₦{totalAmount.toLocaleString()}</span>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          {/* REMOVE THIS TEST BUTTON IN PRODUCTION */}
          {/* <Button 
            type="button" 
            variant="outline"
            onClick={async () => {
              try {
                await sendUnfinishedDonationEmail({
                  causeName: causeName,
                  continueUrl: `${window.location.origin}${causeUrl}`
                });
                alert("Test donation email sent successfully!");
              } catch (error) {
                alert("Failed to send test donation email");
              }
            }}
          >
            Test Donation Email
          </Button> */}

          <Button
            type="submit"
            disabled={
              isLoading || isDisabled || donationAmount < MIN_DONATION_AMOUNT
            }
            className="w-full"
          >
            {isLoading ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Donate Now"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
