"use client";

import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
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

interface ShareModalProps {
  url: string;
  title: string;
  entityId: string;
  entityType: "cause" | "petition"; // 👈 required
}

export function ShareModal({
  url,
  title,
  entityId,
  entityType,
}: ShareModalProps) {
  const { toast } = useToast();

  // ✅ entity-specific templates
  const templates = {
    cause: {
      shareMessage: `🙏 Please support my cause on RefreeG! Every little bit helps: ${url}`,
      dialogTitle: "Share this cause",
      dialogDescription:
        "Spread the word! Share this cause with your network using our pre-written message.",
    },
    petition: {
      shareMessage: `🖊️ I just signed this petition on RefreeG. Join me in making a difference: ${url}`,
      dialogTitle: "Share this petition",
      dialogDescription:
        "Help gather more support! Share this petition with your network using our pre-written message.",
    },
  } as const;

  // ✅ ensure fallback
  const { shareMessage, dialogTitle, dialogDescription } =
    templates[entityType] || templates["cause"];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareMessage);
    toast({
      title: "Copied!",
      description: "The share message has been copied to your clipboard.",
    });
  };

  const handleShare = async (platform: string) => {
    let shareUrl = "";
    const encodedMessage = encodeURIComponent(shareMessage);
    const encodedUrl = encodeURIComponent(url);

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
          description:
            "Message copied! Paste it into Instagram manually to share.",
        });
        return;
    }

    try {
      await saveCauseShare(entityId);
      window.open(shareUrl, "_blank");
    } catch (error) {
      console.error("Error saving share:", error);
      toast({
        title: "Error",
        description: "Failed to save share. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-6 py-4">
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
        <div className="space-y-4">
          <div className="p-3 bg-gray-100 rounded-md">
            <p className="text-sm text-gray-700">{shareMessage}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Input value={shareMessage} readOnly className="flex-1" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="shrink-0"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
