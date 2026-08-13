import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  Clock3,
  Download,
  ExternalLink,
  HeartHandshake,
  ReceiptText,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { listUserDonations } from "@/actions/donation-actions";
import { causePublicPath } from "@/lib/causes/slug";

interface MyDonationsListProps {
  userId: string;
  timeframe?: "all" | "recent";
}

const formatNaira = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const getStatusDetails = (status: string) => {
  switch (status) {
    case "completed":
      return {
        label: "Completed",
        icon: CircleCheck,
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
        accent: "bg-emerald-500",
      };
    case "pending":
      return {
        label: "Processing",
        icon: Clock3,
        className: "border-amber-200 bg-amber-50 text-amber-700",
        accent: "bg-amber-400",
      };
    default:
      return {
        label: "Failed",
        icon: XCircle,
        className: "border-rose-200 bg-rose-50 text-rose-700",
        accent: "bg-rose-500",
      };
  }
};

export async function MyDonationsList({
  userId,
  timeframe = "all",
}: MyDonationsListProps) {
  const donations = await listUserDonations(userId, timeframe);

  let filteredDonations = donations;
  if (timeframe === "recent") {
    // Filter to only show donations from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    filteredDonations = filteredDonations.filter(
      (donation) => new Date(donation.created_at) >= thirtyDaysAgo,
    );
  }

  // Calculate total amount donated
  const totalDonated = filteredDonations.reduce(
    (sum, donation) => sum + donation.amount,
    0,
  );

  if (filteredDonations.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-14 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <HeartHandshake className="h-6 w-6" />
        </span>
        <h3 className="mt-5 text-xl font-semibold text-slate-950">
          No donations found
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
          {timeframe === "recent"
            ? "You haven't made a donation in the last 30 days."
            : "Support a cause you care about and your contribution history will appear here."}
        </p>
        <Link href="/causes" className="inline-block">
          <Button className="mt-6 h-11 rounded-xl bg-blue-600 px-5 text-white hover:bg-blue-700">
            Explore causes
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(190px,0.8fr)]">
        <div className="relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#0f172a_0%,#172554_100%)] p-5 text-white shadow-[0_18px_42px_-28px_rgba(15,23,42,0.8)] sm:p-6">
          <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-blue-500/20 blur-2xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                Total contributed
              </p>
              <p className="mt-2 break-words text-3xl font-bold tracking-tight sm:text-4xl">
                {formatNaira(totalDonated)}
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Your giving across the selected period
              </p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-blue-100">
              <HeartHandshake className="h-6 w-6" />
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_14px_35px_-30px_rgba(15,23,42,0.45)]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <ReceiptText className="h-5 w-5" />
          </span>
          <div>
            <p className="text-2xl font-bold text-slate-950">
              {filteredDonations.length}
            </p>
            <p className="text-sm text-slate-600">
              contribution{filteredDonations.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {filteredDonations.map((donation) => {
          const statusDetails = getStatusDetails(donation.status);
          const StatusIcon = statusDetails.icon;

          return (
            <Card
              key={donation.id}
              className="group relative overflow-hidden rounded-3xl border-slate-200/90 bg-white shadow-[0_14px_35px_-28px_rgba(15,23,42,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_22px_48px_-30px_rgba(37,99,235,0.35)]"
            >
              <div
                className={`absolute inset-x-0 top-0 h-1 ${statusDetails.accent}`}
              />
              <CardHeader className="pb-4 pt-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                        {donation.cause.category}
                      </span>
                      <Badge
                        variant="outline"
                        className={`gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusDetails.className}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {statusDetails.label}
                      </Badge>
                    </div>
                    <CardTitle
                      className="line-clamp-2 text-xl leading-7 text-slate-950"
                      title={donation.cause.title}
                    >
                      {donation.cause.title}
                    </CardTitle>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <HeartHandshake className="h-5 w-5" />
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pb-5">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Donation amount
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                    {formatNaira(donation.amount)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-slate-100 p-3">
                    <div className="flex items-center gap-2 text-slate-500">
                      <CalendarDays className="h-4 w-4 text-slate-400" />
                      Donated
                    </div>
                    <p className="mt-1.5 font-medium text-slate-800">
                      {formatDate(donation.created_at)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 p-3">
                    <div className="flex items-center gap-2 text-slate-500">
                      {donation.is_anonymous ? (
                        <ShieldCheck className="h-4 w-4 text-slate-400" />
                      ) : (
                        <Users className="h-4 w-4 text-slate-400" />
                      )}
                      Visibility
                    </div>
                    <p className="mt-1.5 font-medium text-slate-800">
                      {donation.is_anonymous ? "Anonymous" : "Public"}
                    </p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:flex-row">
                <Link
                  href={causePublicPath({
                    id: donation.cause_id,
                    slug: donation.cause?.slug,
                  })}
                  className="w-full"
                >
                  <Button
                    variant="outline"
                    className="h-11 w-full rounded-xl border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View cause
                  </Button>
                </Link>
                {donation.receipt_url && (
                  <Link
                    href={donation.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full"
                  >
                    <Button
                      variant="ghost"
                      className="h-11 w-full rounded-xl text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Receipt
                    </Button>
                  </Link>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
