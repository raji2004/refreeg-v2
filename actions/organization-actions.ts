"use server";

import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { sendOrganizationInvitationEmail } from "@/services/mail";

const MANAGER_ROLES = new Set(["owner", "admin"]);
const INVITATION_ROLES = new Set(["admin", "member"]);

type OrganizationPreferences = {
  donationNotifications: boolean;
  teamDigest: boolean;
  publicProfile: boolean;
};

const DEFAULT_PREFERENCES: OrganizationPreferences = {
  donationNotifications: true,
  teamDigest: true,
  publicProfile: true,
};

function mapPreferences(value: unknown): OrganizationPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_PREFERENCES;
  }

  const stored = value as Partial<OrganizationPreferences>;
  return {
    donationNotifications: stored.donationNotifications !== false,
    teamDigest: stored.teamDigest !== false,
    publicProfile: stored.publicProfile !== false,
  };
}

function normalizeOptionalUrl(value: string | undefined, label: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    if (!url.hostname || !["http:", "https:"].includes(url.protocol)) {
      throw new Error();
    }
    return url.toString();
  } catch {
    throw new Error(`Enter a valid ${label} URL.`);
  }
}

function normalizeOptionalWhatsAppNumber(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const normalized = `${trimmed.startsWith("+") ? "+" : ""}${trimmed.replace(/\D/g, "")}`;
  const digits = normalized.replace(/\D/g, "");

  if (digits.length < 7 || digits.length > 15) {
    throw new Error("Enter a valid WhatsApp number with country code.");
  }

  return normalized;
}

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be signed in to manage an organization.");
  }
  return session.user;
}

async function requireOrganizationAccess(managersOnly = false) {
  const user = await requireUser();
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    include: { organization: true },
    orderBy: { joinedAt: "asc" },
  });

  if (!membership) {
    throw new Error("No organization workspace is linked to this account.");
  }
  if (managersOnly && !MANAGER_ROLES.has(membership.role)) {
    throw new Error("Only organization owners and admins can make this change.");
  }

  return { user, membership, organization: membership.organization };
}

export async function getOrganizationWorkspace() {
  try {
    const { membership, organization } = await requireOrganizationAccess();
    const canManage = MANAGER_ROLES.has(membership.role);

    const [members, invitations] = await Promise.all([
      prisma.organizationMember.findMany({
        where: { organizationId: organization.id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              profilePhoto: true,
            },
          },
        },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      }),
      canManage
        ? prisma.organizationInvitation.findMany({
            where: {
              organizationId: organization.id,
              status: "pending",
              expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
    ]);

    return {
      success: true as const,
      workspace: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        adminEmail: organization.adminEmail,
        phone: organization.phone || "",
        address: organization.address || "",
        industry: organization.industry || "",
        logoUrl: organization.logoUrl || "",
        bio: organization.bio || "",
        websiteUrl: organization.websiteUrl || "",
        instagramUrl: organization.instagramUrl || "",
        twitterUrl: organization.twitterUrl || "",
        tiktokUrl: organization.tiktokUrl || "",
        facebookUrl: organization.facebookUrl || "",
        whatsappNumber: organization.whatsappNumber || "",
        preferences: mapPreferences(organization.preferences),
        currentUserRole: membership.role,
        canManage,
        members: members.map((member) => ({
          id: member.id,
          role: member.role,
          joinedAt: member.joinedAt.toISOString(),
          user: member.user,
        })),
        invitations: invitations.map((invitation) => ({
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt.toISOString(),
        })),
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Unable to load workspace.",
    };
  }
}

/**
 * Public, read-only organization identity for an owner's profile page.
 * Sensitive workspace data such as invitations and admin permissions is
 * intentionally excluded.
 */
export async function getOrganizationPublicProfile(ownerId: string) {
  try {
    const organization = await prisma.organization.findUnique({
      where: { ownerId },
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        address: true,
        industry: true,
        logoUrl: true,
        bio: true,
        websiteUrl: true,
        instagramUrl: true,
        twitterUrl: true,
        tiktokUrl: true,
        facebookUrl: true,
        whatsappNumber: true,
        preferences: true,
        createdAt: true,
        _count: { select: { members: true } },
      },
    });

    if (!organization) return null;

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      phone: organization.phone || "",
      address: organization.address || "",
      industry: organization.industry || "",
      logoUrl: organization.logoUrl || "",
      bio: organization.bio || "",
      websiteUrl: organization.websiteUrl || "",
      instagramUrl: organization.instagramUrl || "",
      twitterUrl: organization.twitterUrl || "",
      tiktokUrl: organization.tiktokUrl || "",
      facebookUrl: organization.facebookUrl || "",
      whatsappNumber: organization.whatsappNumber || "",
      memberCount: organization._count.members,
      publicProfile: mapPreferences(organization.preferences).publicProfile,
      createdAt: organization.createdAt.toISOString(),
    };
  } catch (error) {
    console.error("Unable to load public organization profile:", error);
    return null;
  }
}

