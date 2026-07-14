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
  // Include email HTML templates in the serverless bundle.
  // Without this, fs.readFileSync cannot find them at runtime on Vercel
  // because Next.js only traces statically-imported files by default.
  outputFileTracingIncludes: {
    "**": ["./services/templates/**/*.html"],
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
    ],
  },

  webpack(config, { dev, isServer }) {
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
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://apps.refreeg.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-Requested-With, Content-Type, Accept, Authorization' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
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
