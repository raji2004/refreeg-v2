/**
 * @jest-environment node
 */
import fs from "fs";
import path from "path";
import Handlebars from "handlebars";
import { sendMail } from "@/services/mail";
import { isTemplateEnabled } from "@/lib/email/triggers";

const mockTransportSend = jest.fn();

jest.mock("nodemailer", () => ({
  __esModule: true,
  default: {
    createTransport: () => ({
      sendMail: (...args: unknown[]) => mockTransportSend(...args),
    }),
  },
}));
jest.mock("next/headers", () => ({ headers: jest.fn() }));
jest.mock("@/lib/api/client-ip", () => ({ getClientIp: jest.fn() }));
jest.mock("@/actions/users/auth-actions", () => ({
  getCurrentUser: jest.fn(),
}));
jest.mock("@/actions/users/profile-actions", () => ({ getProfile: jest.fn() }));
jest.mock("@/lib/email/triggers", () => ({ isTemplateEnabled: jest.fn() }));

const mockEnabled = isTemplateEnabled as jest.Mock;

const mail = (templateName: string) => ({
  to: "user@x.com",
  subject: "Subject",
  templateName,
  context: { userName: "Ada", currentYear: 2026 },
});

beforeEach(() => {
  mockEnabled.mockResolvedValue(true);
  mockTransportSend.mockResolvedValue({ messageId: "m1" });
});

describe("sendMail and the Triggers switches", () => {
  it("sends normally while the event is on", async () => {
    expect(await sendMail(mail("welcome-email"))).toEqual({
      success: true,
      messageId: "m1",
    });
    expect(mockEnabled).toHaveBeenCalledWith("welcome-email");
    expect(mockTransportSend).toHaveBeenCalledTimes(1);
  });

  it("skips, without error and without sending, when the event is off", async () => {
    mockEnabled.mockResolvedValue(false);
    expect(await sendMail(mail("proof-update-published"))).toEqual({
      success: true,
      skipped: true,
    });
    expect(mockTransportSend).not.toHaveBeenCalled();
  });

  it("sends announcements from hello@", async () => {
    await sendMail(mail("announcement"));
    expect(mockTransportSend.mock.calls[0][0].from).toBe("hello@refreeg.com");
  });

  it("does not leave the 10 second timeout running after a send", async () => {
    jest.useFakeTimers();
    try {
      await sendMail(mail("welcome-email"));
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it("gives up with a failure when the mail server never answers", async () => {
    jest.useFakeTimers();
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      mockTransportSend.mockReturnValue(new Promise(() => {}));
      const pending = sendMail(mail("welcome-email"));
      await jest.advanceTimersByTimeAsync(10_000);
      expect((await pending).success).toBe(false);
    } finally {
      error.mockRestore();
      jest.useRealTimers();
    }
  });

  it("still reports a send failure as before", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    mockTransportSend.mockRejectedValue(new Error("smtp down"));
    const result = await sendMail(mail("welcome-email"));
    expect(result.success).toBe(false);
    error.mockRestore();
  });
});

describe("announcement template", () => {
  const render = (context: Record<string, unknown>) =>
    Handlebars.compile(
      fs.readFileSync(
        path.join(process.cwd(), "services", "templates", "announcement.html"),
        "utf-8",
      ),
    )(context);

  const base = {
    userName: "Ada",
    title: "Proof of delivery is now required",
    paragraphs: ["First paragraph.", "Second paragraph."],
    ctaUrl: "https://www.refreeg.com/dashboard/causes",
    currentYear: 2026,
  };

  it("greets the person and shows the title and each paragraph", () => {
    const html = render(base);
    expect(html).toContain("Hi Ada,");
    expect(html).toContain("Proof of delivery is now required");
    expect(html).toContain("First paragraph.");
    expect(html).toContain("Second paragraph.");
  });

  it("shows the button only when there is a link", () => {
    expect(render(base)).toContain(
      'href="https://www.refreeg.com/dashboard/causes"',
    );
    const without = render({ ...base, ctaUrl: null });
    expect(without).not.toContain("Open RefreeG");
  });

  it("escapes markup an admin types, so it cannot inject HTML", () => {
    const html = render({
      ...base,
      title: "<script>alert(1)</script>",
      paragraphs: ['<img src=x onerror="alert(1)">'],
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
  });
});
