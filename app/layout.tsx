import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Quicksand } from "next/font/google";
import "./globals.css";
import SessionAuditor from "./components/sessionauditor";
import { ServiceWorkerRegister } from "./components/service-worker-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const quicksand = Quicksand({
  variable: "--font-quicksand-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PGCV-BDML Bioinformatics Dashboard",
    template: "%s | PGCV-BDML Dashboard",
  },
  description:
    "Internal bioinformatics operations, training, and project tracking for the PGC Visayas — Bioinformatics & Data Management Laboratory.",
  applicationName: "PGCV Dashboard",
  appleWebApp: {
    capable: true,
    title: "PGCV Dashboard",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2a7797",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${quicksand.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-aileron">
        <ServiceWorkerRegister />
        <SessionAuditor />
        {children}
      </body>
    </html>
  );
}
