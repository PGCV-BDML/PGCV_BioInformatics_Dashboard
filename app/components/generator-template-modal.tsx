"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, FilePlus2, Pencil, X } from "lucide-react";
import {
  GENERATOR_ICONS,
  GENERATOR_ICON_LABELS,
  GENERATOR_INPUT_CLASS,
  GeneratorCard,
} from "./service-report-generator-card";
import {
  GENERATOR_ACCENTS,
  GENERATOR_ICON_KEYS,
  TEMPLATE_TITLE_MAX,
  tintFromAccent,
  validateGeneratorTemplate,
  type GeneratorTemplateErrors,
  type GeneratorTemplateInput,
  type ServiceReportGenerator,
} from "@/lib/service-report-generators";

const LABEL_CLASS =
  "text-[10px] font-extrabold uppercase tracking-[1.2px] text-[#2a7797] font-quicksand";

function initialInput(
  generator: ServiceReportGenerator | null,
): GeneratorTemplateInput {
  if (generator) {
    return {
      title: generator.title,
      description: generator.description,
      href: generator.href,
      icon: generator.icon,
      accent: generator.accent,
      shareHost: generator.shareHost !== false,
    };
  }
  return {
    title: "",
    description: "",
    href: "",
    icon: "file-text",
    accent: GENERATOR_ACCENTS[4],
    shareHost: true,
  };
}

export function GeneratorTemplateModal({
  isOpen,
  generator,
  saving,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  /** Template being edited; null when adding a new one. */
  generator: ServiceReportGenerator | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: GeneratorTemplateInput) => void;
}) {
  const [input, setInput] = useState<GeneratorTemplateInput>(() =>
    initialInput(generator),
  );
  const [errors, setErrors] = useState<GeneratorTemplateErrors>({});

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, saving, onClose]);

  const preview = useMemo<ServiceReportGenerator>(
    () => ({
      id: generator?.id ?? "template-preview",
      title: input.title.trim() || "Template title",
      description:
        input.description.trim() ||
        `Open the ${input.title.trim() || "new"} report generator.`,
      href: input.href,
      icon: input.icon,
      accent: input.accent,
      tint: tintFromAccent(input.accent),
      custom: true,
      shareHost: input.shareHost,
    }),
    [generator, input],
  );

  if (!isOpen) return null;

  const isEdit = Boolean(generator);
  const update = <K extends keyof GeneratorTemplateInput>(
    key: K,
    value: GeneratorTemplateInput[K],
  ) => {
    setInput((current) => ({ ...current, [key]: value }));
    if (key in errors) {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const nextErrors = validateGeneratorTemplate(input);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    onSubmit(input);
  };

  return (
    <div
      className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="generator-template-title"
        noValidate
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="bg-surface rounded-[24px] max-w-[760px] w-full max-h-[calc(100vh-2rem)] overflow-y-auto p-6 shadow-xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95 duration-150 font-aileron"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-[#2a7797]">
            {isEdit ? (
              <Pencil className="w-5 h-5" />
            ) : (
              <FilePlus2 className="w-5 h-5" />
            )}
            <h4 id="generator-template-title" className="text-lg font-bold">
              {isEdit ? "Edit report template" : "Add report template"}
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="template-title" className={LABEL_CLASS}>
                Title
              </label>
              <input
                id="template-title"
                type="text"
                value={input.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="Viral Metagenomics"
                maxLength={TEMPLATE_TITLE_MAX}
                autoComplete="off"
                autoFocus
                aria-invalid={Boolean(errors.title)}
                className={GENERATOR_INPUT_CLASS}
              />
              {errors.title ? (
                <p className="text-[11px] text-red-600 ml-1">{errors.title}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="template-description" className={LABEL_CLASS}>
                Description
              </label>
              <textarea
                id="template-description"
                value={input.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="Open the viral metagenomics report generator."
                rows={2}
                className={`${GENERATOR_INPUT_CLASS} h-auto py-2.5 resize-none`}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="template-href" className={LABEL_CLASS}>
                Address
              </label>
              <input
                id="template-href"
                type="text"
                value={input.href}
                onChange={(event) => update("href", event.target.value)}
                placeholder="10.49.42.113:5080"
                autoComplete="off"
                aria-invalid={Boolean(errors.href)}
                className={GENERATOR_INPUT_CLASS}
              />
              {errors.href ? (
                <p className="text-[11px] text-red-600 ml-1">{errors.href}</p>
              ) : null}
              <label className="flex items-center gap-2 pt-1 text-[11px] font-medium text-slate-500">
                <input
                  type="checkbox"
                  checked={input.shareHost}
                  onChange={(event) => update("shareHost", event.target.checked)}
                  className="h-3.5 w-3.5 accent-[#2a7797]"
                />
                Runs on the lab machine (follows the Lab host field)
              </label>
            </div>

            <fieldset className="space-y-1.5">
              <legend className={LABEL_CLASS}>Icon</legend>
              <div className="flex flex-wrap gap-2 pt-1.5">
                {GENERATOR_ICON_KEYS.map((key) => {
                  const Icon = GENERATOR_ICONS[key];
                  const selected = input.icon === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => update("icon", key)}
                      aria-pressed={selected}
                      aria-label={GENERATOR_ICON_LABELS[key]}
                      title={GENERATOR_ICON_LABELS[key]}
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
                        selected
                          ? "border-[#2a7797] bg-brand-tint text-[#2a7797] ring-2 ring-[#2a7797]/20"
                          : "border-slate-200 bg-surface text-slate-500 hover:border-slate-300 hover:text-slate-700"
                      }`}
                    >
                      <Icon className="h-4 w-4 stroke-[2.25]" aria-hidden />
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="space-y-1.5">
              <legend className={LABEL_CLASS}>Color</legend>
              <div className="flex flex-wrap gap-2.5 pt-1.5">
                {GENERATOR_ACCENTS.map((accent) => {
                  const selected =
                    input.accent.toLowerCase() === accent.toLowerCase();
                  return (
                    <button
                      key={accent}
                      type="button"
                      onClick={() => update("accent", accent)}
                      aria-pressed={selected}
                      aria-label={`Color ${accent}`}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-white transition-transform hover:scale-110 ${
                        selected ? "ring-2 ring-offset-2 ring-slate-400" : ""
                      }`}
                      style={{ backgroundColor: accent }}
                    >
                      {selected ? (
                        <Check className="h-3.5 w-3.5 stroke-[3]" aria-hidden />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {errors.accent ? (
                <p className="text-[11px] text-red-600 ml-1">{errors.accent}</p>
              ) : null}
            </fieldset>
          </div>

          <div className="space-y-1.5">
            <p className={LABEL_CLASS}>Preview</p>
            <div className="pt-1.5">
              <GeneratorCard generator={preview} preview />
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 px-4 bg-gray-100 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center gap-1.5 px-4 bg-[#2a7797] hover:bg-[#1f5f79] disabled:bg-[#2a7797]/60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-md transition-colors"
          >
            <Check className="h-4 w-4 stroke-[2.5]" />
            {saving ? "Saving…" : isEdit ? "Save template" : "Add template"}
          </button>
        </div>
      </form>
    </div>
  );
}
