import type { ReactNode } from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ComposeAnnouncement } from "@/components/admin/email/ComposeAnnouncement";
import { TriggersTable } from "@/components/admin/email/TriggersTable";
import { AnnouncementHistory } from "@/components/admin/email/AnnouncementHistory";
import {
  createAnnouncement,
  getAnnouncements,
  getAudienceReach,
  getEmailTriggers,
  sendTestAnnouncement,
  setEmailTrigger,
} from "@/actions/admin/email-actions";

jest.mock("@/actions/admin/email-actions", () => ({
  createAnnouncement: jest.fn(),
  getAnnouncements: jest.fn(),
  getAudienceReach: jest.fn(),
  getEmailTriggers: jest.fn(),
  sendTestAnnouncement: jest.fn(),
  setEmailTrigger: jest.fn(),
}));

const mocks = {
  create: createAnnouncement as jest.Mock,
  list: getAnnouncements as jest.Mock,
  reach: getAudienceReach as jest.Mock,
  triggers: getEmailTriggers as jest.Mock,
  test: sendTestAnnouncement as jest.Mock,
  setTrigger: setEmailTrigger as jest.Mock,
};

const wrap = (ui: ReactNode) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
};

const announcement = (overrides = {}) => ({
  id: "a1",
  title: "Give to all 13 launch",
  audience: "all_users",
  status: "sent",
  scheduledAt: "2026-11-14T09:00:00.000Z",
  completedAt: "2026-11-14T09:05:00.000Z",
  recipientCount: 10,
  sentCount: 9,
  failedCount: 1,
  ...overrides,
});

beforeEach(() => {
  mocks.reach.mockResolvedValue({ success: true, data: { count: 3412 } });
  mocks.list.mockResolvedValue({ success: true, data: [] });
  mocks.create.mockResolvedValue({ success: true, data: { id: "n1" } });
  mocks.test.mockResolvedValue({
    success: true,
    data: { email: "admin@refreeg.com" },
  });
});

const fill = (title = "Proof is required", message = "Upload it by 1 Dec.") => {
  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: title },
  });
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: message },
  });
};

