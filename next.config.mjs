import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { withSentryConfig } from "@sentry/nextjs";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

function listPublicFiles(dir, prefix = "") {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listPublicFiles(full, rel));
    else if (entry.isFile()) files.push(`/${rel.split(path.sep).join("/")}`);
  }
  return files;
}

const publicManifestPath = path.join(
  projectRoot,
  "lib/public-file-manifest.ts",
);
const publicManifest = `// Generated from public/ when Next loads this config. Do not edit.\nexport const publicFileManifest = ${JSON.stringify(
  listPublicFiles(path.join(projectRoot, "public")).sort(),
)} as const;\n`;
if (
  !fs.existsSync(publicManifestPath) ||
  fs.readFileSync(publicManifestPath, "utf8") !== publicManifest
) {
  fs.writeFileSync(publicManifestPath, publicManifest);
}

let userConfig = undefined;
try {
  userConfig = await import("./v0-user-next.config");
} catch (e) {}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Changes every CI build; an open tab from an older build reloads instead
  // of calling server actions that no longer exist. Unset locally.
  deploymentId: process.env.GITHUB_SHA,
  serverExternalPackages: ["sharp"],
  outputFileTracingIncludes: {
    "**": [
      "./services/templates/**/*.html",
      "./node_modules/.prisma/client/**",
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "date-fns",
      "recharts",
      "@radix-ui/react-icons",
      "react-icons",
    ],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [640, 1080, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.cloudfront.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "refreeg-media.s3.us-east-1.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "assets.aceternity.com",
      },
      {
        protocol: "https",
        hostname: "www.gstatic.com",
      },
      {
        protocol: "https",
        hostname: "flagcdn.com",
      },
    ],
  },

  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      handlebars: "handlebars/dist/handlebars.js",
    };

    return config;
  },

  async rewrites() {
    return {
      // Existing public files are served before these fallback rewrites.
      beforeFiles: [],
      afterFiles: [
        {
          source:
            "/:asset((?!api/|_next/).+\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico))",
          destination: "/api/missing-asset",
        },
      ],
      fallback: [],
    };
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "https://apps.refreeg.com",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "X-Requested-With, Content-Type, Accept, Authorization",
          },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
    ];
  },
};

mergeConfig(nextConfig, userConfig);

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) return;
  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === "object" &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = { ...nextConfig[key], ...userConfig[key] };
    } else {
      nextConfig[key] = userConfig[key];
    }
  }
}

const sentryWrapped = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  // No tunnelRoute: CloudFront's WAF blocks request bodies over 8 KB, which drops larger reports.
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: false,
  },
});

export default sentryWrapped;
