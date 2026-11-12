import { notFound, redirect } from "next/navigation";
import { StandaloneAnalytics } from "@/components/admin/standalone-analytics";
import { getWorkspaceData } from "@/lib/admin-analytics/workspace-data";
import { getUserRole } from "@/lib/auth/admin-auth";
import { auth } from "@/lib/auth/auth";
import type { Period } from "@/components/admin/workspace/types";

export const metadata = {
  title: "Admin analytics",
  robots: { index: false, follow: false },
};

const PERIODS: Period[] = ["day", "month", "year"];

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth/signin?redirect=${encodeURIComponent("/admin-analytics")}`);
  }
  const role = await getUserRole(session.user.id);
  if (role !== "admin" && role !== "manager") notFound();

  const { period: requested } = await searchParams;
  const period = PERIODS.includes(requested as Period)
    ? (requested as Period)
    : "month";
  const data = await getWorkspaceData(period);

  return <StandaloneAnalytics data={data} />;
}
