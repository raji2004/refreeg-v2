import Link from "next/link";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Clock3 } from "lucide-react";

/**
 * Shown instead of the full cause detail page when `cause.paused` is true.
 * The card still appears in Discover/homepage listings — only this page is
 * locked, so donations can't be made against a campaign that's missing its
 * real details. See prisma/schema/cause.prisma `paused`.
 */
export function CausePausedNotice({ title }: { title: string }) {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
      <Eyebrow>Campaign paused</Eyebrow>
      <h1 className="mt-3 font-fraunces text-3xl font-semibold text-ink">{title}</h1>

      <CalloutBanner
        className="mt-6 text-left"
        variant="gold"
        icon={<Clock3 className="mt-0.5 h-5 w-5 shrink-0" />}
        title="This campaign is temporarily paused"
        description="Its owner is updating the campaign details. Donations are on hold until that's reviewed and approved — you can still find it listed, just not open it yet."
      />

      <div className="mt-8 flex justify-center gap-3">
        <Link href="/causes">
          <Button variant="ink">Browse other campaigns</Button>
        </Link>
      </div>
    </div>
  );
}
