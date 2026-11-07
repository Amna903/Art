import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
  images: {
    // Cover/avatar images can be any admin-pasted URL (the "…or paste an
    // image URL" inputs in JournalGrid/ExhibitionsGrid/CollectionsAdmin/
    // ArtistDashboard), not just our own Supabase storage or the lovable CDN
    // — an allowlist of specific hosts would break the next one an admin
    // pastes, so any https source is allowed instead.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    // AVIF first (smallest), WebP for browsers without AVIF.
    formats: ["image/avif", "image/webp"],
    // Keep optimized images for a year: on shared hosting re-encoding is the
    // slow part, and every source URL is versioned (new uploads get new paths,
    // signed Supabase URLs change with their token).
    minimumCacheTTL: 31536000,
    // 70 for the large hero images, 75 (the default) everywhere else.
    qualities: [70, 75],
  },
  async headers() {
    const immutable = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];
    return [
      // Content-hashed build output.
      { source: "/_next/static/:path*", headers: immutable },
      // Files in public/images. To change one, upload it under a NEW file
      // name — browsers will keep the old file for up to a year otherwise.
      { source: "/images/:path*", headers: immutable },
    ];
  },
  // sharp's native binary loads libvips dynamically. File tracing cannot
  // reliably discover that optional runtime dependency, so include it in the
  // two server routes that perform originality checks.
  outputFileTracingIncludes: {
    "/api/artworks/*": [
      "./node_modules/sharp/**/*",
      "./node_modules/@img/sharp-linux-x64/**/*",
      "./node_modules/@img/sharp-libvips-linux-x64/**/*",
    ],
  },
};

export default nextConfig;
