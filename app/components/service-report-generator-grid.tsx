"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, FileOutput, Pencil, Plus, Trash2, X } from "lucide-react";
import { usePortal } from "./portal-context";
import { useToast } from "./toast";
import DeleteModal from "./deletemodal";
import { GeneratorTemplateModal } from "./generator-template-modal";
import {
  GENERATOR_INPUT_CLASS,
  GeneratorCard,
} from "./service-report-generator-card";
import { describeSaveError } from "@/lib/db-errors";
import {
  applySharedHost,
  catalogHrefById,
  createGeneratorTemplate,
  deleteGeneratorTemplate,
  generatorsWithHrefs,
  hrefsOf,
  loadGenerators,
  normalizeHostInput,
  saveGeneratorHrefMap,
  sharedGeneratorHost,
  updateGeneratorTemplate,
  type GeneratorTemplateInput,
  type ServiceReportGenerator,
} from "@/lib/service-report-generators";

type TemplateDialog =
  | { mode: "create" }
  | { mode: "edit"; generator: ServiceReportGenerator };

function CardActionButton({
  label,
  tone = "default",
  onClick,
  children,
}: {
  label: string;
  tone?: "default" | "danger";
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 shadow-sm transition-colors ${
        tone === "danger"
          ? "text-red-500 hover:border-red-200 hover:bg-red-50"
          : "text-[#2a7797] hover:bg-brand-tint"
      }`}
    >
      {children}
    </button>
  );
}

export function ServiceReportGeneratorGrid() {
  const { isStaff, profile } = usePortal();
  const { showToast } = useToast();
  const [generators, setGenerators] = useState<ServiceReportGenerator[]>(() =>
    generatorsWithHrefs(catalogHrefById()),
  );
  const [draftById, setDraftById] = useState<Record<string, string>>({});
  const [sharedHost, setSharedHost] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templateDialog, setTemplateDialog] = useState<TemplateDialog | null>(
    null,
  );
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [removing, setRemoving] = useState<ServiceReportGenerator | null>(null);
  const [removingBusy, setRemovingBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const next = await loadGenerators();
      if (cancelled) return;
      setGenerators(next);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const hrefById = useMemo(() => hrefsOf(generators), [generators]);

  const beginEdit = useCallback(() => {
    setDraftById(hrefById);
    setSharedHost(sharedGeneratorHost(hrefById, generators));
    setEditing(true);
  }, [hrefById, generators]);

  const cancelEdit = useCallback(() => {
    setDraftById({});
    setSharedHost("");
    setEditing(false);
  }, []);

  const applyHostToAll = useCallback(() => {
    const next = applySharedHost(draftById, sharedHost, generators);
    setDraftById(next);
    setSharedHost(
      sharedGeneratorHost(next, generators) || normalizeHostInput(sharedHost),
    );
  }, [draftById, sharedHost, generators]);

  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const saved = await saveGeneratorHrefMap(
        draftById,
        profile?.id ?? null,
        generators,
      );
      setGenerators((current) => generatorsWithHrefs(saved, current));
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
  }, [draftById, generators, profile, saving, showToast]);

  const closeTemplateDialog = useCallback(() => {
    setTemplateDialog(null);
  }, []);

  const submitTemplate = useCallback(
    async (input: GeneratorTemplateInput) => {
      if (!templateDialog || savingTemplate) return;
      setSavingTemplate(true);
      try {
        if (templateDialog.mode === "create") {
          const created = await createGeneratorTemplate(input, {
            existing: generators,
            updatedBy: profile?.id ?? null,
          });
          setGenerators((current) => [...current, created]);
          showToast(`Added "${created.title}".`, "success");
        } else {
          const updated = await updateGeneratorTemplate(
            templateDialog.generator.id,
            input,
            profile?.id ?? null,
          );
          setGenerators((current) =>
            current.map((generator) =>
              generator.id === updated.id ? updated : generator,
            ),
          );
          setDraftById((current) =>
            updated.id in current
              ? { ...current, [updated.id]: updated.href }
              : current,
          );
          showToast(`Updated "${updated.title}".`, "success");
        }
        setTemplateDialog(null);
      } catch (error) {
        showToast(
          describeSaveError(error, "service_report_generator"),
          "error",
        );
      } finally {
        setSavingTemplate(false);
      }
    },
    [generators, profile, savingTemplate, showToast, templateDialog],
  );

  const confirmRemove = useCallback(async () => {
    if (!removing || removingBusy) return;
    setRemovingBusy(true);
    try {
      await deleteGeneratorTemplate(removing.id);
      setGenerators((current) =>
        current.filter((generator) => generator.id !== removing.id),
      );
      setDraftById((current) => {
        const next = { ...current };
        delete next[removing.id];
        return next;
      });
      showToast(`Removed "${removing.title}".`, "success");
      setRemoving(null);
    } catch (error) {
      showToast(
        describeSaveError(error, "service_report_generator"),
        "error",
      );
    } finally {
      setRemovingBusy(false);
    }
  }, [removing, removingBusy, showToast]);

  const openCreate = useCallback(() => {
    setTemplateDialog({ mode: "create" });
  }, []);

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
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={beginEdit}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-surface px-4 text-xs font-bold text-[#2a7797] shadow-sm transition-all hover:bg-brand-tint"
                >
                  <Pencil className="h-3.5 w-3.5 stroke-[2.5]" />
                  Edit addresses
                </button>
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-slate-900 px-4 text-xs font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-black"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  Add template
                </button>
              </div>
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
              className={GENERATOR_INPUT_CLASS}
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
            actions={
              editing && generator.custom ? (
                <div className="flex items-center gap-1.5">
                  <CardActionButton
                    label={`Edit ${generator.title}`}
                    onClick={() =>
                      setTemplateDialog({ mode: "edit", generator })
                    }
                  >
                    <Pencil className="h-3.5 w-3.5 stroke-[2.5]" />
                  </CardActionButton>
                  <CardActionButton
                    label={`Remove ${generator.title}`}
                    tone="danger"
                    onClick={() => setRemoving(generator)}
                  >
                    <Trash2 className="h-3.5 w-3.5 stroke-[2.5]" />
                  </CardActionButton>
                </div>
              ) : undefined
            }
          />
        ))}
        {isStaff && !editing ? (
          <button
            type="button"
            onClick={openCreate}
            className="group flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-[28px] border-2 border-dashed border-slate-300 bg-transparent p-6 text-center transition-all hover:border-[#4ec2bb] hover:bg-brand-tint/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ec2bb] focus-visible:ring-offset-2"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 bg-surface text-slate-500 transition-colors group-hover:border-[#4ec2bb] group-hover:text-[#2a7797]">
              <Plus className="h-5 w-5 stroke-[2.5]" />
            </span>
            <span className="space-y-1">
              <span className="block text-sm font-extrabold text-[#172126]">
                New template
              </span>
              <span className="block text-[12px] font-medium text-slate-400">
                Add a card for another report generator
              </span>
            </span>
          </button>
        ) : null}
      </div>

      {/* Keyed so each open starts from a fresh form. */}
      <GeneratorTemplateModal
        key={
          templateDialog?.mode === "edit"
            ? `edit-${templateDialog.generator.id}`
            : (templateDialog?.mode ?? "closed")
        }
        isOpen={templateDialog !== null}
        generator={
          templateDialog?.mode === "edit" ? templateDialog.generator : null
        }
        saving={savingTemplate}
        onClose={closeTemplateDialog}
        onSubmit={(input) => void submitTemplate(input)}
      />

      <DeleteModal
        isOpen={removing !== null}
        itemName={removing?.title ?? ""}
        isDeleting={removingBusy}
        onClose={() => {
          if (!removingBusy) setRemoving(null);
        }}
        onConfirm={() => void confirmRemove()}
      />
    </div>
  );
}
