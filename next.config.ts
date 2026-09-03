import type { NextConfig } from "next";
import { join } from "path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["pdfjs-dist"],
  serverExternalPackages: ["web-push"],
  turbopack: {
    root: join(__dirname),
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/dashboard/services/training",
        destination: "/dashboard/training",
        permanent: true,
      },
      {
        source: "/dashboard/services/training/:path*",
        destination: "/dashboard/training/:path*",
        permanent: true,
      },
      {
        source: "/dashboard/services/internship",
        destination: "/dashboard/internship",
        permanent: true,
      },
      {
        source: "/dashboard/services/internship/:path*",
        destination: "/dashboard/internship/:path*",
        permanent: true,
      },
      {
        source: "/dashboard/services-list",
        destination: "/dashboard/services/tracker",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
