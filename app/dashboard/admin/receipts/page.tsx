import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getUserRole } from "@/actions/admin/role-actions";
import { getAdminReceiptQueue } from "@/actions/admin/admin-receipt-actions";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReceiptFlashToast } from "@/components/admin/receipts/ReceiptFlashToast";
import { receiptQueueTabOptions } from "@/lib/options/receipt-review.options";
import type { ReceiptQueueTab } from "@/types/receipt-types";
import { ReceiptQueueClient } from "./ReceiptQueueClient";

export const metadata = { title: "Receipts | RefreeG Admin" };

export default async function ReceiptQueuePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/auth/signin");

  const role = await getUserRole(userId);
  if (role !== "admin" && role !== "manager") {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const params = (await searchParams) ?? {};
  const tabParam = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialTab =
    receiptQueueTabOptions.find((option) => option.value === tabParam)?.value ??
    "to-verify";

  const snapshot = await getAdminReceiptQueue();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <ReceiptFlashToast />
      <ReceiptQueueClient
        key={initialTab}
        snapshot={snapshot}
        initialTab={initialTab as ReceiptQueueTab}
      />
    </div>
  );
}
