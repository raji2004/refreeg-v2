"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleBookmark } from "@/actions/saved-actions";
import { toast } from "@/hooks/use-toast";
import { bumpSavedCount, setSavedCount } from "@/lib/saved-count";
import { useAuthContext } from "@/components/auth-provider";

interface Props {
  itemId: string;
  itemType: "cause" | "petition";
  initialSaved: boolean;
}
export function BookmarkButton({ itemId, itemType, initialSaved }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);
  const { isAuthenticated, isLoading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;

    if (!isAuthenticated) {
      if (!isLoading) {
        toast({
          title: "Sign in to save campaigns",
          description: "Your shortlist follows you across devices.",
        });
        router.push(`/auth/signin?redirect=${encodeURIComponent(pathname)}`);
      }
      return;
    }

    const next = !saved;
    setSaved(next);
    bumpSavedCount(next ? 1 : -1);
    setPending(true);
    try {
      const res = await toggleBookmark(itemId, itemType);
      setSaved(res.saved);
      setSavedCount(res.count);
      toast({ title: res.saved ? "Added to saved" : "Removed from saved" });
    } catch {
      setSaved(!next);
      bumpSavedCount(next ? -1 : 1);
      toast({ title: "Failed to update", variant: "destructive" });
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={saved}
      aria-label={saved ? "Remove bookmark" : "Save"}
      className={cn(
        "absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition-all duration-150",
        saved
          ? "bg-ink text-ink-foreground"
          : "bg-white/90 text-slate-700 hover:bg-white",
        pending && "opacity-70",
      )}
    >
      <Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
