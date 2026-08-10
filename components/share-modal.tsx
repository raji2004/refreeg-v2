"use client";

import { Button } from "@/components/ui/button";
import { Share2, Link as LinkIcon, QrCode, Download } from "lucide-react";
import { FaWhatsapp, FaInstagram, FaTwitter, FaLinkedin } from "react-icons/fa";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { saveCauseShare } from "@/actions/cause-actions";
import { createShortUrl } from "@/actions/url-actions";
import { useState, useEffect, useRef } from "react";
import QRCode from "react-qr-code";

interface ShareModalProps {
  url: string;
  title: string;
  entityId: string;
  entityType: "cause" | "petition";
}

type Tab = "share" | "qr";

export function ShareModal({
  url,
  title,
  entityId,
  entityType,
}: ShareModalProps) {
  const { toast } = useToast();
  const [shortUrl, setShortUrl] = useState<string>(url);
  const [isLoadingShortUrl, setIsLoadingShortUrl] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("share");
  const qrRef = useRef<HTMLDivElement>(null);

  const qrUrl =
    entityType === "cause" ? `${url.replace(/\/+$/, "")}/donate` : url;

  // Generate short URL on mount
  useEffect(() => {
    const generateUrl = async () => {
      try {
        const shortened = await createShortUrl(entityId, entityType, url);
        setShortUrl(shortened);
      } catch {
        setShortUrl(url);
      } finally {
        setIsLoadingShortUrl(false);
      }
    };
    generateUrl();
  }, [entityId, entityType, url]);

  const templates = {
    cause: {
      shareMessage: `Please donate to my cause on RefreeG 🌍✨: ${shortUrl}`,
      dialogTitle: "Share this cause",
      dialogDescription: "Inspire others to care. ❤️",
      qrText: "Scan to donate directly to this cause",
      qrDownloadName: `cause-qr-${entityId}.png`,
      qrShareTitle: `Donate to ${title}`,
      qrShareText: `Scan this QR to donate to ${title} on RefreeG`,
    },
    petition: {
      shareMessage: `Please sign my petition on RefreeG ✍️💡: ${shortUrl}`,
      dialogTitle: "Share this petition",
      dialogDescription: "Help amplify this petition. ❤️",
      qrText: "Scan to sign this petition",
      qrDownloadName: `petition-qr-${entityId}.png`,
      qrShareTitle: `Sign ${title}`,
      qrShareText: `Scan this QR to sign ${title} on RefreeG`,
    },
  } as const;

  const {
    shareMessage,
    dialogTitle,
    dialogDescription,
    qrText,
    qrDownloadName,
    qrShareTitle,
    qrShareText,
  } = templates[entityType] || templates["cause"];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shortUrl);
    toast({ title: "Copied!", description: "Short link copied to clipboard." });
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(shareMessage);
    toast({ title: "Copied!", description: "Share message copied." });
  };

  const handleShare = async (platform: string) => {
    let shareUrl = "";
    const encodedMessage = encodeURIComponent(shareMessage);
    const encodedUrl = encodeURIComponent(shortUrl);

    switch (platform) {
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodedMessage}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedMessage}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case "instagram":
        navigator.clipboard.writeText(shareMessage);
        toast({
          title: "Instagram",
          description: "Message copied! Paste it into Instagram manually.",
        });
        return;
    }

    try {
      await saveCauseShare(entityId);
      window.open(shareUrl, "_blank");
    } catch {
      toast({ title: "Error", description: "Failed to save share.", variant: "destructive" });
    }
  };

  // ── QR helpers ─────────────────────────────────────────────────────────────

  const downloadQR = async () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    // Serialize SVG → data URL → canvas → PNG blob
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const SIZE = 400;
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      URL.revokeObjectURL(svgUrl);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = qrDownloadName;
        a.click();
        URL.revokeObjectURL(a.href);
      }, "image/png");
    };
    img.src = svgUrl;
  };

  const shareQR = async () => {
    if (!navigator.share) {
      navigator.clipboard.writeText(qrUrl);
      toast({ title: "Copied!", description: "Link copied to clipboard." });
      return;
    }

    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      const SIZE = 400;
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      URL.revokeObjectURL(svgUrl);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          const file = new File([blob], qrDownloadName, { type: "image/png" });
          await navigator.share({
            title: qrShareTitle,
            text: qrShareText,
            url: qrUrl,
            files: [file],
          });
        } catch {
          // fallback
          navigator.clipboard.writeText(qrUrl);
          toast({ title: "Copied!", description: "Link copied to clipboard." });
        }
      }, "image/png");
    };
    img.src = svgUrl;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Share2 className="h-6 w-6" />
          Share
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          {(["share", "qr"] as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                activeTab === tab
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab === "share" ? (
                <>
                  <Share2 className="h-3.5 w-3.5" /> Share links
                </>
              ) : (
                <>
                  <QrCode className="h-3.5 w-3.5" /> QR Code
                </>
              )}
            </button>
          ))}
        </div>

        {/* ── SHARE tab ─── */}
        {activeTab === "share" && (
          <div className="space-y-4">
            <div className="flex justify-center gap-6 py-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleShare("whatsapp")}
                className="h-12 w-12 rounded-full bg-[#25D366] hover:bg-[#25D366]/90"
              >
                <FaWhatsapp className="h-6 w-6 text-white" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleShare("instagram")}
                className="h-12 w-12 rounded-full bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] hover:opacity-90"
              >
                <FaInstagram className="h-6 w-6 text-white" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleShare("twitter")}
                className="h-12 w-12 rounded-full bg-black hover:bg-black/90"
              >
                <FaTwitter className="h-6 w-6 text-white" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleShare("linkedin")}
                className="h-12 w-12 rounded-full bg-[#0077B5] hover:bg-[#0077B5]/90"
              >
                <FaLinkedin className="h-6 w-6 text-white" />
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Link</label>
              <div className="flex items-center space-x-2">
                <Input
                  value={isLoadingShortUrl ? "Generating…" : shortUrl}
                  readOnly
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="shrink-0"
                  disabled={isLoadingShortUrl}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Share Message</label>
              <div className="p-3 bg-gray-100 rounded-md max-h-32 overflow-y-auto">
                <p className="text-sm text-gray-700 whitespace-pre-line">{shareMessage}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyMessage}
                className="w-full"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Copy Message
              </Button>
            </div>
          </div>
        )}

        {/* ── QR CODE tab ─── */}
        {activeTab === "qr" && (
          <div className="space-y-4">
            <p className="text-center text-xs text-slate-500">
              {qrText}
            </p>

            {/* QR code */}
            <div
              ref={qrRef}
              className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-5"
            >
              <QRCode
                value={qrUrl}
                size={220}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="M"
              />
            </div>

            <p className="text-center text-[11px] text-slate-400 break-all">
              {qrUrl}
            </p>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={downloadQR}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PNG
              </Button>
              <Button
                type="button"
                className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                onClick={shareQR}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share QR
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
