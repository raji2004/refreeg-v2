import path from "path";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import { withSentryConfig } from "@sentry/nextjs";

let userConfig = undefined;
try {
  userConfig = await import("./v0-user-next.config");
} catch (e) {
  // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal self-contained server bundle (.next/standalone) instead of shipping
  // the whole node_modules to EC2 — keeps each deploy release small on disk.
  output: "standalone",
  serverExternalPackages: ["sharp"],
  // Include email HTML templates and the Prisma query engine binaries in the
  // standalone/serverless bundle. Without this, fs.readFileSync cannot find
  // them at runtime because Next.js only traces statically-imported files by
  // default, and Prisma's engine binaries are loaded dynamically at runtime.
  //
  // sharp used to be handled here too (its linux-arm64 native binding +
  // transitive deps), but outputFileTracingIncludes globs proved unreliable
  // for it under pnpm's isolated-per-package node_modules layout — it kept
  // producing dangling symlinks ("Cannot find module 'detect-libc'") no
  // matter how the globs were written. It's now handled deterministically in
  // .github/workflows/deploy.yml's "Create deployment tarball" step instead,
  // which dereference-copies sharp's real dependency chain directly.
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
  },
  images: {
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

  webpack(config, { dev, isServer }) {
    // Fix Handlebars require.extensions error
    config.resolve.alias = {
      ...config.resolve.alias,
      handlebars: "handlebars/dist/handlebars.js",
    };

    // Aceternity UI may import CSS that requires MiniCssExtractPlugin in prod
    if (!dev && !isServer) {
      config.plugins.push(
        new MiniCssExtractPlugin({
          filename: "static/css/[name].[contenthash].css",
          chunkFilename: "static/css/[id].[contenthash].css",
        }),
      );

      // Make sure CSS loader uses the plugin
      const cssRule = config.module.rules.find(
        (r) => r.test && r.test.toString().includes(".css"),
      );
      if (cssRule) {
        cssRule.use = [
          MiniCssExtractPlugin.loader,
          "css-loader",
          "postcss-loader",
        ];
      }
    }

    return config;
  },

  // Add CORS headers so requests from apps.refreeg.com (RSC prefetch, API calls) succeed
  async headers() {
    return [
      {
        // apply to all routes including static assets
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

// SENTRY_AUTH_TOKEN is intentionally optional here — without it, this just
// skips source map upload (readable stack traces in Sentry) and release
// association, logging a warning rather than failing the build. That keeps
// local dev and any environment without the token building normally.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  // We proxy Sentry's client requests through our own /monitoring route so
  // ad-blockers (which commonly block sentry.io directly) don't silently
  // drop error reports.
  tunnelRoute: "/monitoring",
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: false,
  },
});
