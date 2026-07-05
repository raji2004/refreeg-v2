jest.mock("@/actions/cause-actions", () => ({
  createCause: jest.fn(),
  updateCause: jest.fn(),
  deleteCause: jest.fn(),
}));

jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useRouter } from "next/navigation";
import { createCause, deleteCause } from "@/actions/cause-actions";
import { toast } from "@/components/ui/use-toast";
import { useCause } from "@/hooks/use-cause";

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
};

describe("useCause", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: jest.fn(),
    });
  });

  it("exposes loading state and mutation helpers", () => {
    const { result } = renderHook(() => useCause(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.createCause).toBe("function");
    expect(typeof result.current.updateCause).toBe("function");
    expect(typeof result.current.deleteCause).toBe("function");
  });

  it("creates a cause and navigates to dashboard", async () => {
    (createCause as jest.Mock).mockResolvedValue({ id: "cause-1" });
    const causeData = { title: "Help", description: "Desc" } as never;

    const { result } = renderHook(() => useCause(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.createCause("user-1", causeData);
    });

    expect(createCause).toHaveBeenCalledWith("user-1", causeData);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Cause created successfully" }),
    );
    expect(mockPush).toHaveBeenCalledWith("/dashboard/causes");
  });

  it("deletes a cause on success", async () => {
    (deleteCause as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useCause(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.deleteCause("cause-1");
    });

    await waitFor(() => {
      expect(deleteCause).toHaveBeenCalledWith("cause-1");
    });
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Cause deleted successfully" }),
    );
  });
});
