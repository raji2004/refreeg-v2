/**
 * @jest-environment node
 */
jest.mock("@/actions/role-actions", () => ({
  listUsersWithRoles: jest.fn(),
}));

import { listUsersWithRoles } from "@/actions/role-actions";
import { exportUsersToCSV } from "@/app/dashboard/admin/users/actions/export-csv";

const mockListUsersWithRoles = listUsersWithRoles as jest.Mock;

describe("exportUsersToCSV", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exports active users as CSV", async () => {
    mockListUsersWithRoles.mockResolvedValue([
      {
        id: "user-1",
        full_name: "Jane Doe",
        email: "jane@example.com",
        role: "user",
        kyc_status: "approved",
        created_at: "2026-01-15T10:00:00.000Z",
        is_blocked: false,
      },
      {
        id: "user-2",
        full_name: "Blocked User",
        email: "blocked@example.com",
        role: "user",
        kyc_status: null,
        created_at: "2026-01-10T10:00:00.000Z",
        is_blocked: true,
      },
    ]);

    const result = await exportUsersToCSV();

    expect(result.error).toBeNull();
    expect(result.csv).toContain(
      "ID,Full Name,Email,Role,KYC Status,Joined Date",
    );
    expect(result.csv).toContain("user-1,Jane Doe,jane@example.com,user,approved");
    expect(result.csv).not.toContain("blocked@example.com");
  });

  it("escapes fields containing commas and quotes", async () => {
    mockListUsersWithRoles.mockResolvedValue([
      {
        id: "user-3",
        full_name: 'Doe, "John"',
        email: "john@example.com",
        role: "user",
        kyc_status: "Not Submitted",
        created_at: "2026-02-01T10:00:00.000Z",
        is_blocked: false,
      },
    ]);

    const result = await exportUsersToCSV();

    expect(result.error).toBeNull();
    expect(result.csv).toContain('"Doe, ""John"""');
  });

  it("returns error when listing users fails", async () => {
    mockListUsersWithRoles.mockRejectedValue(new Error("Database error"));

    const result = await exportUsersToCSV();

    expect(result.csv).toBe("");
    expect(result.error).toBe("Database error");
  });
});
