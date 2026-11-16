import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { eventBus } from "@/lib/event-bus";
import { EventPayload } from "@/hooks/use-event-listeners";

export const dynamic = "force-dynamic";

const MAX_CONNECTIONS_PER_USER = 5;
const activeConnections = new Map<string, number>();

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const active = activeConnections.get(userId) ?? 0;
  if (active >= MAX_CONNECTIONS_PER_USER) {
    return new Response("Too many connections", { status: 429 });
  }
  activeConnections.set(userId, active + 1);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    const n = (activeConnections.get(userId) ?? 1) - 1;
    if (n <= 0) activeConnections.delete(userId);
    else activeConnections.set(userId, n);
  };

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(`data: ${JSON.stringify({ type: "ping" })}\n\n`);

      const handleEvent = (payload: EventPayload) => {
        // Only the signed-in user's own events; events with no owner are dropped.
        if (payload.data?.user_id !== userId) return;

        controller.enqueue(`data: ${JSON.stringify(payload)}\n\n`);
      };

      // Attach listeners to our global Node.js Event Emitter
      eventBus.on("comment", handleEvent);
      eventBus.on("share", handleEvent);
      eventBus.on("donation", handleEvent);
      eventBus.on("weekly_streak", handleEvent);
      eventBus.on("monthly_active", handleEvent);

      // Keep the connection alive with pings every 30 seconds
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(`data: ${JSON.stringify({ type: "ping" })}\n\n`);
        } catch (e) {
          // If enqueue fails, the stream is likely closed.
          clearInterval(pingInterval);
        }
      }, 30000);

      // Clean up when the client disconnects
      req.signal.addEventListener("abort", () => {
        release();
        clearInterval(pingInterval);
        eventBus.off("comment", handleEvent);
        eventBus.off("share", handleEvent);
        eventBus.off("donation", handleEvent);
        eventBus.off("weekly_streak", handleEvent);
        eventBus.off("monthly_active", handleEvent);
        try {
          controller.close();
        } catch (e) {
          // Stream might already be closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable buffering in reverse proxies like Nginx
    },
  });
}
