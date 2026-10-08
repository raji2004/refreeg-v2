import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGiftByReference } from "@/actions/gift-actions";
import { PrintButton } from "./print-button";

export const metadata: Metadata = {
  title: "Receipt",
  robots: { index: false, follow: false },
};

const PROVIDERS: Record<string, string> = {
  paystack: "Paystack",
  flutterwave: "Flutterwave",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3 text-sm">
      <dt className="text-ink/60">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const gift = await getGiftByReference(decodeURIComponent(reference));
  if (!gift) notFound();

  const paidAt = new Date(gift.paidAt);
  const naira = (n: number) => `₦${n.toLocaleString()}`;

  return (
    <main className="min-h-screen bg-cream px-4 py-10 print:bg-white print:py-0">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link
            href="/dashboard/donations"
            className="text-sm font-semibold text-blue-accent hover:underline"
          >
            My giving
          </Link>
          <PrintButton />
        </div>

        <article className="rounded-3xl bg-surface p-8 print:rounded-none print:p-0">
          <header className="flex items-start justify-between gap-6 border-b border-hairline pb-6">
            <div>
              <p className="font-fraunces text-2xl text-ink">RefreeG</p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink/50">
                Donation receipt
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-ink/50">Reference</p>
              <p className="mt-0.5 break-all font-mono text-xs text-ink">
                {gift.reference}
              </p>
            </div>
          </header>

          <section className="py-6 text-center">
            <p className="text-sm text-ink/60">Gift to {gift.cause.orgName}</p>
            <p className="mt-2 font-fraunces text-5xl tracking-tight text-ink">
              {naira(gift.amount)}
            </p>
          </section>

          <dl className="divide-y divide-hairline border-y border-hairline">
            <Row label="Campaign" value={gift.cause.title} />
            <Row
              label="Organiser"
              value={`${gift.cause.orgName}${gift.cause.orgVerified ? " · Verified NGO" : ""}`}
            />
            <Row
              label="Date"
              value={paidAt.toLocaleString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            />
            <Row label="Gift" value={naira(gift.amount)} />
            {gift.tip > 0 && (
              <Row label="Tip to RefreeG" value={naira(gift.tip)} />
            )}
            <Row
              label="Paid through"
              value={PROVIDERS[gift.provider] ?? gift.provider}
            />
            <Row
              label="Given by"
              value={
                <>
                  {gift.donorName}
                  {gift.anonymous && (
                    <span className="block text-xs font-normal text-ink/50">
                      Shown publicly as Anonymous
                    </span>
                  )}
                  <span className="block text-xs font-normal text-ink/50">
                    {gift.donorEmail}
                  </span>
                </>
              }
            />
          </dl>

          <p className="mt-6 text-xs leading-5 text-ink/55">
            This receipt confirms a gift made through RefreeG to the campaign
            above. {gift.cause.orgName} posts proof of how donations are spent
            on the campaign page, and donors are emailed when it does.
          </p>
        </article>
      </div>
    </main>
  );
}
