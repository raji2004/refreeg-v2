"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    <Card className="w-full max-w-lg mx-auto mt-10">
      <CardHeader className="text-center">
        <div className="mx-auto bg-primaryShades-100 p-4 rounded-full mb-4">
          <ShieldCheck className="w-10 h-10 text-primaryShades-700" />
        </div>
        <CardTitle className="text-2xl font-montserrat">Verify Your Identity</CardTitle>
        <CardDescription>
          We use Didit for fast and secure identity verification. 
          Please click the button below to start.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button 
          className="w-full h-12 bg-primaryShades-700 text-white hover:bg-primaryShades-800" 
          onClick={startVerification} 
          disabled={loading}
        >
          {loading ? "Preparing..." : "Verify with Didit"}
        </Button>
      </CardContent>
    </Card>
  );
}
