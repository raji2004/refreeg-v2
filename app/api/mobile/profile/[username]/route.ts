import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params;

    if (!username) {
      return apiError("Username or user ID is required", 400);
    }

    const { user: authUser } = await authenticateMobileRequest(request);

    // Find profile by UUID or username or case-insensitive username/fullName
    let profile = null;
    if (UUID_REGEX.test(username)) {
      profile = await prisma.user.findUnique({
        where: { id: username },
      });
    }

    if (!profile) {
      profile = await prisma.user.findUnique({
        where: { username },
      });
    }

    if (!profile) {
      profile = await prisma.user.findFirst({
        where: {
          OR: [
            { username: { equals: username, mode: "insensitive" } },
            { fullName: { equals: username, mode: "insensitive" } },
          ],
        },
      });
    }

    if (!profile) {
      return apiError("Profile not found", 404);
    }

    // Fetch user's causes (approved)
    const causes = await prisma.cause.findMany({
      where: {
        userId: profile.id,
        status: { in: ["approved", "active", "completed"] },
      },
      select: {
        id: true,
        title: true,
        category: true,
        goal: true,
        raised: true,
        status: true,
        image: true,
        daysActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const causeIds = causes.map((c) => c.id);

    // Calculate real stats
    const campaignsCount = causes.length;
    const deliveredAmount = causes.reduce(
      (acc, c) => acc + Number(c.raised || 0),
      0,
    );

    const donorsCount =
      causeIds.length > 0
        ? await prisma.donation.count({
            where: {
              causeId: { in: causeIds },
              status: { in: ["completed", "successful"] },
            },
          })
        : 0;

    let isFollowing = false;
    if (authUser?.id && causeIds.length > 0) {
      const follow = await prisma.campaign_follows.findFirst({
        where: {
          user_id: authUser.id,
          cause_id: { in: causeIds },
        },
      });
      isFollowing = !!follow;
    }

    return apiSuccess({
      profile: {
        id: profile.id,
        name: profile.fullName || profile.displayName || "Creator",
        username: profile.username,
        bio: profile.bio || null,
        photoUrl: profile.profilePhoto || null,
        isVerified: !!profile.isVerified,
        accountType: profile.accountType || "individual",
        location: profile.location || null,
      },
      stats: {
        campaignsCount,
        deliveredAmount,
        donorsCount,
      },
      causes: causes.map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        goal: Number(c.goal),
        raised: Number(c.raised || 0),
        status: c.status,
        image: c.image,
        daysActive: c.daysActive,
        createdAt: c.createdAt,
      })),
      isFollowing,
    });
  } catch (error: any) {
    console.error("Mobile API Get Profile by Username Error:", error);
    return apiError("Internal server error", 500);
  }
}
