import { redirect } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MyDonationsList } from "@/components/my-donations-list";
import { getCurrentUser } from "@/actions/auth-actions";
import { ArrowUpRight, HeartHandshake, Sparkles } from "lucide-react";

export default async function MyDonationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
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

      <Tabs defaultValue="all" className="mt-5 space-y-5">
        <TabsList className="h-auto max-w-full justify-start gap-1 rounded-2xl bg-slate-100/80 p-1.5">
          <TabsTrigger
            value="all"
            className="h-9 rounded-xl px-4 text-slate-600 data-[state=active]:text-slate-950"
          >
            All donations
          </TabsTrigger>
          <TabsTrigger
            value="recent"
            className="h-9 rounded-xl px-4 text-slate-600 data-[state=active]:text-blue-700"
          >
            Last 30 days
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-0">
          <MyDonationsList userId={user.id} />
        </TabsContent>
        <TabsContent value="recent" className="mt-0">
          <MyDonationsList userId={user.id} timeframe="recent" />
        </TabsContent>
      </Tabs>
    </section>
  );
}
