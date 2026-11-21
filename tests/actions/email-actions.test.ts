/**
 * @jest-environment node
 */
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAdminOrManager } from "@/lib/auth/admin-auth";
import { sendMail } from "@/services/mail";
import { countAudience } from "@/lib/email/audience";
import { clearTriggerCache } from "@/lib/email/triggers";
import { processDueAnnouncements } from "@/lib/email/announcement-sender";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  createAnnouncement,
  getAnnouncements,
  getAudienceReach,
  getEmailTriggers,
  sendTestAnnouncement,
  setEmailTrigger,
} from "@/actions/admin/email-actions";

jest.mock("next/server", () => ({ after: jest.fn() }));
jest.mock("@/lib/auth/admin-auth", () => ({
  requireAdmin: jest.fn(),
  requireAdminOrManager: jest.fn(),
}));
jest.mock("@/services/mail", () => ({ sendMail: jest.fn() }));
jest.mock("@/lib/email/audience", () => ({ countAudience: jest.fn() }));
jest.mock("@/lib/email/triggers", () => ({ clearTriggerCache: jest.fn() }));
jest.mock("@/lib/email/announcement-sender", () => ({
  ...jest.requireActual("@/lib/email/announcement-sender"),
  processDueAnnouncements: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    emailTrigger: { findMany: jest.fn(), upsert: jest.fn() },
    emailAnnouncement: { create: jest.fn(), findMany: jest.fn() },
    logs: { create: jest.fn() },
  },
}));

const db = prisma as unknown as {
  emailTrigger: { findMany: jest.Mock; upsert: jest.Mock };
  emailAnnouncement: { create: jest.Mock; findMany: jest.Mock };
  logs: { create: jest.Mock };
};
const mockAdmin = requireAdmin as jest.Mock;
const mockManager = requireAdminOrManager as jest.Mock;
const mockSendMail = sendMail as jest.Mock;
const mockCount = countAudience as jest.Mock;
const mockAfter = after as jest.Mock;

const admin = { id: "admin-1", email: "admin@refreeg.com", name: "Kemi" };

const input = {
  audience: "all_users" as const,
  title: "Hello",
  message: "A message",
  linkPath: "none",
  sendAt: "",
};

beforeEach(() => {
  mockAdmin.mockResolvedValue(admin);
  mockManager.mockResolvedValue(admin);
  mockCount.mockResolvedValue(25);
  db.emailAnnouncement.create.mockResolvedValue({ id: "ann-1" });
});

describe("access", () => {
  it("lets a manager read but only an admin change things", async () => {
    mockAdmin.mockRejectedValue(new Error("Admin access required"));

    expect(await setEmailTrigger("proof_posted", false)).toEqual({
      success: false,
      error: "Admin access required",
    });
    expect(await createAnnouncement(input)).toEqual({
      success: false,
      error: "Admin access required",
    });
    db.emailTrigger.findMany.mockResolvedValue([]);
    expect((await getEmailTriggers()).success).toBe(true);
    expect(db.emailTrigger.upsert).not.toHaveBeenCalled();
    expect(db.emailAnnouncement.create).not.toHaveBeenCalled();
  });

  it("returns the real auth error for anyone else", async () => {
    mockManager.mockRejectedValue(new Error("Not authenticated"));
    for (const result of await Promise.all([
      getEmailTriggers(),
      getAnnouncements(),
      getAudienceReach("all_users"),
      sendTestAnnouncement(input),
    ])) {
      expect(result).toEqual({ success: false, error: "Not authenticated" });
    }
    expect(mockSendMail).not.toHaveBeenCalled();
  });
});

