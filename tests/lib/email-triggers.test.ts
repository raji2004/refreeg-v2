/**
 * @jest-environment node
 */
import { prisma } from "@/lib/prisma";
import { clearTriggerCache, isTemplateEnabled } from "@/lib/email/triggers";
import { emailTriggerEvents } from "@/lib/options/email-trigger.options";

jest.mock("@/lib/prisma", () => ({
  prisma: { emailTrigger: { findMany: jest.fn() } },
}));

const findMany = (
  prisma as unknown as { emailTrigger: { findMany: jest.Mock } }
).emailTrigger.findMany;

beforeEach(() => {
  clearTriggerCache();
  findMany.mockResolvedValue([]);
});

describe("isTemplateEnabled", () => {
  it("sends templates no switch controls, without touching the database", async () => {
    expect(await isTemplateEnabled("password-reset")).toBe(true);
    expect(await isTemplateEnabled("announcement")).toBe(true);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("sends a switchable template while its event is on", async () => {
    expect(await isTemplateEnabled("proof-update-published")).toBe(true);
  });

  it("blocks every template of an event that is switched off", async () => {
    findMany.mockResolvedValue([{ event_key: "proof_due" }]);
    expect(await isTemplateEnabled("proof-update-required")).toBe(false);
    expect(await isTemplateEnabled("proof-update-reminder")).toBe(false);
    expect(await isTemplateEnabled("proof-cause-paused")).toBe(false);
    expect(await isTemplateEnabled("proof-update-published")).toBe(true);
  });

  it("caches the switches so a burst of emails is one query", async () => {
    await isTemplateEnabled("proof-update-published");
    await isTemplateEnabled("proof-update-reminder");
    await isTemplateEnabled("proof-update-published");
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it("re-reads after the cache expires", async () => {
    const now = jest.spyOn(Date, "now");
    now.mockReturnValue(1_000_000);
    await isTemplateEnabled("proof-update-published");
    now.mockReturnValue(1_000_000 + 31_000);
    await isTemplateEnabled("proof-update-published");
    expect(findMany).toHaveBeenCalledTimes(2);
    now.mockRestore();
  });

  it("re-reads straight away after clearTriggerCache", async () => {
    findMany.mockResolvedValueOnce([{ event_key: "proof_posted" }]);
    expect(await isTemplateEnabled("proof-update-published")).toBe(false);
    clearTriggerCache();
    findMany.mockResolvedValueOnce([]);
    expect(await isTemplateEnabled("proof-update-published")).toBe(true);
  });

  it("sends anyway when the lookup fails", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    findMany.mockRejectedValue(new Error("db down"));
    expect(await isTemplateEnabled("proof-update-published")).toBe(true);
    error.mockRestore();
  });
});

describe("required events", () => {
  it("are never blocked, even with a template and a stray 'off' row", async () => {
    jest.resetModules();
    jest.doMock("@/lib/options/email-trigger.options", () => ({
      emailTriggerEvents: [
        {
          key: "kyc",
          label: "KYC",
          audience: "User",
          required: true,
          templates: ["kyc-approved"],
        },
      ],
    }));
    jest.doMock("@/lib/prisma", () => ({
      prisma: {
        emailTrigger: {
          findMany: jest.fn().mockResolvedValue([{ event_key: "kyc" }]),
        },
      },
    }));
    const { isTemplateEnabled: isolated } =
      await import("@/lib/email/triggers");
    expect(await isolated("kyc-approved")).toBe(true);
    jest.dontMock("@/lib/options/email-trigger.options");
    jest.dontMock("@/lib/prisma");
  });
});

describe("emailTriggerEvents registry", () => {
  it("has unique keys", () => {
    const keys = emailTriggerEvents.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives required events no switchable templates", () => {
    for (const event of emailTriggerEvents.filter((e) => e.required)) {
      expect(event.templates).toHaveLength(0);
    }
  });

  it("assigns each template to one event only", () => {
    const templates = emailTriggerEvents.flatMap((e) => [...e.templates]);
    expect(new Set(templates).size).toBe(templates.length);
  });
});
