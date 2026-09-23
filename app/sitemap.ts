import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.refreeg.com";

  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/causes`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${baseUrl}/petitions`, changeFrequency: "hourly", priority: 0.9 },
    {
      url: `${baseUrl}/how-it-works`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/crowdfund/fees`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    { url: `${baseUrl}/faq`, changeFrequency: "monthly", priority: 0.5 },
    {
      url: `${baseUrl}/about-us/OurMission`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/about-us/OurImpact`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/about-us/OurStory`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/about-us/OurTeam`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Dynamic routes — fetch approved causes & petitions.
  // Wrapped in try/catch so a DB hiccup doesn't break the sitemap.
  //
  // NOTE: `cause` uses camelCase (`updatedAt`), `petitions` uses snake_case
  // (`updated_at`) — schema inconsistency across prisma/schema/*.prisma.
  // Do not "fix" without a migration + touching every consumer.
  try {
    const [causes, petitions] = await Promise.all([
      prisma.cause.findMany({
        where: { status: "approved", compliance_paused: false },
        select: { id: true, slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 5000,
      }),
      prisma.petitions.findMany({
        where: { status: "approved" },
        select: { id: true, updated_at: true },
        orderBy: { updated_at: "desc" },
        take: 5000,
      }),
    ]);

    const causeRoutes: MetadataRoute.Sitemap = causes.map((cause) => ({
      url: `${baseUrl}/causes/${cause.slug || cause.id}`,
      lastModified: cause.updatedAt ?? undefined,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const petitionRoutes: MetadataRoute.Sitemap = petitions.map((petition) => ({
      url: `${baseUrl}/petitions/${petition.id}`,
      lastModified: petition.updated_at ?? undefined,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    return [...staticRoutes, ...causeRoutes, ...petitionRoutes];
  } catch (error) {
    console.error("[sitemap] Failed to fetch dynamic routes:", error);
    return staticRoutes;
  }
}
