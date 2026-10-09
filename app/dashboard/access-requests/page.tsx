"use client";

import { useCallback, useEffect, useState } from "react";
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
import {
  ASSIGNABLE_ROLE_OPTIONS,
  enrollablePrograms,
  type AssignableRole,
} from "@/lib/access-requests";
import { accessRequestsBreadcrumbs } from "@/lib/breadcrumbs";
import { getRowsFromDB, getUsersFromDB, saveDataToDB } from "@/lib/supabase";
import type { TrainingProgram, User } from "@/types/database";

type PendingUser = Pick<User, "id" | "name" | "email" | "created_at">;

type Draft = { role: AssignableRole; programId: string };

const DEFAULT_DRAFT: Draft = { role: "trainee", programId: "" };

function roleLabel(role: AssignableRole): string {
  return (
    ASSIGNABLE_ROLE_OPTIONS.find((option) => option.value === role)?.label ??
    role
  );
}

function formatSignedIn(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function AccessRequestsPage() {
  const { realRole, profile, loading: portalLoading } = usePortal();
  const isTeamLead = realRole === "team_lead";

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto pb-16 px-4 font-aileron">
      <PageHeader
        breadcrumbTrail={accessRequestsBreadcrumbs}
        title="Access Requests"
        subtitle="People who signed in and are waiting for a role"
      />
      {portalLoading ? (
        <LoadingState message="Loading access requests…" />
      ) : !isTeamLead ? (
        <EmptyState
          icon={Lock}
          title="Team leads only"
          description="Only team leads can assign roles to new users."
        />
      ) : (
        <AccessRequestList currentUserId={profile?.id ?? null} />
      )}
    </div>
  );
}

function AccessRequestList({ currentUserId }: { currentUserId: string | null }) {
  const { showToast } = useToast();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<PendingUser | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [users, programRows] = await Promise.all([
        getUsersFromDB<PendingUser>(["none"]),
        getRowsFromDB<TrainingProgram>("training_program"),
      ]);
      setPendingUsers(
        [...users].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      );
      setPrograms(programRows);
    } catch (error) {
      console.error("Failed to load access requests:", error);
      setLoadError("Failed to load access requests.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
    try {
      await saveDataToDB("users", user.id, { role: draft.role });
    } catch (error) {
      console.error("Failed to assign role:", error);
      showToast("Failed to assign the role. Please try again.", "error");
      setIsAssigning(false);
      return;
    }

    let enrollFailed = false;
    if (draft.programId) {
      try {
        await saveDataToDB("program_enrollment", crypto.randomUUID(), {
          program_id: draft.programId,
          user_id: user.id,
          status: "enrolled",
          enrolled_by: currentUserId,
        });
      } catch (error) {
        console.error("Failed to enroll new user:", error);
        enrollFailed = true;
      }
    }

    setPendingUsers((prev) => prev.filter((row) => row.id !== user.id));
    setConfirmUser(null);
    setIsAssigning(false);
    if (enrollFailed) {
      showToast(
        `${user.name} now has the ${roleLabel(draft.role)} role, but enrollment failed. Enroll them from the program's Participants page.`,
        "error",
      );
    } else {
      showToast(
        `${user.name} now has the ${roleLabel(draft.role)} role.`,
        "success",
      );
    }
  };

  if (isLoading) return <LoadingState message="Loading access requests…" />;
  if (loadError) {
    return <ErrorState message={loadError} onRetry={() => void load()} />;
  }
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
        message={
          confirmUser && confirmDraft ? (
            <>
              Give <strong>{confirmUser.name}</strong> ({confirmUser.email})
              the <strong>{roleLabel(confirmDraft.role)}</strong> role
              {confirmProgram ? (
                <>
                  {" "}
                  and enroll them in <strong>{confirmProgram.title}</strong>
                </>
              ) : null}
              ?
            </>
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
