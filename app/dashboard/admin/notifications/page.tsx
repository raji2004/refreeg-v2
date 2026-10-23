import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { isAdminOrManager } from "@/actions/role-actions";

const BroadcastPushForm = dynamic(
  () => import("@/components/admin/BroadcastPushForm"),
  {
    loading: () => <Skeleton className="h-[600px] w-full rounded-2xl" />,
  },
);

export const metadata = {
  title: "Push Notifications | Admin Dashboard",
  description: "Send broadcast push notifications to RefreeG mobile app users.",
};

export default async function AdminNotificationsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const isAuthorized = await isAdminOrManager(session.user.id);
  if (!isAuthorized) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
      <BroadcastPushForm />
    </div>
  );
}
