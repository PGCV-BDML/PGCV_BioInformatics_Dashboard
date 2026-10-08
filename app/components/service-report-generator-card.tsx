"use client";

import type { ReactNode, SVGProps } from "react";
import {
  ArrowUpRight,
  Biohazard,
  Dna,
  FileText,
  FlaskConical,
  Layers3,
  Microscope,
  SlidersHorizontal,
  Sprout,
  TestTube,
  type LucideIcon,
} from "lucide-react";
import {
  displayGeneratorHref,
  isGeneratorHrefReady,
  normalizeGeneratorHref,
  type GeneratorIconKey,
  type ServiceReportGenerator,
} from "@/lib/service-report-generators";

export const GENERATOR_INPUT_CLASS =
  "w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm";

/** Simple rod bacterium so it still reads at card size. */
export function BacteriaIcon(props: SVGProps<SVGSVGElement>) {
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

export const GENERATOR_ICONS: Record<
  GeneratorIconKey,
  LucideIcon | typeof BacteriaIcon
> = {
  layers: Layers3,
  dna: Dna,
  bacteria: BacteriaIcon,
  biohazard: Biohazard,
  microscope: Microscope,
  flask: FlaskConical,
  "test-tube": TestTube,
  sprout: Sprout,
  "file-text": FileText,
  sliders: SlidersHorizontal,
};

export const GENERATOR_ICON_LABELS: Record<GeneratorIconKey, string> = {
  layers: "Layers",
  dna: "DNA",
  bacteria: "Bacteria",
  biohazard: "Biohazard",
  microscope: "Microscope",
  flask: "Flask",
  "test-tube": "Test tube",
  sprout: "Sprout",
  "file-text": "Document",
  sliders: "Sliders",
};

export function GeneratorCard({
  generator,
  editing = false,
  preview = false,
  draftHref = "",
  onDraftChange,
  actions,
}: {
  generator: ServiceReportGenerator;
  editing?: boolean;
  /** Static render for the template form; never links anywhere. */
  preview?: boolean;
  draftHref?: string;
  onDraftChange?: (href: string) => void;
  /** Edit-mode controls that replace the open arrow. */
  actions?: ReactNode;
}) {
  const Icon = GENERATOR_ICONS[generator.icon] ?? Dna;
  const href = normalizeGeneratorHref(editing ? draftHref : generator.href);
  const ready = isGeneratorHrefReady(href);
  const shownAddress = displayGeneratorHref(editing ? draftHref : generator.href);

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
        {actions ?? (
          <span
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white/80 transition-all duration-200 ${
              !editing && ready
                ? "border-slate-200 text-slate-500 group-hover:border-transparent group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-[var(--generator-accent)]"
                : "border-slate-200 text-slate-300"
            }`}
            style={
              !editing && ready
                ? { ["--generator-accent" as string]: generator.accent }
                : undefined
            }
          >
            <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
          </span>
        )}
      </div>

      <div className="relative mt-6 flex-1 space-y-2">
        <h2 className="text-xl font-extrabold leading-snug tracking-tight text-[#172126] font-aileron group-hover:text-[#2a7797] transition-colors">
          {generator.title}
        </h2>
        <p className="text-[13px] leading-relaxed text-slate-500 font-medium">
          {generator.description}
        </p>
      </div>

      {editing ? (
        <div className="relative mt-6 space-y-1.5">
          <label
            htmlFor={`generator-href-${generator.id}`}
            className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-[#2a7797] font-quicksand"
          >
            Address
          </label>
          <input
            id={`generator-href-${generator.id}`}
            type="text"
            value={draftHref}
            onChange={(event) => onDraftChange?.(event.target.value)}
            placeholder="10.49.42.113:5050"
            autoComplete="off"
            className={GENERATOR_INPUT_CLASS}
          />
        </div>
      ) : (
        <div className="relative mt-6 flex items-center justify-between gap-3">
          <span
            className={`min-w-0 truncate text-[12px] font-bold font-quicksand ${
              ready ? "text-[#2a7797]" : "text-slate-400"
            }`}
            title={shownAddress || undefined}
          >
            {shownAddress || "Link not set"}
          </span>
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: ready ? generator.accent : "#cbd5e1" }}
            aria-hidden
          />
        </div>
      )}
    </>
  );

  const className = `group relative flex h-full flex-col overflow-hidden rounded-[28px] border p-6 shadow-[0_12px_32px_rgba(23,33,38,0.06)] transition-all duration-300 ${
    editing || preview
      ? "bg-surface border-slate-300/70"
      : ready
        ? "bg-surface border-slate-300/70 hover:-translate-y-1 hover:border-[rgba(42,119,151,0.35)] hover:shadow-[0_18px_40px_rgba(42,119,151,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ec2bb] focus-visible:ring-offset-2"
        : "bg-surface/80 border-dashed border-slate-300 cursor-not-allowed"
  }`;

  if (editing || preview) {
    return <div className={className}>{content}</div>;
  }

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