describe("getEmailTriggers", () => {
  it("shows every event, with switched-off ones disabled", async () => {
    db.emailTrigger.findMany.mockResolvedValue([{ event_key: "proof_posted" }]);
    const result = await getEmailTriggers();
    if (!result.success) throw new Error("expected success");
    const byKey = Object.fromEntries(result.data.map((t) => [t.key, t]));
    expect(byKey.proof_posted.enabled).toBe(false);
    expect(byKey.proof_due.enabled).toBe(true);
    expect(byKey.donation).toMatchObject({ required: true, enabled: true });
  });

  it("keeps a required event on even if a stray row says off", async () => {
    db.emailTrigger.findMany.mockResolvedValue([{ event_key: "donation" }]);
    const result = await getEmailTriggers();
    if (!result.success) throw new Error("expected success");
    expect(result.data.find((t) => t.key === "donation")?.enabled).toBe(true);
  });
});

describe("setEmailTrigger", () => {
  it("saves the switch, logs it, drops the cache and refreshes the page", async () => {
    expect(await setEmailTrigger("proof_posted", false)).toEqual({
      success: true,
    });
    expect(db.emailTrigger.upsert).toHaveBeenCalledWith({
      where: { event_key: "proof_posted" },
      create: {
        event_key: "proof_posted",
        enabled: false,
        updated_by: "admin-1",
      },
      update: { enabled: false, updated_by: "admin-1" },
    });
    expect(db.logs.create).toHaveBeenCalledWith({
      data: { action: "email-trigger:proof_posted:off", admin_id: "admin-1" },
    });
    expect(clearTriggerCache).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith(
      "/dashboard/admin/notifications",
    );
  });

  it("refuses to switch off a required event", async () => {
    const result = await setEmailTrigger("donation", false);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/required/);
    expect(db.emailTrigger.upsert).not.toHaveBeenCalled();
  });

  it("refuses an unknown event", async () => {
    expect(await setEmailTrigger("made_up", false)).toEqual({
      success: false,
      error: "Unknown notification event",
    });
    expect(db.emailTrigger.upsert).not.toHaveBeenCalled();
  });

  it("reports a database failure", async () => {
    db.emailTrigger.upsert.mockRejectedValue(new Error("db down"));
    expect(await setEmailTrigger("proof_posted", true)).toEqual({
      success: false,
      error: "db down",
    });
  });
});

describe("getAudienceReach", () => {
  it("returns the count for a known audience", async () => {
    expect(await getAudienceReach("donors")).toEqual({
      success: true,
      data: { count: 25 },
    });
    expect(mockCount).toHaveBeenCalledWith("donors");
  });

  it("rejects an unknown audience before querying", async () => {
    expect(await getAudienceReach("nobody")).toEqual({
      success: false,
      error: "Unknown audience",
    });
    expect(mockCount).not.toHaveBeenCalled();
  });
});

describe("createAnnouncement", () => {
  it("queues a send-now announcement and starts it right away", async () => {
    expect(await createAnnouncement(input)).toEqual({
      success: true,
      data: { id: "ann-1" },
    });
    const { data } = db.emailAnnouncement.create.mock.calls[0][0];
    expect(data).toMatchObject({
      title: "Hello",
      audience: "all_users",
      link_path: null,
      recipient_count: 25,
      created_by: "admin-1",
    });
    expect(Math.abs(data.scheduled_at.getTime() - Date.now())).toBeLessThan(
      5000,
    );
    expect(mockAfter).toHaveBeenCalledTimes(1);
    mockAfter.mock.calls[0][0]();
    expect(processDueAnnouncements).toHaveBeenCalled();
  });

  it("schedules a future one without starting it", async () => {
    const at = new Date(Date.now() + 3_600_000).toISOString();
    await createAnnouncement({ ...input, sendAt: at, sendLater: true });
    const { data } = db.emailAnnouncement.create.mock.calls[0][0];
    expect(data.scheduled_at.toISOString()).toBe(at);
    expect(mockAfter).not.toHaveBeenCalled();
  });

  it("stores the page the button opens", async () => {
    await createAnnouncement({ ...input, linkPath: "/wallet" });
    expect(db.emailAnnouncement.create.mock.calls[0][0].data.link_path).toBe(
      "/wallet",
    );
  });

  it("logs who created it", async () => {
    await createAnnouncement(input);
    expect(db.logs.create).toHaveBeenCalledWith({
      data: { action: "email-announcement:ann-1", admin_id: "admin-1" },
    });
  });

  it.each([
    ["an empty title", { title: " " }, "Add a title"],
    ["an empty message", { message: "" }, "Write a message"],
    [
      "a past time",
      { sendAt: new Date(Date.now() - 60_000).toISOString() },
      "Pick a time in the future",
    ],
    ["Schedule without a time", { sendLater: true }, "Pick a time to send"],
  ])("rejects %s on the server too", async (_name, patch, message) => {
    expect(await createAnnouncement({ ...input, ...patch })).toEqual({
      success: false,
      error: message,
    });
    expect(db.emailAnnouncement.create).not.toHaveBeenCalled();
    expect(mockAfter).not.toHaveBeenCalled();
  });

  it("rejects a page that is not on the list", async () => {
    const result = await createAnnouncement({
      ...input,
      linkPath: "https://evil.example",
    });
    expect(result).toEqual({ success: false, error: "Choose a page" });
  });

  it("reports a database failure", async () => {
    db.emailAnnouncement.create.mockRejectedValue(new Error("db down"));
    expect(await createAnnouncement(input)).toEqual({
      success: false,
      error: "db down",
    });
  });
});

