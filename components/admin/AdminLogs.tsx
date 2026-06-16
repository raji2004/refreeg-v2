"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface AdminLog {
  email: string;
  action: string;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  "approve-cause": "Approved Cause",
  "reject-cause": "Rejected Cause",
  "approve-petition": "Approved Petition",
  "reject-petition": "Rejected Petition",
  "block-user": "Blocked User",
  "unblock-user": "Unblocked User",
  "appoint-manager": "Appointed Manager",
  "remove-manager": "Removed Manager",
  "delete-user": "Deleted User",
  "approve-kyc": "Approved KYC",
  "reject-kyc": "Rejected KYC",
  "appoint-admin": "Appointed Admin",
};

const getActionBadgeColor = (action: string) => {
  if (
    action.includes("approve") ||
    action.includes("unblock") ||
    action.includes("appoint")
  ) {
    return "default"; // or "success" if available, but default is usually black/primary
  }
  if (
    action.includes("reject") ||
    action.includes("block") ||
    action.includes("remove") ||
    action.includes("delete")
  ) {
    return "destructive";
  }
  return "secondary";
};

export default function AdminLogs({ logs }: { logs: AdminLog[] }) {
  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Admin Email</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Timestamp</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center">
                No admin logs found.
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log: AdminLog, idx: number) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">{log.email}</TableCell>
                <TableCell>
                  <Badge variant={getActionBadgeColor(log.action)}>
                    {ACTION_LABELS[log.action] || log.action}
                  </Badge>
                </TableCell>
                <TableCell suppressHydrationWarning>
                  {new Date(log.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
