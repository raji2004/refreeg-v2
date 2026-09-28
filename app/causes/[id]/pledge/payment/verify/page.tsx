"use client";

import { useEffect, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { usePayment } from "@/hooks/use-payment";
import { useQueryState } from "nuqs";

export default function PledgePaymentVerification() {
  const router = useRouter();
  const [reference] = useQueryState("reference");
  const { verifyPayment } = usePayment();
  const [verificationStatus, setVerificationStatus] = useState<
    "loading" | "success" | "failed"
  >("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [hasVerified, setHasVerified] = useState(false);

  useEffect(() => {
    const verifyPaymentStatus = async () => {
      if (hasVerified || !reference) {
        if (!reference) {
          setVerificationStatus("failed");
          setErrorMessage("Invalid verification parameters");
        }
        return;
      }

      try {
        setHasVerified(true);
        const isSuccessful = await verifyPayment(reference);

        if (isSuccessful) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          setVerificationStatus("success");
        } else {
          setVerificationStatus("failed");
          setErrorMessage("We could not verify your card. Please try again.");
        }
      } catch (error) {
        console.error("Pledge payment verification error:", error);
        setVerificationStatus("failed");
        setErrorMessage("Verification failed. Please contact support.");
      }
    };

    verifyPaymentStatus();
  }, [reference, verifyPayment, hasVerified]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center space-y-6">
          {verificationStatus === "loading" && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-foreground">
                Verifying your card
              </h2>
              <p className="text-muted-foreground mt-2">
                Almost done — confirming with Paystack…
              </p>
            </motion.div>
          )}

          {verificationStatus === "success" && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <CheckCircle2 className="w-16 h-16 text-brand mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-foreground">
                Card saved
              </h2>
              <p className="text-muted-foreground mt-2">
                Your pledge is secured. The full amount will be charged on your
                reminder date and sent to the campaign. You will receive a
                confirmation email shortly.
              </p>
              <div className="mt-6 space-y-3">
                <Button
                  onClick={() => router.push("/causes")}
                  className="w-full bg-brand hover:bg-secondary"
                >
                  Browse causes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/")}
                  className="w-full border-brand text-brand hover:bg-secondary hover:text-secondary-foreground"
                >
                  Home
                </Button>
              </div>
            </motion.div>
          )}

          {verificationStatus === "failed" && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-foreground">
                Verification failed
              </h2>
              <p className="text-muted-foreground mt-2">{errorMessage}</p>
              <div className="mt-6 space-y-3">
                <Button
                  onClick={() => router.back()}
                  className="w-full bg-brand hover:bg-secondary"
                >
                  Go back
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </Card>
    </div>
  );
}
