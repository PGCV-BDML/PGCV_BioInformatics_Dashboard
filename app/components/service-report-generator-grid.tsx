"use client";

import type { SVGProps } from "react";
import {
  ArrowUpRight,
  Dna,
  Layers3,
  type LucideIcon,
} from "lucide-react";
import {
  isGeneratorHrefReady,
  normalizeGeneratorHref,
  SERVICE_REPORT_GENERATORS,
  type ServiceReportGenerator,
} from "@/lib/service-report-generators";

/** Simple rod bacterium so it still reads at card size. */
function BacteriaIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="7" y="8" width="14" height="8" rx="4" />
      <path d="M7 12H3" />
      <path d="M7.4 10 3.5 7.5" />
      <path d="M7.4 14 3.5 16.5" />
    </svg>
  );
}

const GENERATOR_ICONS: Record<string, LucideIcon | typeof BacteriaIcon> = {
  "amplicon-assembly": Layers3,
  "whole-genome-assembly": Dna,
  "16s-metabarcoding": BacteriaIcon,
};

function GeneratorCard({ generator }: { generator: ServiceReportGenerator }) {
  const Icon = GENERATOR_ICONS[generator.id] ?? Dna;
  const href = normalizeGeneratorHref(generator.href);
  const ready = isGeneratorHrefReady(href);

  const content = (
    <>
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full opacity-40 blur-2xl transition-opacity duration-300 group-hover:opacity-70"
        style={{ backgroundColor: generator.accent }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 opacity-[0.12]"
        style={{
          background: `radial-gradient(120% 80% at 80% 120%, ${generator.accent}, transparent 70%)`,
        }}
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-3">
        <div
          className="inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-[0_10px_24px_rgba(23,33,38,0.18)] ring-1 ring-white/40"
          style={{ backgroundColor: generator.accent }}
        >
          <Icon className="h-7 w-7 stroke-[2.25]" aria-hidden />
        </div>
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white/80 transition-all duration-200 ${
            ready
              ? "border-slate-200 text-slate-500 group-hover:border-transparent group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-[var(--generator-accent)]"
              : "border-slate-200 text-slate-300"
          }`}
          style={
            ready
              ? { ["--generator-accent" as string]: generator.accent }
              : undefined
          }
        >
          <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
        </span>
      </div>

      <div className="relative mt-6 flex-1 space-y-2">
        <h2 className="text-xl font-extrabold leading-snug tracking-tight text-[#172126] font-aileron group-hover:text-[#2a7797] transition-colors">
          {generator.title}
        </h2>
        <p className="text-[13px] leading-relaxed text-slate-500 font-medium">
          {generator.description}
        </p>
      </div>

      <div className="relative mt-6 flex items-center justify-between gap-3">
        <span
          className={`text-[11px] font-extrabold uppercase tracking-[1.2px] font-quicksand ${
            ready ? "text-[#2a7797]" : "text-slate-400"
          }`}
        >
          {ready ? "Open generator" : "Link not set"}
        </span>
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: ready ? generator.accent : "#cbd5e1" }}
          aria-hidden
        />
      </div>
    </>
  );

  const className = `group relative flex h-full flex-col overflow-hidden rounded-[28px] border p-6 shadow-[0_12px_32px_rgba(23,33,38,0.06)] transition-all duration-300 ${
    ready
      ? "bg-surface border-slate-300/70 hover:-translate-y-1 hover:border-[rgba(42,119,151,0.35)] hover:shadow-[0_18px_40px_rgba(42,119,151,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ec2bb] focus-visible:ring-offset-2"
      : "bg-surface/80 border-dashed border-slate-300 cursor-not-allowed"
  }`;

  if (!ready) {
    return (
      <div
        className={className}
        aria-disabled="true"
        title="This generator's link has not been attached yet"
      >
        {content}
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      <span className="sr-only">Open {generator.title} in a new tab</span>
      {content}
    </a>
  );
}

export function ServiceReportGeneratorGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {SERVICE_REPORT_GENERATORS.map((generator) => (
        <GeneratorCard key={generator.id} generator={generator} />
      ))}
    </div>
  );
}
