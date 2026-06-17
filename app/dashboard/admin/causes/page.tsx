import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { isAdminOrManager } from "@/actions/role-actions";

const ManageCauses = dynamic(() => import("@/components/admin/ManageCause"), {
  loading: () => <Skeleton className="h-[800px] w-full" />,
});

export default async function AdminCausesPage() {
  // ✅ Server-side check BEFORE any client component renders
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const isAuthorized = await isAdminOrManager(session.user.id);

  if (!isAuthorized) {
    redirect("/dashboard");
  }

  return <ManageCauses />;
}
