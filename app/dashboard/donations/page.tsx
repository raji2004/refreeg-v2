import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MyDonationsList } from "@/components/my-donations-list";
import { auth } from "@/lib/auth/auth";
import { listUserDonationsPage } from "@/actions/donation-actions";
import { ArrowUpRight, HeartHandshake, Sparkles } from "lucide-react";

const PAGE_SIZE = 10;

const tabClass = (active: boolean) =>
  `inline-flex h-9 items-center rounded-xl px-4 text-sm font-medium transition-colors ${
    active
      ? "bg-white text-slate-950 shadow-sm"
      : "text-slate-600 hover:text-slate-950"
  }`;

export default async function MyDonationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const params = await searchParams;
  const timeframe = params.tab === "recent" ? "recent" : "all";
  const requestedPage = Math.max(Number.parseInt(params.page || "1") || 1, 1);

  const result = await listUserDonationsPage(session.user.id, {
    timeframe,
    page: requestedPage,
    pageSize: PAGE_SIZE,
  });

  if (requestedPage > result.totalPages) {
    const query = new URLSearchParams();
    if (timeframe === "recent") query.set("tab", "recent");
    query.set("page", String(result.totalPages));
    redirect(`/dashboard/donations?${query.toString()}`);
  }

  return (
    <section className="px-3 py-3 sm:px-5 sm:py-5 lg:px-6">
      <div className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            Impact history
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            My Donations
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
            See where you&apos;ve contributed, revisit the causes you support,
            and follow the impact of every donation.
          </p>
        </div>
        <Link href="/causes" className="w-full sm:w-auto">
          <Button className="h-11 w-full rounded-xl bg-blue-600 px-5 text-white shadow-sm hover:bg-blue-700 sm:w-auto">
            <HeartHandshake className="mr-2 h-4 w-4" />
            Explore causes
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="mt-5 space-y-5">
        <nav
          aria-label="Donation period"
          className="inline-flex h-auto max-w-full items-center justify-start gap-1 rounded-2xl bg-slate-100/80 p-1.5"
        >
          <Link
            href="/dashboard/donations"
            aria-current={timeframe === "all" ? "page" : undefined}
            className={tabClass(timeframe === "all")}
          >
            All donations
          </Link>
          <Link
            href="/dashboard/donations?tab=recent"
            aria-current={timeframe === "recent" ? "page" : undefined}
            className={tabClass(timeframe === "recent")}
          >
            Last 30 days
          </Link>
        </nav>
        <MyDonationsList
          donations={result.donations}
          total={result.total}
          totalAmount={result.totalAmount}
          page={result.page}
          totalPages={result.totalPages}
          timeframe={timeframe}
        />
      </div>
    </section>
  );
}
