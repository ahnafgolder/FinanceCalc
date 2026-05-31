/** @type {import('next').NextConfig} */
const isMobileBuild = process.env.MOBILE_BUILD === '1';

const nextConfig = {
  reactStrictMode: false,
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  ...(isMobileBuild
    ? {
        output: 'export',
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

module.exports = nextConfig;
