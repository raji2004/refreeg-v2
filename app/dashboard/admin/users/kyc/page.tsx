import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getUserRole } from "@/actions/admin/role-actions";
import { getAdminKycQueueSnapshot } from "@/actions/users/kyc-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KycFlashToast } from "@/components/admin/kyc/kyc-flash-toast";
import { kycStatusTabs } from "@/lib/options/kyc-review.options";
import type { KycQueueTab } from "@/types/kyc-types";
import { KycQueueClient } from "./kyc-queue-client";

/**
 * Server shell for the KYC review board: auth + role guard, the flash
 * toast from approve/reject actions, and one snapshot fetch. Tabs,
 * search, filters and pagination are client state (see KycQueueClient)
 * so switching feels instant instead of reloading the page.
 */
export default async function KycListPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/auth/signin");
  }

  const userRole = await getUserRole(userId);
  if (!userRole || (userRole !== "admin" && userRole !== "manager")) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You do not have permission to access this page.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Deep links like /dashboard/admin/users/kyc?tab=approved still open the
  // right tab; every interaction after that stays client-side.
  const params = (await searchParams) ?? {};
  const tabParam = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialTab = (
    kycStatusTabs.some((item) => item.value === tabParam)
      ? tabParam
      : "needs-review"
  ) as KycQueueTab;

  const snapshot = await getAdminKycQueueSnapshot();

  return (
    <div className="space-y-6 px-4 py-4 md:px-0 md:py-6">
      <KycFlashToast />
      <KycQueueClient snapshot={snapshot} initialTab={initialTab} />
    </div>
  );
}
