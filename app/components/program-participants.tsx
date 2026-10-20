"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Mail,
  School,
  CheckCircle2,
  XCircle,
  UserPlus,
  Trash2,
} from "lucide-react";
import DataTable, { Column } from "@/app/components/datatable";
import ConfirmModal from "@/app/components/confirm-modal";
import ModuleProgressModal from "@/app/components/module-progress-modal";
import { usePortal } from "@/app/components/portal-context";
import { useToast } from "@/app/components/toast";
import { moduleIdFromModuleLink } from "@/lib/module-library";
import { fetchModuleCatalog } from "@/lib/module-library-client";
import {
  checklistKindForModule,
  quizIsSubmitted,
  progressByUser,
  type ChecklistItem,
  type ChecklistKind,
  type ProgressSummary,
} from "@/lib/module-progress";
import { isListedParticipant } from "@/lib/program-enrollment";
import { programRoutes, type ProgramType } from "@/lib/routes";
import {
  deleteDataFromDB,
  getCurrentUser,
  getRowsFromDB,
  getUsersFromDB,
  saveDataToDB,
} from "@/lib/supabase";
import type {
  Certificate,
  Module,
  ModuleProgress,
  ProgramEnrollment,
  User,
} from "@/types/database";

interface ParticipantRow {
  enrollmentId: string;
  id: string;
  name: string;
  email: string;
  institution: string | null;
  has_certificate: boolean;
  status: ProgramEnrollment["status"];
  /** Checklist progress per library module that reports one (by modules.json id). */
  setup: Record<string, ProgressSummary>;
  /** Steps done in the first checklist module, for sorting. */
  setup_done: number | null;
}

/** A module in this program whose modules.json entry has a `checklist`. */
type SetupModule = {
  id: string;
  title: string;
  checklist: ChecklistItem[];
  checklistKind: ChecklistKind;
};

function progressColumnLabel(module: SetupModule, onlyOne: boolean): string {
  if (module.checklistKind === "quiz") {
    if (module.id.endsWith("pre-test")) return "Pre-test";
    if (module.id.endsWith("post-test")) return "Post-test";
    return module.title;
  }
  return onlyOne ? "Setup" : module.title;
}

function progressHint(modules: SetupModule[]): string {
  const hasQuiz = modules.some((module) => module.checklistKind === "quiz");
  const hasSteps = modules.some((module) => module.checklistKind !== "quiz");
  if (hasQuiz && hasSteps) {
    return " Test scores count correct answers. Setup steps show as done.";
  }
  if (hasQuiz) return " Scores update when learners submit a test from the module.";
  return " Setup progress updates as learners mark steps done in the module.";
}

/**
 * Library modules in the program that report checklist progress (e.g. the
 * NFDI Software Setup module). Empty when there are none or the library
 * can't be reached, so the rest of the participants list still loads.
 */
async function loadSetupModules(programId: string): Promise<SetupModule[]> {
  try {
    const modules = (await getRowsFromDB<Module>("module")).filter(
      (m) => m.program_id === programId,
    );
    const ids = new Set(
      modules
        .map((m) => moduleIdFromModuleLink(m.html_content_link))
        .filter((id): id is string => Boolean(id)),
    );
    if (!ids.size) return [];
    const catalog = await fetchModuleCatalog();
    return catalog.modules
      .filter((item) => ids.has(item.id) && item.checklist?.length)
      .map((item) => ({
        id: item.id,
        title: item.title,
        checklist: item.checklist ?? [],
        checklistKind: checklistKindForModule(item.id, item.checklistKind),
      }));
  } catch (error) {
    console.error("Failed to load module checklists:", error);
    return [];
  }
}

async function loadModuleProgress(): Promise<ModuleProgress[]> {
  try {
    return await getRowsFromDB<ModuleProgress>("module_progress");
  } catch (error) {
    console.error("Failed to load module progress:", error);
    return [];
  }
}

interface ProgramParticipantsProps {
  programId: string;
  programType: ProgramType;
}

