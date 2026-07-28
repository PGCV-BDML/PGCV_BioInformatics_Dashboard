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
import { usePortal } from "@/app/components/portal-context";
import { useToast } from "@/app/components/toast";
import { programRoutes, type ProgramType } from "@/lib/routes";
import {
  deleteDataFromDB,
  getCurrentUser,
  getRowsFromDB,
  getUsersFromDB,
  saveDataToDB,
} from "@/lib/supabase";
import type {
  Assessment,
  AssessmentResponse,
  Certificate,
  ProgramEnrollment,
  User,
} from "@/types/database";

interface ParticipantRow {
  enrollmentId: string;
  id: string;
  name: string;
  email: string;
  institution: string | null;
  pre_test_score: number | null;
  post_test_score: number | null;
  has_certificate: boolean;
  status: ProgramEnrollment["status"];
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
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ParticipantRow;
    direction: "asc" | "desc";
  } | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [enrollments, assessments, responses, certificates, users] =
        await Promise.all([
          getRowsFromDB<ProgramEnrollment>("program_enrollment"),
          getRowsFromDB<Assessment>("assessment"),
          getRowsFromDB<AssessmentResponse>("assessment_response"),
          getRowsFromDB<Certificate>("certificate"),
          getUsersFromDB<User>(["trainee", "intern"]),
        ]);

      const programEnrollments = enrollments.filter(
        (e) =>
          e.program_id === programId &&
          (e.status === "enrolled" || e.status === "completed"),
      );
      const enrolledIds = new Set(programEnrollments.map((e) => e.user_id));

      const programAssessmentIds = assessments
        .filter((a) => a.program_id === programId)
        .map((a) => a.id);
      const assessmentTypeMap = new Map<string, string>();
      for (const a of assessments) {
        if (a.program_id === programId) assessmentTypeMap.set(a.id, a.type);
      }

      const scoreByUser = new Map<
        string,
        { pre: number | null; post: number | null }
      >();
      for (const r of responses) {
        if (!programAssessmentIds.includes(r.assessment_id)) continue;
        const type = assessmentTypeMap.get(r.assessment_id);
        const current = scoreByUser.get(r.participant_id) ?? {
          pre: null,
          post: null,
        };
        if (type === "pre_test") current.pre = r.score;
        if (type === "post_test") current.post = r.score;
        scoreByUser.set(r.participant_id, current);
      }

      const certSet = new Set(
        certificates
          .filter((c) => c.program_id === programId)
          .map((c) => c.participant_id),
      );

      const userMap = new Map(users.map((u) => [u.id, u]));
      const rows: ParticipantRow[] = [];
      for (const enrollment of programEnrollments) {
        const u = userMap.get(enrollment.user_id);
        if (!u) continue;
        const scores = scoreByUser.get(u.id);
        rows.push({
          enrollmentId: enrollment.id,
          id: u.id,
          name: u.name,
          email: u.email,
          institution: u.institution ?? null,
          pre_test_score: scores?.pre ?? null,
          post_test_score: scores?.post ?? null,
          has_certificate: certSet.has(u.id),
          status: enrollment.status,
        });
      }

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
      width: canEnroll ? "34%" : "40%",
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
    {
      key: "pre_test_score",
      label: "Pre-Test Score",
      width: "18%",
      sortable: true,
      render: (p) => (
        <span className="font-mono font-bold text-slate-600 block pl-1">
          {p.pre_test_score ?? "—"}
        </span>
      ),
    },
    {
      key: "post_test_score",
      label: "Post-Test Score",
      width: "18%",
      sortable: true,
      render: (p) => (
        <span className="font-mono font-bold text-[#2a7797] block pl-1">
          {p.post_test_score ?? "—"}
        </span>
      ),
    },
    {
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
    },
  ];

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
              program. Scores and certificates appear once submitted or issued.
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
