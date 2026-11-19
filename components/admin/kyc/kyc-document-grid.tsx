import { Image as ImageIcon } from "lucide-react";

export interface KycDocumentTile {
  key: string;
  label: string;
  url: string | null;
}

/**
 * Document tiles from the designer's spec: ID front, ID back and live selfie.
 * Didit serves short-lived presigned URLs, so tiles use plain img tags and
 * open the full image in a new tab.
 */
export function KycDocumentGrid({ tiles }: { tiles: KycDocumentTile[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {tiles.map((tile) =>
        tile.url ? (
          <a
            key={tile.key}
            href={tile.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block overflow-hidden rounded-lg border border-hairline bg-cream-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- presigned Didit URLs expire, so next/image optimization would cache dead links */}
            <img
              src={tile.url}
              alt={tile.label}
              className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.02]"
            />
            <span className="absolute bottom-2 left-2 rounded-full bg-ink/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cream">
              {tile.label}
            </span>
          </a>
        ) : (
          <div
            key={tile.key}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-ink/20 bg-cream-muted text-ink/50"
          >
            <ImageIcon className="h-5 w-5" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">
              {tile.label}
            </span>
          </div>
        ),
      )}
    </div>
  );
}
