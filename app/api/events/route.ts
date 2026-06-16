import { NextRequest } from "next/server";
import { eventBus } from "@/lib/event-bus";
import { EventPayload } from "@/hooks/use-event-listeners";

// This route must be dynamic
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection ping
      controller.enqueue(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);

      const handleEvent = (payload: EventPayload) => {
        // Filter events specific to the user, if a userId was provided by the client
        if (userId && payload.data?.user_id && payload.data.user_id !== userId) {
          return;
        }
        
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
          controller.enqueue(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
        } catch (e) {
          // If enqueue fails, the stream is likely closed.
          clearInterval(pingInterval);
        }
      }, 30000);

      // Clean up when the client disconnects
      req.signal.addEventListener("abort", () => {
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
