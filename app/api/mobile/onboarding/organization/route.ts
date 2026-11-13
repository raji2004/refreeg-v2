import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { isOwnUploadKey } from "@/lib/s3/owned-key";
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
      type,
      role,
      ownerRole,
      bio,
      logoUrl,
      websiteUrl,
      instagramUrl,
      twitterUrl,
      tiktokUrl,
      facebookUrl,
      whatsappNumber,
      preferences,
    } = body;

    const effectiveIndustry = (industry || type)?.trim() || null;
    const effectiveOwnerRole = (ownerRole || role)?.trim() || undefined;
    const validLogoUrl =
      isOwnUploadKey(logoUrl, "profiles", user!.id) ||
      isOwnUploadKey(logoUrl, "organizations", user!.id)
        ? logoUrl
        : undefined;
    const incomingPrefs =
      preferences && typeof preferences === "object" && !Array.isArray(preferences)
        ? (preferences as Record<string, unknown>)
        : {};

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
      const existingPrefs =
        membership.organization.preferences &&
        typeof membership.organization.preferences === "object" &&
        !Array.isArray(membership.organization.preferences)
          ? (membership.organization.preferences as Prisma.InputJsonObject)
          : ({} as Prisma.InputJsonObject);
      const nextPrefs: Prisma.InputJsonObject = {
        ...existingPrefs,
        ...(typeof incomingPrefs.donationNotifications === "boolean"
          ? { donationNotifications: incomingPrefs.donationNotifications }
          : {}),
        ...(typeof incomingPrefs.teamDigest === "boolean"
          ? { teamDigest: incomingPrefs.teamDigest }
          : {}),
        ...(typeof incomingPrefs.publicProfile === "boolean"
          ? { publicProfile: incomingPrefs.publicProfile }
          : {}),
        ...(effectiveOwnerRole ? { ownerRole: effectiveOwnerRole } : {}),
      };
      organization = await prisma.organization.update({
        where: { id: membership.organizationId },
        data: {
          name: trimmedName,
          adminEmail: effectiveAdminEmail,
          phone: phone?.trim() || null,
          address: address?.trim() || null,
          industry: effectiveIndustry,
          ...(validLogoUrl ? { logoUrl: validLogoUrl } : {}),
          bio: bio?.trim() || null,
          websiteUrl: normalizeOptionalUrl(websiteUrl),
          instagramUrl: normalizeOptionalUrl(instagramUrl),
          twitterUrl: normalizeOptionalUrl(twitterUrl),
          tiktokUrl: normalizeOptionalUrl(tiktokUrl),
          facebookUrl: normalizeOptionalUrl(facebookUrl),
          whatsappNumber: whatsappNumber?.trim() || null,
          preferences: nextPrefs,
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
          industry: effectiveIndustry,
          ...(validLogoUrl ? { logoUrl: validLogoUrl } : {}),
          bio: bio?.trim() || null,
          websiteUrl: normalizeOptionalUrl(websiteUrl),
          instagramUrl: normalizeOptionalUrl(instagramUrl),
          twitterUrl: normalizeOptionalUrl(twitterUrl),
          tiktokUrl: normalizeOptionalUrl(tiktokUrl),
          facebookUrl: normalizeOptionalUrl(facebookUrl),
          whatsappNumber: whatsappNumber?.trim() || null,
          ownerId: user!.id,
          preferences: {
            donationNotifications:
              typeof incomingPrefs.donationNotifications === "boolean"
                ? incomingPrefs.donationNotifications
                : true,
            teamDigest:
              typeof incomingPrefs.teamDigest === "boolean"
                ? incomingPrefs.teamDigest
                : true,
            publicProfile:
              typeof incomingPrefs.publicProfile === "boolean"
                ? incomingPrefs.publicProfile
                : true,
            ...(effectiveOwnerRole ? { ownerRole: effectiveOwnerRole } : {}),
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
        phone: organization.phone,
        address: organization.address,
        logoUrl: organization.logoUrl,
        bio: organization.bio,
        websiteUrl: organization.websiteUrl,
        instagramUrl: organization.instagramUrl,
        twitterUrl: organization.twitterUrl,
        tiktokUrl: organization.tiktokUrl,
        facebookUrl: organization.facebookUrl,
        whatsappNumber: organization.whatsappNumber,
        preferences: organization.preferences,
      },
    });
  } catch (error: any) {
    console.error("Mobile API Save Organization Error:", error);
    return apiError(error?.message || "Internal server error", 500);
  }
}