export async function updateOrganization(input: {
  name: string;
  adminEmail: string;
  phone?: string;
  address?: string;
  industry?: string;
  bio?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  tiktokUrl?: string;
  facebookUrl?: string;
  whatsappNumber?: string;
  preferences: OrganizationPreferences;
}) {
  try {
    const { organization } = await requireOrganizationAccess(true);
    const name = input.name?.trim();
    const adminEmail = input.adminEmail?.trim().toLowerCase();

    if (!name || name.length < 2 || name.length > 120) {
      throw new Error("Organization name must be between 2 and 120 characters.");
    }
    if (!/^\S+@\S+\.\S+$/.test(adminEmail)) {
      throw new Error("Enter a valid admin email address.");
    }
    const bio =
      input.bio === undefined ? undefined : input.bio.trim() || null;
    if (bio && bio.length > 600) {
      throw new Error("Organization bio must be 600 characters or fewer.");
    }
    const websiteUrl =
      input.websiteUrl === undefined
        ? undefined
        : normalizeOptionalUrl(input.websiteUrl, "website");
    const instagramUrl =
      input.instagramUrl === undefined
        ? undefined
        : normalizeOptionalUrl(input.instagramUrl, "Instagram");
    const twitterUrl =
      input.twitterUrl === undefined
        ? undefined
        : normalizeOptionalUrl(input.twitterUrl, "Twitter/X");
    const tiktokUrl =
      input.tiktokUrl === undefined
        ? undefined
        : normalizeOptionalUrl(input.tiktokUrl, "TikTok");
    const facebookUrl =
      input.facebookUrl === undefined
        ? undefined
        : normalizeOptionalUrl(input.facebookUrl, "Facebook");
    const whatsappNumber =
      input.whatsappNumber === undefined
        ? undefined
        : normalizeOptionalWhatsAppNumber(input.whatsappNumber);

    await prisma.organization.update({
      where: { id: organization.id },
      data: {
        name,
        adminEmail,
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        industry: input.industry?.trim() || null,
        ...(bio !== undefined ? { bio } : {}),
        ...(websiteUrl !== undefined ? { websiteUrl } : {}),
        ...(instagramUrl !== undefined ? { instagramUrl } : {}),
        ...(twitterUrl !== undefined ? { twitterUrl } : {}),
        ...(tiktokUrl !== undefined ? { tiktokUrl } : {}),
        ...(facebookUrl !== undefined ? { facebookUrl } : {}),
        ...(whatsappNumber !== undefined ? { whatsappNumber } : {}),
        preferences: mapPreferences(input.preferences),
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/organization");
    revalidatePath("/dashboard");
    revalidatePath("/[username]", "page");
    return { success: true as const };
  } catch (error) {
    const isDatabaseError =
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError ||
      error instanceof Prisma.PrismaClientValidationError;

    return {
      success: false as const,
      error: isDatabaseError
        ? "Unable to save the organisation right now. Please try again."
        : error instanceof Error
          ? error.message
          : "Unable to save organization.",
    };
  }
}

export async function updateOrganizationLogo(file: File) {
  try {
    const { user, organization } = await requireOrganizationAccess(true);
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      throw new Error("Logo must be a JPG, PNG, or WebP image.");
    }
    if (file.size === 0 || file.size > 2 * 1024 * 1024) {
      throw new Error("Logo must be smaller than 2 MB.");
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const key = `uploads/organizations/${user.id}/${organization.id}/images/logo-${Date.now()}.${extension}`;
    const { uploadToS3 } = await import("@/lib/s3/s3-utils");
    await uploadToS3(Buffer.from(await file.arrayBuffer()), key, file.type);
    await prisma.organization.update({
      where: { id: organization.id },
      data: { logoUrl: key },
    });

    revalidatePath("/dashboard/settings/organization");
    revalidatePath("/dashboard");
    return { success: true as const, logoUrl: key };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Unable to upload logo.",
    };
  }
}

export async function inviteOrganizationMember(input: {
  email: string;
  role: string;
}) {
  try {
    const { user, organization } = await requireOrganizationAccess(true);
    const email = input.email?.trim().toLowerCase();
    const role = input.role?.toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw new Error("Enter a valid email address.");
    }
    if (!INVITATION_ROLES.has(role)) {
      throw new Error("Choose either the admin or member role.");
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (existingUser) {
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: organization.id,
            userId: existingUser.id,
          },
        },
      });
      if (existingMember) {
        throw new Error("That email already belongs to a team member.");
      }
    }

    const pending = await prisma.organizationInvitation.findFirst({
      where: {
        organizationId: organization.id,
        email: { equals: email, mode: "insensitive" },
        status: "pending",
        expiresAt: { gt: new Date() },
      },
    });
    if (pending) {
      throw new Error("A pending invitation already exists for this email.");
    }

    const token = crypto.randomBytes(32).toString("hex");
    const invitation = await prisma.organizationInvitation.create({
      data: {
        organizationId: organization.id,
        email,
        role,
        token,
        invitedById: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.AUTH_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000"
    ).replace(/\/$/, "");
    const mailResult = await sendOrganizationInvitationEmail({
      email,
      inviterName: user.name || user.email || "An organization admin",
      organizationName: organization.name,
      role,
      invitationUrl: `${appUrl}/organization/invitations/${token}`,
    });

    revalidatePath("/dashboard/settings/organization");
    return {
      success: true as const,
      invitationId: invitation.id,
      warning: mailResult.success
        ? undefined
        : "The invitation was saved, but the email could not be delivered. Revoke it and try again after checking SMTP settings.",
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Unable to send invitation.",
    };
  }
}

