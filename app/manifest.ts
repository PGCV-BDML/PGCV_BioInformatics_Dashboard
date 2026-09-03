import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "PGCV-BDML Bioinformatics Dashboard",
    short_name: "PGCV Dashboard",
    description:
      "Internal bioinformatics operations, training, and project tracking for PGC Visayas — Bioinformatics & Data Management Laboratory.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#F6F4EE",
    theme_color: "#2a7797",
    lang: "en",
    orientation: "any",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
