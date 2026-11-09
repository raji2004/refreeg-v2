// ── Mock next/server BEFORE importing the route ───────────────────────────────
jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
      json: () => Promise.resolve(body),
    }),
  },
  NextRequest: class {},
}));

jest.mock("@/lib/auth/mobile-auth", () => ({
  authenticateMobileRequest: jest.fn(),
}));

jest.mock("@/actions/profile-actions", () => ({
  getOnboardingData: jest.fn(),
  getCurrentOnboardingStep: jest.fn(),
  createOnboardingProfile: jest.fn(),
  checkUsernameAvailability: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    organizationMember: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    organization: {
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/mobile/onboarding/route";
import { POST as postOrganization } from "@/app/api/mobile/onboarding/organization/route";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import {
  getOnboardingData,
  getCurrentOnboardingStep,
  createOnboardingProfile,
  checkUsernameAvailability,
} from "@/actions/profile-actions";
import { prisma } from "@/lib/prisma";

function makeRequest(body: Record<string, unknown> = {}): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
    headers: {
      get: () => null,
    },
  } as unknown as NextRequest;
}

describe("Mobile Onboarding API Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authenticateMobileRequest as jest.Mock).mockResolvedValue({
      user: { id: "user-1", email: "amina@refreeg.com" },
      errorResponse: null,
    });
  });

  describe("GET /api/mobile/onboarding", () => {
    it("returns onboarding data including fullName, displayName, and accountType", async () => {
      (getOnboardingData as jest.Mock).mockResolvedValue({
        accountType: "individual",
        firstName: "Amina",
        lastName: "Bello",
      });
      (getCurrentOnboardingStep as jest.Mock).mockResolvedValue(2);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        accountType: "individual",
        gender: "female",
        firstName: "Amina",
        lastName: "Bello",
        fullName: "Amina Bello",
        displayName: "Amina",
        username: "aminabello123",
        location: "Lekki, Lagos",
        phone: "",
        email: "amina@refreeg.com",
        profilePhoto: null,
        interests: ["education"],
        onboarding_completed: false,
      });

      const req = makeRequest();
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.accountType).toBe("individual");
      expect(body.data.currentStep).toBe(2);
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          select: expect.objectContaining({
            fullName: true,
            displayName: true,
            accountType: true,
          }),
        }),
      );
    });
  });

  describe("POST /api/mobile/onboarding", () => {
    it("returns 400 when profileData is missing", async () => {
      const req = makeRequest({});
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain("Missing required field");
    });

    it("returns 400 when createOnboardingProfile rejects an under-18 dateOfBirth", async () => {
      (createOnboardingProfile as jest.Mock).mockRejectedValue(
        new Error("You need to be 18 or over to use RefreeG."),
      );

      const req = makeRequest({
        profileData: {
          fullName: "Amina Bello",
          dateOfBirth: "14/08/2012",
          accountType: "individual",
        },
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("You need to be 18 or over to use RefreeG.");
    });

    it("returns 400 when createOnboardingProfile rejects a single-word name", async () => {
      (createOnboardingProfile as jest.Mock).mockRejectedValue(
        new Error("Enter your first and last name, as on your ID."),
      );

      const req = makeRequest({
        profileData: {
          fullName: "Amina",
          dateOfBirth: "14/08/1996",
          accountType: "individual",
        },
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Enter your first and last name, as on your ID.");
    });

    it("saves profileData successfully and returns 200", async () => {
      (checkUsernameAvailability as jest.Mock).mockResolvedValue(true);
      (createOnboardingProfile as jest.Mock).mockResolvedValue({
        id: "user-1",
        firstName: "Amina",
        lastName: "Bello",
        fullName: "Amina Bello",
        accountType: "individual",
        location: "Lekki, Lagos",
      });

      const req = makeRequest({
        profileData: {
          fullName: "Amina Bello",
          gender: "female",
          dateOfBirth: "14/08/1996",
          accountType: "individual",
          state: "Lagos",
          city: "Lekki",
        },
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.fullName).toBe("Amina Bello");
      expect(createOnboardingProfile).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          fullName: "Amina Bello",
          accountType: "individual",
          state: "Lagos",
          city: "Lekki",
        }),
        null,
      );
    });
  });

  describe("POST /api/mobile/onboarding/organization", () => {
    it("creates an organization with type and role and marks user as organization", async () => {
      (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.organization.create as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Bello Community Foundation",
        slug: "bello-community-foundation-1234",
        industry: "Registered NGO / non-profit",
        address: "Yaba, Lagos",
        websiteUrl: null,
      });
      (prisma.organizationMember.create as jest.Mock).mockResolvedValue({
        id: "mem-1",
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: "user-1",
        accountType: "organization",
      });

      const req = makeRequest({
        name: "Bello Community Foundation",
        type: "Registered NGO / non-profit",
        role: "Executive Director",
        address: "Yaba, Lagos",
      });
      const res = await postOrganization(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.organization.name).toBe("Bello Community Foundation");
      expect(body.data.organization.industry).toBe("Registered NGO / non-profit");
      expect(prisma.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Bello Community Foundation",
            industry: "Registered NGO / non-profit",
            preferences: expect.objectContaining({
              ownerRole: "Executive Director",
            }),
          }),
        }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { accountType: "organization" },
      });
    });
  });
});
