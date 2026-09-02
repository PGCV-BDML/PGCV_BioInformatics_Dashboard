"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Calendar, FolderGit2 } from "lucide-react";
import SlideOverModal, { renderSectionLabel } from "./slidemodal";
import type { Repository, SequencingRunFormData } from "@/types/database";
import {
  eligibleRepositoriesForNewRun,
  repositoriesMissingRunId,
  validateRunForm,
} from "@/lib/sequencing-run-checklist";
import { routes } from "@/lib/routes";

export const EMPTY_SEQUENCING_RUN_FORM: SequencingRunFormData = {
  repository_id: "",
  date_received: "",
  notes: "",
};

interface SequencingRunModalProps {
  isOpen: boolean;
  isAdding: boolean;
  isSaving: boolean;
  initialData: SequencingRunFormData | null;
  repositories: Repository[];
  usedRepositoryIds: Set<string>;
  lockedRepository?: Repository | null;
  onClose: () => void;
  onSubmit: (data: SequencingRunFormData) => void;
}

export default function SequencingRunModal({
  isOpen,
  isAdding,
  isSaving,
  initialData,
  repositories,
  usedRepositoryIds,
  lockedRepository,
  onClose,
  onSubmit,
}: SequencingRunModalProps) {
  const [formState, setFormState] =
    useState<SequencingRunFormData>(EMPTY_SEQUENCING_RUN_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormState(initialData || EMPTY_SEQUENCING_RUN_FORM);
      setErrors({});
    }
  }, [isOpen, initialData]);

  const eligibleRepos = useMemo(
    () => eligibleRepositoriesForNewRun(repositories, usedRepositoryIds),
    [repositories, usedRepositoryIds],
  );

  const missingRunIdRepos = useMemo(
    () => repositoriesMissingRunId(repositories),
    [repositories],
  );

  const handleInputChange = <K extends keyof SequencingRunFormData>(
    key: K,
    value: SequencingRunFormData[K],
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateRunForm(formState, repositories);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSubmit(formState);
  };

  const fieldClass =
    "w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm";

  return (
    <SlideOverModal
      isOpen={isOpen}
      onClose={onClose}
      title={isAdding ? "New Sequencing Run" : "Edit Sequencing Run"}
      subtitle="Analyst reference — tied to a Repository run ID."
      onSubmit={handleSubmit}
      submitLabel="Save"
      isSaving={isSaving}
    >
      <div className="space-y-4">
        {isAdding ? (
          <div className="space-y-2.5">
            {renderSectionLabel(
              <FolderGit2 className="w-3.5 h-3.5" />,
              "Repository run",
            )}
            {missingRunIdRepos.length > 0 && (
              <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p>
                  Some repository links are missing a run ID.{" "}
                  <strong>Add run ID on Repository first.</strong>{" "}
                  <Link
                    href={routes.repositories.list}
                    className="font-bold text-[#2a7797] underline underline-offset-2"
                  >
                    Open Repositories
                  </Link>
                </p>
              </div>
            )}
            {eligibleRepos.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[11px] text-slate-600">
                No repository links with a run ID are available for a new
                checklist. Add a run ID on Repository first, or every eligible
                link already has a checklist.
              </div>
            ) : (
              <>
                <label
                  htmlFor="sequencing-run-repository"
                  className="text-xs font-bold text-slate-800 ml-1 font-aileron"
                >
                  Repository link
                </label>
                <select
                  id="sequencing-run-repository"
                  value={formState.repository_id}
                  onChange={(e) =>
                    handleInputChange("repository_id", e.target.value)
                  }
                  className={fieldClass}
                >
                  <option value="">Select a repository link…</option>
                  {eligibleRepos.map((repo) => (
                    <option key={repo.id} value={repo.id}>
                      {repo.run_id} · {repo.title}
                    </option>
                  ))}
                </select>
              </>
            )}
            {errors.repository_id && (
              <p className="text-red-500 text-xs ml-1" role="alert">
                {errors.repository_id}
              </p>
            )}
          </div>
        ) : (
          lockedRepository && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Repository run
              </p>
              <p className="mt-1 font-mono text-sm font-bold text-slate-800">
                {lockedRepository.run_id ?? "—"}
              </p>
              <p className="text-xs text-slate-600">{lockedRepository.title}</p>
            </div>
          )
        )}

        <div className="space-y-2.5">
          {renderSectionLabel(<Calendar className="w-3.5 h-3.5" />, "Intake")}
          <label
            htmlFor="sequencing-run-date-received"
            className="text-xs font-bold text-slate-800 ml-1 font-aileron"
          >
            Date sequences received
          </label>
          <input
            id="sequencing-run-date-received"
            type="date"
            value={formState.date_received}
            onChange={(e) => handleInputChange("date_received", e.target.value)}
            className={fieldClass}
          />
          {errors.date_received && (
            <p className="text-red-500 text-xs ml-1" role="alert">
              {errors.date_received}
            </p>
          )}
        </div>

        <div className="space-y-2.5">
          <label
            htmlFor="sequencing-run-notes"
            className="text-xs font-bold text-slate-800 ml-1 font-aileron"
          >
            Notes (optional)
          </label>
          <textarea
            id="sequencing-run-notes"
            value={formState.notes}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            rows={3}
            placeholder="Run-level note for analysts"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm resize-y min-h-[4.5rem]"
          />
        </div>
      </div>
    </SlideOverModal>
  );
}
