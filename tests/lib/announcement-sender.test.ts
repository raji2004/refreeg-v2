/**
 * @jest-environment node
 */
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/services/mail";
import { countAudience, getRecipientBatch } from "@/lib/email/audience";
import {
  announcementContext,
  processDueAnnouncements,
  recipientName,
  sendAnnouncement,
} from "@/lib/email/announcement-sender";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    emailAnnouncement: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));
jest.mock("@/services/mail", () => ({ sendMail: jest.fn() }));
jest.mock("@/lib/email/audience", () => ({
  countAudience: jest.fn(),
  getRecipientBatch: jest.fn(),
}));

const announcements = (
  prisma as unknown as {
    emailAnnouncement: Record<
      "findUnique" | "findMany" | "update" | "updateMany",
      jest.Mock
    >;
  }
).emailAnnouncement;
const mockSendMail = sendMail as jest.Mock;
const mockCount = countAudience as jest.Mock;
const mockBatch = getRecipientBatch as jest.Mock;

const row = (overrides = {}) => ({
  id: "a1",
  title: "Proof of delivery is now required",
  message: "From 1 December.\nUpload it from your campaign page.",
  audience: "campaign_owners",
  link_path: "/dashboard/causes",
  status: "sending",
  recipient_count: 3,
  sent_count: 0,
  failed_count: 0,
  last_user_id: null,
  ...overrides,
});

const user = (id: string, email: string | null = `${id}@x.com`) => ({
  id,
  email,
  firstName: id.toUpperCase(),
  displayName: null,
  fullName: null,
});

const updates = () =>
  announcements.update.mock.calls.map(
    ([arg]) => arg.data as Record<string, unknown>,
  );

beforeEach(() => {
  mockSendMail.mockResolvedValue({ success: true });
  announcements.update.mockResolvedValue({});
});

describe("announcementContext / recipientName", () => {
  it("splits the message into paragraphs and builds the button url", () => {
    const ctx = announcementContext(
      { title: "T", message: "one\n\n two \nthree", linkPath: "/wallet" },
      "Ada",
    );
    expect(ctx.paragraphs).toEqual(["one", " two ", "three"]);
    expect(ctx.ctaUrl).toMatch(/\/wallet$/);
    expect(ctx.userName).toBe("Ada");
  });

  it("has no button url without a link", () => {
    expect(
      announcementContext({ title: "T", message: "m", linkPath: null }, "Ada")
        .ctaUrl,
    ).toBeNull();
  });

  it("falls back from first name to display name to full name to 'there'", () => {
    expect(
      recipientName({ firstName: "A", displayName: "B", fullName: "C" }),
    ).toBe("A");
    expect(
      recipientName({ firstName: null, displayName: "B", fullName: "C" }),
    ).toBe("B");
    expect(
      recipientName({ firstName: null, displayName: null, fullName: "C" }),
    ).toBe("C");
    expect(
      recipientName({ firstName: null, displayName: null, fullName: null }),
    ).toBe("there");
  });
});

