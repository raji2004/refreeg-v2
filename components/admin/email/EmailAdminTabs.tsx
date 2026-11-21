"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComposeAnnouncement } from "@/components/admin/email/ComposeAnnouncement";
import { TriggersTable } from "@/components/admin/email/TriggersTable";
import { AnnouncementHistory } from "@/components/admin/email/AnnouncementHistory";

export function EmailAdminTabs() {
  return (
    <Tabs defaultValue="compose" className="space-y-4">
      <TabsList variant="pill">
        <TabsTrigger variant="pill" value="compose">
          Compose
        </TabsTrigger>
        <TabsTrigger variant="pill" value="triggers">
          Triggers
        </TabsTrigger>
        <TabsTrigger variant="pill" value="history">
          History
        </TabsTrigger>
      </TabsList>
      <TabsContent value="compose">
        <ComposeAnnouncement />
      </TabsContent>
      <TabsContent value="triggers">
        <TriggersTable />
      </TabsContent>
      <TabsContent value="history">
        <AnnouncementHistory />
      </TabsContent>
    </Tabs>
  );
}
