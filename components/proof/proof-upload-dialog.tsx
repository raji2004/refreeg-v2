"use client";

import { useRef, useState } from "react";
import { submitProofUpdate } from "@/actions/proof-update-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Upload, X, FileText } from "lucide-react";

const MAX_FILES = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_DOC_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,application/pdf";

type Props = {
  causeId: string;
  causeTitle: string;
  pendingMilestones?: number[];
  onSubmitted?: () => void;
  trigger?: React.ReactNode;
};

export function ProofUploadDialog({
  causeId,
  causeTitle,
  pendingMilestones = [],
  onSubmitted,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [milestone, setMilestone] = useState<string>(
    pendingMilestones.length > 0 ? String(pendingMilestones[0]) : "general",
  );
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setError(null);
    const incoming = Array.from(list);
    const next = [...files];
    for (const file of incoming) {
      if (next.length >= MAX_FILES) {
        setError(`Maximum ${MAX_FILES} files.`);
        break;
      }
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const isDoc = file.type === "application/pdf";
      if (!isImage && !isVideo && !isDoc) {
        setError(`Unsupported file type: ${file.name}`);
        continue;
      }
      const limit = isImage
        ? MAX_IMAGE_BYTES
        : isDoc
          ? MAX_DOC_BYTES
          : MAX_VIDEO_BYTES;
      if (file.size > limit) {
        setError(`${file.name} is too large.`);
        continue;
      }
      next.push(file);
    }
    setFiles(next);
  };

  const reset = () => {
    setDescription("");
    setFiles([]);
    setError(null);
    setMilestone(
      pendingMilestones.length > 0 ? String(pendingMilestones[0]) : "general",
    );
  };

  const handleSubmit = async () => {
    const fd = new FormData();
    fd.append("causeId", causeId);
    fd.append("description", description);
    fd.append("milestone", milestone);
    files.forEach((f) => fd.append("media", f));

    setSubmitting(true);
    setError(null);
    const result = await submitProofUpdate(fd);
    setSubmitting(false);

    if (result.success) {
      toast({
        title: "Update submitted",
        description:
          "Our team will review it. You'll get an email once it's approved.",
      });
      reset();
      setOpen(false);
      onSubmitted?.();
    } else {
      setError(result.error ?? "Something went wrong.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="rounded-xl bg-blue-600 text-white hover:bg-blue-700">
            <Upload className="mr-2 h-4 w-4" /> Post fund-use update
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Post a fund-use update — {causeTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {pendingMilestones.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-700">
                This update covers
              </label>
              <select
                value={milestone}
                onChange={(e) => setMilestone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {pendingMilestones.map((m) => (
                  <option key={m} value={m}>
                    {m}% milestone (required)
                  </option>
                ))}
                <option value="general">
                  General proof (not tied to a milestone)
                </option>
              </select>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">
                How were the funds used?
              </label>
              <span
                className={`text-xs ${description.trim().length < 20 ? "text-slate-400" : "text-emerald-600"}`}
              >
                {description.trim().length}/20 min
              </span>
            </div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. We purchased 40 bags of cement and paid the masons for week 2."
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Proof (photos, video, documents)
            </label>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-1 flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600"
            >
              <Upload className="h-5 w-5" />
              Click to upload — images, video or PDF ({files.length}/{MAX_FILES}
              )
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />

            {files.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {files.map((f, i) => {
                  const isImage = f.type.startsWith("image/");
                  const isVideo = f.type.startsWith("video/");
                  const isDoc = f.type === "application/pdf";

                  const previewUrl =
                    isImage || isVideo ? URL.createObjectURL(f) : null;

                  return (
                    <div
                      key={`${f.name}-${i}`}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                    >
                      {previewUrl ? (
                        isImage ? (
                          <img
                            src={previewUrl}
                            alt={f.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <video
                            src={previewUrl}
                            className="h-full w-full object-cover"
                            muted
                            autoPlay
                            loop
                          />
                        )
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-2 text-center bg-white">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
                            <FileText className="h-5 w-5" />
                          </div>
                          <span className="line-clamp-2 text-[10px] font-medium text-slate-600 break-all">
                            {f.name}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {(f.size / 1024 / 1024).toFixed(1)} MB
                          </span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setFiles(files.filter((_, j) => j !== i))
                        }
                        aria-label={`Remove ${f.name}`}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 z-10"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={
              submitting || files.length === 0 || description.trim().length < 20
            }
            className="w-full rounded-xl bg-slate-900 text-white"
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {submitting ? "Submitting…" : "Submit for review"}
          </Button>
          <p className="text-xs text-slate-400">
            Updates go live on your campaign page once approved by the RefreeG
            team.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
