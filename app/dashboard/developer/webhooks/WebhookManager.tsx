"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { createWebhook, deleteWebhook } from "@/actions/webhook-actions";
import {
  Plus,
  Trash2,
  Globe,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const EVENT_OPTIONS = [
  { id: "campaign.created", label: "Campaign Created" },
  { id: "donation.success", label: "Donation Success" },
  { id: "campaign.completed", label: "Campaign Completed" },
  { id: "campaign.updated", label: "Campaign Updated" },
];

export default function WebhookManager({
  initialWebhooks,
}: {
  initialWebhooks: any[];
}) {
  const [webhooks, setWebhooks] = useState(initialWebhooks);
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    "campaign.created",
    "donation.success",
  ]);
  const [loading, setLoading] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<{
    id: string;
    secret: string;
  } | null>(null);

  const handleCreate = async () => {
    if (!url.trim() || selectedEvents.length === 0) return;
    if (!url.startsWith("https://")) {
      alert("Webhooks must use HTTPS for security.");
      return;
    }

    setLoading(true);
    try {
      const result = await createWebhook(url, selectedEvents);
      setCreatedSecret({ id: result.id, secret: result.secret });
      setWebhooks([result, ...webhooks]);
      setUrl("");
    } catch (err: any) {
      alert(err.message || "Failed to create webhook");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure? This webhook will stop receiving events immediately.",
      )
    )
      return;
    try {
      await deleteWebhook(id);
      setWebhooks(webhooks.filter((w) => w.id !== id));
      if (createdSecret?.id === id) setCreatedSecret(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete webhook");
    }
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId],
    );
  };

  return (
    <div className="space-y-8">
      <div className="bg-card border rounded-lg p-6 space-y-6 shadow-sm">
        <div>
          <h3 className="font-medium text-lg">Register Endpoint</h3>
          <p className="text-sm text-muted-foreground">
            RefreeG will send POST requests to this URL when events occur in
            your app.
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Endpoint URL</label>
            <Input
              placeholder="https://your-api.com/webhooks/refreeg"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="max-w-2xl"
            />
            <p className="text-[10px] text-muted-foreground italic">
              Must be an HTTPS endpoint.
            </p>
          </div>

          <div className="grid gap-3">
            <label className="text-sm font-medium">
              Events to subscribe to
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {EVENT_OPTIONS.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center space-x-2 border rounded-md p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => toggleEvent(event.id)}
                >
                  <Checkbox
                    id={event.id}
                    checked={selectedEvents.includes(event.id)}
                    onCheckedChange={() => toggleEvent(event.id)}
                  />
                  <label
                    htmlFor={event.id}
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {event.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Button
            disabled={loading || !url.trim() || selectedEvents.length === 0}
            onClick={handleCreate}
            className="w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" /> Register Webhook
          </Button>
        </div>

        {createdSecret && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md animate-in fade-in slide-in-from-top-2">
            <div className="flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="w-full">
                <h4 className="font-medium text-blue-800">
                  Webhook Secret Generated
                </h4>
                <p className="text-sm text-blue-700 mt-1 mb-3">
                  Use this secret to verify the `X-RefreeG-Signature` header in
                  incoming requests. This is shown only once.
                </p>
                <div className="flex items-center gap-2">
                  <code className="px-3 py-2 bg-white rounded border flex-1 text-sm font-mono break-all selection:bg-blue-100 italic">
                    {createdSecret.secret}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(createdSecret.secret);
                      alert("Secret copied!");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border rounded-lg overflow-x-auto bg-card shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-6 py-3 font-medium text-muted-foreground">
                Endpoint
              </th>
              <th className="px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">
                Status
              </th>
              <th className="px-6 py-3 font-medium text-muted-foreground">
                Events
              </th>
              <th className="px-6 py-3 font-medium text-muted-foreground text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {webhooks.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-muted-foreground"
                >
                  <Globe className="w-8 h-8 text-muted/50 mx-auto mb-3" />
                  No webhooks registered yet.
                </td>
              </tr>
            ) : (
              webhooks.map((webhook) => (
                <tr
                  key={webhook.id}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium break-all">{webhook.url}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-mono uppercase tracking-wider">
                      ID: {webhook.id}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase w-fit ${
                        webhook.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {webhook.is_active ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {webhook.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.map((e: string) => (
                        <span
                          key={e}
                          className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-[10px] whitespace-nowrap"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(webhook.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
