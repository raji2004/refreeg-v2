"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ShieldCheck } from "lucide-react";

type DiditKycFormProps = {
  userId: string;
};

export default function DiditKycForm({ userId }: DiditKycFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startVerification = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/kyc/didit/session", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create session");
      }

      // dynamically import to avoid SSR issues with window
      const { DiditSdk } = await import("@didit-protocol/sdk-web");

      if (DiditSdk && data.url) {
        DiditSdk.shared.startVerification({
          url: data.url,
        });

        DiditSdk.shared.onComplete = () => {
          // Reload page to reflect isVerified status after webhook completes
          window.location.reload();
        };
      } else {
        throw new Error("SDK not loaded properly or URL is missing");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto mt-10 border border-slate-200 shadow-sm bg-white overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none h-32" />

      <CardHeader className="text-center pt-10 relative z-10">
        <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">
          RefreeG Identity Verification
        </CardTitle>
        <CardDescription className="text-base text-slate-500 mt-2">
          Fast, secure, and automated identity verification to unlock premium
          platform features.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pb-10 relative z-10 px-8">
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 mb-2">
          <h4 className="text-sm font-semibold text-slate-900 mb-4">
            What to expect:
          </h4>
          <ul className="space-y-3">
            <li className="flex items-start text-sm text-slate-600">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold mr-3 shrink-0">
                1
              </span>
              <span className="leading-relaxed">
                Have a valid{" "}
                <span className="font-semibold text-slate-700">
                  government-issued ID
                </span>{" "}
                ready (Passport, ID Card, etc).
              </span>
            </li>
            <li className="flex items-start text-sm text-slate-600">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold mr-3 shrink-0">
                2
              </span>
              <span className="leading-relaxed">
                Take a clear photo of your identity document.
              </span>
            </li>
            <li className="flex items-start text-sm text-slate-600">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold mr-3 shrink-0">
                3
              </span>
              <span className="leading-relaxed">
                Complete a quick facial scan to verify it&apos;s you.
              </span>
            </li>
          </ul>
        </div>

        {error && (
          <Alert
            variant="destructive"
            className="bg-red-50 text-red-900 border-red-200"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          className="w-full h-14 text-base bg-slate-900 text-white hover:bg-slate-800 transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 rounded-xl mt-2"
          onClick={startVerification}
          disabled={loading}
        >
          {loading ? "Preparing session..." : "Start Secure Verification"}
        </Button>

        <p className="text-xs text-center text-slate-400 pt-2">
          Your information is encrypted and securely processed according to our
          privacy policy.
        </p>
      </CardContent>
    </Card>
  );
}
