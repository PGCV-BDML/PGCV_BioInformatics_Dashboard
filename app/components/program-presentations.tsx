"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  Presentation,
  Trash2,
} from "lucide-react";
import SlideOverModal from "@/app/components/slidemodal";
import ConfirmModal from "@/app/components/confirm-modal";
import { usePortal } from "@/app/components/portal-context";
import { useToast } from "@/app/components/toast";
import {
  groupPresentationItems,
  presentationIdFromLink,
  presentationLinkForId,
  type PresentationLibraryItem,
} from "@/lib/presentation-library";
import {
  fetchPresentationCatalog,
  getGithubPresentationViewUrl,
} from "@/lib/presentation-library-client";
import {
  deleteDataFromDB,
  getRowsFromDB,
  saveDataToDB,
} from "@/lib/supabase";
import type { Presentation as PresentationRow } from "@/types/database";

interface ProgramPresentationsProps {
  programId: string;
}

type DeckRow = {
  id: string;
  title: string;
  contentLink: string | null;
  order: number;
};

function toDeckRow(row: PresentationRow, index: number): DeckRow {
  return {
    id: row.id,
    title: row.title?.trim() || `Presentation ${index + 1}`,
    contentLink: row.content_link,
    order: row.order ?? index + 1,
  };
}

export default function ProgramPresentations({
  programId,
}: ProgramPresentationsProps) {
  const { showToast } = useToast();
  const { isStaff, isLearnerView } = usePortal();
  const canBuild = isStaff && !isLearnerView;

  const [decks, setDecks] = useState<DeckRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<PresentationLibraryItem[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<
    "idle" | "loading" | "ready" | "unconfigured" | "error"
  >("idle");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<DeckRow | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const rows = await getRowsFromDB<PresentationRow>("presentation");
      const filtered = rows
        .filter((row) => row.program_id === programId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((row, index) => toDeckRow(row, index));
      setDecks(filtered);
    } catch (error) {
      console.error("Failed to load presentations:", error);
      setLoadError("Failed to load presentations. Please refresh the page.");
    }
  }, [programId]);

  useEffect(() => {
    load();
  }, [load]);

  const loadCatalog = useCallback(async () => {
    setCatalogStatus("loading");
    try {
      const result = await fetchPresentationCatalog();
      setCatalog(result.presentations);
      setCatalogStatus(result.configured ? "ready" : "unconfigured");
    } catch (error) {
      console.error("Failed to load presentation catalog:", error);
      setCatalogStatus("error");
    }
  }, []);

  const assignedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of decks) {
      const id = presentationIdFromLink(row.contentLink);
      if (id) ids.add(id);
    }
    return ids;
  }, [decks]);

  const availableLibrary = useMemo(
    () => catalog.filter((item) => !item.retired && !assignedIds.has(item.id)),
    [assignedIds, catalog],
  );

  const libraryByGroup = useMemo(
    () => groupPresentationItems(availableLibrary),
    [availableLibrary],
  );

  const openDeck = async (deck: DeckRow) => {
    const id = presentationIdFromLink(deck.contentLink);
    if (!id) {
      showToast("This presentation isn't linked to the library.", "error");
      return;
    }
    setOpeningId(deck.id);
    try {
      const href = await getGithubPresentationViewUrl(id);
      window.open(href, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Failed to open presentation:", error);
      showToast(
        error instanceof Error
          ? error.message
          : "Couldn't open that presentation.",
        "error",
      );
    } finally {
      setOpeningId(null);
    }
  };

  const persistOrder = async (ordered: DeckRow[]) => {
    await Promise.all(
      ordered.map((row, index) =>
        saveDataToDB("presentation", row.id, { order: -(index + 1) }),
      ),
    );
    await Promise.all(
      ordered.map((row, index) =>
        saveDataToDB("presentation", row.id, { order: index + 1 }),
      ),
    );
    setDecks(ordered.map((row, index) => ({ ...row, order: index + 1 })));
  };

  const moveDeck = async (deckId: string, direction: "up" | "down") => {
    const index = decks.findIndex((row) => row.id === deckId);
    if (index < 0) return;
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= decks.length) return;

    const next = [...decks];
    const current = next[index];
    const other = next[swapWith];
    if (!current || !other) return;
    next[index] = other;
    next[swapWith] = current;

    const previous = decks;
    setDecks(next.map((row, i) => ({ ...row, order: i + 1 })));
    setBusyId(deckId);
    try {
      await persistOrder(next);
    } catch (error) {
      console.error("Failed to reorder presentations:", error);
      showToast("Failed to reorder presentations.", "error");
      setDecks(previous);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!removeTarget) return;
    setIsRemoving(true);
    try {
      await deleteDataFromDB("presentation", removeTarget.id);
      const remaining = decks.filter((row) => row.id !== removeTarget.id);
      await persistOrder(remaining);
      setRemoveTarget(null);
      showToast("Presentation removed from this training.", "success");
    } catch (error) {
      console.error("Failed to remove presentation:", error);
      showToast("Failed to remove presentation.", "error");
    } finally {
      setIsRemoving(false);
    }
  };

  const resolveItemsToAdd = (): PresentationLibraryItem[] =>
    availableLibrary.filter((item) => selectedLibraryIds.includes(item.id));

  const handleAddSelected = async () => {
    const toAdd = resolveItemsToAdd();
    if (toAdd.length === 0) return;

    setIsSaving(true);
    try {
      let nextOrder = decks.reduce((max, row) => Math.max(max, row.order), 0) + 1;
      const created: DeckRow[] = [];

      for (const item of toAdd) {
        const id = crypto.randomUUID();
        const saved = (await saveDataToDB("presentation", id, {
          id,
          program_id: programId,
          title: item.title,
          content_link: presentationLinkForId(item.id),
          order: nextOrder,
        })) as PresentationRow;
        created.push(toDeckRow(saved, nextOrder - 1));
        nextOrder += 1;
      }

      setDecks((prev) => [...prev, ...created]);
      setSelectedLibraryIds([]);
      setIsPickerOpen(false);
      showToast(
        toAdd.length === 1
          ? "Presentation added to this training."
          : `${toAdd.length} presentations added to this training.`,
        "success",
      );
    } catch (error) {
      console.error("Failed to add presentations:", error);
      showToast("Failed to add presentations.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleLibraryId = (id: string) => {
    setSelectedLibraryIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  };

  const selectedCount = resolveItemsToAdd().length;

  return (
    <>
      <div className="bg-surface border border-slate-300/60 rounded-[24px] p-6 shadow-xl shadow-slate-400/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wide">
              Training Presentations
            </h3>
            <p className="text-xs font-semibold text-slate-500">
              {decks.length === 1
                ? "1 presentation"
                : `${decks.length} presentations`}
              {canBuild
                ? " • Add decks built in the presentations repo"
                : ""}
            </p>
          </div>
          {canBuild && (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setIsPickerOpen(true);
                if (catalogStatus === "idle" || catalogStatus === "error") {
                  void loadCatalog();
                }
              }}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-[#2a7797] hover:bg-[#1f5f79] text-white text-xs font-bold rounded-full shadow-sm transition-colors disabled:opacity-50 self-start sm:self-center"
            >
              <Plus className="w-4 h-4" />
              Add from library
            </button>
          )}
        </div>

        {loadError ? (
          <p className="text-sm text-rose-600 font-semibold">{loadError}</p>
        ) : decks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center px-4">
            <Presentation className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">
              {canBuild
                ? "No presentations in this training yet"
                : "No presentations assigned"}
            </p>
            <p className="text-xs text-slate-500 max-w-md">
              {canBuild
                ? "Use Add from library. Decks are HTML files from the bioinfo-presentations repo."
                : "Your instructor has not added presentations to this training yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {decks.map((deck, index) => (
              <div
                key={deck.id}
                className="w-full rounded-[20px] p-4 border border-slate-200 bg-[#FAF9F5] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shadow-sm"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-xs font-extrabold bg-white border border-slate-200 text-slate-400">
                    {`P${index + 1}`}
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 tracking-tight leading-snug truncate">
                    {deck.title}
                  </h4>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {canBuild && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Move presentation up"
                        disabled={index === 0 || busyId === deck.id}
                        onClick={() => void moveDeck(deck.id, "up")}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Move presentation down"
                        disabled={
                          index === decks.length - 1 || busyId === deck.id
                        }
                        onClick={() => void moveDeck(deck.id, "down")}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${deck.title}`}
                        onClick={() => setRemoveTarget(deck)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-rose-100 bg-white text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => void openDeck(deck)}
                    disabled={openingId === deck.id}
                    className="text-[11px] font-extrabold px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-[#4ec2bb] hover:border-[#4ec2bb] hover:text-white transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-60"
                  >
                    {openingId === deck.id ? "Opening…" : "Open"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SlideOverModal
        isOpen={isPickerOpen}
        onClose={() => {
          if (isSaving) return;
          setIsPickerOpen(false);
          setSelectedLibraryIds([]);
        }}
        title="Add presentations from library"
        subtitle="Pick decks from the bioinfo-presentations repo on GitHub"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setIsPickerOpen(false);
                setSelectedLibraryIds([]);
              }}
              className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving || selectedCount === 0}
              onClick={() => void handleAddSelected()}
              className="h-10 px-4 bg-[#2a7797] hover:bg-[#1f5f79] disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors"
            >
              {isSaving
                ? "Adding…"
                : selectedCount > 0
                  ? `Add ${selectedCount}`
                  : "Add selected"}
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {catalogStatus === "loading" || catalogStatus === "idle" ? (
            <p className="text-sm text-slate-500">
              Loading presentations from GitHub…
            </p>
          ) : catalogStatus === "unconfigured" ? (
            <p className="text-sm text-slate-500">
              The presentation library isn&apos;t connected yet. Set{" "}
              <code className="text-xs">GITHUB_PRESENTATIONS_TOKEN</code> on
              the server.
            </p>
          ) : catalogStatus === "error" ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-rose-600">
                Couldn&apos;t load the presentation library from GitHub.
              </p>
              <button
                type="button"
                onClick={() => void loadCatalog()}
                className="h-9 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Try again
              </button>
            </div>
          ) : libraryByGroup.length === 0 ? (
            <p className="text-sm text-slate-500">
              Every library presentation is already on this training.
            </p>
          ) : (
            libraryByGroup.map(([group, items]) => (
              <section key={group} className="space-y-2">
                <p className="text-[10px] font-bold text-[#2a7797] uppercase tracking-[1.5px] font-quicksand">
                  {group}
                </p>
                {items.map((item) => {
                  const checked = selectedLibraryIds.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 cursor-pointer transition-colors ${
                        checked
                          ? "border-[#4ec2bb] bg-[#f0faf9]"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleLibraryId(item.id)}
                        className="mt-1"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-slate-800">
                          {item.title}
                        </span>
                        {item.duration && (
                          <span className="block text-[11px] font-semibold text-slate-500 mt-0.5">
                            {item.duration}
                          </span>
                        )}
                        {item.summary && (
                          <span className="block text-[11px] text-slate-500 mt-1">
                            {item.summary}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </section>
            ))
          )}
        </div>
      </SlideOverModal>

      <ConfirmModal
        isOpen={!!removeTarget}
        title="Remove presentation"
        message={
          <>
            Remove <strong>{removeTarget?.title}</strong> from this training?
            The deck stays in the presentations repo for other programs.
          </>
        }
        confirmLabel="Remove"
        isConfirming={isRemoving}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemoveConfirm}
      />
    </>
  );
}
