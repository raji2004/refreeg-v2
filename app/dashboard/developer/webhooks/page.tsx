import { getWebhooks } from "@/actions/webhook-actions";
import WebhookManager from "./WebhookManager";
import WebhookLogViewer from "./WebhookLogViewer";

export const metadata = {
  title: "Webhooks | RefreeG Developer",
};

export default async function WebhooksPage() {
  const webhooks = await getWebhooks();

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Webhooks</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure HTTP endpoints to receive real-time notifications from
          RefreeG.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-1">
        <WebhookManager initialWebhooks={webhooks} />

        <div className="border-t pt-10">
          <WebhookLogViewer />
        </div>
      </div>
    </div>
  );
}
