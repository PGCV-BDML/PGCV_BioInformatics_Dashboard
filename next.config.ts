import type { NextConfig } from "next";
import { join } from "path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["pdfjs-dist"],
  turbopack: {
    root: join(__dirname),
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
