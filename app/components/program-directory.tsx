"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Plus } from "lucide-react";
import { PageHeader } from "@/app/components/pageheader";
import ProgramSearchGrid, {
  type ProgramCard,
} from "@/app/components/program-search-grid";
import ProgramModal from "@/app/components/program-modal";
import ConfirmModal from "@/app/components/confirm-modal";
import DeleteModal from "@/app/components/deletemodal";
import { useDashboardUI } from "@/app/components/dashboard-ui-context";
import { usePortal } from "@/app/components/portal-context";
import { useToast } from "@/app/components/toast";
import {
  getRowsFromDB,
  getUsersFromDB,
  saveDataToDB,
  deleteDataFromDB,
} from "@/lib/supabase";
import { loadUserNameMap } from "@/lib/user-names";
import { describeDeleteError, describeSaveError } from "@/lib/db-errors";
import type { BreadcrumbItem } from "@/app/components/dashboardbreadcrumbs";
import type {
  TrainingProgram,
  TrainingProgramFormData,
  TrainingProgramStatus,
  TrainingType,
  User as UserType,
  UserOption,
} from "@/types/database";

function mapProgramCard(
  program: TrainingProgram,
  userNameById: Map<string, string>,
): ProgramCard {
  return {
    id: program.id,
    title: program.title,
    description: program.description ?? "",
    instructor_name: program.instructor_id
      ? (userNameById.get(program.instructor_id) ?? "Unassigned")
      : "Unassigned",
    requesting_institution: program.requesting_institution ?? "",
    training_code: program.training_code ?? "",
    start_date: program.start_date ?? "",
    end_date: program.end_date ?? "",
    participant_count: 0,
    status: program.status ?? "ongoing",
  };
}

interface ProgramDirectoryProps {
  programType: TrainingType;
  breadcrumbTrail: BreadcrumbItem[];
  title: string;
  subtitle: string;
  addButtonLabel: string;
}