describe("sendAnnouncement", () => {
  it("sends to everyone batch by batch and marks it sent", async () => {
    announcements.findUnique.mockResolvedValue(row());
    mockBatch
      .mockResolvedValueOnce([user("u1"), user("u2")])
      .mockResolvedValueOnce([user("u3")])
      .mockResolvedValueOnce([]);

    await sendAnnouncement("a1");

    expect(mockSendMail).toHaveBeenCalledTimes(3);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "u1@x.com",
        subject: "Proof of delivery is now required",
        templateName: "announcement",
      }),
    );
    expect(updates()).toEqual([
      { sent_count: 2, failed_count: 0, last_user_id: "u2" },
      { sent_count: 3, failed_count: 0, last_user_id: "u3" },
      expect.objectContaining({ status: "sent" }),
    ]);
    expect(mockBatch).toHaveBeenNthCalledWith(1, "campaign_owners", null, 100);
    expect(mockBatch).toHaveBeenNthCalledWith(2, "campaign_owners", "u2", 100);
  });

  it("personalises each email with the recipient's name", async () => {
    announcements.findUnique.mockResolvedValue(row());
    mockBatch.mockResolvedValueOnce([user("u1")]).mockResolvedValueOnce([]);
    await sendAnnouncement("a1");
    expect(mockSendMail.mock.calls[0][0].context.userName).toBe("U1");
  });

  it("counts failures and still finishes as sent when some went out", async () => {
    announcements.findUnique.mockResolvedValue(row());
    mockSendMail
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false });
    mockBatch
      .mockResolvedValueOnce([user("u1"), user("u2")])
      .mockResolvedValueOnce([]);

    await sendAnnouncement("a1");

    expect(updates()[0]).toMatchObject({ sent_count: 1, failed_count: 1 });
    expect(updates().at(-1)).toMatchObject({ status: "sent" });
  });

  it("marks it failed when every email failed", async () => {
    announcements.findUnique.mockResolvedValue(row());
    mockSendMail.mockResolvedValue({ success: false });
    mockBatch.mockResolvedValueOnce([user("u1")]).mockResolvedValueOnce([]);
    await sendAnnouncement("a1");
    expect(updates().at(-1)).toMatchObject({ status: "failed" });
  });

  it("counts a user with no email as failed instead of crashing", async () => {
    announcements.findUnique.mockResolvedValue(row());
    mockBatch
      .mockResolvedValueOnce([user("u1", null)])
      .mockResolvedValueOnce([]);
    await sendAnnouncement("a1");
    expect(mockSendMail).not.toHaveBeenCalled();
    expect(updates()[0]).toMatchObject({ sent_count: 0, failed_count: 1 });
  });

  it("resumes from the saved cursor and keeps earlier counts", async () => {
    announcements.findUnique.mockResolvedValue(
      row({ last_user_id: "u2", sent_count: 2, failed_count: 1 }),
    );
    mockBatch.mockResolvedValueOnce([user("u3")]).mockResolvedValueOnce([]);

    await sendAnnouncement("a1");

    expect(mockBatch).toHaveBeenNthCalledWith(1, "campaign_owners", "u2", 100);
    expect(updates()[0]).toEqual({
      sent_count: 3,
      failed_count: 1,
      last_user_id: "u3",
    });
  });

  it("works out the audience size when none was stored", async () => {
    announcements.findUnique.mockResolvedValue(row({ recipient_count: 0 }));
    mockCount.mockResolvedValue(7);
    mockBatch.mockResolvedValue([]);
    await sendAnnouncement("a1");
    expect(updates()[0]).toEqual({ recipient_count: 7 });
  });

  it("marks it failed and keeps going if the run throws", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    announcements.findUnique.mockResolvedValue(row());
    mockBatch.mockRejectedValue(new Error("db down"));
    await sendAnnouncement("a1");
    expect(updates().at(-1)).toMatchObject({ status: "failed" });
    error.mockRestore();
  });

  it("does nothing for an unknown id", async () => {
    announcements.findUnique.mockResolvedValue(null);
    await sendAnnouncement("nope");
    expect(mockBatch).not.toHaveBeenCalled();
    expect(announcements.update).not.toHaveBeenCalled();
  });

  it("sends in groups of five at most", async () => {
    announcements.findUnique.mockResolvedValue(row());
    let running = 0;
    let peak = 0;
    mockSendMail.mockImplementation(async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running--;
      return { success: true };
    });
    mockBatch
      .mockResolvedValueOnce(
        Array.from({ length: 12 }, (_, i) => user(`u${i}`)),
      )
      .mockResolvedValueOnce([]);
    await sendAnnouncement("a1");
    expect(mockSendMail).toHaveBeenCalledTimes(12);
    expect(peak).toBe(5);
  });
});

describe("processDueAnnouncements", () => {
  const now = new Date("2026-11-20T12:00:00Z");

  it("looks for due scheduled rows and for stuck sending rows", async () => {
    announcements.findMany.mockResolvedValue([]);
    await processDueAnnouncements(now);
    const { where } = announcements.findMany.mock.calls[0][0];
    expect(where.OR).toEqual([
      { status: "scheduled", scheduled_at: { lte: now } },
      {
        status: "sending",
        updated_at: { lt: new Date("2026-11-20T11:50:00Z") },
      },
    ]);
  });

  it("claims a scheduled row, then sends it", async () => {
    announcements.findMany.mockResolvedValue([
      { id: "a1", status: "scheduled", updated_at: now },
    ]);
    announcements.updateMany.mockResolvedValue({ count: 1 });
    announcements.findUnique.mockResolvedValue(row());
    mockBatch.mockResolvedValue([]);

    expect(await processDueAnnouncements(now)).toEqual({ processed: 1 });
    expect(announcements.updateMany).toHaveBeenCalledWith({
      where: { id: "a1", status: "scheduled" },
      data: { status: "sending", started_at: now },
    });
  });

  it("skips a row another caller claimed first", async () => {
    announcements.findMany.mockResolvedValue([
      { id: "a1", status: "scheduled", updated_at: now },
    ]);
    announcements.updateMany.mockResolvedValue({ count: 0 });

    expect(await processDueAnnouncements(now)).toEqual({ processed: 0 });
    expect(announcements.findUnique).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("reclaims a crashed run only if nobody touched it since it was read", async () => {
    const stale = new Date("2026-11-20T11:00:00Z");
    announcements.findMany.mockResolvedValue([
      { id: "a1", status: "sending", updated_at: stale },
    ]);
    announcements.updateMany.mockResolvedValue({ count: 1 });
    announcements.findUnique.mockResolvedValue(row({ last_user_id: "u2" }));
    mockBatch.mockResolvedValue([]);

    await processDueAnnouncements(now);

    expect(announcements.updateMany).toHaveBeenCalledWith({
      where: { id: "a1", status: "sending", updated_at: stale },
      data: { status: "sending" },
    });
    expect(mockBatch).toHaveBeenCalledWith("campaign_owners", "u2", 100);
  });

  it("does nothing when nothing is due", async () => {
    announcements.findMany.mockResolvedValue([]);
    expect(await processDueAnnouncements(now)).toEqual({ processed: 0 });
    expect(announcements.updateMany).not.toHaveBeenCalled();
  });
});
