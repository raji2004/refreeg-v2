/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    organization: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    organizationMember: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import { updateOrganization } from "@/actions/organization-actions";

const mockPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock; update: jest.Mock };
  organization: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  organizationMember: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
  };
};

const mockAuth = auth as jest.Mock;

describe("updateOrganization action", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws error if user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await updateOrganization({
      name: "Hope Initiative",
      adminEmail: "admin@hope.org",
      preferences: {
        donationNotifications: true,
        teamDigest: true,
        publicProfile: true,
      },
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe("You must be signed in.");
  });

  it("creates organization and owner membership when setting up for the first time", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockPrisma.organizationMember.findFirst.mockResolvedValue(null);
    mockPrisma.organization.create.mockResolvedValue({
      id: "org-456",
      name: "Hope Initiative",
      slug: "hope-initiative-abc12345",
    });
    mockPrisma.organizationMember.create.mockResolvedValue({
      id: "member-789",
      role: "owner",
    });
    mockPrisma.user.update.mockResolvedValue({ id: "user-123" });

    const res = await updateOrganization({
      name: "Hope Initiative",
      adminEmail: "admin@hope.org",
      phone: "+2348012345678",
      industry: "Healthcare",
      preferences: {
        donationNotifications: true,
        teamDigest: true,
        publicProfile: true,
      },
    });

    expect(res.success).toBe(true);
    expect(mockPrisma.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Hope Initiative",
          adminEmail: "admin@hope.org",
          phone: "+2348012345678",
          industry: "Healthcare",
          ownerId: "user-123",
        }),
      }),
    );
    expect(mockPrisma.organizationMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          organizationId: "org-456",
          userId: "user-123",
          role: "owner",
        },
      }),
    );
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-123" },
        data: { accountType: "organization" },
      }),
    );
  });

  it("updates existing organization when user is already owner", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      id: "member-789",
      role: "owner",
      organization: { id: "org-456", name: "Old Org" },
    });
    mockPrisma.organization.update.mockResolvedValue({ id: "org-456" });

    const res = await updateOrganization({
      name: "Updated Org Name",
      adminEmail: "admin@updated.org",
      preferences: {
        donationNotifications: false,
        teamDigest: true,
        publicProfile: true,
      },
    });

    expect(res.success).toBe(true);
    expect(mockPrisma.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "org-456" },
        data: expect.objectContaining({
          name: "Updated Org Name",
          adminEmail: "admin@updated.org",
        }),
      }),
    );
    expect(mockPrisma.organization.create).not.toHaveBeenCalled();
  });

  it("rejects invalid inputs", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    const res = await updateOrganization({
      name: "A", // too short
      adminEmail: "invalid-email",
      preferences: {
        donationNotifications: true,
        teamDigest: true,
        publicProfile: true,
      },
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe(
      "Organization name must be between 2 and 120 characters.",
    );
  });
});
