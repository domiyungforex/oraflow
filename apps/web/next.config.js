/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@orderflow/db", "@orderflow/types", "@orderflow/ui", "@orderflow/config"],
  // Output standalone for Docker/Vercel
  output: "standalone",
  // Environment variables to expose to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  },
};

module.exports = nextConfig;
