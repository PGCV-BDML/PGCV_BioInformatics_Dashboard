import type { Metadata } from "next";
import { Geist, Geist_Mono, Quicksand } from "next/font/google";
import "./globals.css";
import SessionAuditor from "./components/sessionauditor";

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
        <SessionAuditor />
        {children}
      </body>
    </html>
  );
}
