import path from "path";
import MiniCssExtractPlugin from "mini-css-extract-plugin";

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
  // Include email HTML templates, the Prisma query engine binaries, and
  // sharp's linux-arm64 native binding in the standalone/serverless bundle.
  // Without this, fs.readFileSync/require cannot find them at runtime
  // because Next.js only traces files reachable from the build machine's
  // own platform/arch by default — Prisma's engine and sharp's native
  // addon are both resolved dynamically, and the EC2 target (linux-arm64)
  // differs from the x64 GitHub Actions runner that builds the release.
  outputFileTracingIncludes: {
    "**": [
      "./services/templates/**/*.html",
      "./node_modules/.prisma/client/**",
      "./node_modules/sharp/**",
      "./node_modules/@img/**",
      "./node_modules/.pnpm/sharp@*/**",
      "./node_modules/.pnpm/@img+sharp-linux-arm64@*/**",
      "./node_modules/.pnpm/@img+sharp-libvips-linux-arm64@*/**",
      // sharp's own (non-optional) runtime deps + their transitive deps.
      // pnpm keeps these nested under .pnpm/<pkg>@<version>/ rather than
      // hoisted to top-level node_modules, so the globs above only copy a
      // symlink *into* these folders, not the folders themselves — leaving
      // dangling symlinks ("Cannot find module 'detect-libc'") in the
      // deployed standalone bundle unless we include the real targets too.
      "./node_modules/.pnpm/detect-libc@*/**",
      "./node_modules/.pnpm/semver@*/**",
      "./node_modules/.pnpm/color@*/**",
      "./node_modules/.pnpm/color-string@*/**",
      "./node_modules/.pnpm/color-convert@*/**",
      "./node_modules/.pnpm/color-name@*/**",
      "./node_modules/.pnpm/simple-swizzle@*/**",
      "./node_modules/.pnpm/is-arrayish@*/**",
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

export default nextConfig;
