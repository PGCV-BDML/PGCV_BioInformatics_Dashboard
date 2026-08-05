"use client";

import Link from "next/link";
import { CONTACT_EMAILS, LAB_SHORT, SITE_LINKS } from "@/lib/site-info";

const footerLinkClass =
  "text-[#2a7797] hover:text-[#236584] underline-offset-2 hover:underline transition-colors";

function FooterLink({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={footerLinkClass}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={footerLinkClass}>
      {children}
    </Link>
  );
}

function Separator() {
  return (
    <span className="text-[#65706f]/40 hidden sm:inline" aria-hidden="true">
      ·
    </span>
  );
}

export function DashboardFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto shrink-0 border-t border-[rgba(23,33,38,0.06)] bg-[#F6F4EE] px-4 md:px-8 py-4 md:py-5">
      <div className="max-w-[1240px] mx-auto space-y-2 font-quicksand text-center">
        <p className="text-[11px] leading-5 text-[#65706f]">
          © {year} {LAB_SHORT} · University of the Philippines
          <span className="hidden sm:inline">
            {" "}
            · Philippine Genome Center Visayas
          </span>
          <span className="block sm:inline sm:before:content-['·'] sm:before:mx-1.5">
            Internal use only
          </span>
        </p>
        <nav
          aria-label="Footer links"
          className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] font-medium"
        >
          <FooterLink href={SITE_LINKS.labWebsite.href} external>
            {SITE_LINKS.labWebsite.label}
          </FooterLink>
          <Separator />
          <FooterLink href={SITE_LINKS.omicsPortal.href} external>
            {SITE_LINKS.omicsPortal.label}
          </FooterLink>
          <Separator />
          <FooterLink href="/dashboard/about">About</FooterLink>
          <Separator />
          <FooterLink href="/dashboard/about#privacy">Privacy</FooterLink>
          <Separator />
          <FooterLink
            href={`mailto:${CONTACT_EMAILS.bioinformatics}?subject=Dashboard%20issue`}
            external
          >
            Report an issue
          </FooterLink>
        </nav>
        <p className="text-[10px] text-[#65706f]/80">
          Built by the June–July 2026 Internship Cohort
        </p>
      </div>
    </footer>
  );
}
