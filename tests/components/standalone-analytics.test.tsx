import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StandaloneAnalytics } from "@/components/admin/standalone-analytics";
import type { WorkspaceData } from "@/components/admin/workspace/types";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/admin-analytics",
}));

function fixture(overrides: Partial<WorkspaceData> = {}): WorkspaceData {
  return {
    period: "month",
    generatedAt: "2026-11-11T10:00:00.000Z",
    label: "November 2026 to date",
    previousLabel: "October",
    metrics: [
      {
        label: "Total donations",
        value: "₦4.2M",
        change: "+12%",
        tone: "green",
      },
      { label: "Donors", value: "310" },
      { label: "Pledge → donation", value: "61%" },
      {
        label: "Active campaigns",
        value: "42",
        change: "7 inactive",
        tone: "gold",
      },
    ],
    donations: {
      values: [1, 2, 3],
      previous: [1, 1, 2],
      labels: ["1 Nov", "3 Nov"],
    },
    topCampaigns: [
      {
        item: {
          id: "c1",
          name: "School roofs in Ilorin",
          detail: "Femi Adeyemi",
          initials: "SR",
          status: "approved",
          href: "/causes/c1",
        },
        given: "₦640k",
        donors: 12,
        averageGift: "₦53k",
        trend: [0, 1, 2, 3, 2, 1, 4],
      },
    ],
    campaignStatus: {
      segments: [
        { label: "Active", value: 42, display: "42" },
        { label: "Inactive 21+ days", value: 7, display: "7" },
        { label: "Paused", value: 1, display: "1" },
      ],
      total: "50",
    },
    eiza: {
      segments: [{ label: "Donations", value: 900, display: "900" }],
      total: "900",
    },
    ambassadors: [
      {
        id: "a1",
        name: "Aisha Mohammed",
        initials: "AM",
        region: "Borno",
        referrals: 12,
        signupRate: "50%",
        donations: "₦1.2M",
        donationsValue: 1_200_000,
        rewards: "60 EIZA",
        trend: [1, 2, 3, 4, 5, 6],
      },
    ],
    users: {
      monthlyActive: "8,420",
      change: "+6.1% vs previous 30 days",
      retention: "41%",
      trend: [1, 2, 3],
    },
    yearSummary: [["Donors", "310"]],
    userActivity: {
      returning: [1, 2],
      new: [1, 1],
      labels: ["1 Nov", "2 Nov"],
    },
    cohorts: [{ label: "Nov", values: [100, null, null, null, null, null] }],
    holders: {
      rows: [{ label: "Top 10 holders", value: 30, tone: "gold" }],
      top100Share: 62,
    },
    navCounts: { KYC: 9 },
    ...overrides,
  };
}

beforeEach(() => push.mockClear());

it("renders live metrics and navigates between views", async () => {
  const user = userEvent.setup();
  render(<StandaloneAnalytics data={fixture()} />);

  expect(screen.getByText("₦4.2M")).toBeVisible();
  expect(screen.getByText(/Live · updated/)).toBeVisible();
  expect(screen.getByText("8,420")).toBeVisible();
  expect(screen.getByText("9")).toBeVisible();

  await user.click(
    screen.getByRole("button", { name: "Compare to last period" }),
  );
  expect(screen.queryByText("October")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Top ambassadors" }));
  expect(
    screen.getByRole("heading", { name: "Ambassador performance" }),
  ).toBeVisible();
  expect(screen.getByText("60 EIZA")).toBeVisible();

  await user.click(screen.getByRole("button", { name: "Back to analytics" }));
  expect(screen.getByRole("heading", { name: "Analytics" })).toBeVisible();
});

it("requests a new reporting period from the server", async () => {
  const user = userEvent.setup();
  render(<StandaloneAnalytics data={fixture()} />);
  await user.click(screen.getByRole("button", { name: "day" }));
  expect(push).toHaveBeenCalledWith("/admin-analytics?period=day");
});

it("shows today's campaigns and an empty state on the day view", () => {
  const { rerender } = render(
    <StandaloneAnalytics data={fixture({ period: "day" })} />,
  );
  const table = screen.getByRole("table");
  expect(within(table).getByText("School roofs in Ilorin")).toBeVisible();

  rerender(
    <StandaloneAnalytics data={fixture({ period: "day", topCampaigns: [] })} />,
  );
  expect(screen.getByText("No donations yet today.")).toBeVisible();
});