export default function ProgramDirectory({
  programType,
  breadcrumbTrail,
  title,
  subtitle,
  addButtonLabel,
}: ProgramDirectoryProps) {
  const [rawPrograms, setRawPrograms] = useState<TrainingProgram[]>([]);
  const [instructors, setInstructors] = useState<UserOption[]>([]);
  const [userNameById, setUserNameById] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<ProgramCard | null>(
    null,
  );
  const [archiveTarget, setArchiveTarget] = useState<ProgramCard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProgramCard | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toggleSidebar } = useDashboardUI();
  const { isLearnerView, isStaff } = usePortal();
  const { showToast } = useToast();
  const isPanelOpen = isAdding || isEditing;
  const canManage = isStaff && !isLearnerView;

  const programsList = useMemo(
    () => rawPrograms.map((program) => mapProgramCard(program, userNameById)),
    [rawPrograms, userNameById],
  );

  const directoryTitle = isLearnerView ? `My ${title} Courses` : title;
  const directorySubtitle = isLearnerView
    ? programsList.length === 0
      ? "You are not enrolled in a program yet. Contact a team lead if you believe this is an error."
      : "Select a course to continue."
    : subtitle;

  useEffect(() => {
    toggleSidebar(isPanelOpen);
  }, [isPanelOpen, toggleSidebar]);

  useEffect(() => {
    const loadData = async () => {
      setLoadError(null);
      try {
        const [programs, staff] = await Promise.all([
          getRowsFromDB<TrainingProgram>("training_program"),
          getUsersFromDB<UserType>(["team_lead", "team_member"]),
        ]);

        const filtered = programs.filter((p) => p.type === programType);
        const nameMap = await loadUserNameMap(
          filtered.map((program) => program.instructor_id),
        );

        setRawPrograms(filtered);
        setUserNameById(nameMap);
        setInstructors(staff.map((u) => ({ id: u.id, name: u.name })));
      } catch (error) {
        console.error(`Failed to load ${programType} programs:`, error);
        setLoadError(
          `Failed to load ${programType} programs. Please refresh the page.`,
        );
      }
    };
    loadData();
  }, [programType]);

  const selectedRaw = useMemo(
    () => rawPrograms.find((p) => p.id === selectedProgram?.id) ?? null,
    [rawPrograms, selectedProgram],
  );

  const availableInstructors = useMemo(() => {
    const assignedId = selectedRaw?.instructor_id;
    if (!assignedId || instructors.some((user) => user.id === assignedId)) {
      return instructors;
    }
    return [
      {
        id: assignedId,
        name: userNameById.get(assignedId) ?? "Unknown instructor",
      },
      ...instructors,
    ];
  }, [instructors, selectedRaw?.instructor_id, userNameById]);

  const initialData = useMemo((): TrainingProgramFormData | null => {
    if (!selectedRaw) return null;
    return {
      title: selectedRaw.title,
      description: selectedRaw.description ?? "",
      requesting_institution: selectedRaw.requesting_institution ?? "",
      training_code: selectedRaw.training_code ?? "",
      instructor_id: selectedRaw.instructor_id ?? "",
      start_date: selectedRaw.start_date ?? "",
      end_date: selectedRaw.end_date ?? "",
      status: selectedRaw.status ?? "ongoing",
    };
  }, [selectedRaw]);

  const updateProgramStatus = useCallback(
    async (program: ProgramCard, newStatus: TrainingProgramStatus) => {
      const previous = program.status;
      setRawPrograms((prev) =>
        prev.map((p) =>
          p.id === program.id ? { ...p, status: newStatus } : p,
        ),
      );
      try {
        await saveDataToDB("training_program", program.id, {
          status: newStatus,
        });
        const label =
          newStatus === "completed"
            ? "marked as done"
            : newStatus === "archived"
              ? "archived"
              : newStatus === "ongoing"
                ? "restored"
                : "updated";
        showToast(`Program ${label}.`, "success");
      } catch (error) {
        console.error("Failed to update program status:", error);
        setRawPrograms((prev) =>
          prev.map((p) =>
            p.id === program.id ? { ...p, status: previous } : p,
          ),
        );
        showToast("Failed to update program status.", "error");
      }
    },
    [showToast],
  );

  const handleAddSubmit = useCallback(
    async (formData: TrainingProgramFormData) => {
      const newId = crypto.randomUUID();
      const payload = {
        id: newId,
        title: formData.title.trim(),
        type: programType,
        status: formData.status,
        instructor_id: formData.instructor_id,
        description: formData.description.trim() || null,
        requesting_institution:
          formData.requesting_institution.trim() || null,
        training_code:
          programType === "training"
            ? formData.training_code.trim() || null
            : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      };

      setIsSaving(true);
      try {
        const saved = (await saveDataToDB(
          "training_program",
          newId,
          payload,
        )) as TrainingProgram;
        setRawPrograms((prev) => [saved, ...prev]);
        setIsAdding(false);
        showToast(`${title} program created.`, "success");
      } catch (error) {
        console.error("Failed to create program:", error);
        showToast(describeSaveError(error, "training_program"), "error");
      } finally {
        setIsSaving(false);
      }
    },
    [programType, showToast, title],
  );

  const handleEditSubmit = useCallback(
    async (formData: TrainingProgramFormData) => {
      if (!selectedProgram) return;
      const payload = {
        title: formData.title.trim(),
        status: formData.status,
        instructor_id: formData.instructor_id,
        description: formData.description.trim() || null,
        requesting_institution:
          formData.requesting_institution.trim() || null,
        training_code:
          programType === "training"
            ? formData.training_code.trim() || null
            : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      };

      setIsSaving(true);
      try {
        const saved = (await saveDataToDB(
          "training_program",
          selectedProgram.id,
          payload,
        )) as TrainingProgram;
        setRawPrograms((prev) =>
          prev.map((p) => (p.id === selectedProgram.id ? { ...p, ...saved } : p)),
        );
        setIsEditing(false);
        setSelectedProgram(null);
        showToast("Program updated.", "success");
      } catch (error) {
        console.error("Failed to update program:", error);
        showToast(describeSaveError(error, "training_program"), "error");
      } finally {
        setIsSaving(false);
      }
    },
    [selectedProgram, showToast, programType],
  );

  const handleCloseModal = useCallback(() => {
    setIsAdding(false);
    setIsEditing(false);
    setSelectedProgram(null);
  }, []);

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    try {
      await updateProgramStatus(archiveTarget, "archived");
      setArchiveTarget(null);
    } finally {
      setIsArchiving(false);
    }
  }, [archiveTarget, updateProgramStatus]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteDataFromDB("training_program", deleteTarget.id);
      setRawPrograms((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      if (selectedProgram?.id === deleteTarget.id) {
        handleCloseModal();
      }
      setDeleteTarget(null);
      showToast(`${title} program deleted permanently.`, "success");
    } catch (error) {
      console.error("Failed to delete program:", error);
      showToast(describeDeleteError(error, "training_program"), "error");
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, selectedProgram?.id, handleCloseModal, showToast, title]);

  return (
    <div className="space-y-8 mx-auto font-aileron w-full max-w-[1240px]">
      <PageHeader
        breadcrumbTrail={breadcrumbTrail}
        title={directoryTitle}
        subtitle={directorySubtitle}
        actions={
          canManage ? (
            <button
              type="button"
              onClick={() => {
                setSelectedProgram(null);
                setIsEditing(false);
                setIsAdding(true);
              }}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-[#2a7797] hover:bg-[#1f5f79] text-white text-xs font-bold rounded-full shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              {addButtonLabel}
            </button>
          ) : undefined
        }
      />

      <div className="bg-surface border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20 space-y-6">
        {loadError ? (
          <div className="flex items-center gap-2 p-4">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-600">{loadError}</p>
          </div>
        ) : isLearnerView && programsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
            <AlertCircle className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">
              No enrolled courses yet
            </p>
            <p className="text-xs text-slate-500 max-w-md">
              Ask a team lead to enroll you in a {programType} program. Once
              assigned, your course will appear here automatically.
            </p>
          </div>
        ) : (
          <ProgramSearchGrid
            programs={programsList}
            type={programType}
            canManage={canManage}
            showStatusFilters={!isLearnerView}
            onEdit={(prog) => {
              setSelectedProgram(prog);
              setIsAdding(false);
              setIsEditing(true);
            }}
            onMarkDone={(prog) => updateProgramStatus(prog, "completed")}
            onArchive={(prog) => setArchiveTarget(prog)}
            onRestore={(prog) => updateProgramStatus(prog, "ongoing")}
            onDelete={(prog) => setDeleteTarget(prog)}
          />
        )}
      </div>

      {canManage && (
        <ProgramModal
          isOpen={isPanelOpen}
          isAdding={isAdding}
          isSaving={isSaving}
          programType={programType}
          initialData={isEditing ? initialData : null}
          availableInstructors={availableInstructors}
          onClose={handleCloseModal}
          onSubmit={isAdding ? handleAddSubmit : handleEditSubmit}
        />
      )}

      <ConfirmModal
        isOpen={!!archiveTarget}
        title="Archive Program"
        message={
          <>
            Archive <strong>{archiveTarget?.title}</strong>? It will be hidden
            from the active directory. You can restore it later from the
            Archived filter.
          </>
        }
        confirmLabel="Archive"
        isConfirming={isArchiving}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveConfirm}
      />

      <DeleteModal
        isOpen={!!deleteTarget}
        itemName={deleteTarget?.title ?? "this program"}
        isDeleting={isDeleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
