"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2, Info, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface BreetCryptoDonationModalProps {
  causeId: string;
  donorId: string | null;
}

export function BreetCryptoDonationModal({
  causeId,
  donorId,
}: BreetCryptoDonationModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    address: string;
    qrCode: string;
  } | null>(null);

  const [isConfirmed, setIsConfirmed] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const router = useRouter();

  const initializeCryptoCheckout = async () => {
    setLoading(true);
    setIsConfirmed(false);
    try {
      const response = await fetch("/api/webhooks/breet/get-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ causeId, donorId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Failed to acquire target wallet channel keys",
        );
      }

      setPaymentData({
        address: result.address,
        qrCode: result.qr_code,
      });
    } catch (error: any) {
      console.error("Checkout modal launch breakdown:", error.message);
      toast({
        variant: "destructive",
        title: "Gateway Connection Error",
        description:
          "Unable to establish secure stablecoin rails. Please close and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && paymentData && !isConfirmed) {
      pollingRef.current = setInterval(async () => {
        try {
          const checkResponse = await fetch(
            `/api/webhooks/breet?checkStatus=true&causeId=${causeId}`,
          );
          const checkResult = await checkResponse.json();

          if (checkResult.hasNewDonation) {
            setIsConfirmed(true);

            localStorage.removeItem("donationAttempt");

            if (pollingRef.current) clearInterval(pollingRef.current);
            toast({
              title: "Payment Confirmed! 🎉",
              description: "Your crypto donation has settled successfully.",
            });
            router.refresh();
          }
        } catch (e) {
          console.error("Status polling error:", e);
        }
      }, 3000);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isOpen, paymentData, isConfirmed, causeId, router, toast]);

  const handleClose = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setIsOpen(false);
    setIsConfirmed(false);
    setPaymentData(null);
    setCopied(false);
  };

  const copyAddressToClipboard = () => {
    if (!paymentData) return;
    navigator.clipboard.writeText(paymentData.address);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Solana SPL USDT address copied to clipboard cleanly.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) {
          setIsOpen(true);
          if (!paymentData) initializeCryptoCheckout();
        } else {
          handleClose();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="w-full gap-x-2 rounded-xl bg-[#2563EB] py-6 text-base font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.2)] transition hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93C5FD]">
          <svg
            className="h-5 w-5 fill-[#14F195] bg-white rounded-full p-0.5 shrink-0"
            viewBox="0 0 24 24"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.62 6.77h3.46v2.18h-3.46v1.4c1.19.11 2.29.38 3.19.78l-.63 1.95c-.96-.4-2.12-.66-3.32-.73v4.88h-1.74v-4.87c-1.2.06-2.35.31-3.32.72l-.63-1.95c.9-.4 2-.67 3.19-.78v-1.4H6.92V8.77h3.46V5.45h1.62v3.32z" />
          </svg>
          Donate with Crypto (USDT)
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-white border border-slate-100 rounded-2xl p-6 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center text-slate-900">
            {isConfirmed
              ? "Donation Received!"
              : "Send Solana-USDT Contribution"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
            <p className="text-sm text-slate-500 font-medium">
              Generating your secure payment address...
            </p>
          </div>
        ) : isConfirmed ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
            <div className="rounded-full bg-emerald-50 p-3 text-emerald-500 animate-bounce">
              <CheckCircle2 className="h-16 w-16" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Donation Received Successfully!
            </h3>
            <p className="text-sm text-slate-500 px-6">
              Thank you! Your donation has been safely sent and converted to
              local cash for the organizer.
            </p>

            <Button
              onClick={handleClose}
              className="mt-4 rounded-xl bg-slate-900 px-6 text-white hover:bg-slate-800"
            >
              Close Window
            </Button>
          </div>
        ) : paymentData ? (
          <div className="flex flex-col items-center space-y-5 pt-2">
            <div className="relative p-4 border border-slate-100 bg-slate-50 rounded-2xl shadow-inner max-w-[200px] aspect-square flex items-center justify-center">
              <img
                src={paymentData.qrCode}
                alt="Scan QR Code to transfer assets"
                className="w-full h-full rounded-xl mix-blend-multiply"
              />
            </div>

            <div className="w-full text-center space-y-3">
              {/* 🟢 PRODUCTION CLEANUP: Removed the legacy click-simulation cursor wrappers */}
              <div className="inline-flex items-center gap-2 rounded-full bg-[#14F195]/10 border border-[#14F195]/20 px-3 py-1 text-xs font-bold text-[#14F195] bg-slate-900 select-none">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.62 6.77h3.46v2.18h-3.46v1.4c1.19.11 2.29.38 3.19.78l-.63 1.95c-.96-.4-2.12-.66-3.32-.73v4.88h-1.74v-4.87c-1.2.06-2.35.31-3.32.72l-.63-1.95c.9-.4 2-.67 3.19-.78v-1.4H6.92V8.77h3.46V5.45h1.62v3.32z" />
                </svg>
                <span>USDT • Solana (SPL) Network</span>
              </div>

              <p className="text-xs text-slate-500 px-2 leading-relaxed">
                Transfer stablecoin <strong>USDT</strong> straight to this
                address. It will automatically liquidate to Naira (NGN) and
                settle inside the organizer&apos;s bank account.
              </p>
            </div>

            <div className="w-full flex items-center bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-x-2">
              <p className="font-mono text-xs text-slate-700 truncate flex-1 select-all pl-2">
                {paymentData.address}
              </p>
              <Button
                size="icon"
                variant="ghost"
                onClick={copyAddressToClipboard}
                className="h-9 w-9 shrink-0 text-slate-400 hover:text-slate-900 rounded-lg transition-colors"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="w-full flex items-start gap-2.5 rounded-xl bg-blue-50/50 border border-blue-100 p-3.5 text-xs text-slate-600">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
              <div className="leading-normal space-y-1">
                <p>
                  <strong>
                    Kindly note: There is a 15 USDT minimum requirement for
                    crypto donations on this network.
                  </strong>
                </p>
              </div>
            </div>

            <div className="w-full text-center border-t border-slate-100 pt-4 flex items-center justify-center space-x-2 text-xs font-semibold text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#14F195]" />
              <span>
                Awaiting transaction verification proof confirmations over the
                wire...
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-red-500">
            System initialization failure. Please close and re-trigger this
            modal container.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
