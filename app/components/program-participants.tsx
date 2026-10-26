"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import ModuleProgressStrip, {
  ModuleProgressPill,
  type ProgressModule,
} from "@/app/components/module-progress-strip";
import ParticipantProgressDrawer from "@/app/components/participant-progress-drawer";
import { usePortal } from "@/app/components/portal-context";
import { useToast } from "@/app/components/toast";
import { moduleIdFromModuleLink } from "@/lib/module-library";
import { fetchModuleCatalog } from "@/lib/module-library-client";
import {
  checklistKindForModule,
  moduleIsFinished,
  moduleStatus,
  overallProgress,
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
  /** Modules finished, for sorting the Progress column. */
  overall_done: number;
  /** Steps done (or test score) in the focused module, for sorting. -1 when not submitted. */
  focus_done: number;
}

/** A module in this program whose modules.json entry has a `checklist`. */
type SetupModule = ProgressModule & {
  checklist: ChecklistItem[];
};

type StatusFilter = "all" | "not_started" | "in_progress" | "finished";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "finished", label: "Finished" },
];

const MODULE_PARAM = "module";

function moduleLabel(id: string, title: string, kind: ChecklistKind): string {
  if (kind === "quiz") {
    if (id.endsWith("pre-test")) return "Pre-test";
    if (id.endsWith("post-test")) return "Post-test";
  }
  return title;
}

