import type { NextConfig } from "next";
import { join } from "path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    root: join(__dirname),
  },
};

export default nextConfig;
