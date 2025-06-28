/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverSourceMaps: true, // This alone should fix server-side stack traces
  }
}

module.exports = nextConfig