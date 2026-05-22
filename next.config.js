/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,  // Prevents double-rendering in dev mode (which doubles all API calls)
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

module.exports = nextConfig;
