import { prisma } from "@/lib/prisma";
import { sendMail } from "@/services/mail";
import { countAudience, getRecipientBatch } from "@/lib/email/audience";
import type { EmailAudience } from "@/lib/options/email-audience.options";

const BATCH_SIZE = 100;
const CONCURRENCY = 5;
const MAX_PER_RUN = 5;
/** A `sending` row that has not moved for this long is treated as crashed. */
const STALE_MS = 10 * 60_000;

const appUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL || "https://www.refreeg.com";

type AnnouncementContent = {
  title: string;
  message: string;
  linkPath: string | null;
};

/** One mail context shared by real sends and the admin's test send. */
export function announcementContext(
  content: AnnouncementContent,
  userName: string,
) {
  return {
    userName,
    title: content.title,
    paragraphs: content.message.split(/\n+/).filter(Boolean),
    ctaUrl: content.linkPath ? `${appUrl()}${content.linkPath}` : null,
    currentYear: new Date().getFullYear(),
  };
}

export const recipientName = (user: {
  firstName: string | null;
  displayName: string | null;
  fullName: string | null;
}) => user.firstName || user.displayName || user.fullName || "there";

async function sendToBatch(
  recipients: Awaited<ReturnType<typeof getRecipientBatch>>,
  content: AnnouncementContent,
) {
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < recipients.length; i += CONCURRENCY) {
    const results = await Promise.all(
      recipients.slice(i, i + CONCURRENCY).map((user) =>
        user.email
          ? sendMail({
              to: user.email,
              subject: content.title,
              templateName: "announcement",
              context: announcementContext(content, recipientName(user)),
            })
          : { success: false },
      ),
    );
    for (const result of results) {
      if (result.success) sent++;
      else failed++;
    }
  }
  return { sent, failed };
}

/** Sends one claimed announcement to completion, resuming from its cursor. */
export async function sendAnnouncement(id: string) {
  const announcement = await prisma.emailAnnouncement.findUnique({
    where: { id },
  });
  if (!announcement) return;

  const audience = announcement.audience as EmailAudience;
  const content = {
    title: announcement.title,
    message: announcement.message,
    linkPath: announcement.link_path,
  };

  try {
    if (!announcement.recipient_count) {
      await prisma.emailAnnouncement.update({
        where: { id },
        data: { recipient_count: await countAudience(audience) },
      });
    }

    let cursor = announcement.last_user_id;
    let sent = announcement.sent_count;
    let failed = announcement.failed_count;

    for (;;) {
      const recipients = await getRecipientBatch(audience, cursor, BATCH_SIZE);
      if (!recipients.length) break;

      const batch = await sendToBatch(recipients, content);
      sent += batch.sent;
      failed += batch.failed;
      cursor = recipients[recipients.length - 1].id;
      await prisma.emailAnnouncement.update({
        where: { id },
        data: { sent_count: sent, failed_count: failed, last_user_id: cursor },
      });
    }

    await prisma.emailAnnouncement.update({
      where: { id },
      data: {
        status: sent === 0 && failed > 0 ? "failed" : "sent",
        completed_at: new Date(),
      },
    });
  } catch (error) {
    console.error(`[Announcement ${id}] Run failed:`, error);
    await prisma.emailAnnouncement.update({
      where: { id },
      data: { status: "failed", completed_at: new Date() },
    });
  }
}

/**
 * Picks up announcements that are due (or stuck mid-send) and sends them. Safe
 * to call from many places at once: a row is claimed with a conditional update,
 * so only one caller sends it.
 */
export async function processDueAnnouncements(now = new Date()) {
  const staleBefore = new Date(now.getTime() - STALE_MS);
  const due = await prisma.emailAnnouncement.findMany({
    where: {
      OR: [
        { status: "scheduled", scheduled_at: { lte: now } },
        { status: "sending", updated_at: { lt: staleBefore } },
      ],
    },
    orderBy: { scheduled_at: "asc" },
    take: MAX_PER_RUN,
    select: { id: true, status: true, updated_at: true },
  });

  let processed = 0;
  for (const row of due) {
    const claim = await prisma.emailAnnouncement.updateMany({
      where:
        row.status === "scheduled"
          ? { id: row.id, status: "scheduled" }
          : { id: row.id, status: "sending", updated_at: row.updated_at },
      data:
        row.status === "scheduled"
          ? { status: "sending", started_at: now }
          : { status: "sending" },
    });
    if (claim.count !== 1) continue;
    await sendAnnouncement(row.id);
    processed++;
  }
  return { processed };
}
