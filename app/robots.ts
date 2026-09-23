import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.refreeg.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/onboarding/",
          "/auth/",
          "/s/",
          "/organization/invitations/",
        ],
      },
      {
        // Allow Google to crawl Next.js static assets & images
        userAgent: "Googlebot-Image",
        allow: ["/_next/image", "/images/", "/api/s3/image"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
