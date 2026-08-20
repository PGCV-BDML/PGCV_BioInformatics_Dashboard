"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FileText } from "lucide-react";
import { PageHeader } from "./pageheader";
import { protocolDetailBreadcrumbs, protocolsBreadcrumbs } from "@/lib/breadcrumbs";
import { DEFAULT_PROTOCOL_SLUG, getProtocolBySlug, PROTOCOLS } from "@/lib/protocols";
import { routes } from "@/lib/routes";

export default function ProtocolLibrary({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeSlug = pathname === routes.protocols.list
    ? DEFAULT_PROTOCOL_SLUG
    : pathname.startsWith(`${routes.protocols.list}/`)
      ? decodeURIComponent(pathname.slice(`${routes.protocols.list}/`.length))
      : null;
  const activeProtocol = activeSlug ? getProtocolBySlug(activeSlug) : undefined;

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto pb-8 font-aileron">
      <PageHeader
        breadcrumbTrail={
          activeProtocol
            ? protocolDetailBreadcrumbs(activeProtocol.title)
            : protocolsBreadcrumbs
        }
        title="Protocols"
        subtitle="Lab how-to guides for dashboard workflows, analysis pipelines, sign-off, and close-out"
      />

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] items-start">
        <aside className="bg-surface border border-slate-300/70 rounded-[24px] p-4 shadow-xl shadow-slate-400/20 lg:sticky lg:top-24">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[1.5px] text-[#7a8e9b] font-quicksand px-2 mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            Protocol library
          </p>
          <nav aria-label="Protocols" className="flex flex-col gap-1">
            {PROTOCOLS.map((protocol) => {
              const href = routes.protocols.detail(protocol.slug);
              const isActive = activeSlug === protocol.slug;
              return (
                <Link
                  key={protocol.slug}
                  href={href}
                  className={`rounded-2xl px-3 py-3 transition-colors ${
                    isActive
                      ? "bg-[#e6f4f8] text-[#2a7797]"
                      : "text-slate-700 hover:bg-brand-tint hover:text-[#2a7797]"
                  }`}
                >
                  <span className="flex items-start gap-2.5">
                    <FileText
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        isActive ? "text-[#2a7797]" : "text-slate-400"
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-bold leading-snug">
                        {protocol.title}
                      </span>
                      <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-[#7a8e9b] font-quicksand">
                        {protocol.category} · {protocol.code}
                      </span>
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
