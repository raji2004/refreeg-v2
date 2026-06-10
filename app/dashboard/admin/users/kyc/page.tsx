import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { format } from "date-fns";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { getUserRole } from "@/actions/role-actions";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function KycListPage() {
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

  const submissions = await prisma.kyc_verifications.findMany({
    orderBy: { created_at: "desc" },
  });

  const userIds = [...new Set(submissions.map((s) => s.user_id))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, fullName: true, email: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const pending = submissions.filter((s) => s.status === "pending").length;
  const approved = submissions.filter((s) => s.status === "approved").length;
  const rejected = submissions.filter((s) => s.status === "rejected").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">KYC Reviews</h1>
        <p className="text-muted-foreground">
          Review and manage user identity verification submissions.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{approved}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <XCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{rejected}</p>
              <p className="text-sm text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            All Submissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No KYC submissions found
                    </TableCell>
                  </TableRow>
                ) : (
                  submissions.map((sub) => {
                    const user = userMap[sub.user_id];
                    return (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {sub.full_name || user?.fullName || "—"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {user?.email || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{sub.document_type || "—"}</TableCell>
                        <TableCell>
                          {sub.status === "approved" ? (
                            <Badge className="bg-green-500 hover:bg-green-600">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Approved
                            </Badge>
                          ) : sub.status === "pending" ? (
                            <Badge variant="secondary">
                              <Clock className="mr-1 h-3 w-3" />
                              Pending
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="mr-1 h-3 w-3" />
                              Rejected
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {sub.created_at
                            ? format(new Date(sub.created_at), "MMM d, yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {sub.updated_at
                            ? format(new Date(sub.updated_at), "MMM d, yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={`/dashboard/admin/users/kyc/${sub.user_id}`}
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              Review
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