export default function ProgramParticipants({
  programId,
  programType,
}: ProgramParticipantsProps) {
  const router = useRouter();
  const { canEnroll, isLearnerView, refreshEnrollments } = usePortal();
  const { showToast } = useToast();
  const isTraining = programType === "training";
  const learnerRole = isTraining ? "trainee" : "intern";
  const learnerLabel = isTraining ? "trainee" : "intern";

  useEffect(() => {
    if (isLearnerView) {
      router.replace(programRoutes(programType).detail(programId));
    }
  }, [isLearnerView, programId, programType, router]);

  const [searchQuery, setSearchQuery] = useState("");
  const [participantsList, setParticipantsList] = useState<ParticipantRow[]>(
    [],
  );
  const [candidateUsers, setCandidateUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ParticipantRow | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [setupModules, setSetupModules] = useState<SetupModule[]>([]);
  const [progressDetail, setProgressDetail] = useState<{
    row: ParticipantRow;
    module: SetupModule;
  } | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ParticipantRow;
    direction: "asc" | "desc";
  } | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [enrollments, certificates, users] = await Promise.all([
        getRowsFromDB<ProgramEnrollment>("program_enrollment"),
        getRowsFromDB<Certificate>("certificate"),
        getUsersFromDB<User>(["trainee", "intern"]),
      ]);

      const learnerIds = new Set(users.map((user) => user.id));
      const programEnrollments = enrollments.filter(
        (e) =>
          e.program_id === programId &&
          isListedParticipant(e.status, e.user_id, learnerIds),
      );
      const enrolledIds = new Set(programEnrollments.map((e) => e.user_id));

      const certSet = new Set(
        certificates
          .filter((c) => c.program_id === programId)
          .map((c) => c.participant_id),
      );

      const setup = await loadSetupModules(programId);
      const progressRows = setup.length ? await loadModuleProgress() : [];
      const enrolledUserIds = programEnrollments.map((e) => e.user_id);
      const firstSetup = setup[0];
      const setupByModule = new Map(
        setup.map((m) => [
          m.id,
          progressByUser(progressRows, m.id, m.checklist, enrolledUserIds),
        ]),
      );

      const userMap = new Map(users.map((u) => [u.id, u]));
      const rows: ParticipantRow[] = [];
      for (const enrollment of programEnrollments) {
        const u = userMap.get(enrollment.user_id);
        if (!u) continue;
        rows.push({
          enrollmentId: enrollment.id,
          id: u.id,
          name: u.name,
          email: u.email,
          institution: u.institution ?? null,
          has_certificate: certSet.has(u.id),
          status: enrollment.status,
          setup: Object.fromEntries(
            setup.flatMap((m) => {
              const summary = setupByModule.get(m.id)?.get(u.id);
              return summary ? [[m.id, summary] as const] : [];
            }),
          ),
          setup_done: firstSetup
            ? (setupByModule.get(firstSetup.id)?.get(u.id)?.done ?? 0)
            : null,
        });
      }

      setSetupModules(setup);
      setParticipantsList(rows);
      setCandidateUsers(
        users.filter(
          (u) => u.role === learnerRole && !enrolledIds.has(u.id),
        ),
      );
    } catch (error) {
      console.error("Failed to load participants:", error);
      setLoadError("Failed to load participants. Please refresh the page.");
    }
  }, [learnerRole, programId]);

  useEffect(() => {
    if (isLearnerView) return;
    load();
  }, [isLearnerView, load]);

  const handleEnroll = async () => {
    if (!selectedUserId || !canEnroll) return;
    setIsEnrolling(true);
    try {
      const authUser = await getCurrentUser();
      const newId = crypto.randomUUID();
      await saveDataToDB("program_enrollment", newId, {
        id: newId,
        program_id: programId,
        user_id: selectedUserId,
        status: "enrolled",
        enrolled_by: authUser?.id ?? null,
      });
      setSelectedUserId("");
      showToast(`${learnerLabel} enrolled.`, "success");
      await Promise.all([load(), refreshEnrollments()]);
    } catch (error) {
      console.error("Failed to enroll participant:", error);
      showToast(`Failed to enroll ${learnerLabel}.`, "error");
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!removeTarget || !canEnroll) return;
    setIsRemoving(true);
    try {
      await deleteDataFromDB("program_enrollment", removeTarget.enrollmentId);
      showToast(`${learnerLabel} removed from program.`, "success");
      setRemoveTarget(null);
      await Promise.all([load(), refreshEnrollments()]);
    } catch (error) {
      console.error("Failed to remove enrollment:", error);
      showToast(`Failed to remove ${learnerLabel}.`, "error");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleSort = (key: keyof ParticipantRow) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...participantsList];
    const q = searchQuery.toLowerCase().trim();

    if (q) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.institution ?? "").toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q),
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (typeof valA === "string" && typeof valB === "string") {
          const stringA = valA.toLowerCase();
          const stringB = valB.toLowerCase();
          if (stringA < stringB) return sortConfig.direction === "asc" ? -1 : 1;
          if (stringA > stringB) return sortConfig.direction === "asc" ? 1 : -1;
        } else if (valA != null && valB != null) {
          if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
          if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [participantsList, searchQuery, sortConfig]);

  const columns: Column<ParticipantRow>[] = [
    {
      key: "name",
      label: isTraining ? "Enrolled Trainee" : "Enrolled Intern",
      sortable: true,
      render: (p) => (
        <div className="flex flex-col gap-0.5 py-1">
          <span className="font-bold text-slate-900 leading-snug">{p.name}</span>
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
            <Mail className="w-3 h-3" /> {p.email}
          </span>
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
            <School className="w-3.5 h-3.5 text-slate-400" />{" "}
            {p.institution ?? "—"}
          </span>
        </div>
      ),
    },
    ...setupModules.map(
      (m, index): Column<ParticipantRow> => ({
        key: index === 0 ? "setup_done" : `setup:${m.id}`,
        label: progressColumnLabel(m, setupModules.length === 1),
        width: "14%",
        sortable: index === 0,
        render: (p) => {
          const summary = p.setup[m.id];
          if (!summary) return <span className="text-slate-400">—</span>;
          const isQuiz = m.checklistKind === "quiz";
          const submitted = isQuiz && quizIsSubmitted(summary.items);
          const complete = summary.done === summary.total && (!isQuiz || submitted);
          const started = isQuiz ? submitted : summary.done > 0;
          return (
            <button
              type="button"
              onClick={() => setProgressDetail({ row: p, module: m })}
              title={
                isQuiz
                  ? `${m.title}: ${submitted ? "view score and answers" : "not submitted"}`
                  : `${m.title}: view steps and pasted output`
              }
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold font-mono transition-colors ${
                complete
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                  : started
                    ? isQuiz
                      ? "bg-[#e7f3f6] text-[#1f5f79] border-[#c5e0e8] hover:bg-[#d7ebf1]"
                      : "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100"
                    : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {isQuiz && !submitted ? "—" : `${summary.done} / ${summary.total}`}
            </button>
          );
        },
      }),
    ),
  ];

  // Certificates are not issued from the training dashboard yet.
  if (!isTraining) {
    columns.push({
      key: "has_certificate",
      label: "Certificate",
      width: "18%",
      sortable: true,
      render: (p) =>
        p.has_certificate ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-bold uppercase tracking-wider font-quicksand">
            <CheckCircle2 className="w-3 h-3" /> Issued
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-400 border border-slate-200 rounded-full text-[10px] font-bold uppercase tracking-wider font-quicksand">
            <XCircle className="w-3 h-3" /> Pending
          </span>
        ),
    });
  }

  if (canEnroll) {
    columns.push({
      key: "enrollmentId",
      label: "",
      width: "12%",
      sortable: false,
      render: (p) => (
        <button
          type="button"
          onClick={() => setRemoveTarget(p)}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-600 hover:text-rose-700"
          aria-label={`Remove ${p.name}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Remove
        </button>
      ),
    });
  }

  if (isLearnerView) {
    return null;
  }

  return (
    <div className="font-aileron bg-surface border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#2a7797]" />
          <div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">
              {isTraining ? "Training" : "Internship"} Participants
            </h3>
            <p className="text-[11px] font-semibold text-slate-400">
              Enrollments are the source of truth for who can access this
              program.
              {!isTraining && " Certificates appear once issued."}
              {setupModules.length > 0 && progressHint(setupModules)}
            </p>
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${learnerLabel}s...`}
            aria-label="Search participants"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 bg-white border border-gray-200 rounded-full text-xs outline-none focus:ring-2 focus:ring-[#2a7797]/30 transition-all shadow-sm"
          />
        </div>
      </div>

      {canEnroll && (
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
          <label className="flex-1 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400 font-quicksand">
              Add {learnerLabel}
            </span>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#2a7797]/30"
            >
              <option value="">Select a {learnerLabel}…</option>
              {candidateUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!selectedUserId || isEnrolling}
            onClick={handleEnroll}
            className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-full bg-[#2a7797] hover:bg-[#1f5f79] disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            {isEnrolling ? "Enrolling…" : "Enroll"}
          </button>
        </div>
      )}

      {loadError ? (
        <p className="text-sm text-rose-600 font-semibold">{loadError}</p>
      ) : (
        <div className="w-full overflow-x-auto [&&_table]:table-fixed [&&_table]:min-w-[800px]">
          <DataTable
            columns={columns}
            data={filteredAndSorted}
            sortConfig={sortConfig}
            onSort={handleSort}
            emptyMessage={`No ${learnerLabel}s enrolled in this program yet.`}
          />
        </div>
      )}

      <ModuleProgressModal
        isOpen={!!progressDetail}
        participantName={progressDetail?.row.name ?? ""}
        moduleTitle={progressDetail?.module.title ?? ""}
        summary={
          progressDetail
            ? (progressDetail.row.setup[progressDetail.module.id] ?? null)
            : null
        }
        kind={progressDetail?.module.checklistKind ?? "steps"}
        onClose={() => setProgressDetail(null)}
      />

      <ConfirmModal
        isOpen={!!removeTarget}
        title={`Remove ${learnerLabel}`}
        message={
          <>
            Remove <strong>{removeTarget?.name}</strong> from this program?
            They will lose access to the course content.
          </>
        }
        confirmLabel="Remove"
        isConfirming={isRemoving}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemoveConfirm}
      />
    </div>
  );
}
