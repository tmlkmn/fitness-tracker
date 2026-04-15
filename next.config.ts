import withSerwist from "@serwist/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/yuhonas/free-exercise-db/**",
      },
    ],
  },
};

const isDev = process.env.NODE_ENV !== "production";

export default withSerwist({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: isDev,
})(nextConfig);
