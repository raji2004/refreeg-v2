import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Sparkles } from "lucide-react";
import { MyCausesList } from "@/components/my-causes-list";
import { getCurrentUser } from "@/actions/auth-actions";
import { ProofComplianceBanner } from "@/components/proof/proof-compliance-banner";


const validStatuses = ["all", "approved", "pending", "rejected", "suspended"];

export default async function MyCausesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }
  const param = await searchParams;
  const status = validStatuses.includes(param.status || "")
    ? param.status!
    : "all";

  return (
    <section className="px-3 py-3 sm:px-5 sm:py-5 lg:px-6">
      <div className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            Fundraising workspace
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            My Causes
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
            Track funding, manage approvals, and keep every campaign moving
            forward from one place.
          </p>
        </div>
        <Link href="/dashboard/causes/create" className="w-full sm:w-auto">
          <Button className="h-11 w-full rounded-xl bg-blue-600 px-5 text-white shadow-sm hover:bg-blue-700 sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Create new cause
          </Button>
        </Link>
      </div>

      <div className="mt-5">
        <ProofComplianceBanner userId={user.id} />
      </div>

      <Tabs defaultValue={status} className="mt-5 space-y-5">
        <TabsList className="h-auto max-w-full justify-start gap-1 overflow-x-auto rounded-2xl bg-slate-100/80 p-1.5">
          <TabsTrigger
            value="all"
            asChild
            className="h-9 rounded-xl px-4 text-slate-600 data-[state=active]:text-slate-950"
          >
            <Link href="/dashboard/causes">All</Link>
          </TabsTrigger>
          <TabsTrigger
            value="approved"
            asChild
            className="h-9 rounded-xl px-4 text-slate-600 data-[state=active]:text-emerald-700"
          >
            <Link href="/dashboard/causes?status=approved">Active</Link>
          </TabsTrigger>
          {/* 👇 ADDED SUSPENDED TAB 👇 */}
          <TabsTrigger
            value="suspended"
            asChild
            className="h-9 rounded-xl px-4 text-slate-600 data-[state=active]:text-amber-700"
          >
            <Link href="/dashboard/causes?status=suspended">Suspended</Link>
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            asChild
            className="h-9 rounded-xl px-4 text-slate-600 data-[state=active]:text-amber-700"
          >
            <Link href="/dashboard/causes?status=pending">Pending</Link>
          </TabsTrigger>
          <TabsTrigger
            value="rejected"
            asChild
            className="h-9 rounded-xl px-4 text-slate-600 data-[state=active]:text-rose-700"
          >
            <Link href="/dashboard/causes?status=rejected">Rejected</Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value={status} className="mt-0">
          <MyCausesList status={status} userId={user.id} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
