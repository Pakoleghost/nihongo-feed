import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gzip/Brotli compression for all responses
  compress: true,

  // Optimize large package imports to avoid pulling in the whole lib on every page
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react"],
  },

  // Image optimization — accept external domains used in the app
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ufysagkmcdbtsdhsatzn.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // Comunidad images fit well in 1200px; avoids oversized decode
    deviceSizes: [640, 828, 1080, 1200],
    imageSizes: [64, 128, 256, 384],
  },

  // Long-lived cache headers for Next.js static assets (JS/CSS/fonts)
  // _next/static is already immutable — this makes it explicit and adds
  // stale-while-revalidate for edge caches.
  async headers() {
    if (process.env.NODE_ENV !== "production") {
      return [];
    }

    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
};

export default nextConfig;
