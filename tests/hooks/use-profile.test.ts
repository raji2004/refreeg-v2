jest.mock("@/actions/profile-actions", () => ({
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  updateBankDetails: jest.fn(),
  updateProfilePhoto: jest.fn(),
}));

jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  getProfile,
  updateProfile,
} from "@/actions/profile-actions";
import { toast } from "@/components/ui/use-toast";
import { useProfile } from "@/hooks/use-profile";

const mockGetProfile = getProfile as jest.Mock;
const mockUpdateProfile = updateProfile as jest.Mock;
const mockToast = toast as jest.Mock;

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
};

const mockProfile = {
  id: "user-1",
  full_name: "Jane Doe",
  email: "jane@example.com",
  account_number: "0123456789",
  bank_name: "Test Bank",
};

describe("useProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProfile.mockResolvedValue(mockProfile);
  });

  it("fetches profile when userId is provided", async () => {
    const { result } = renderHook(() => useProfile("user-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetProfile).toHaveBeenCalledWith("user-1");
    expect(result.current.profile).toEqual(mockProfile);
    expect(result.current.hasBankDetails).toBe(true);
  });

  it("does not fetch profile when userId is undefined", () => {
    renderHook(() => useProfile(undefined), { wrapper: createWrapper() });

    expect(mockGetProfile).not.toHaveBeenCalled();
  });

  it("updates profile and shows success toast", async () => {
    const updatedProfile = { ...mockProfile, full_name: "Jane Smith" };
    mockUpdateProfile.mockResolvedValue(updatedProfile);

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useProfile("user-1"), { wrapper });

    await waitFor(() => expect(result.current.profile).toEqual(mockProfile));

    act(() => {
      result.current.updateProfile({
        name: "Jane Smith",
        phone: "08012345678",
        email: "jane@example.com",
        bio: "Bio",
      });
    });

    await waitFor(() =>
      expect(client.getQueryData(["profile", "user-1"])).toEqual(
        updatedProfile,
      ),
    );
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Profile updated" }),
    );
  });
});
