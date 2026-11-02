import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  // Generated Prisma clients must be loaded from disk rather than cached in a bundle.
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg'],
  // Avoid persisting stale generated-client bundles and growing the local disk cache.
  experimental: { turbopackFileSystemCacheForDev: false },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Frame-Options', value: 'DENY' },
    ] }];
  },
};
export default config;
