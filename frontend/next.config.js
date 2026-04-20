const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // MetaMask SDK imports @react-native-async-storage/async-storage at module level.
    // Alias it to a browser-compatible mock to silence "Module not found" warnings.
    config.resolve.alias['@react-native-async-storage/async-storage'] =
      path.resolve(__dirname, 'lib/async-storage-mock.js');
    return config;
  },
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