describe("sendTestAnnouncement", () => {
  it("sends one email to the admin, marked as a test", async () => {
    mockSendMail.mockResolvedValue({ success: true });
    expect(await sendTestAnnouncement(input)).toEqual({
      success: true,
      data: { email: "admin@refreeg.com" },
    });
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "admin@refreeg.com",
        subject: "[Test] Hello",
        templateName: "announcement",
      }),
    );
    expect(db.emailAnnouncement.create).not.toHaveBeenCalled();
  });

  it("does not need a valid schedule time to test", async () => {
    mockSendMail.mockResolvedValue({ success: true });
    const result = await sendTestAnnouncement({
      ...input,
      sendLater: true,
      sendAt: "",
    });
    expect(result.success).toBe(true);
  });

  it("validates the content first", async () => {
    expect(await sendTestAnnouncement({ ...input, title: "" })).toEqual({
      success: false,
      error: "Add a title",
    });
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("says so when the admin has no email", async () => {
    mockManager.mockResolvedValue({ id: "a", email: null });
    expect(await sendTestAnnouncement(input)).toEqual({
      success: false,
      error: "Your account has no email address",
    });
  });

  it("says so when the mail could not be sent", async () => {
    mockSendMail.mockResolvedValue({ success: false });
    expect(await sendTestAnnouncement(input)).toEqual({
      success: false,
      error: "The test email could not be sent",
    });
  });
});

describe("getAnnouncements", () => {
  it("returns the latest first, with dates as strings", async () => {
    const at = new Date("2026-11-20T10:00:00Z");
    db.emailAnnouncement.findMany.mockResolvedValue([
      {
        id: "a1",
        title: "T",
        audience: "donors",
        status: "sent",
        scheduled_at: at,
        completed_at: at,
        recipient_count: 10,
        sent_count: 9,
        failed_count: 1,
      },
      {
        id: "a2",
        title: "U",
        audience: "all_users",
        status: "scheduled",
        scheduled_at: at,
        completed_at: null,
        recipient_count: 5,
        sent_count: 0,
        failed_count: 0,
      },
    ]);
    const result = await getAnnouncements();
    if (!result.success) throw new Error("expected success");
    expect(db.emailAnnouncement.findMany).toHaveBeenCalledWith({
      orderBy: { created_at: "desc" },
      take: 50,
    });
    expect(result.data[0]).toEqual({
      id: "a1",
      title: "T",
      audience: "donors",
      status: "sent",
      scheduledAt: at.toISOString(),
      completedAt: at.toISOString(),
      recipientCount: 10,
      sentCount: 9,
      failedCount: 1,
    });
    expect(result.data[1].completedAt).toBeNull();
  });
});