describe("ComposeAnnouncement", () => {
  it("shows how many people the audience reaches", async () => {
    wrap(<ComposeAnnouncement />);
    expect(await screen.findByText("3,412 people")).toBeInTheDocument();
    expect(mocks.reach).toHaveBeenCalledWith("all_users");
  });

  it("says '1 person', not '1 people', for a single recipient", async () => {
    mocks.reach.mockResolvedValue({ success: true, data: { count: 1 } });
    wrap(<ComposeAnnouncement />);
    expect(await screen.findByText("1 person")).toBeInTheDocument();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Send now" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Send to 1 person?")).toBeInTheDocument();
  });

  it("mirrors the title and message in the preview", () => {
    wrap(<ComposeAnnouncement />);
    expect(screen.getByText("Your title appears here")).toBeInTheDocument();
    fill("Hello there", "Line one");
    expect(screen.getAllByText("Hello there").length).toBeGreaterThan(0);
    expect(screen.getByText("Line one", { selector: "p" })).toBeInTheDocument();
  });

  it("lists recently sent announcements beside the preview", async () => {
    mocks.list.mockResolvedValue({ success: true, data: [announcement()] });
    wrap(<ComposeAnnouncement />);
    expect(
      await screen.findByText("Give to all 13 launch"),
    ).toBeInTheDocument();
    expect(screen.getByText("9 sent")).toBeInTheDocument();
  });

  it("shows field errors and sends nothing when the form is empty", () => {
    wrap(<ComposeAnnouncement />);
    fireEvent.click(screen.getByRole("button", { name: "Send now" }));
    expect(screen.getByText("Add a title")).toBeInTheDocument();
    expect(screen.getByText("Write a message")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("clears a field's error as soon as it is edited", () => {
    wrap(<ComposeAnnouncement />);
    fireEvent.click(screen.getByRole("button", { name: "Send now" }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "x" },
    });
    expect(screen.queryByText("Add a title")).not.toBeInTheDocument();
    expect(screen.getByText("Write a message")).toBeInTheDocument();
  });

  it("asks for confirmation with the audience size before sending", async () => {
    wrap(<ComposeAnnouncement />);
    await screen.findByText("3,412 people");
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Send now" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByText("Send to 3,412 people?"),
    ).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("sends once confirmed, with the form values", async () => {
    wrap(<ComposeAnnouncement />);
    await screen.findByText("3,412 people");
    fill("Proof is required", "Upload it by 1 Dec.");
    fireEvent.click(screen.getByRole("button", { name: "Send now" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Send now" }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create).toHaveBeenCalledWith({
      audience: "all_users",
      title: "Proof is required",
      message: "Upload it by 1 Dec.",
      linkPath: "none",
      sendLater: false,
      sendAt: "",
    });
  });

  it("goes back without sending when the confirmation is cancelled", async () => {
    wrap(<ComposeAnnouncement />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Send now" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Go back" }));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(mocks.create).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Title")).toHaveValue("Proof is required");
  });

  it("clears the form after a successful send", async () => {
    wrap(<ComposeAnnouncement />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Send now" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Send now" }));
    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue(""));
  });

  it("keeps the form and shows the server's error when sending fails", async () => {
    mocks.create.mockResolvedValue({ success: false, error: "db down" });
    wrap(<ComposeAnnouncement />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Send now" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Send now" }));

    expect(await screen.findByText("db down")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Proof is required");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("asks for a time when Schedule is chosen without one", () => {
    wrap(<ComposeAnnouncement />);
    fill();
    fireEvent.click(screen.getByRole("radio", { name: "Schedule" }));
    expect(
      screen.getByRole("button", { name: "Schedule" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Schedule" }));
    expect(screen.getByText("Pick a time to send")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("rejects a time in the past", () => {
    wrap(<ComposeAnnouncement />);
    fill();
    fireEvent.click(screen.getByRole("radio", { name: "Schedule" }));
    fireEvent.change(screen.getByLabelText("Send at"), {
      target: { value: "2020-01-01T10:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Schedule" }));
    expect(screen.getByText("Pick a time in the future")).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("schedules for a future time, sending it as an ISO date", async () => {
    wrap(<ComposeAnnouncement />);
    fill();
    fireEvent.click(screen.getByRole("radio", { name: "Schedule" }));
    fireEvent.change(screen.getByLabelText("Send at"), {
      target: { value: "2099-01-01T10:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Schedule" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/^Schedule for/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Schedule" }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    const sent = mocks.create.mock.calls[0][0];
    expect(sent.sendLater).toBe(true);
    expect(sent.sendAt).toBe(new Date("2099-01-01T10:00").toISOString());
  });

  it("switching back to Now drops the chosen time", () => {
    wrap(<ComposeAnnouncement />);
    fireEvent.click(screen.getByRole("radio", { name: "Schedule" }));
    fireEvent.change(screen.getByLabelText("Send at"), {
      target: { value: "2099-01-01T10:00" },
    });
    fireEvent.click(screen.getByRole("radio", { name: "Now" }));
    expect(screen.queryByLabelText("Send at")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send now" }),
    ).toBeInTheDocument();
  });

  it("sends a test to the admin only after validating", async () => {
    wrap(<ComposeAnnouncement />);
    fireEvent.click(screen.getByRole("button", { name: "Send test to me" }));
    expect(mocks.test).not.toHaveBeenCalled();
    expect(screen.getByText("Add a title")).toBeInTheDocument();

    fill();
    fireEvent.click(screen.getByRole("button", { name: "Send test to me" }));
    await waitFor(() => expect(mocks.test).toHaveBeenCalledTimes(1));
    expect(mocks.test.mock.calls[0][0]).toMatchObject({
      title: "Proof is required",
      audience: "all_users",
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });
});

describe("TriggersTable", () => {
  const rows = [
    {
      key: "donation",
      label: "Donation received or sent",
      audience: "Donor and campaign owner",
      required: true,
      enabled: true,
    },
    {
      key: "proof_posted",
      label: "Proof of delivery posted",
      audience: "All donors to the campaign",
      required: false,
      enabled: true,
    },
    {
      key: "bounty",
      label: "Bounty approved, changes requested or rejected",
      audience: "Campaign owner",
      required: false,
      enabled: false,
    },
  ];

  beforeEach(() => {
    mocks.triggers.mockResolvedValue({ success: true, data: rows });
    mocks.setTrigger.mockResolvedValue({ success: true });
  });

  it("lists each event with who it goes to", async () => {
    wrap(<TriggersTable />);
    expect(
      await screen.findByText("Donation received or sent"),
    ).toBeInTheDocument();
    expect(screen.getByText("Donor and campaign owner")).toBeInTheDocument();
    expect(screen.getByText("All donors to the campaign")).toBeInTheDocument();
  });

  it("shows required events as Required, with no switch to turn them off", async () => {
    wrap(<TriggersTable />);
    await screen.findByText("Donation received or sent");
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(
      screen.queryByRole("switch", { name: /Donation received or sent/ }),
    ).not.toBeInTheDocument();
  });

  it("reflects which switchable events are on", async () => {
    wrap(<TriggersTable />);
    await screen.findByText("Donation received or sent");
    expect(
      screen.getByRole("switch", { name: /Proof of delivery posted/ }),
    ).toBeChecked();
    expect(
      screen.getByRole("switch", { name: /Bounty approved/ }),
    ).not.toBeChecked();
  });

  it("saves a switch the moment it is flipped", async () => {
    wrap(<TriggersTable />);
    await screen.findByText("Donation received or sent");
    fireEvent.click(
      screen.getByRole("switch", { name: /Proof of delivery posted/ }),
    );
    await waitFor(() =>
      expect(mocks.setTrigger).toHaveBeenCalledWith("proof_posted", false),
    );
    fireEvent.click(screen.getByRole("switch", { name: /Bounty approved/ }));
    await waitFor(() =>
      expect(mocks.setTrigger).toHaveBeenCalledWith("bounty", true),
    );
  });

  it("flips the switch at once, before the server has answered", async () => {
    let finish: (value: { success: boolean }) => void = () => {};
    mocks.setTrigger.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    wrap(<TriggersTable />);
    await screen.findByText("Donation received or sent");
    const toggle = () =>
      screen.getByRole("switch", { name: /Proof of delivery posted/ });

    fireEvent.click(toggle());

    await waitFor(() => expect(toggle()).not.toBeChecked());
    expect(toggle()).toBeDisabled();
    finish({ success: true });
    await waitFor(() => expect(toggle()).not.toBeDisabled());
  });

  it("puts the switch back when the server refuses the change", async () => {
    mocks.setTrigger.mockResolvedValue({
      success: false,
      error: "Admin access required",
    });
    // The refetch after the change never answers, so only the rollback can
    // bring the switch back.
    mocks.triggers
      .mockResolvedValueOnce({ success: true, data: rows })
      .mockReturnValue(new Promise(() => {}));
    wrap(<TriggersTable />);
    await screen.findByText("Donation received or sent");
    const toggle = () =>
      screen.getByRole("switch", { name: /Proof of delivery posted/ });

    fireEvent.click(toggle());

    await waitFor(() => expect(mocks.setTrigger).toHaveBeenCalled());
    await waitFor(() => expect(toggle()).toBeChecked());
  });

  it("puts the switch back when the request itself fails", async () => {
    mocks.setTrigger.mockRejectedValue(new Error("network down"));
    // The refetch after the change never answers, so only the rollback can
    // bring the switch back.
    mocks.triggers
      .mockResolvedValueOnce({ success: true, data: rows })
      .mockReturnValue(new Promise(() => {}));
    wrap(<TriggersTable />);
    await screen.findByText("Donation received or sent");
    const toggle = () =>
      screen.getByRole("switch", { name: /Proof of delivery posted/ });

    fireEvent.click(toggle());

    await waitFor(() => expect(mocks.setTrigger).toHaveBeenCalled());
    await waitFor(() => expect(toggle()).toBeChecked());
  });

  it("shows the server's error when loading fails", async () => {
    mocks.triggers.mockResolvedValue({
      success: false,
      error: "Admin or manager access required",
    });
    wrap(<TriggersTable />);
    expect(
      await screen.findByText("Admin or manager access required"),
    ).toBeInTheDocument();
  });
});

describe("AnnouncementHistory", () => {
  it("explains when nothing has been sent", async () => {
    wrap(<AnnouncementHistory />);
    expect(await screen.findByText("No announcements yet")).toBeInTheDocument();
  });

  it("lists announcements with status and delivery counts", async () => {
    mocks.list.mockResolvedValue({
      success: true,
      data: [
        announcement(),
        announcement({
          id: "a2",
          title: "Scheduled maintenance",
          audience: "donors",
          status: "scheduled",
          completedAt: null,
          recipientCount: 500,
          sentCount: 0,
          failedCount: 0,
        }),
      ],
    });
    wrap(<AnnouncementHistory />);

    expect(
      await screen.findByText("Give to all 13 launch"),
    ).toBeInTheDocument();
    expect(screen.getByText("sent")).toBeInTheDocument();
    expect(screen.getByText("9 of 10 · 1 failed")).toBeInTheDocument();
    expect(screen.getByText("Scheduled maintenance")).toBeInTheDocument();
    expect(screen.getByText("scheduled")).toBeInTheDocument();
    expect(screen.getByText("Donors")).toBeInTheDocument();
    expect(screen.getByText("0 of 500")).toBeInTheDocument();
  });

  it("shows the server's error when loading fails", async () => {
    mocks.list.mockResolvedValue({
      success: false,
      error: "Not authenticated",
    });
    wrap(<AnnouncementHistory />);
    expect(await screen.findByText("Not authenticated")).toBeInTheDocument();
  });
});
