import { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/actions/profile-actions";
import { getCurrentUser } from "@/actions/auth-actions";
import DeveloperNav from "./DeveloperNav";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default async function DeveloperLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");

  const profile = await getProfile(user.id);

  if (profile?.account_type !== "developer") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-2 sm:px-4">
        <Card className="w-full sm:max-w-md border border-slate-200 shadow-lg">
          <CardHeader className="text-center px-4 sm:px-6">
            <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 rounded-full flex items-center justify-center mb-3 sm:mb-4">
              <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
            </div>

            <CardTitle className="text-xl sm:text-2xl">
              Developer Access Required
            </CardTitle>

            <CardDescription className="pt-1 sm:pt-2 text-sm">
              The developer area is reserved for technical integrations, API
              management, and webhook configurations.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 px-4 sm:px-6">
            <div className="bg-slate-50 p-3 sm:p-4 rounded-lg text-sm text-slate-600 italic">
              &quot;Your current account type is set to{" "}
              <strong>{profile?.account_type || "User"}</strong>. To access
              these tools, you need to be a registered developer.&quot;
            </div>

            <div className="flex flex-col gap-2 pt-1 sm:pt-2">
              <Button asChild className="w-full">
                <Link href="/dashboard/settings/profile">
                  Upgrade Account in Settings
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full gap-2 text-slate-800"
              >
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>

            <p className="text-[11px] text-center text-slate-400 pt-2">
              If you believe this is an error, please contact RefreeG support or
              check your documentation.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-8 px-4 sm:px-6 border border-slate-100 rounded-xl my-4">
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Developer Area</h1>
        <p className="text-muted-foreground mt-2">
          Manage your API keys, webhooks, and technical integrations for the
          RefreeG Crowdfunding service.
        </p>

        <DeveloperNav />
      </div>
      <div className="min-h-[500px]">{children}</div>
    </div>
  );
}
