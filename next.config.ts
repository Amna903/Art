import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Cover/avatar images can be any admin-pasted URL (the "…or paste an
    // image URL" inputs in JournalGrid/ExhibitionsGrid/CollectionsAdmin/
    // ArtistDashboard), not just our own Supabase storage or the lovable CDN
    // — an allowlist of specific hosts would break the next one an admin
    // pastes, so any https source is allowed instead.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
