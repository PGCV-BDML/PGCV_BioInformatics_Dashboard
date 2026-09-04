"use client";

import { useCallback, useEffect, useMemo, useState, type SVGProps } from "react";
import {
  ArrowUpRight,
  Check,
  Dna,
  FileOutput,
  Layers3,
  Pencil,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";
import { usePortal } from "./portal-context";
import { useToast } from "./toast";
import { describeSaveError } from "@/lib/db-errors";
import {
  applySharedHost,
  catalogHrefById,
  displayGeneratorHref,
  generatorsWithHrefs,
  isGeneratorHrefReady,
  loadGeneratorHrefMap,
  normalizeGeneratorHref,
  normalizeHostInput,
  saveGeneratorHrefMap,
  sharedGeneratorHost,
  type ServiceReportGenerator,
} from "@/lib/service-report-generators";

const INPUT_CLASS =
  "w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm";

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
  "custom-service-report": SlidersHorizontal,
};

function GeneratorCard({
  generator,
  editing,
  draftHref,
  onDraftChange,
}: {
  generator: ServiceReportGenerator;
  editing: boolean;
  draftHref: string;
  onDraftChange: (href: string) => void;
}) {
  const Icon = GENERATOR_ICONS[generator.id] ?? Dna;
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
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="10.49.42.113:5050"
            autoComplete="off"
            className={INPUT_CLASS}
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
    editing
      ? "bg-surface border-slate-300/70"
      : ready
        ? "bg-surface border-slate-300/70 hover:-translate-y-1 hover:border-[rgba(42,119,151,0.35)] hover:shadow-[0_18px_40px_rgba(42,119,151,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ec2bb] focus-visible:ring-offset-2"
        : "bg-surface/80 border-dashed border-slate-300 cursor-not-allowed"
  }`;

  if (editing) {
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

export function ServiceReportGeneratorGrid() {
  const { isStaff, profile } = usePortal();
  const { showToast } = useToast();
  const [hrefById, setHrefById] = useState<Record<string, string>>(
    catalogHrefById,
  );
  const [draftById, setDraftById] = useState<Record<string, string>>({});
  const [sharedHost, setSharedHost] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const next = await loadGeneratorHrefMap();
      if (cancelled) return;
      setHrefById(next);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const generators = useMemo(
    () => generatorsWithHrefs(hrefById),
    [hrefById],
  );

  const beginEdit = useCallback(() => {
    setDraftById(hrefById);
    setSharedHost(sharedGeneratorHost(hrefById));
    setEditing(true);
  }, [hrefById]);

  const cancelEdit = useCallback(() => {
    setDraftById({});
    setSharedHost("");
    setEditing(false);
  }, []);

  const applyHostToAll = useCallback(() => {
    const next = applySharedHost(draftById, sharedHost);
    setDraftById(next);
    setSharedHost(sharedGeneratorHost(next) || normalizeHostInput(sharedHost));
  }, [draftById, sharedHost]);

  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const saved = await saveGeneratorHrefMap(draftById, profile?.id ?? null);
      setHrefById(saved);
      setEditing(false);
      setDraftById({});
      showToast("Generator addresses updated.", "success");
    } catch (error) {
      showToast(
        describeSaveError(error, "service_report_generator"),
        "error",
      );
    } finally {
      setSaving(false);
    }
  }, [draftById, profile, saving, showToast]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <FileOutput className="w-5 h-5 text-[#333333]" />
          <h2 className="text-2xl font-bold text-[#333333]">Generators</h2>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          {isStaff ? (
            editing ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-surface px-4 text-xs font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-60"
                >
                  <X className="h-3.5 w-3.5 stroke-[2.5]" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-slate-900 px-4 text-xs font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-black disabled:translate-y-0 disabled:opacity-60"
                >
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  {saving ? "Saving…" : "Save addresses"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={beginEdit}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-surface px-4 text-xs font-bold text-[#2a7797] shadow-sm transition-all hover:bg-brand-tint"
              >
                <Pencil className="h-3.5 w-3.5 stroke-[2.5]" />
                Edit addresses
              </button>
            )
          ) : (
            <p className="hidden max-w-sm text-right text-[11px] leading-relaxed font-medium text-slate-400 sm:block">
              Each card opens its generator in a new tab. Cards without a link
              stay inactive until an address is attached.
            </p>
          )}
        </div>
      </div>

      {editing ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <label
              htmlFor="generator-shared-host"
              className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-[#2a7797] font-quicksand"
            >
              Lab host
            </label>
            <input
              id="generator-shared-host"
              type="text"
              value={sharedHost}
              onChange={(event) => setSharedHost(event.target.value)}
              placeholder="10.49.42.113"
              autoComplete="off"
              className={INPUT_CLASS}
            />
            <p className="text-[11px] font-medium leading-relaxed text-slate-400">
              When the lab IP changes, type the new host and apply it to every
              generator. Ports stay as they are.
            </p>
          </div>
          <button
            type="button"
            onClick={applyHostToAll}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-surface px-4 text-xs font-bold text-[#2a7797] shadow-sm transition-all hover:bg-brand-tint"
          >
            Apply to all
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {generators.map((generator) => (
          <GeneratorCard
            key={generator.id}
            generator={generator}
            editing={editing}
            draftHref={draftById[generator.id] ?? generator.href}
            onDraftChange={(href) =>
              setDraftById((current) => ({ ...current, [generator.id]: href }))
            }
          />
        ))}
      </div>
    </div>
  );
}
