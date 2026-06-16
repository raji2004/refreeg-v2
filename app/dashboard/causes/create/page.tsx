import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { hasBankDetails, isProfileComplete } from "@/actions/profile-actions";
import CreateCauseForm from "./create-cause-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function CreateCausePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const hasBankInfo = await hasBankDetails(session.user.id as string);
  const { isComplete: profileComplete, missingFields } = await isProfileComplete(session.user.id as string);

  const canCreate = hasBankInfo && profileComplete;

  return (
    <div className="">
      <div className="">
        {!canCreate ? (
          <div className="space-y-4">
            {!hasBankInfo && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Bank Details Required</AlertTitle>
                <AlertDescription className="flex flex-col gap-4">
                  Please add your bank details in the settings to create a cause.
                  This is required to receive donations.
                  <Link href="/dashboard/settings/bank">
                    <Button variant="destructive" className="w-fit">
                      Add Bank Details
                    </Button>
                  </Link>
                </AlertDescription>
              </Alert>
            )}
            
            {!profileComplete && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Profile Incomplete</AlertTitle>
                <AlertDescription className="flex flex-col gap-4">
                  Your profile is missing the following: {missingFields.join(", ")}.
                  Please complete your profile in settings to build trust with donors.
                  <Link href="/dashboard/settings">
                    <Button variant="destructive" className="w-fit">
                      Complete Profile
                    </Button>
                  </Link>
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <CreateCauseForm />
        )}
      </div>
    </div>
  );
}
