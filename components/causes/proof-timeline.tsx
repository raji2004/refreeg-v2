import { ProofMediaGallery } from "./proof-media-gallery";

type MediaEntry = {
  type: "image" | "video" | "document";
  url: string;
  name: string;
};

type ProofUpdate = {
  id: string;
  milestone: number | null;
  created_at: string | Date;
  description: string;
  media: unknown;
};

export function ProofTimeline({ updates }: { updates: ProofUpdate[] }) {
  if (!updates || updates.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 mt-8">
      <h2 className="text-xl font-bold text-slate-900">Updates & proof</h2>
      <p className="mt-1 text-sm text-slate-500">
        Verified fund-use updates from the organizer - proof, not promises.
      </p>

      <ol className="mt-6 space-y-8 border-l border-slate-200 pl-6">
        {updates.map((update) => {
          const media = (update.media as unknown as MediaEntry[]) ?? [];
          const date =
            typeof update.created_at === "string"
              ? new Date(update.created_at)
              : update.created_at;

          return (
            <li key={update.id} className="relative">
              <span className="absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
              <div className="flex flex-wrap items-center gap-2">
                {update.milestone ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-700">
                    {update.milestone}% milestone
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-600">
                    Proof of impact
                  </span>
                )}
                <span className="text-xs text-slate-400">
                  {new Date(update.created_at).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                {update.description}
              </p>
              <ProofMediaGallery media={media} />
            </li>
          );
        })}
      </ol>
    </section>
  );
}
