/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Remove console.log in production builds (keep errors)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  env: {
    NEXT_PUBLIC_GATEWAY_URL:
      process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:4000',
  },
  // Compress responses
  compress: true,
};

module.exports = nextConfig;
