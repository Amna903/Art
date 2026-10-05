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
