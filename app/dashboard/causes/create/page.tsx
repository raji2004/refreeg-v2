import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import {
  hasBankDetails,
  isProfileComplete,
} from "@/actions/users/profile-actions";
import CreateCauseForm from "./create-cause-form";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function CreateCausePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const hasBankInfo = await hasBankDetails(session.user.id as string);
  const { isComplete: profileComplete, missingFields } =
    await isProfileComplete(session.user.id as string);

  if (hasBankInfo && profileComplete) {
    return <CreateCauseForm />;
  }

  return (
    <div className="min-h-screen w-full bg-cream px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="mb-6">
          <Eyebrow>Campaign builder</Eyebrow>
          <h1 className="mt-2 font-fraunces text-3xl font-medium text-ink sm:text-4xl">
            A couple of things first
          </h1>
        </div>

        {!hasBankInfo && (
          <CalloutBanner
            variant="gold"
            className="flex-col sm:flex-row"
            title="Add your bank details to start a cause"
            description="Donations are paid out to this account, so it has to be in place before your cause goes live."
            action={
              <Button asChild variant="ink" size="sm" className="shrink-0">
                <Link href="/dashboard/settings/bank">Add bank details</Link>
              </Button>
            }
          />
        )}

        {!profileComplete && (
          <CalloutBanner
            variant="gold"
            className="flex-col sm:flex-row"
            title="Finish your profile"
            description={`Still missing: ${missingFields.join(", ")}. A complete profile helps donors trust your cause.`}
            action={
              <Button asChild variant="ink" size="sm" className="shrink-0">
                <Link href="/dashboard/settings">Complete profile</Link>
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
