"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, UserCheck, UserPlus } from "lucide-react";
import ConfirmModal from "@/app/components/confirm-modal";
import { PageHeader } from "@/app/components/pageheader";
import { usePortal } from "@/app/components/portal-context";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/app/components/state-views";
import { useToast } from "@/app/components/toast";
import UserRolesTable, {
  type RoleTableUser,
} from "@/app/components/user-roles-table";
import {
  ASSIGNABLE_ROLE_OPTIONS,
  enrollablePrograms,
  roleChangeErrorMessage,
  updateUserRole,
  userRoleLabel,
  type AssignableRole,
} from "@/lib/access-requests";
import { accessRequestsBreadcrumbs } from "@/lib/breadcrumbs";
import { ALL_USER_ROLES } from "@/lib/portal";
import { routes } from "@/lib/routes";
import { getRowsFromDB, getUsersFromDB, saveDataToDB } from "@/lib/supabase";
import type {
  ProgramEnrollment,
  TrainingProgram,
  UserRole,
} from "@/types/database";

type Tab = "pending" | "users";

type Draft = { role: AssignableRole; programId: string };

const DEFAULT_DRAFT: Draft = { role: "trainee", programId: "" };

function formatSignedIn(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function groupByUser(
  rows: ProgramEnrollment[],
): Record<string, ProgramEnrollment[]> {
  const grouped: Record<string, ProgramEnrollment[]> = {};
  for (const row of rows) {
    (grouped[row.user_id] ??= []).push(row);
  }
  return grouped;
}

export default function AccessRequestsPage() {
  const { realRole, profile, loading: portalLoading } = usePortal();
  const isTeamLead = realRole === "team_lead";

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto pb-16 px-4 font-aileron">
      <PageHeader
        breadcrumbTrail={accessRequestsBreadcrumbs}
        title="Users & Access"
        subtitle="Assign roles to new sign-ins and change anyone's role"
      />
      {portalLoading ? (
        <LoadingState message="Loading users…" />
      ) : !isTeamLead ? (
        <EmptyState
          icon={Lock}
          title="Team leads only"
          description="Only team leads can assign or change roles."
        />
      ) : (
        <Suspense fallback={<LoadingState message="Loading users…" />}>
          <UsersAndAccess currentUserId={profile?.id ?? null} />
        </Suspense>
      )}
    </div>
  );
}

function UsersAndAccess({ currentUserId }: { currentUserId: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: Tab = searchParams.get("tab") === "users" ? "users" : "pending";

  const [users, setUsers] = useState<RoleTableUser[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [enrollments, setEnrollments] = useState<ProgramEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [userRows, programRows, enrollmentRows] = await Promise.all([
        getUsersFromDB<RoleTableUser>(ALL_USER_ROLES),
        getRowsFromDB<TrainingProgram>("training_program"),
        getRowsFromDB<ProgramEnrollment>("program_enrollment"),
      ]);
      setUsers(userRows);
      setPrograms(programRows);
      setEnrollments(enrollmentRows);
    } catch (error) {
      console.error("Failed to load users:", error);
      setLoadError("Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectTab = (next: Tab) => {
    router.replace(
      next === "users" ? `${routes.accessRequests}?tab=users` : routes.accessRequests,
      { scroll: false },
    );
  };

  const setUserRole = (userId: string, role: UserRole) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === userId ? { ...user, role } : user)),
    );
  };

  const addEnrollment = (enrollment: ProgramEnrollment) => {
    setEnrollments((prev) => [...prev, enrollment]);
  };

  const pendingUsers = users
    .filter((user) => user.role === "none")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "pending", label: "Pending", count: pendingUsers.length },
    { id: "users", label: "All users", count: users.length },
  ];

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Users and access"
        className="flex gap-1 border-b border-slate-200"
      >
        {tabs.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`access-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`access-panel-${item.id}`}
              onClick={() => selectTab(item.id)}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3.5 pb-3 pt-2 text-sm font-bold transition-colors ${
                selected
                  ? "border-[#2a7797] text-[#2a7797]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {item.label}
              {!isLoading && (
                <span
                  className={`rounded-full px-2 py-px text-[11px] font-extrabold tabular-nums ${
                    item.id === "pending" && item.count > 0
                      ? "bg-amber-100 text-amber-800"
                      : selected
                        ? "bg-[#dceaf0] text-[#2a7797]"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`access-panel-${tab}`}
        aria-labelledby={`access-tab-${tab}`}
      >
        {isLoading ? (
          <LoadingState message="Loading users…" />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={() => void load()} />
        ) : tab === "pending" ? (
          <PendingRequests
            pendingUsers={pendingUsers}
            programs={programs}
            currentUserId={currentUserId}
            onAssigned={setUserRole}
            onEnrolled={addEnrollment}
            onStale={() => void load()}
          />
        ) : (
          <UserRolesTable
            users={users}
            programs={programs}
            enrollmentsByUser={groupByUser(enrollments)}
            currentUserId={currentUserId}
            onRoleChanged={setUserRole}
            onEnrolled={addEnrollment}
            onStale={() => void load()}
          />
        )}
      </div>
    </div>
  );
}

