import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StandaloneAnalytics } from "@/components/admin/standalone-analytics";

it("runs without auth or query providers and keeps analytics interactions local", async () => {
  const user = userEvent.setup();
  render(<StandaloneAnalytics />);
  expect(screen.getByText("UI preview · sample data")).toBeVisible();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "day" }));
  expect(screen.getByText("Donations by hour")).toBeVisible();
  expect(screen.getByText("₦14.2M")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "year" }));
  expect(screen.getByText("2025", { exact: true })).toBeVisible();
  await user.click(
    screen.getByRole("button", { name: "Compare to last period" }),
  );
  expect(screen.queryByText("2025", { exact: true })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "month" }));
  await user.click(screen.getByRole("button", { name: "Top ambassadors" }));
  expect(
    screen.getByRole("heading", { name: "Ambassador performance" }),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Back to analytics" }));
  expect(screen.getByRole("heading", { name: "Analytics" })).toBeVisible();
});
