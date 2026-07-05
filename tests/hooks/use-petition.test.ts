jest.mock("@/actions/petition-actions", () => ({
  createPetition: jest.fn(),
  updatePetition: jest.fn(),
}));

jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react";
import { createPetition, updatePetition } from "@/actions/petition-actions";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { usePetition } from "@/hooks/use-petition";

const mockCreatePetition = createPetition as jest.Mock;
const mockUpdatePetition = updatePetition as jest.Mock;
const mockToast = toast as jest.Mock;
const mockPush = jest.fn();

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
};

describe("usePetition", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  it("returns create and update helpers", () => {
    const { result } = renderHook(() => usePetition(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.createPetition).toBe("function");
    expect(typeof result.current.updatePetition).toBe("function");
  });

  it("creates a petition and navigates on success", async () => {
    mockCreatePetition.mockResolvedValue({ id: "petition-1" });
    const { result } = renderHook(() => usePetition(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.createPetition("user-1", {
        title: "Save the park",
        description: "Details",
        category: "environment",
        goal: 1000,
        coverImage: null,
      });
    });

    expect(mockCreatePetition).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ title: "Save the park" }),
    );
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Petition created successfully" }),
    );
    expect(mockPush).toHaveBeenCalledWith("/dashboard/petitions");
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("updates a petition on success", async () => {
    mockUpdatePetition.mockResolvedValue({ id: "petition-1" });
    const { result } = renderHook(() => usePetition(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.updatePetition("petition-1", "user-1", {
        title: "Updated title",
      });
    });

    expect(mockUpdatePetition).toHaveBeenCalledWith(
      "petition-1",
      "user-1",
      { title: "Updated title" },
    );
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Petition updated successfully" }),
    );
    expect(mockPush).toHaveBeenCalledWith("/dashboard/petitions");
  });
});
