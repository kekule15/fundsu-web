import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // allow ALL https hosts
      },
    ],
    unoptimized: true, // disable Next.js image optimization
  },
};

export default nextConfig;
