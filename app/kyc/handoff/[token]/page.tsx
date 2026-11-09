"use client";

import { use, useEffect, useState, useRef } from "react";
import { Camera, CheckCircle2, AlertCircle, RefreshCw, Smartphone, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icons } from "@/components/icons";

interface Props {
  params: Promise<{ token: string }>;
}

type HandoffStep = "loading" | "doc_capture" | "selfie_challenge" | "submitting" | "done" | "error";

export default function KycHandoffPage({ params }: Props) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [step, setStep] = useState<HandoffStep>("loading");
  const [sessionData, setSessionData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [docImageB64, setDocImageB64] = useState<string>("");
  const [challengeInstruction, setChallengeInstruction] = useState<string>("Look straight at camera");
  const [challengeProgress, setChallengeProgress] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize session from token
  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch(`/api/kyc/handoff/${token}`);
        const json = await res.json();
        if (json.success) {
          setSessionData(json.data);
          setStep("doc_capture");
        } else {
          setErrorMessage(json.error || "Invalid or expired link");
          setStep("error");
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to connect to server");
        setStep("error");
      }
    }
    loadSession();
  }, [token]);

  // Start mobile camera stream
  const startCamera = async (facingMode: "environment" | "user" = "environment") => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setErrorMessage("Could not access camera. Please allow camera permissions in your browser.");
      setStep("error");
    }
  };

  useEffect(() => {
    if (step === "doc_capture") {
      startCamera("environment");
    } else if (step === "selfie_challenge") {
      startCamera("user");
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [step]);

  const snapFrame = (): { b64: string; digest: string } => {
    if (!videoRef.current) return { b64: "", digest: "" };
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { b64: "", digest: "" };
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const b64 = dataUrl.split(",")[1];
    return { b64, digest: "" };
  };

  const handleCaptureDocument = () => {
    const frame = snapFrame();
    if (!frame.b64) return;
    setDocImageB64(frame.b64);
    setStep("selfie_challenge");
  };

  const handleRunActiveChallenge = async () => {
    if (!sessionData?.challenge) return;
    setChallengeInstruction("Hold still (Neutral Face)...");
    setChallengeProgress(1);

    const t0 = Date.now();
    const frame0 = snapFrame().b64;

    await new Promise((resolve) => setTimeout(resolve, 1500));

    setChallengeInstruction("Now blink or turn slightly...");
    setChallengeProgress(2);
    const t1 = Date.now();
    const frame1 = snapFrame().b64;

    await new Promise((resolve) => setTimeout(resolve, 1500));

    setChallengeInstruction("Holding peak position...");
    setChallengeProgress(3);
    const t2 = Date.now();
    const frame2 = snapFrame().b64;

    setStep("submitting");

    try {
      const manifest = {
        challengeToken: sessionData.challenge.challengeToken,
        timestamps: [t0, t1, t2],
        frameDigests: ["", "", ""], // server computes if empty
      };

      const res = await fetch(`/api/kyc/handoff/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentImageBase64: docImageB64,
          framesBase64: [frame0, frame1, frame2],
          manifest,
          documentType: sessionData?.session?.documentType || "nin_slip",
          idNumber: sessionData?.session?.idLast4,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setStep("done");
      } else {
        setErrorMessage(json.error || "Verification failed");
        setStep("error");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit frames");
      setStep("error");
    }
  };

  if (step === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white p-4">
        <Icons.spinner className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6 text-center text-white">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold">Verification Submitted!</h1>
        <p className="mt-2 max-w-xs text-sm text-zinc-400">
          You can now close this tab and return to your computer screen to complete your setup.
        </p>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6 text-center text-white">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
          <AlertCircle className="h-10 w-10" />
        </div>
        <h1 className="text-xl font-bold">Verification Error</h1>
        <p className="mt-2 max-w-xs text-sm text-zinc-400">{errorMessage}</p>
        <Button
          variant="outline"
          className="mt-6 border-zinc-700 bg-zinc-900 text-white"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-black text-white">
      {/* Top Header */}
      <div className="absolute top-0 z-10 flex w-full items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
          RefreeG ID Verification
        </span>
        <span className="text-xs text-zinc-400">
          {step === "doc_capture" ? "Step 1: ID Document" : "Step 2: Live Selfie"}
        </span>
      </div>

      {/* Camera Viewport */}
      <div className="relative flex-1 overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
        />

        {/* Framing Overlays */}
        {step === "doc_capture" ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-56 w-80 rounded-2xl border-2 border-dashed border-emerald-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]" />
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-72 w-56 rounded-[50%] border-2 border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]" />
          </div>
        )}

        {/* Challenge Prompt */}
        {step === "selfie_challenge" && (
          <div className="absolute top-20 z-10 rounded-full bg-black/75 px-5 py-2 text-center border border-zinc-700 backdrop-blur">
            <p className="text-sm font-semibold text-emerald-400">{challengeInstruction}</p>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="relative z-10 flex flex-col items-center gap-4 bg-zinc-950 p-6">
        {step === "doc_capture" ? (
          <>
            <p className="text-xs text-zinc-400">Place your ID card inside the frame</p>
            <Button
              size="lg"
              className="h-14 w-full rounded-2xl bg-emerald-500 font-semibold text-black hover:bg-emerald-400"
              onClick={handleCaptureDocument}
            >
              Snap Document Photo
            </Button>
          </>
        ) : step === "selfie_challenge" ? (
          <>
            <p className="text-xs text-zinc-400">Position your face in the oval and tap Start</p>
            <Button
              size="lg"
              className="h-14 w-full rounded-2xl bg-emerald-500 font-semibold text-black hover:bg-emerald-400"
              onClick={handleRunActiveChallenge}
            >
              Start Live Motion Challenge
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-3 py-4 text-emerald-400">
            <Icons.spinner className="h-6 w-6 animate-spin" />
            <span className="text-sm font-medium">Verifying biometrics on server...</span>
          </div>
        )}
      </div>
    </div>
  );
}

