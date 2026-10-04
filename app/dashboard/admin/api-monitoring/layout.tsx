import type { ReactNode } from "react";
import ApiMonitoringNav from "@/components/admin/ApiMonitoringNav";

export default function ApiMonitoringLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API Monitoring</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor API-created campaigns, donation throughput, reports, and
          request health.
        </p>
      </div>

      <ApiMonitoringNav />

      {children}
    </div>
  );
}
