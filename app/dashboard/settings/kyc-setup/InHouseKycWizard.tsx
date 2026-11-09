"use client";

import { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import {
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Card, CardContent } from "@/components/ui/card";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { useToast } from "@/components/ui/use-toast";
import { Icons } from "@/components/icons";

interface InHouseKycWizardProps {
  userId: string;
}

type Step = "K1" | "K2" | "K3" | "K4_HANDOFF" | "K5_REVIEW" | "K6_CLEARED" | "K7_MISMATCH";

export default function InHouseKycWizard({ userId }: InHouseKycWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("K1");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocType, setSelectedDocType] = useState<string>("nin_slip");
  const [idNumber, setIdNumber] = useState<string>("");
  const [dob, setDob] = useState<string>("");
  const [handoffUrl, setHandoffUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeKycId, setActiveKycId] = useState<string>("");
  const [mismatchDetails, setMismatchDetails] = useState<{
    profileName: string;
    idName: string;
    suggestedLegalName: string;
  } | null>(null);

  // Poll KYC status periodically when waiting for phone handoff or under review
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchSession = async () => {
      try {
        const res = await fetch("/api/kyc/session");
        const json = await res.json();
        if (json.success && json.data) {
          const { status, resumableSession, isVerified } = json.data;
          if (isVerified || status === "approved") {
            setStep("K6_CLEARED");
          } else if (status === "name_mismatch" && resumableSession?.mismatchDetails) {
            setMismatchDetails(resumableSession.mismatchDetails);
            setStep("K7_MISMATCH");
          } else if (status === "under_review") {
            setStep("K5_REVIEW");
          } else if (resumableSession) {
            setActiveKycId(resumableSession.kycId);
            if (resumableSession.documentType) {
              setSelectedDocType(resumableSession.documentType);
            }
            if (resumableSession.dob) {
              setDob(resumableSession.dob);
            }
            if (resumableSession.currentStep === 3) {
              setStep("K3");
            }
          }
        }
      } catch (err) {
        console.error("Error checking session:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();

    if (step === "K4_HANDOFF" || step === "K5_REVIEW") {
      interval = setInterval(fetchSession, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step]);

  const handleStartStep2 = () => {
    setStep("K2");
  };

  const handlePickDocument = async (docType: string) => {
    setSelectedDocType(docType);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/kyc/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStep: 3,
          documentType: docType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveKycId(data.data.kycId);
        setStep("K3");
      }
    } catch {
      toast({
        title: "Error saving step",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProceedToHandoff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idNumber.trim()) {
      toast({
        title: "ID number required",
        description: "Please enter your 11-digit NIN or ID number.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Save Step 3 progress
      await fetch("/api/kyc/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStep: 4,
          documentType: selectedDocType,
          idNumber: idNumber.trim(),
          dob: dob.trim(),
        }),
      });

      // 2. Request 15-minute signed phone camera handoff token
      const res = await fetch("/api/kyc/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kycId: activeKycId }),
      });
      const data = await res.json();
      if (data.success && data.data.handoffUrl) {
        setHandoffUrl(data.data.handoffUrl);
        setStep("K4_HANDOFF");
      } else {
        throw new Error(data.error || "Failed to generate QR code");
      }
    } catch (err: any) {
      toast({
        title: "Handoff error",
        description: err.message || "Failed to start phone capture",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (handoffUrl) {
      navigator.clipboard.writeText(handoffUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied to clipboard" });
    }
  };

  const handleAdoptIdName = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/kyc/resolve-mismatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "adopt_id_name" }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("K6_CLEARED");
        toast({
          title: "Legal name updated",
          description: "Level 2 verification is now complete.",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast({
        title: "Failed to update name",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestHumanReview = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/kyc/request-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kycId: activeKycId }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("K5_REVIEW");
        toast({
          title: "Submitted for human review",
          description: "Our review team will check your details.",
        });
      }
    } catch {
      toast({
        title: "Error submitting review",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin text-forest" />
      </div>
    );
  }

  // --- K6: Level 2 Cleared ---
  if (step === "K6_CLEARED") {
    return (
      <Card variant="surface" className="max-w-xl mx-auto rounded-3xl p-6 sm:p-8">
        <CardContent className="space-y-6 p-0 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-forest/10 text-forest">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h2 className="font-fraunces text-3xl font-semibold text-ink">
              Level 2 Cleared
            </h2>
            <p className="mt-2 text-sm text-ink/65">
              You can now publish campaigns and receive donations directly to your
              verified bank account.
            </p>
          </div>

          <div className="rounded-2xl bg-cream-muted/60 p-4 text-left space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <ShieldCheck className="h-4 w-4 text-forest" />
              <span>What this unlocked:</span>
            </div>
            <ul className="text-sm text-ink/70 space-y-1 pl-6 list-disc">
              <li>Direct bank account settlements on every campaign</li>
              <li>Bounty and grant claims</li>
              <li>Verified creator badge</li>
            </ul>
          </div>

          <CalloutBanner
            variant="sand"
            title="Privacy & regulatory compliance"
            description="Your face photo is encrypted, never shown publicly, and kept strictly for regulatory compliance. Only the last four digits of your NIN are shown on your profile."
          />

          <Button
            variant="ink"
            size="lg"
            className="w-full"
            onClick={() => (window.location.href = "/dashboard")}
          >
            Done
          </Button>
        </CardContent>
      </Card>
    );
  }

  // --- K5: Under Review ---
  if (step === "K5_REVIEW") {
    return (
      <Card variant="surface" className="max-w-xl mx-auto rounded-3xl p-6 sm:p-8">
        <CardContent className="space-y-6 p-0 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <Clock className="h-8 w-8" />
          </div>
          <div>
            <h2 className="font-fraunces text-3xl font-semibold text-ink">
              Checking Your Details
            </h2>
            <p className="mt-2 text-sm text-ink/65">
              We are checking your ID document and photo. You can draft your campaign while we review.
            </p>
          </div>

          <div className="rounded-2xl bg-cream-muted/60 p-4 text-left space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-ink">ID Document</span>
              <span className="text-forest font-semibold">RECEIVED</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-ink">Live Selfie</span>
              <span className="text-amber-600 font-semibold">UNDER REVIEW</span>
            </div>
          </div>

          <CalloutBanner
            variant="forest"
            title="Your campaign drafts are safe"
            description="You will get an email notification as soon as Level 2 clears."
          />

          <Button
            variant="surface"
            size="lg"
            className="w-full"
            onClick={() => (window.location.href = "/dashboard")}
          >
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  // --- K7: Name Mismatch ---
  if (step === "K7_MISMATCH") {
    return (
      <Card variant="surface" className="max-w-xl mx-auto rounded-3xl p-6 sm:p-8">
        <CardContent className="space-y-6 p-0">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rust/10 text-rust">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-fraunces text-2xl font-semibold text-ink">
                Name Mismatch
              </h2>
              <p className="text-sm text-ink/65">
                The name on your ID differs from your RefreeG profile.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-hairline bg-bone/70 p-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-ink/60">Profile Name:</span>
              <span className="font-semibold text-ink">
                {mismatchDetails?.profileName || "Your Profile"}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-ink/60">Name on ID:</span>
              <span className="font-semibold text-forest">
                {mismatchDetails?.idName || "Official ID Name"}
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-cream-muted/70 p-4 space-y-2">
            <p className="text-sm font-semibold text-ink">What would you like to do?</p>
            <p className="text-sm text-ink/70">
              To receive direct bank payouts, your legal name must match your ID and bank account. Your public display name will stay unchanged.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              variant="ink"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
              onClick={handleAdoptIdName}
            >
              {isSubmitting ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Updating
                </>
              ) : (
                `Use "${mismatchDetails?.suggestedLegalName || "ID Name"}"`
              )}
            </Button>
            <Button
              variant="surface"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
              onClick={() => setStep("K2")}
            >
              Send a different ID card
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-ink/50"
              onClick={handleRequestHumanReview}
            >
              Talk to someone / Request human review
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // --- K4: Phone Camera Handoff QR Code ---
  if (step === "K4_HANDOFF") {
    return (
      <Card variant="surface" className="max-w-xl mx-auto rounded-3xl p-6 sm:p-8">
        <CardContent className="space-y-6 p-0 text-center">
          <div>
            <Eyebrow className="text-forest">Step 3 of 4</Eyebrow>
            <h2 className="mt-1 font-fraunces text-2xl sm:text-3xl font-semibold text-ink">
              Scan with your phone
            </h2>
            <p className="mt-2 text-sm text-ink/65">
              To prevent laptop webcam blur and protect your identity, capture your ID and live selfie on your phone.
            </p>
          </div>

          <div className="mx-auto flex w-fit items-center justify-center rounded-2xl bg-white p-5 shadow-subtle border border-hairline">
            {handoffUrl ? (
              <QRCode value={handoffUrl} size={180} />
            ) : (
              <Icons.spinner className="h-10 w-10 animate-spin text-forest" />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-ink/70">
              <Smartphone className="h-4 w-4 text-forest" />
              <span>Point your phone camera at this QR code</span>
            </div>
            <p className="text-xs text-ink/45">
              This screen will automatically update as soon as you finish on your phone.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="surface"
              size="sm"
              onClick={handleCopyLink}
              className="text-xs"
            >
              {copied ? (
                <>
                  <Check className="mr-1 h-3.5 w-3.5 text-forest" />
                  Link copied
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-3.5 w-3.5" />
                  Copy mobile link
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep("K3")}
              className="text-xs text-ink/50"
            >
              Back to NIN step
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // --- K3: Enter NIN / ID Number ---
  if (step === "K3") {
    return (
      <Card variant="surface" className="max-w-xl mx-auto rounded-3xl p-6 sm:p-8">
        <form onSubmit={handleProceedToHandoff} className="space-y-6">
          <div>
            <Eyebrow className="text-forest">Step 2 of 4</Eyebrow>
            <h2 className="mt-1 font-fraunces text-2xl sm:text-3xl font-semibold text-ink">
              Your 11-digit NIN
            </h2>
            <p className="mt-2 text-sm text-ink/65">
              RefreeG checks your identity number against official records. Only the last 4 digits are stored on your public profile.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Eyebrow className="text-ink/45">National Identification Number (NIN)</Eyebrow>
              <span className="text-xs font-mono text-ink/40">
                {idNumber.replace(/\s/g, "").length} of 11
              </span>
            </div>
            <Input
              value={idNumber}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
                // Group as 2841 9930 112
                const formatted = raw
                  .replace(/(\d{4})(\d{4})?(\d{1,3})?/, (_, p1, p2, p3) =>
                    [p1, p2, p3].filter(Boolean).join(" "),
                  );
                setIdNumber(formatted);
              }}
              placeholder="2841 9930 112"
              className="h-12 font-mono text-lg tracking-wider"
              inputMode="numeric"
              required
            />
            <p className="text-xs text-ink/50">
              Don’t know it? Dial <span className="font-semibold text-ink">*346#</span> from your registered phone number.
            </p>
          </div>

          <div className="space-y-2">
            <Eyebrow className="text-ink/45">Date of Birth</Eyebrow>
            <Input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="h-11"
            />
          </div>

          <CalloutBanner
            variant="sand"
            title="Camera check on phone next"
            description="In the next step, you will snap your ID card and take a 2-frame live selfie on your phone."
          />

          <div className="flex gap-3">
            <Button
              type="button"
              variant="surface"
              size="lg"
              onClick={() => setStep("K2")}
              className="w-1/3"
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="ink"
              size="lg"
              className="w-2/3"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Continuing
                </>
              ) : (
                "Continue to phone capture"
              )}
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  // --- K2: Pick One ID ---
  if (step === "K2") {
    const docOptions = [
      {
        id: "nin_slip",
        title: "NIN slip or number",
        time: "Minutes",
        description: "Fastest verification via NIMC digital slip or tracking slip.",
      },
      {
        id: "driver_licence",
        title: "Driver licence",
        time: "Up to 2 days",
        description: "Official FRSC driving licence with visible portrait photo.",
      },
      {
        id: "passport",
        title: "International passport",
        time: "Up to 2 days",
        description: "Nigerian passport data page with machine readable zone.",
      },
      {
        id: "voter_card",
        title: "Voter card (PVC)",
        time: "Up to 2 days",
        description: "INEC permanent voter card with VIN number.",
      },
    ];

    return (
      <Card variant="surface" className="max-w-xl mx-auto rounded-3xl p-6 sm:p-8">
        <CardContent className="space-y-6 p-0">
          <div>
            <Eyebrow className="text-forest">Step 1 of 4</Eyebrow>
            <h2 className="mt-1 font-fraunces text-2xl sm:text-3xl font-semibold text-ink">
              Pick one ID document
            </h2>
            <p className="mt-2 text-sm text-ink/65">
              Choose the Nigerian identification document you have available.
            </p>
          </div>

          <div className="space-y-3">
            {docOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handlePickDocument(opt.id)}
                disabled={isSubmitting}
                className={`w-full text-left rounded-2xl border p-4 transition-all hover:border-forest hover:bg-surface/80 ${
                  selectedDocType === opt.id
                    ? "border-forest bg-bone/70 ring-1 ring-forest/20"
                    : "border-hairline bg-bone/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">{opt.title}</span>
                  <span className="rounded-full bg-forest/10 px-2 py-0.5 text-xs font-medium text-forest">
                    {opt.time}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink/55">{opt.description}</p>
              </button>
            ))}
          </div>

          <Button
            variant="surface"
            size="lg"
            className="w-full"
            onClick={() => setStep("K1")}
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    );
  }

  // --- K1: Verification Status Hub ---
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="font-fraunces text-3xl font-semibold text-ink sm:text-4xl">
          Verification Status
        </h1>
        <p className="mt-2 text-sm text-ink/55">
          Level 2 verification is required before you can publish a campaign, receive direct bank payouts, or claim bounties.
        </p>
      </div>

      <div className="space-y-4">
        {/* Tier 1 */}
        <Card variant="surface" className="rounded-2xl p-5 border-hairline">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="rounded-md bg-forest/10 px-2 py-0.5 text-xs font-semibold text-forest uppercase">
                Level 1 · Cleared
              </span>
              <h3 className="font-semibold text-ink pt-1">Basic Profile & Email</h3>
              <p className="text-xs text-ink/55">
                Your profile information and email address are confirmed.
              </p>
            </div>
            <CheckCircle2 className="h-6 w-6 text-forest shrink-0 mt-1" />
          </div>
        </Card>

        {/* Tier 2 */}
        <Card variant="surface" className="rounded-2xl p-5 border-forest ring-1 ring-forest/20 bg-surface">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 uppercase">
                  Level 2 · Needed to Fundraise
                </span>
                <h3 className="font-semibold text-ink pt-1">National Identity & Face Match</h3>
                <p className="text-xs text-ink/55">
                  Verify with your NIN, Driver Licence, Passport, or Voter Card.
                </p>
              </div>
              <ShieldCheck className="h-6 w-6 text-forest shrink-0 mt-1" />
            </div>

            <CalloutBanner
              variant="forest"
              title="Direct-to-bank settlements"
              description="Once Level 2 clears, donor funds route directly to your verified bank account without withdrawal holding."
            />

            <Button
              variant="ink"
              size="lg"
              className="w-full justify-between"
              onClick={handleStartStep2}
            >
              <span>{activeKycId ? "Resume Level 2" : "Start Level 2"}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* Tier 3 */}
        <Card variant="surface" className="rounded-2xl p-5 border-hairline bg-bone/30 opacity-75">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="rounded-md bg-bone px-2 py-0.5 text-xs font-semibold text-ink/50 uppercase">
                Level 3 · Organizations
              </span>
              <h3 className="font-semibold text-ink pt-1">CAC Corporate Verification</h3>
              <p className="text-xs text-ink/55">
                Required only for registered non-profits, institutions, and corporate entities.
              </p>
            </div>
            <UserCheck className="h-6 w-6 text-ink/30 shrink-0 mt-1" />
          </div>
        </Card>
      </div>
    </div>
  );
}

