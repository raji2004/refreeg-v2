"use client";

import { useState, useEffect } from "react";
import { getWebhookLogs } from "@/actions/webhook-actions";
import { Button } from "@/components/ui/button";
import {
  RefreshCcw,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

export default function WebhookLogViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getWebhookLogs();
      setLogs(data);
      setError(null);
    } catch (err: any) {
      setError("Failed to load logs");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            Delivery Logs
          </h3>
          <p className="text-sm text-muted-foreground">
            Recent delivery attempts and responses.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          disabled={loading}
        >
          <RefreshCcw
            className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="border rounded-lg bg-card shadow-sm overflow-hidden text-sm">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground">
                  Event
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground">
                  Endpoint
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground">
                  Time
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    {loading
                      ? "Loading logs..."
                      : error || "No delivery logs found."}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {log.status_code >= 200 && log.status_code < 300 ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span
                          className={`font-mono font-bold ${
                            log.status_code >= 200 && log.status_code < 300
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {log.status_code || "FAIL"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] truncate max-w-[150px]">
                      {log.event_type}
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-[11px] truncate max-w-[200px] text-muted-foreground"
                      title={log.api_webhooks?.url}
                    >
                      {log.api_webhooks?.url}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {/* Detailed log view could be a modal, keeping it simple for now */}
                      <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">
                        {log.response_body ? "Response Received" : "No Body"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
