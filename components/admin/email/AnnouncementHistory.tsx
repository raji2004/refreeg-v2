"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError } from "@/components/ui/field-error";
import { announcementColumns } from "@/components/admin/email/history-columns";
import { useAnnouncements } from "@/hooks/use-email-admin";

const PAGE_SIZE = 10;

export function AnnouncementHistory() {
  const { announcements, error, isLoading } = useAnnouncements();
  const [pageIndex, setPageIndex] = useState(0);

  if (error) return <FieldError message={error} />;
  if (!isLoading && announcements.length === 0) {
    return (
      <EmptyState
        title="No announcements yet"
        description="Announcements you send or schedule will appear here."
      />
    );
  }

  return (
    <Card>
      <CardContent className="p-2">
        <DataTable
          columns={announcementColumns}
          data={announcements}
          pageSize={PAGE_SIZE}
          pageIndex={pageIndex}
          onPageIndexChange={setPageIndex}
          pagination
        />
      </CardContent>
    </Card>
  );
}