/** Bucket a learner for the status filter, by one module or across all of them. */
function rowStatus(row: ParticipantRow, modules: SetupModule[]): StatusFilter {
  const [only] = modules;
  if (modules.length === 1 && only) {
    const status = moduleStatus(row.setup[only.id], only.checklistKind);
    if (moduleIsFinished(status)) return "finished";
    return status === "in_progress" ? "in_progress" : "not_started";
  }
  const { finished, started, total } = overallProgress(row.setup, modules);
  if (total > 0 && finished === total) return "finished";
  return finished + started > 0 ? "in_progress" : "not_started";
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
      .map((item) => {
        const checklistKind = checklistKindForModule(item.id, item.checklistKind);
        return {
          id: item.id,
          title: item.title,
          label: moduleLabel(item.id, item.title, checklistKind),
          checklist: item.checklist ?? [],
          checklistKind,
        };
      });
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

function chipClass(active: boolean): string {
  return `inline-flex items-center gap-2 h-8 px-3 rounded-full border text-[11px] font-bold transition-colors ${
    active
      ? "bg-[#2a7797] border-[#2a7797] text-white"
      : "bg-white border-slate-200 text-slate-600 hover:border-[#2a7797]/50 hover:text-[#2a7797]"
  }`;
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
    module: ProgressModule;
  } | null>(null);
  const [drawerRow, setDrawerRow] = useState<ParticipantRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  // The focused module lives in ?module= so a link opens straight to it.
  const focusedModuleId = useSearchParams().get(MODULE_PARAM);

  const focusModule = (id: string | null) => {
    setSortConfig((current) =>
      current?.key === "focus_done" ? null : current,
    );
    const url = new URL(window.location.href);
    if (id) url.searchParams.set(MODULE_PARAM, id);
    else url.searchParams.delete(MODULE_PARAM);
    window.history.replaceState(null, "", url);
  };
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
        const userSetup: Record<string, ProgressSummary> = Object.fromEntries(
          setup.flatMap((m) => {
            const summary = setupByModule.get(m.id)?.get(u.id);
            return summary ? [[m.id, summary] as const] : [];
          }),
        );
        rows.push({
          enrollmentId: enrollment.id,
          id: u.id,
          name: u.name,
          email: u.email,
          institution: u.institution ?? null,
          has_certificate: certSet.has(u.id),
          status: enrollment.status,
          setup: userSetup,
          overall_done: overallProgress(userSetup, setup).finished,
          focus_done: 0,
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

  const closeDrawer = useCallback(() => setDrawerRow(null), []);

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

  const focusedModule =
    setupModules.find((m) => m.id === focusedModuleId) ?? null;

  /** Learners who finished each module, for the chips above the table. */
  const finishedByModule = useMemo(
    () =>
      new Map(
        setupModules.map((m) => [
          m.id,
          participantsList.filter((p) =>
            moduleIsFinished(moduleStatus(p.setup[m.id], m.checklistKind)),
          ).length,
        ]),
      ),
    [participantsList, setupModules],
  );

  const filteredAndSorted = useMemo(() => {
    let result = participantsList.map((p) => {
      if (!focusedModule) return p;
      const summary = p.setup[focusedModule.id];
      const unsubmitted =
        moduleStatus(summary, focusedModule.checklistKind) === "not_started" &&
        focusedModule.checklistKind === "quiz";
      return { ...p, focus_done: unsubmitted ? -1 : (summary?.done ?? 0) };
    });
    const q = searchQuery.toLowerCase().trim();

    if (statusFilter !== "all") {
      const scope = focusedModule ? [focusedModule] : setupModules;
      result = result.filter((p) => rowStatus(p, scope) === statusFilter);
    }

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
  }, [focusedModule, participantsList, searchQuery, setupModules, sortConfig, statusFilter]);

  const columns: Column<ParticipantRow>[] = [
    {
      key: "name",
      label: isTraining ? "Enrolled Trainee" : "Enrolled Intern",
      sortable: true,
      render: (p) => (
        <div className="flex flex-col gap-0.5 py-1">
          {setupModules.length > 0 ? (
            <button
              type="button"
              onClick={() => setDrawerRow(p)}
              title={`View ${p.name}'s progress in every module`}
              className="self-start text-left font-bold text-slate-900 leading-snug hover:text-[#2a7797] hover:underline"
            >
              {p.name}
            </button>
          ) : (
            <span className="font-bold text-slate-900 leading-snug">{p.name}</span>
          )}
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
  ];

  if (setupModules.length > 0) {
    columns.push({
      key: "overall_done",
      label: "Progress",
      width: "24%",
      sortable: true,
      render: (p) => (
        <div className="flex flex-col gap-1.5 py-1">
          <ModuleProgressStrip
            modules={setupModules}
            setup={p.setup}
            participantName={p.name}
            onSelect={(module) => setProgressDetail({ row: p, module })}
          />
          <span className="text-[11px] font-semibold text-slate-500">
            {p.overall_done} of {setupModules.length} modules
          </span>
        </div>
      ),
    });
  }

  if (focusedModule) {
    columns.push({
      key: "focus_done",
      label: focusedModule.label,
      width: "14%",
      sortable: true,
      render: (p) => (
        <ModuleProgressPill
          module={focusedModule}
          summary={p.setup[focusedModule.id]}
          onClick={() => setProgressDetail({ row: p, module: focusedModule })}
        />
      ),
    });
  }

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

      {setupModules.length > 0 && (
        <div className="space-y-3">
          <div
            role="group"
            aria-label="Focus on a module"
            className="flex flex-wrap gap-2"
          >
            <button
              type="button"
              aria-pressed={!focusedModule}
              onClick={() => focusModule(null)}
              className={chipClass(!focusedModule)}
            >
              All modules
            </button>
            {setupModules.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={focusedModule?.id === m.id}
                title={`${m.title}: ${finishedByModule.get(m.id) ?? 0} of ${participantsList.length} finished`}
                onClick={() =>
                  focusModule(focusedModule?.id === m.id ? null : m.id)
                }
                className={chipClass(focusedModule?.id === m.id)}
              >
                <span className="truncate max-w-[180px]">{m.label}</span>
                <span className="font-mono opacity-70">
                  {finishedByModule.get(m.id) ?? 0}/{participantsList.length}
                </span>
              </button>
            ))}
          </div>
          <div
            role="group"
            aria-label="Filter by status"
            className="flex flex-wrap items-center gap-1.5"
          >
            <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400 font-quicksand mr-1">
              {focusedModule ? focusedModule.label : "Status"}
            </span>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={statusFilter === f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`h-7 px-3 rounded-full text-[11px] font-bold transition-colors ${
                  statusFilter === f.value
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
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

      <ParticipantProgressDrawer
        isOpen={!!drawerRow}
        participantName={drawerRow?.name ?? ""}
        email={drawerRow?.email ?? ""}
        modules={setupModules}
        setup={drawerRow?.setup ?? {}}
        onSelectModule={(module) =>
          drawerRow && setProgressDetail({ row: drawerRow, module })
        }
        onClose={closeDrawer}
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
