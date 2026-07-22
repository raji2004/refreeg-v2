jest.mock("@/actions/database-actions", () => ({
  checkDatabaseSetup: jest.fn(),
}));

import { renderHook, waitFor } from "@testing-library/react";
import { checkDatabaseSetup } from "@/actions/database-actions";
import { useDatabaseSetup } from "@/hooks/use-database-setup";

describe("useDatabaseSetup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns ready state when database is set up", async () => {
    (checkDatabaseSetup as jest.Mock).mockResolvedValue({
      ready: true,
      missingTables: [],
    });

    const { result } = renderHook(() => useDatabaseSetup());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.missingTables).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("returns missing tables when database is not ready", async () => {
    (checkDatabaseSetup as jest.Mock).mockResolvedValue({
      ready: false,
      missingTables: ["users", "causes"],
    });

    const { result } = renderHook(() => useDatabaseSetup());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isReady).toBe(false);
    expect(result.current.missingTables).toEqual(["users", "causes"]);
  });

  it("sets error and isReady false when check fails", async () => {
    (checkDatabaseSetup as jest.Mock).mockRejectedValue(
      new Error("connection refused"),
    );

    const { result } = renderHook(() => useDatabaseSetup());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isReady).toBe(false);
    expect(result.current.error).toBe("connection refused");
  });
});
