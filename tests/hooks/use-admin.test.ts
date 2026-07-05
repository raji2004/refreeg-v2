jest.mock("@/actions/role-actions", () => ({
  getUserRoleInfo: jest.fn(),
  setUserRole: jest.fn(),
  listUsersWithRoles: jest.fn(),
}));

jest.mock("@/actions/admin-user-actions", () => ({
  blockUser: jest.fn(),
  unblockUser: jest.fn(),
}));

jest.mock("@/actions/admin-cause-actions", () => ({
  updateCauseStatus: jest.fn(),
  listAdminCauses: jest.fn(),
  getCauseEdits: jest.fn(),
}));

jest.mock("@/actions/admin-petition-actions", () => ({
  updatePetitionStatus: jest.fn(),
  listAdminPetitions: jest.fn(),
  getPetitionEdits: jest.fn(),
}));

jest.mock("@/actions/database-actions", () => ({
  logAdminActivity: jest.fn(),
}));

jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  getUserRoleInfo,
  setUserRole,
  listUsersWithRoles,
} from "@/actions/role-actions";
import { listAdminCauses, getCauseEdits } from "@/actions/admin-cause-actions";
import {
  listAdminPetitions,
  getPetitionEdits,
} from "@/actions/admin-petition-actions";
import { logAdminActivity } from "@/actions/database-actions";
import { toast } from "@/components/ui/use-toast";
import { useAdmin } from "@/hooks/use-admin";

const mockGetUserRoleInfo = getUserRoleInfo as jest.Mock;
const mockSetUserRole = setUserRole as jest.Mock;
const mockListUsersWithRoles = listUsersWithRoles as jest.Mock;
const mockListAdminCauses = listAdminCauses as jest.Mock;
const mockGetCauseEdits = getCauseEdits as jest.Mock;
const mockListAdminPetitions = listAdminPetitions as jest.Mock;
const mockGetPetitionEdits = getPetitionEdits as jest.Mock;
const mockLogAdminActivity = logAdminActivity as jest.Mock;
const mockToast = toast as jest.Mock;

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
};

describe("useAdmin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserRoleInfo.mockResolvedValue({
      isAdmin: true,
      isManager: false,
      role: "admin",
    });
    mockListUsersWithRoles.mockResolvedValue([]);
    mockListAdminCauses.mockResolvedValue([]);
    mockGetCauseEdits.mockResolvedValue([]);
    mockListAdminPetitions.mockResolvedValue([]);
    mockGetPetitionEdits.mockResolvedValue([]);
    mockSetUserRole.mockResolvedValue(true);
  });

  it("exposes admin role flags and data helpers", async () => {
    const { result } = renderHook(() => useAdmin("admin-1", "pending"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isManager).toBe(false);
    expect(result.current.isAdminOrManager).toBe(true);
    expect(result.current.userRole).toBe("admin");
    expect(result.current.fetchUsers()).toEqual([]);
    expect(result.current.causes).toEqual([]);
    expect(result.current.petitions).toEqual([]);
  });

  it("appoints a manager when caller is admin", async () => {
    const { result } = renderHook(() => useAdmin("admin-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isAdmin).toBe(true));

    let success = false;
    await act(async () => {
      success = await result.current.appointManager("target-user");
    });

    expect(success).toBe(true);
    expect(mockSetUserRole).toHaveBeenCalledWith("target-user", "manager");
    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      "appoint-manager",
      "admin-1",
    );
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Manager appointed" }),
    );
  });

  it("denies appointing a manager when caller is not admin", async () => {
    mockGetUserRoleInfo.mockResolvedValue({
      isAdmin: false,
      isManager: true,
      role: "manager",
    });

    const { result } = renderHook(() => useAdmin("manager-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isManager).toBe(true));

    let success = true;
    await act(async () => {
      success = await result.current.appointManager("target-user");
    });

    expect(success).toBe(false);
    expect(mockSetUserRole).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Permission denied",
        variant: "destructive",
      }),
    );
  });
});
