import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ChevronDown } from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import { causePublicPath } from "@/lib/causes/slug";
import type { CauseDetail } from "../types/types";
import { fadeUp } from "../types/types";

const ShareModal = dynamic(
  () => import("@/components/share-modal").then((mod) => mod.ShareModal),
  {
    loading: () => <Skeleton className="h-10 w-10 rounded-full" />,
  },
);

const ImageLightbox = dynamic(
  () => import("@/components/ImageLightbox").then((mod) => mod.ImageLightbox),
  {
    ssr: false,
  },
);

const trustTiles = (cause: CauseDetail) => [
  {
    title: "Milestone escrow",
    status: cause.verified_status === "verified" ? "Active" : "Pending",
    badgeClass:
      cause.verified_status === "verified" ? "bg-[#22C55E]" : "bg-[#F59E0B]",
    badgeTextClass: "text-white",
    body: "Funds release only after proof review.",
  },
  {
    title: "Evidence review",
    status: "Active",
    badgeClass: "bg-[#2563EB]",
    badgeTextClass: "text-white",
    body: "Latest upload awaiting approval.",
  },
  {
    title: "Impact score",
    status: cause.trust_score?.impact || "B+",
    badgeClass: "bg-[#2563EB]",
    badgeTextClass: "text-white",
    body: "Strong delivery confidence.",
  },
  {
    title: "Transparency",
    status: cause.trust_score?.transparency || "High",
    badgeClass: "bg-[#E5E7EB]",
    badgeTextClass: "text-[#0F172A]",
    body: "Open financials and updates.",
  },
];

export function TrustPanel({
  cause,
  baseUrl,
}: {
  cause: CauseDetail;
  baseUrl?: string;
}) {
  const proofMedia = useMemo(() => {
    const allMedia =
      cause.multimedia && cause.multimedia.length > 0
        ? cause.multimedia
        : cause.image
          ? [cause.image]
          : [];
    return allMedia
      .filter((url) => {
        const isVideo =
          url.match(/\.(mp4|mov|webm)$/i) ||
          url.match(/(youtube\.com|youtu\.be|tiktok\.com|drive\.google\.com)/i);
        return !isVideo;
      })
      .reverse();
  }, [cause.image, cause.multimedia]);

  const [failedEvidence, setFailedEvidence] = useState<Set<string>>(
    () => new Set(),
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const visibleProofMedia = useMemo(
    () => proofMedia.filter((item) => !failedEvidence.has(item)),
    [failedEvidence, proofMedia],
  );

  const tiles = trustTiles(cause);

  return (
    <motion.div
      className="overflow-hidden rounded-2xl bg-[linear-gradient(165deg,#10233F_0%,#0C1B33_100%)] text-white sm:rounded-[20px]"
      variants={fadeUp}
    >
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:gap-4 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D9FF5B] text-[#10233F]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-white">
                Verified and escrow protected
              </p>
              <p className="mt-0.5 truncate text-xs text-white/60">
                View trust details and campaign evidence
              </p>
            </div>
          </div>
          <ChevronDown className="h-5 w-5 shrink-0 text-white/60 transition-transform group-open:rotate-180" />
        </summary>

        <div className="border-t border-white/10 px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
          <div className="flex justify-end">
            <ShareModal
              url={`${baseUrl}${causePublicPath(cause)}`}
              title={cause.title}
              entityId={cause.id}
              entityType="cause"
            />
          </div>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {tiles.map((tile: any) => (
              <div
                key={tile.title}
                className="rounded-2xl border border-white/15 bg-white/[0.055] p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-white/60">
                    {tile.title}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tile.badgeClass} ${tile.badgeTextClass}`}
                  >
                    {tile.status}
                  </span>
                </div>
                <p className="mt-2 text-[13px] leading-5 text-white/80">
                  {tile.body}
                </p>
              </div>
            ))}
          </div>

          {visibleProofMedia.length > 0 && (
            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-white/60">
                  Campaign evidence
                </p>
                <span className="text-[11px] text-white/45">
                  {visibleProofMedia.length}{" "}
                  {visibleProofMedia.length === 1 ? "image" : "images"}
                </span>
              </div>
              <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
                {visibleProofMedia.map((item: any, index: any) => (
                  <button
                    key={`${item}-${index}`}
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    aria-label="View evidence image full size"
                    className="group relative aspect-[4/3] w-[78%] shrink-0 snap-center overflow-hidden rounded-xl border border-white/15 bg-[#08162B] sm:aspect-video sm:w-auto"
                  >
                    <Image
                      src={getMediaUrl(item)}
                      alt=""
                      fill
                      className="scale-110 object-cover opacity-35 blur-xl"
                      loading="lazy"
                      unoptimized={isProxyMediaUrl(getMediaUrl(item))}
                      aria-hidden="true"
                    />
                    <Image
                      src={getMediaUrl(item)}
                      alt=""
                      fill
                      className="object-contain transition-transform duration-200 group-hover:scale-[1.03]"
                      loading="lazy"
                      unoptimized={isProxyMediaUrl(getMediaUrl(item))}
                      onError={() =>
                        setFailedEvidence((current) => {
                          const next = new Set(current);
                          next.add(item);
                          return next;
                        })
                      }
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/30 group-hover:opacity-100">
                      <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white">
                        View full size
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              <ImageLightbox
                images={visibleProofMedia.map((item, mediaIndex) => ({
                  src: getMediaUrl(item),
                  alt: `${cause.title} evidence ${mediaIndex + 1}`,
                }))}
                currentIndex={lightboxIndex}
                onIndexChange={setLightboxIndex}
                onClose={() => setLightboxIndex(null)}
                label={`${cause.title} campaign evidence`}
              />
            </div>
          )}
        </div>
      </details>
    </motion.div>
  );
}