export async function revokeOrganizationInvitation(invitationId: string) {
  try {
    const { organization } = await requireOrganizationAccess(true);
    const result = await prisma.organizationInvitation.updateMany({
      where: {
        id: invitationId,
        organizationId: organization.id,
        status: "pending",
      },
      data: { status: "revoked" },
    });
    if (result.count === 0) throw new Error("Pending invitation not found.");

    revalidatePath("/dashboard/settings/organization");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Unable to revoke invitation.",
    };
  }
}

export async function removeOrganizationMember(memberId: string) {
  try {
    const { organization } = await requireOrganizationAccess(true);
    const member = await prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: organization.id },
    });
    if (!member) throw new Error("Team member not found.");
    if (member.role === "owner") {
      throw new Error("The organization owner cannot be removed.");
    }

    await prisma.organizationMember.delete({ where: { id: member.id } });
    revalidatePath("/dashboard/settings/organization");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Unable to remove member.",
    };
  }
}

export async function getOrganizationInvitation(token: string) {
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { token },
    include: { organization: { select: { name: true, logoUrl: true } } },
  });
  if (!invitation) return { success: false as const, error: "Invitation not found." };

  return {
    success: true as const,
    invitation: {
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expired: invitation.expiresAt <= new Date(),
      organization: invitation.organization,
    },
  };
}

export async function acceptOrganizationInvitation(token: string) {
  try {
    const user = await requireUser();
    const invitation = await prisma.organizationInvitation.findUnique({
      where: { token },
    });
    if (!invitation || invitation.status !== "pending") {
      throw new Error("This invitation is no longer available.");
    }
    if (invitation.expiresAt <= new Date()) {
      await prisma.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: "expired" },
      });
      throw new Error("This invitation has expired. Ask an admin to send a new one.");
    }
    if (!user.email || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new Error(`Sign in with ${invitation.email} to accept this invitation.`);
    }

    await prisma.$transaction([
      prisma.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId: user.id,
          },
        },
        update: { role: invitation.role },
        create: {
          organizationId: invitation.organizationId,
          userId: user.id,
          role: invitation.role,
        },
      }),
      prisma.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: "accepted", acceptedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { accountType: "organization" },
      }),
    ]);

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/organization");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Unable to accept invitation.",
    };
  }
}
