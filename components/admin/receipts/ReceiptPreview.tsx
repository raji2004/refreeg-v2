"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, FileText, RotateCw, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReceiptMedia } from "@/types/receipt-types";

type PreviewMedia = ReceiptMedia & { unoptimized: boolean };

function MediaView({
  media,
  rotation,
}: {
  media: PreviewMedia;
  rotation: number;
}) {
  if (media.type === "video") {
    return <video src={media.url} controls className="max-h-full max-w-full" />;
  }
  if (media.type === "document") {
    return (
      <a
        href={media.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center gap-2 text-sm font-medium text-ink/60 hover:text-ink"
      >
        <FileText className="h-8 w-8" />
        {media.name}
      </a>
    );
  }
  return (
    <Image
      src={media.url}
      alt={media.name}
      fill
      sizes="(min-width: 1024px) 50vw, 100vw"
      unoptimized={media.unoptimized}
      className="object-contain transition-transform"
      style={{ transform: `rotate(${rotation}deg)` }}
    />
  );
}

/** The uploaded receipt with Zoom (opens full size), Rotate and Download, plus thumbnails when several files came in. */
export function ReceiptPreview({
  media,
  label,
}: {
  media: PreviewMedia[];
  label: string;
}) {
  const [selected, setSelected] = useState(0);
  const [rotation, setRotation] = useState(0);
  const current = media[selected];

  return (
    <Card variant="surface">
      <CardContent className="space-y-3 p-4">
        <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-lg bg-warm-neutral">
          {current ? (
            <MediaView media={current} rotation={rotation} />
          ) : (
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink/40">
              <FileText className="h-4 w-4" />
              No file attached · {label}
            </span>
          )}
        </div>

        {media.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {media.map((item, index) => (
              <button
                key={item.url}
                type="button"
                onClick={() => {
                  setSelected(index);
                  setRotation(0);
                }}
                aria-label={`Show ${item.name}`}
                aria-pressed={index === selected}
                className={cn(
                  "shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium",
                  index === selected
                    ? "border-ink bg-ink text-cream"
                    : "border-hairline bg-surface text-ink/70 hover:text-ink",
                )}
              >
                {item.name}
              </button>
            ))}
          </div>
        )}

        {current && (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="surface" size="sm">
              <a href={current.url} target="_blank" rel="noopener noreferrer">
                <ZoomIn className="mr-1.5 h-4 w-4" />
                Zoom
              </a>
            </Button>
            <Button
              variant="surface"
              size="sm"
              disabled={current.type !== "image"}
              onClick={() => setRotation((value) => (value + 90) % 360)}
            >
              <RotateCw className="mr-1.5 h-4 w-4" />
              Rotate
            </Button>
            <Button asChild variant="surface" size="sm">
              <a href={current.url} download={current.name}>
                <Download className="mr-1.5 h-4 w-4" />
                Download
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
