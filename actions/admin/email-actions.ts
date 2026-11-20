"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAdminOrManager } from "@/lib/auth/admin-auth";
import { sendMail } from "@/services/mail";
import { countAudience } from "@/lib/email/audience";
import { clearTriggerCache } from "@/lib/email/triggers";
import {
  announcementContext,
  processDueAnnouncements,
  recipientName,
} from "@/lib/email/announcement-sender";
import { emailTriggerEvents } from "@/lib/options/email-trigger.options";
import {
  announcementSchema,
  type AnnouncementInput,
} from "@/lib/schemas/email-announcement.schema";
import { emailAudienceValues } from "@/lib/options/email-audience.options";
import { NO_LINK } from "@/lib/options/email-link.options";
import type {
  AnnouncementItem,
  AnnouncementStatus,
  EmailTriggerItem,
} from "@/types/email-types";

const PAGE_PATH = "/dashboard/admin/notifications";
const HISTORY_LIMIT = 50;

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong";

export async function getEmailTriggers(): Promise<
  | { success: true; data: EmailTriggerItem[] }
  | { success: false; error: string }
> {
  try {
    await requireAdminOrManager();
    const off = await prisma.emailTrigger.findMany({
      where: { enabled: false },
      select: { event_key: true },
    });
    const disabled = new Set(off.map((row) => row.event_key));
    return {
      success: true,
      data: emailTriggerEvents.map((event) => ({
        key: event.key,
        label: event.label,
        audience: event.audience,
        required: event.required,
        enabled: event.required || !disabled.has(event.key),
      })),
    };
  } catch (error) {
    return { success: false, error: messageOf(error) };
  }
}

export async function setEmailTrigger(key: string, enabled: boolean) {
  try {
    const admin = await requireAdmin();
    const event = emailTriggerEvents.find((e) => e.key === key);
    if (!event) return { success: false, error: "Unknown notification event" };
    if (event.required) {
      return {
        success: false,
        error: "This notification is required and cannot be switched off",
      };
    }
    await prisma.emailTrigger.upsert({
      where: { event_key: key },
      create: { event_key: key, enabled, updated_by: admin.id },
      update: { enabled, updated_by: admin.id },
    });
    await prisma.logs.create({
      data: {
        action: `email-trigger:${key}:${enabled ? "on" : "off"}`,
        admin_id: admin.id,
      },
    });
    clearTriggerCache();
    revalidatePath(PAGE_PATH);
    return { success: true };
  } catch (error) {
    return { success: false, error: messageOf(error) };
  }
}

export async function getAudienceReach(audience: string) {
  try {
    await requireAdminOrManager();
    if (!(emailAudienceValues as string[]).includes(audience)) {
      return { success: false as const, error: "Unknown audience" };
    }
    const count = await countAudience(
      audience as (typeof emailAudienceValues)[number],
    );
    return { success: true as const, data: { count } };
  } catch (error) {
    return { success: false as const, error: messageOf(error) };
  }
}

export async function createAnnouncement(input: AnnouncementInput) {
  try {
    const admin = await requireAdmin();
    const parsed = announcementSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const { audience, title, message, linkPath, sendAt } = parsed.data;
    const sendNow = !sendAt;

    const announcement = await prisma.emailAnnouncement.create({
      data: {
        title,
        message,
        audience,
        link_path: linkPath === NO_LINK ? null : linkPath,
        scheduled_at: sendNow ? new Date() : new Date(sendAt),
        recipient_count: await countAudience(audience),
        created_by: admin.id,
      },
    });
    await prisma.logs.create({
      data: {
        action: `email-announcement:${announcement.id}`,
        admin_id: admin.id,
      },
    });

    // Scheduled ones are picked up by the cron route; "now" starts right away.
    if (sendNow) after(() => processDueAnnouncements());
    revalidatePath(PAGE_PATH);
    return { success: true, data: { id: announcement.id } };
  } catch (error) {
    return { success: false, error: messageOf(error) };
  }
}

export async function sendTestAnnouncement(input: AnnouncementInput) {
  try {
    const admin = await requireAdminOrManager();
    const parsed = announcementSchema.safeParse({
      ...input,
      sendAt: "",
      sendLater: false,
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    if (!admin.email) {
      return { success: false, error: "Your account has no email address" };
    }
    const { title, message, linkPath } = parsed.data;
    const result = await sendMail({
      to: admin.email,
      subject: `[Test] ${title}`,
      templateName: "announcement",
      context: announcementContext(
        { title, message, linkPath: linkPath === NO_LINK ? null : linkPath },
        recipientName({
          firstName: null,
          displayName: admin.name ?? null,
          fullName: null,
        }),
      ),
    });
    if (!result.success) {
      return { success: false, error: "The test email could not be sent" };
    }
    return { success: true, data: { email: admin.email } };
  } catch (error) {
    return { success: false, error: messageOf(error) };
  }
}

export async function getAnnouncements(): Promise<
  | { success: true; data: AnnouncementItem[] }
  | { success: false; error: string }
> {
  try {
    await requireAdminOrManager();
    const rows = await prisma.emailAnnouncement.findMany({
      orderBy: { created_at: "desc" },
      take: HISTORY_LIMIT,
    });
    return {
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        title: row.title,
        audience: row.audience,
        status: row.status as AnnouncementStatus,
        scheduledAt: row.scheduled_at.toISOString(),
        completedAt: row.completed_at?.toISOString() ?? null,
        recipientCount: row.recipient_count,
        sentCount: row.sent_count,
        failedCount: row.failed_count,
      })),
    };
  } catch (error) {
    return { success: false, error: messageOf(error) };
  }
}
