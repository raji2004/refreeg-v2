/**
 * @jest-environment node
 */
import {
  announcementSchema,
  MESSAGE_MAX,
  TITLE_MAX,
} from "@/lib/schemas/email-announcement.schema";

const valid = {
  audience: "all_users",
  title: "Hello",
  message: "A message",
  linkPath: "none",
  sendAt: "",
  sendLater: false,
};

const firstError = (input: object, path: string) =>
  announcementSchema
    .safeParse(input)
    .error?.issues.find((issue) => issue.path[0] === path)?.message;

const inHours = (hours: number) =>
  new Date(Date.now() + hours * 3_600_000).toISOString();

describe("announcementSchema", () => {
  it("accepts a plain send-now announcement", () => {
    expect(announcementSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a future schedule", () => {
    expect(
      announcementSchema.safeParse({
        ...valid,
        sendLater: true,
        sendAt: inHours(2),
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown audience", () => {
    expect(firstError({ ...valid, audience: "everyone" }, "audience")).toBe(
      "Choose who gets this",
    );
  });

  it("requires a title and a message, ignoring surrounding spaces", () => {
    expect(firstError({ ...valid, title: "   " }, "title")).toBe("Add a title");
    expect(firstError({ ...valid, message: "" }, "message")).toBe(
      "Write a message",
    );
  });

  it("caps title and message length", () => {
    expect(
      firstError({ ...valid, title: "x".repeat(TITLE_MAX + 1) }, "title"),
    ).toMatch(/under 120/);
    expect(
      firstError({ ...valid, message: "x".repeat(MESSAGE_MAX + 1) }, "message"),
    ).toMatch(/under 2000/);
    expect(
      announcementSchema.safeParse({ ...valid, title: "x".repeat(TITLE_MAX) })
        .success,
    ).toBe(true);
  });

  it("only allows the listed pages, so an admin cannot send people elsewhere", () => {
    expect(
      firstError({ ...valid, linkPath: "https://evil.example" }, "linkPath"),
    ).toBe("Choose a page");
    expect(
      announcementSchema.safeParse({ ...valid, linkPath: "/wallet" }).success,
    ).toBe(true);
  });

  it("asks for a time when Schedule is chosen without one", () => {
    expect(
      firstError({ ...valid, sendLater: true, sendAt: "" }, "sendAt"),
    ).toBe("Pick a time to send");
  });

  it("rejects a past or unreadable time", () => {
    expect(
      firstError({ ...valid, sendLater: true, sendAt: inHours(-1) }, "sendAt"),
    ).toBe("Pick a time in the future");
    expect(
      firstError({ ...valid, sendLater: true, sendAt: "soon" }, "sendAt"),
    ).toBe("Pick a time in the future");
  });

  it("treats a missing sendLater as send now", () => {
    const { sendLater: _omit, ...withoutFlag } = valid;
    expect(announcementSchema.safeParse(withoutFlag).success).toBe(true);
  });
});
