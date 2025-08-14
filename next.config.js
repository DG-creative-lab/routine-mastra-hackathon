/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ Don't fail build due to ESLint errors
  },
  typescript: {
    ignoreBuildErrors: false, // change to true if you also want to bypass TS errors
  },
};

module.exports = nextConfig;