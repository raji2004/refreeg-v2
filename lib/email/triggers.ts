import { prisma } from "@/lib/prisma";
import { emailTriggerEvents } from "@/lib/options/email-trigger.options";

const CACHE_MS = 30_000;

let cache: { at: number; disabled: Set<string> } | null = null;

export function clearTriggerCache() {
  cache = null;
}

async function disabledEventKeys() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.disabled;
  const rows = await prisma.emailTrigger.findMany({
    where: { enabled: false },
    select: { event_key: true },
  });
  cache = { at: Date.now(), disabled: new Set(rows.map((r) => r.event_key)) };
  return cache.disabled;
}

/**
 * Whether the email built from `templateName` may go out. Templates that no
 * switchable event controls always send. A failed lookup also sends: losing a
 * switch is better than losing a password reset.
 */
export async function isTemplateEnabled(templateName: string) {
  const event = emailTriggerEvents.find(
    (e) =>
      !e.required && (e.templates as readonly string[]).includes(templateName),
  );
  if (!event) return true;
  try {
    return !(await disabledEventKeys()).has(event.key);
  } catch (error) {
    console.error("[EmailTriggers] Lookup failed, sending anyway:", error);
    return true;
  }
}
