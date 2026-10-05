/** @type {import('next').NextConfig} */
const nextConfig = {
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
