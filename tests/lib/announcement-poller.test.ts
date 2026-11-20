/**
 * @jest-environment node
 */
import {
  POLL_MS,
  startAnnouncementPoller,
} from "@/lib/email/announcement-poller";

const KEY = "__refreegAnnouncementPoller";
const scope = globalThis as unknown as Record<
  string,
  NodeJS.Timeout | undefined
>;
const env = process.env as Record<string, string | undefined>;
const saved = { ...env };

const mockFetch = jest.fn();

const stop = () => {
  if (scope[KEY]) clearInterval(scope[KEY]);
  delete scope[KEY];
};

beforeEach(() => {
  jest.useFakeTimers();
  stop();
  mockFetch.mockResolvedValue({ ok: true, status: 200 });
  global.fetch = mockFetch as unknown as typeof fetch;
  delete env.ANNOUNCEMENT_POLLER;
  delete env.CRON_SECRET;
  delete env.PORT;
  env.NODE_ENV = "development";
});

afterEach(() => {
  stop();
  jest.useRealTimers();
});

afterAll(() => {
  Object.assign(env, saved);
});

describe("startAnnouncementPoller", () => {
  it("calls its own cron route once a minute", async () => {
    startAnnouncementPoller();
    expect(mockFetch).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(POLL_MS);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://127.0.0.1:3000/api/cron/send-announcements",
      { method: "POST", headers: {} },
    );

    await jest.advanceTimersByTimeAsync(POLL_MS * 2);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("uses the server's port and sends the cron secret", async () => {
    env.PORT = "4000";
    env.CRON_SECRET = "s3cret";
    startAnnouncementPoller();
    await jest.advanceTimersByTimeAsync(POLL_MS);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://127.0.0.1:4000/api/cron/send-announcements",
      { method: "POST", headers: { authorization: "Bearer s3cret" } },
    );
  });

  it("keeps one timer however many times it is started", async () => {
    startAnnouncementPoller();
    startAnnouncementPoller();
    startAnnouncementPoller();
    await jest.advanceTimersByTimeAsync(POLL_MS);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("does nothing when switched off", async () => {
    env.ANNOUNCEMENT_POLLER = "off";
    startAnnouncementPoller();
    await jest.advanceTimersByTimeAsync(POLL_MS * 3);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(scope[KEY]).toBeUndefined();
  });

  it("does not start in production without a cron secret, and says why", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    env.NODE_ENV = "production";
    startAnnouncementPoller();
    await jest.advanceTimersByTimeAsync(POLL_MS * 2);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/CRON_SECRET/);
    warn.mockRestore();
  });

  it("starts in production when the secret is set", async () => {
    env.NODE_ENV = "production";
    env.CRON_SECRET = "s3cret";
    startAnnouncementPoller();
    await jest.advanceTimersByTimeAsync(POLL_MS);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("does not stack a new call on one that is still running", async () => {
    let finish: (value: { ok: boolean; status: number }) => void = () => {};
    mockFetch.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    startAnnouncementPoller();

    await jest.advanceTimersByTimeAsync(POLL_MS * 3);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    finish({ ok: true, status: 200 });
    await jest.advanceTimersByTimeAsync(POLL_MS);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("logs a failed response and keeps polling", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockResolvedValue({ ok: false, status: 503 });
    startAnnouncementPoller();
    await jest.advanceTimersByTimeAsync(POLL_MS * 2);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(error.mock.calls[0][0]).toMatch(/503/);
    error.mockRestore();
  });

  it("survives a network error and tries again next minute", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce(new Error("connection refused"));
    startAnnouncementPoller();
    await jest.advanceTimersByTimeAsync(POLL_MS * 2);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it("does not keep the process alive", () => {
    startAnnouncementPoller();
    expect(scope[KEY]?.hasRef()).toBe(false);
  });
});
