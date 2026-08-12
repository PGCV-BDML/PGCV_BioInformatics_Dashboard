"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, UsersRound } from "lucide-react";
import type { User } from "@/types/database";
import SlideOverModal, { renderSectionLabel } from "./slidemodal";
import { getUsersFromDB, saveDataToDB } from "@/lib/supabase";

interface TeamRosterModalProps {
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSaveStart: () => void;
  onSaveEnd: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}

function roleLabel(role: User["role"]): string {
  if (role === "team_lead") return "Team lead";
  if (role === "team_member") return "Team member";
  if (role === "reviewing_officer") return "Reviewing officer";
  if (role === "approving_officer") return "Approving officer";
  return role;
}

export default function TeamRosterModal({
  isOpen,
  isSaving,
  onClose,
  onSaveStart,
  onSaveEnd,
  onSaved,
  onError,
}: TeamRosterModalProps) {
  const [staff, setStaff] = useState<User[]>([]);
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [initialSelection, setInitialSelection] = useState<
    Record<string, boolean>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Callers pass inline callbacks, so keep them out of the loader's deps:
  // re-running the loader would overwrite in-progress checkbox edits.
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setSearchQuery("");

    (async () => {
      setIsLoading(true);
      try {
        const rows = await getUsersFromDB<User>(["team_lead", "team_member"]);
        if (cancelled) return;

        const sorted = [...rows].sort((a, b) => {
          if (a.role !== b.role) {
            return a.role === "team_lead" ? -1 : 1;
          }
          return a.name.localeCompare(b.name, undefined, {
            sensitivity: "base",
          });
        });

        const nextSelection = Object.fromEntries(
          sorted.map((user) => [user.id, user.in_team_directory === true]),
        );

        setStaff(sorted);
        setSelection(nextSelection);
        setInitialSelection(nextSelection);
      } catch (err) {
        console.error("Failed to load staff roster:", err);
        if (!cancelled) {
          onErrorRef.current("Couldn't load staff list. Please try again.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return staff;
    return staff.filter(
      (user) =>
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        roleLabel(user.role).toLowerCase().includes(q),
    );
  }, [staff, searchQuery]);

  const selectedCount = useMemo(
    () => Object.values(selection).filter(Boolean).length,
    [selection],
  );

  const hasChanges = useMemo(
    () =>
      staff.some(
        (user) => selection[user.id] !== initialSelection[user.id],
      ),
    [staff, selection, initialSelection],
  );

  const toggleUser = (userId: string, included: boolean) => {
    setSelection((prev) => ({ ...prev, [userId]: included }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) {
      onClose();
      return;
    }

    const updates = staff.filter(
      (user) => selection[user.id] !== initialSelection[user.id],
    );

    onSaveStart();
    try {
      await Promise.all(
        updates.map((user) =>
          saveDataToDB("users", user.id, {
            in_team_directory: selection[user.id] === true,
          }),
        ),
      );
      onSaved();
      onClose();
    } catch (err) {
      console.error("Failed to save team roster:", err);
      onError("Couldn't save roster changes. Please try again.");
    } finally {
      onSaveEnd();
    }
  };

  return (
    <SlideOverModal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage bioinformatics roster"
      subtitle="Choose who appears on Team presence and calendar absences."
      onSubmit={(e) => void handleSubmit(e)}
      submitLabel="Save roster"
      isSaving={isSaving}
      submitDisabled={isLoading || !hasChanges}
    >
      <div className="space-y-4">
        {renderSectionLabel(<UsersRound className="w-3.5 h-3.5" />, "Staff")}

        <p className="text-[11px] text-slate-500 font-quicksand leading-relaxed">
          Dashboard access ({roleLabel("team_lead")} / {roleLabel("team_member")}
          ) is separate from this roster. Uncheck staff who are not part of the
          bioinformatics lab but still need the app.
        </p>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-[#2a7797]/50 focus:ring-2 focus:ring-[#2a7797]/15"
          />
        </div>

        <p className="text-[11px] font-semibold text-slate-500 font-aileron">
          {selectedCount} of {staff.length} selected for Team & calendar
        </p>

        {isLoading ? (
          <p className="text-sm text-slate-500 font-aileron">Loading staff…</p>
        ) : filteredStaff.length === 0 ? (
          <p className="text-sm text-slate-500 font-aileron">
            No staff match your search.
          </p>
        ) : (
          <ul className="max-h-[min(420px,50vh)] space-y-2 overflow-y-auto pr-1">
            {filteredStaff.map((user) => {
              const checked = selection[user.id] === true;
              return (
                <li key={user.id}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                      checked
                        ? "border-[#2a7797]/25 bg-[#2a7797]/5"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggleUser(user.id, e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#2a7797] focus:ring-[#2a7797]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800 font-aileron truncate">
                        {user.name}
                      </span>
                      <span className="block text-[11px] text-slate-500 font-quicksand truncate">
                        {user.email}
                      </span>
                      <span className="mt-0.5 inline-block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-quicksand">
                        {roleLabel(user.role)}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </SlideOverModal>
  );
}
