import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

function normalizeOptionalUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return url.toString();
  } catch {
    return null;
  }
}

function createOrganizationSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.floor(1000 + Math.random() * 9000).toString();
  return `${base || "org"}-${suffix}`;
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const {
      name,
      adminEmail,
      phone,
      address,
      industry,
      bio,
      websiteUrl,
      whatsappNumber,
    } = body;

    const trimmedName = name?.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return apiError("Organization name must be at least 2 characters.", 400);
    }

    const effectiveAdminEmail = (
      adminEmail?.trim() || user!.email
    ).toLowerCase();

    // Check if membership already exists
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user!.id },
      include: { organization: true },
      orderBy: { joinedAt: "asc" },
    });

    let organization;

    if (membership) {
      organization = await prisma.organization.update({
        where: { id: membership.organizationId },
        data: {
          name: trimmedName,
          adminEmail: effectiveAdminEmail,
          phone: phone?.trim() || null,
          address: address?.trim() || null,
          industry: industry?.trim() || null,
          bio: bio?.trim() || null,
          websiteUrl: normalizeOptionalUrl(websiteUrl),
          whatsappNumber: whatsappNumber?.trim() || null,
        },
      });
    } else {
      organization = await prisma.organization.create({
        data: {
          name: trimmedName,
          slug: createOrganizationSlug(trimmedName),
          adminEmail: effectiveAdminEmail,
          phone: phone?.trim() || null,
          address: address?.trim() || null,
          industry: industry?.trim() || null,
          bio: bio?.trim() || null,
          websiteUrl: normalizeOptionalUrl(websiteUrl),
          whatsappNumber: whatsappNumber?.trim() || null,
          ownerId: user!.id,
          preferences: {
            donationNotifications: true,
            teamDigest: true,
            publicProfile: true,
          },
        },
      });

      await prisma.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user!.id,
          role: "owner",
        },
      });
    }

    // Ensure user record is tagged as organization
    await prisma.user.update({
      where: { id: user!.id },
      data: {
        accountType: "organization",
      },
    });

    return apiSuccess({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        industry: organization.industry,
        address: organization.address,
        websiteUrl: organization.websiteUrl,
      },
    });
  } catch (error: any) {
    console.error("Mobile API Save Organization Error:", error);
    return apiError(error?.message || "Internal server error", 500);
  }
}
