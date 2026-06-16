import AdminLogs from "@/components/admin/AdminLogs";
import { listAdminLogs } from "@/actions/database-actions";
import { auth } from "@/lib/auth/auth";
import { getUserRole } from "@/lib/auth/admin-auth";
import { redirect } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default async function AdminLogsPage() {
  // Get authenticated user from NextAuth
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Check if user has admin or manager role
  const role = await getUserRole(session.user.id);

  if (role !== "admin" && role !== "manager") {
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

  try {
    const logs = await listAdminLogs();
    return (
      <div>
        <AdminLogs logs={logs} />
      </div>
    );
  } catch (error) {
    console.error("Error in Admin Logs page:", error);
    return (
      <div className="p-4 text-center text-red-500">
        <p>Failed to load admin logs.</p>
        <p className="text-sm text-gray-500 mt-2">
          {(error as Error).message || "Unknown error"}
        </p>
      </div>
    );
  }
}
