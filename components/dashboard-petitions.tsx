import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, BarChart3, Eye, Plus } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session-user";
import { getUserPetitionsWithStats } from "@/actions/dashboard-actions";

const getProgress = (current: number, goal: number) => {
  if (!goal || goal <= 0) return 0;
  return Math.min((current / goal) * 100, 100);
};

const getStatusClasses = (status: string) => {
  switch (status) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
};

export async function DashboardPetitions({
  initialPetitions,
}: {
  initialPetitions?: any[];
}) {
  let petitionsWithSigners = initialPetitions;

  if (!petitionsWithSigners) {
    const user = await getSessionUser();
    if (!user) {
      return (
        <div className="rounded-[24px] border border-slate-200 bg-white p-8 text-center shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)]">
          <h3 className="text-lg font-medium text-slate-950">Please sign in</h3>
          <p className="mt-2 text-sm text-slate-600">
            You need to log in to see your petitions.
          </p>
          <Link href="/auth/login">
            <Button className="mt-5 bg-blue-600 text-white hover:bg-blue-700">
              Sign In
            </Button>
          </Link>
        </div>
      );
    }
    petitionsWithSigners = await getUserPetitionsWithStats(user.id);
  }

  return (
    <section className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)] sm:rounded-[28px] sm:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Petitions
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Your advocacy campaigns
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Monitor signatures, track approval states, and jump into analytics
            or public pages for each petition.
          </p>
        </div>
        <Link href="/dashboard/petitions/create" className="w-full sm:w-auto">
          <Button className="h-11 w-full rounded-2xl bg-blue-600 px-5 text-white hover:bg-blue-700 sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Create petition
          </Button>
        </Link>
      </div>

      {petitionsWithSigners.length === 0 ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center sm:px-6 sm:py-14">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
            <Plus className="h-7 w-7" />
          </div>
          <h4 className="mt-5 text-xl font-semibold text-slate-950">
            No petitions yet
          </h4>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
            Launch your first petition to start gathering supporters and track
            signature progress from one place.
          </p>
          <Link
            href="/dashboard/petitions/create"
            className="block sm:inline-block"
          >
            <Button className="mt-6 h-11 w-full rounded-2xl bg-blue-600 px-5 text-white hover:bg-blue-700 sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Create your first petition
            </Button>
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          {petitionsWithSigners.map((petition) => {
            const progress = getProgress(petition.signatures, petition.goal);

            return (
              <Card
                key={petition.id}
                className="overflow-hidden rounded-[24px] border-slate-200/80 bg-white shadow-[0_16px_38px_-34px_rgba(15,23,42,0.45)]"
              >
                <CardHeader className="pb-4">
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <CardTitle className="line-clamp-1 text-xl text-slate-950">
                        {petition.title}
                      </CardTitle>
                      <CardDescription className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                        {petition.description}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className={getStatusClasses(petition.status)}
                    >
                      {petition.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 pb-5">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="col-span-2 min-w-0 overflow-hidden rounded-2xl bg-slate-50 p-4 sm:col-span-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Signatures
                      </p>
                      <p
                        className="mt-2 break-words text-sm font-semibold leading-tight text-slate-950 sm:text-base lg:text-lg"
                        title={petition.signatures.toLocaleString()}
                      >
                        {petition.signatures}
                      </p>
                    </div>
                    <div className="min-w-0 overflow-hidden rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Goal
                      </p>
                      <p
                        className="mt-2 break-words text-sm font-semibold leading-tight text-slate-950 sm:text-base lg:text-lg"
                        title={petition.goal.toLocaleString()}
                      >
                        {petition.goal.toLocaleString()}
                      </p>
                    </div>
                    <div className="min-w-0 overflow-hidden rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Progress
                      </p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">
                        {progress.toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="mb-3 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <span className="min-w-0 font-medium text-slate-700">
                        Signature progress
                      </span>
                      <span
                        className="min-w-0 break-words text-slate-500 sm:max-w-[60%] sm:text-right"
                        title={`${petition.signatures} of ${petition.goal.toLocaleString()}`}
                      >
                        {petition.signatures} of{" "}
                        {petition.goal.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2.5" />
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row">
                  <Link
                    href={`/dashboard/petitions/${petition.id}/analytics`}
                    className="w-full sm:w-auto"
                  >
                    <Button
                      variant="outline"
                      className="h-11 w-full rounded-2xl border-slate-200 px-5 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Analytics
                    </Button>
                  </Link>
                  <Link
                    href={`/petitions/${petition.id}`}
                    className="w-full sm:w-auto"
                  >
                    <Button
                      variant="ghost"
                      className="h-11 w-full rounded-2xl px-5 text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View petition
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
