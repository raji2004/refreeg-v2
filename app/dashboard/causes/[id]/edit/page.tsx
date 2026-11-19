import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { hasBankDetails } from "@/actions/users/profile-actions";
import { getCause } from "@/actions/causes/cause-actions";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { prisma } from "@/lib/prisma";

const EditCauseForm = dynamic(() => import("./edit-cause-form"), {
  loading: () => <Skeleton className="h-[600px] w-full" />,
});

export default async function EditCausePage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const myParams = await params;

  const [session, cause] = await Promise.all([auth(), getCause(myParams.id)]);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const user = session.user;

  const [hasBankInfo, pendingEdit] = await Promise.all([
    hasBankDetails(user.id as string),
    prisma.cause_edits.findFirst({
      where: {
        original_cause_id: myParams.id,
        status: "pending",
      },
      select: { status: true },
    }),
  ]);

  if (pendingEdit) {
    return (
      <div className="min-h-screen w-full bg-cream px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mx-auto max-w-3xl">
          <CalloutBanner
            variant="gold"
            className="flex-col sm:flex-row"
            title="Your last edit is still under review"
            description="Our team reviews cause edits before they go live. Once that one is approved or rejected you can make more changes."
            action={
              <Button asChild variant="ink" size="sm" className="shrink-0">
                <Link href="/dashboard/causes">Back to causes</Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (!cause) {
    redirect("/dashboard/causes");
  }

  if (cause.user_id !== user.id) {
    redirect("/dashboard/causes");
  }

  if (!hasBankInfo) {
    return (
      <div className="min-h-screen w-full bg-cream px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mx-auto max-w-3xl">
          <CalloutBanner
            variant="gold"
            className="flex-col sm:flex-row"
            title="Add your bank details to edit this cause"
            description="Donations are paid out to this account, so it has to be in place before you make changes."
            action={
              <Button asChild variant="ink" size="sm" className="shrink-0">
                <Link href="/dashboard/settings/bank">Add bank details</Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return <EditCauseForm cause={cause} />;
}
