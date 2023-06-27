/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: true },
};

const withPWA = require("next-pwa")({
  dest: "public",
  skipWaiting: false,
});

module.exports = withPWA(nextConfig);