function PendingRequests({
  pendingUsers,
  programs,
  currentUserId,
  onAssigned,
  onEnrolled,
  onStale,
}: {
  pendingUsers: RoleTableUser[];
  programs: TrainingProgram[];
  currentUserId: string | null;
  onAssigned: (userId: string, role: UserRole) => void;
  onEnrolled: (enrollment: ProgramEnrollment) => void;
  onStale: () => void;
}) {
  const { showToast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [confirmUser, setConfirmUser] = useState<RoleTableUser | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const draftFor = (userId: string) => drafts[userId] ?? DEFAULT_DRAFT;

  const updateDraft = (userId: string, patch: Partial<Draft>) => {
    setDrafts((prev) => {
      const next = { ...(prev[userId] ?? DEFAULT_DRAFT), ...patch };
      // A program only fits the role it was picked for.
      if (patch.role) next.programId = "";
      return { ...prev, [userId]: next };
    });
  };

  const handleAssign = async () => {
    if (!confirmUser) return;
    const user = confirmUser;
    const draft = draftFor(user.id);
    setIsAssigning(true);

    let updated: boolean;
    try {
      updated = await updateUserRole(user.id, "none", draft.role);
    } catch (error) {
      console.error("Failed to assign role:", error);
      showToast(roleChangeErrorMessage(error), "error");
      setIsAssigning(false);
      return;
    }

    if (!updated) {
      setConfirmUser(null);
      setIsAssigning(false);
      showToast(
        `${user.name} already has a role. The list has been refreshed.`,
        "error",
      );
      onStale();
      return;
    }

    let enrollFailed = false;
    if (draft.programId) {
      const enrollment: ProgramEnrollment = {
        id: crypto.randomUUID(),
        program_id: draft.programId,
        user_id: user.id,
        status: "enrolled",
        enrolled_at: new Date().toISOString(),
        enrolled_by: currentUserId,
      };
      try {
        await saveDataToDB("program_enrollment", enrollment.id, {
          program_id: enrollment.program_id,
          user_id: enrollment.user_id,
          status: enrollment.status,
          enrolled_by: enrollment.enrolled_by,
        });
        onEnrolled(enrollment);
      } catch (error) {
        console.error("Failed to enroll new user:", error);
        enrollFailed = true;
      }
    }

    onAssigned(user.id, draft.role);
    setConfirmUser(null);
    setIsAssigning(false);
    if (enrollFailed) {
      showToast(
        `${user.name} now has the ${userRoleLabel(draft.role)} role, but enrollment failed. Enroll them from the program's Participants page.`,
        "error",
      );
    } else {
      showToast(
        `${user.name} now has the ${userRoleLabel(draft.role)} role.`,
        "success",
      );
    }
  };

  if (pendingUsers.length === 0) {
    return (
      <EmptyState
        icon={UserCheck}
        title="No one is waiting"
        description="You'll get a notification when someone new signs in."
      />
    );
  }

  const confirmDraft = confirmUser ? draftFor(confirmUser.id) : null;
  const confirmProgram =
    confirmDraft?.programId &&
    programs.find((program) => program.id === confirmDraft.programId);

  return (
    <>
      <ul className="grid grid-cols-1 gap-4">
        {pendingUsers.map((user) => {
          const draft = draftFor(user.id);
          const programOptions = enrollablePrograms(programs, draft.role);
          const isLearner = draft.role === "trainee" || draft.role === "intern";
          return (
            <li
              key={user.id}
              className="rounded-[22px] border border-amber-200 bg-amber-50/40 p-5 shadow-[0_10px_24px_rgba(23,33,38,0.06)]"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <UserPlus className="h-4 w-4 text-amber-800" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-slate-900 truncate">
                      {user.name}
                    </h2>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600 break-all">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {user.email}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      First signed in {formatSignedIn(user.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Role
                    <select
                      value={draft.role}
                      onChange={(event) =>
                        updateDraft(user.id, {
                          role: event.target.value as AssignableRole,
                        })
                      }
                      className="h-10 min-w-[170px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-700"
                    >
                      {ASSIGNABLE_ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {isLearner && (
                    <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Enroll in
                      <select
                        value={draft.programId}
                        onChange={(event) =>
                          updateDraft(user.id, { programId: event.target.value })
                        }
                        className="h-10 min-w-[220px] max-w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-700"
                      >
                        <option value="">Enroll later</option>
                        {programOptions.map((program) => (
                          <option key={program.id} value={program.id}>
                            {program.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => setConfirmUser(user)}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#2a7797] px-5 text-xs font-bold text-white shadow-md transition-all hover:bg-[#1c5c59]"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Assign
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <ConfirmModal
        isOpen={confirmUser !== null}
        title="Assign role"
        icon={UserCheck}
        message={
          confirmUser && confirmDraft ? (
            <p>
              Give <strong>{confirmUser.name}</strong> ({confirmUser.email})
              the <strong>{userRoleLabel(confirmDraft.role)}</strong> role
              {confirmProgram ? (
                <>
                  {" "}
                  and enroll them in <strong>{confirmProgram.title}</strong>
                </>
              ) : null}
              ?
            </p>
          ) : null
        }
        confirmLabel="Assign"
        isConfirming={isAssigning}
        onClose={() => {
          if (!isAssigning) setConfirmUser(null);
        }}
        onConfirm={() => void handleAssign()}
      />
    </>
  );
}
