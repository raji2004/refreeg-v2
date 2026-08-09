"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  approveProofUpdate,
  rejectProofUpdate,
} from "@/actions/proof-update-actions";
import { getMediaUrl } from "@/lib/s3/media";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { BadgeCheck, XCircle, FileText, Loader2 } from "lucide-react";

type MediaEntry = {
  type: "image" | "video" | "document";
  url: string;
  name: string;
};
type PendingUpdate = {
  id: string;
  description: string;
  milestone: number | null;
  media: unknown;
  created_at: string;
  cause: { id: string; title: string; compliance_paused: boolean };
  user: { fullName: string | null; email: string | null } | null;
};

export default function ProofUpdatesClient({
  initialUpdates,
}: {
  initialUpdates: PendingUpdate[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // 👈 ADD THIS

  const handleApprove = async (id: string) => {
    setBusyId(id);
    try {
      const res = await approveProofUpdate(id);
      toast({
        title: res.pauseLifted
          ? "Approved — campaign restored"
          : "Approved and published",
      });
      router.refresh();
    } catch (e: any) {
      toast({
        title: "Approval failed",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string) => {
    setBusyId(id);
    try {
      await rejectProofUpdate(id, reason.trim());
      toast({ title: "Rejected — creator notified" });
      setRejectingId(null);
      setReason("");
      router.refresh();
    } catch (e: any) {
      toast({
        title: "Rejection failed",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  if (initialUpdates.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        No proof updates awaiting review. 🎉
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Proof updates</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review fund-use updates. Approving publishes them on the campaign and
          lifts any compliance pause.
        </p>
      </div>

      {initialUpdates.map((update) => {
        const media = (update.media as MediaEntry[]) ?? [];
        return (
          <div
            key={update.id}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-900">
                {update.cause.title}
              </span>
              {update.milestone && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  {update.milestone}% milestone
                </span>
              )}
              {update.cause.compliance_paused && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                  Campaign paused — approval restores it
                </span>
              )}
              <span className="ml-auto text-xs text-slate-400">
                {update.user?.fullName ?? "Unknown"} ·{" "}
                {new Date(update.created_at).toLocaleString()}
              </span>
            </div>

            <p className="mt-3 whitespace-pre-line text-sm text-slate-700">
              {update.description}
            </p>

            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {media.map((m) => {
                const url = getMediaUrl(m.url);
                if (m.type === "image") {
                  return (
                    <button
                      key={m.url}
                      type="button"
                      onClick={() => setPreviewUrl(url)} // 👈 Open modal instead of redirecting
                      className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 hover:border-emerald-500 transition-colors"
                    >
                      <Image
                        src={url ?? ""}
                        alt={m.name}
                        fill
                        sizes="20vw"
                        className="object-cover"
                      />
                    </button>
                  );
                }
                if (m.type === "video") {
                  return (
                    <button
                      key={m.url}
                      type="button"
                      onClick={() => setPreviewUrl(url)}
                      className="col-span-2 relative flex items-center justify-center rounded-lg bg-black text-white text-xs font-semibold hover:bg-slate-800"
                    >
                      <span className="z-10">▶ Play Video</span>
                      <video
                        src={url ?? undefined}
                        className="absolute inset-0 h-full w-full object-cover opacity-50"
                      />
                    </button>
                  );
                }
                return (
                  <a
                    key={m.url}
                    href={url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    <FileText className="h-4 w-4" />{" "}
                    <span className="truncate">{m.name}</span>
                  </a>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                onClick={() => handleApprove(update.id)}
                disabled={busyId === update.id}
                className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {busyId === update.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <BadgeCheck className="mr-2 h-4 w-4" />
                )}
                Approve & publish
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setRejectingId(rejectingId === update.id ? null : update.id)
                }
                className="rounded-xl"
              >
                <XCircle className="mr-2 h-4 w-4" /> Reject
              </Button>
            </div>

            {rejectingId === update.id && (
              <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason (sent to the creator) — e.g. photos don't match the described spend."
                  rows={2}
                />
                <Button
                  onClick={() => handleReject(update.id)}
                  disabled={busyId === update.id || reason.trim().length < 5}
                  className="rounded-xl bg-red-600 text-white hover:bg-red-700"
                >
                  Confirm rejection
                </Button>
              </div>
            )}
          </div>
        );
      })}
            {/* 👇 ADD THIS PREVIEW MODAL 👇 */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-label="Proof media viewer"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-4 top-4 text-white/80 hover:text-white z-10"
            onClick={() => setPreviewUrl(null)}
          >
            <XCircle className="h-8 w-8" />
          </button>
          
          {previewUrl.includes("video") || previewUrl.endsWith(".mp4") || previewUrl.endsWith(".webm") ? (
            <video src={previewUrl} controls autoPlay className="max-h-[85vh] max-w-full rounded-lg" onClick={(e) => e.stopPropagation()} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Proof preview"
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div> // <-- This is the existing closing div for the main container
  );
}

