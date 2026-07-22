jest.mock("@/actions/admin-analytics-actions", () => ({
  getAdminAnalytics: jest.fn(),
  getDonationTrends: jest.fn(),
  getUserGrowth: jest.fn(),
  getCauseCategories: jest.fn(),
  getKycAnalytics: jest.fn(),
  getPaymentAnalytics: jest.fn(),
  getCauseLifecycleAnalytics: jest.fn(),
  getAlerts: jest.fn(),
}));

import { renderHook, waitFor } from "@testing-library/react";
import {
  getAdminAnalytics,
  getDonationTrends,
  getUserGrowth,
  getCauseCategories,
  getKycAnalytics,
  getPaymentAnalytics,
  getCauseLifecycleAnalytics,
  getAlerts,
} from "@/actions/admin-analytics-actions";
import {
  useAdminAnalytics,
  useAnalyticsCharts,
  useOperationalAnalytics,
} from "@/hooks/use-admin-analytics";

describe("useAdminAnalytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches and returns admin analytics data", async () => {
    const analyticsData = { totalUsers: 100, totalDonations: 50 };
    (getAdminAnalytics as jest.Mock).mockResolvedValue(analyticsData);

    const { result } = renderHook(() => useAdminAnalytics("2026-01-01", "2026-01-31"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getAdminAnalytics).toHaveBeenCalledWith("2026-01-01", "2026-01-31");
    expect(result.current.data).toEqual(analyticsData);
    expect(result.current.error).toBeNull();
  });

  it("sets error when fetch fails", async () => {
    (getAdminAnalytics as jest.Mock).mockRejectedValue(new Error("unauthorized"));

    const { result } = renderHook(() => useAdminAnalytics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("unauthorized");
    expect(result.current.data).toBeNull();
  });

  it("refetches data when refetch is called", async () => {
    (getAdminAnalytics as jest.Mock).mockResolvedValue({ totalUsers: 1 });

    const { result } = renderHook(() => useAdminAnalytics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    (getAdminAnalytics as jest.Mock).mockResolvedValue({ totalUsers: 2 });
    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.data).toEqual({ totalUsers: 2 });
    });
  });
});

describe("useAnalyticsCharts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches chart data in parallel", async () => {
    const trends = [{ date: "2026-01-01", amount: 100 }];
    const growth = [{ date: "2026-01-01", count: 5 }];
    const categories = [{ name: "Education", count: 10 }];
    (getDonationTrends as jest.Mock).mockResolvedValue(trends);
    (getUserGrowth as jest.Mock).mockResolvedValue(growth);
    (getCauseCategories as jest.Mock).mockResolvedValue(categories);

    const { result } = renderHook(() => useAnalyticsCharts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.donationTrends).toEqual(trends);
    expect(result.current.userGrowth).toEqual(growth);
    expect(result.current.causeCategories).toEqual(categories);
  });
});

describe("useOperationalAnalytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches operational analytics data", async () => {
    const kyc = { pending: 2, approved: 10 };
    const payments = { total: 5000 };
    const lifecycle = { active: 3 };
    const alerts = [{ id: "a-1", message: "High failure rate" }];
    (getKycAnalytics as jest.Mock).mockResolvedValue(kyc);
    (getPaymentAnalytics as jest.Mock).mockResolvedValue(payments);
    (getCauseLifecycleAnalytics as jest.Mock).mockResolvedValue(lifecycle);
    (getAlerts as jest.Mock).mockResolvedValue(alerts);

    const { result } = renderHook(() => useOperationalAnalytics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.kyc).toEqual(kyc);
    expect(result.current.payments).toEqual(payments);
    expect(result.current.lifecycle).toEqual(lifecycle);
    expect(result.current.alerts).toEqual(alerts);
  });
});
