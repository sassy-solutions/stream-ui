/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages publish ESM; let Next transpile them for the dev/server bundle.
  transpilePackages: [
    '@stream-ui/core',
    '@stream-ui/protocol',
    '@stream-ui/react',
    '@stream-ui/testing',
  ],
  experimental: {
    // Demo only — Next 15 keeps PPR / RSC streaming on by default; nothing extra to enable.
  },
};

export default nextConfig;
