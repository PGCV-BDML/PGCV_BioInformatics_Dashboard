"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Lock,
  Search,
  Undo2,
  UserCog,
} from "lucide-react";
import ConfirmModal from "@/app/components/confirm-modal";
import DataTable, { type Column } from "@/app/components/datatable";
import { useToast } from "@/app/components/toast";
import {
  ROLE_OPTIONS,
  enrollablePrograms,
  roleChangeErrorMessage,
  roleChangeImpact,
  roleLockReason,
  updateUserRole,
  userRoleLabel,
} from "@/lib/access-requests";
import { isLearnerRole } from "@/lib/portal";
import { saveDataToDB } from "@/lib/supabase";
import type {
  ProgramEnrollment,
  TrainingProgram,
  User,
  UserRole,
} from "@/types/database";

export type RoleTableUser = Pick<
  User,
  "id" | "name" | "email" | "role" | "created_at" | "in_team_directory"
>;

type RoleFilter = UserRole | "all";
type SortKey = "name" | "role" | "created_at";

const ROLE_DOT: Record<UserRole, string> = {
  team_lead: "bg-[#2a7797]",
  team_member: "bg-[#4ec2bb]",
  reviewing_officer: "bg-[#92298d]",
  approving_officer: "bg-[#282560]",
  intern: "bg-[#6bb155]",
  trainee: "bg-[#fcb016]",
  none: "bg-slate-400",
};

/** Staff first, then officers, learners, and people still waiting. */
const ROLE_SORT_ORDER: UserRole[] = [
  "team_lead",
  "team_member",
  "reviewing_officer",
  "approving_officer",
  "intern",
  "trainee",
  "none",
];

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

function formatJoined(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface UserRolesTableProps {
  users: RoleTableUser[];
  programs: TrainingProgram[];
  enrollmentsByUser: Record<string, ProgramEnrollment[]>;
  currentUserId: string | null;
  onRoleChanged: (userId: string, role: UserRole) => void;
  onEnrolled: (enrollment: ProgramEnrollment) => void;
  /** Someone else changed a role first; reload everything. */
  onStale: () => void;
}

export default function UserRolesTable({
  users,
  programs,
  enrollmentsByUser,
  currentUserId,
  onRoleChanged,
  onEnrolled,
  onStale,
}: UserRolesTableProps) {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  }>({ key: "name", direction: "asc" });
  const [drafts, setDrafts] = useState<Record<string, UserRole>>({});
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null);
  const [enrollProgramId, setEnrollProgramId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const teamLeadCount = users.filter((user) => user.role === "team_lead").length;

  const roleCounts = useMemo(() => {
    const counts = {} as Record<UserRole, number>;
    for (const option of ROLE_OPTIONS) counts[option.value] = 0;
    for (const user of users) counts[user.role] += 1;
    return counts;
  }, [users]);

  const activeEnrollmentCount = (userId: string) =>
    (enrollmentsByUser[userId] ?? []).filter((row) => row.status === "enrolled")
      .length;

  const rows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (!query) return true;
      return (
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    });
    const direction = sortConfig.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let result = 0;
      if (sortConfig.key === "role") {
        result =
          ROLE_SORT_ORDER.indexOf(a.role) - ROLE_SORT_ORDER.indexOf(b.role);
      } else if (sortConfig.key === "created_at") {
        result = a.created_at.localeCompare(b.created_at);
      }
      if (result === 0) result = a.name.localeCompare(b.name);
      return result * direction;
    });
  }, [users, roleFilter, searchQuery, sortConfig]);

  const handleSort = (key: keyof RoleTableUser) => {
    if (key !== "name" && key !== "role" && key !== "created_at") return;
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const setDraft = (user: RoleTableUser, role: UserRole) => {
    setDrafts((prev) => {
      const next = { ...prev };
      if (role === user.role) delete next[user.id];
      else next[user.id] = role;
      return next;
    });
  };

  const clearDraft = (userId: string) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const confirmUser = users.find((user) => user.id === confirmUserId) ?? null;
  const confirmRole = confirmUser ? drafts[confirmUser.id] : undefined;
  const confirmPrograms =
    confirmUser && confirmRole
      ? enrollablePrograms(programs, confirmRole).filter(
          (program) =>
            !(enrollmentsByUser[confirmUser.id] ?? []).some(
              (row) => row.program_id === program.id,
            ),
        )
      : [];

  const openConfirm = (userId: string) => {
    setEnrollProgramId("");
    setConfirmUserId(userId);
  };

  const handleConfirm = async () => {
    if (!confirmUser || !confirmRole) return;
    const user = confirmUser;
    const role = confirmRole;
    setIsSaving(true);

    let updated: boolean;
    try {
      updated = await updateUserRole(user.id, user.role, role);
    } catch (error) {
      console.error("Failed to change role:", error);
      showToast(roleChangeErrorMessage(error), "error");
      setIsSaving(false);
      return;
    }

    if (!updated) {
      clearDraft(user.id);
      setConfirmUserId(null);
      setIsSaving(false);
      showToast(
        `${user.name}'s role was already changed by someone else. The list has been refreshed.`,
        "error",
      );
      onStale();
      return;
    }

    onRoleChanged(user.id, role);
    clearDraft(user.id);

    let enrollFailed = false;
    if (enrollProgramId && isLearnerRole(role)) {
      const enrollment: ProgramEnrollment = {
        id: crypto.randomUUID(),
        program_id: enrollProgramId,
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
        console.error("Failed to enroll user:", error);
        enrollFailed = true;
      }
    }

    setConfirmUserId(null);
    setIsSaving(false);
    if (enrollFailed) {
      showToast(
        `${user.name}'s role is now ${userRoleLabel(role)}, but enrollment failed. Enroll them from the program's Participants page.`,
        "error",
      );
    } else if (role === "none") {
      showToast(
        `${user.name} no longer has access and is back in Pending.`,
        "success",
      );
    } else {
      showToast(
        `${user.name}'s role is now ${userRoleLabel(role)}.`,
        "success",
      );
    }
  };

  const renderRoleControl = (user: RoleTableUser, compact: boolean) => {
    const draft = drafts[user.id];
    const shown = draft ?? user.role;
    const lockReason = roleLockReason(user, currentUserId, teamLeadCount);
    return (
      <div className="flex flex-col gap-1 min-w-0">
        <div className="relative flex items-center">
          <span
            aria-hidden
            className={`pointer-events-none absolute left-3 h-2 w-2 rounded-full ${ROLE_DOT[shown]}`}
          />
          <select
            value={shown}
            disabled={lockReason !== null || isSaving}
            aria-label={`Role for ${user.name}`}
            onChange={(event) =>
              setDraft(user, event.target.value as UserRole)
            }
            className={`h-9 ${
              compact ? "w-full" : "w-[190px]"
            } rounded-xl border bg-white pl-7 pr-3 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#2a7797]/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
              draft ? "border-[#7fb6ca]" : "border-slate-200"
            }`}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {draft ? (
          <span className="text-[11px] font-semibold text-[#2a7797]">
            <s className="font-medium text-slate-400">
              {userRoleLabel(user.role)}
            </s>{" "}
            → {userRoleLabel(draft)}
          </span>
        ) : lockReason ? (
          <span className="flex items-center gap-1 text-[11px] text-slate-500">
            <Lock className="h-3 w-3 shrink-0" />
            {lockReason}
          </span>
        ) : user.role === "none" ? (
          <span className="w-fit rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 font-quicksand">
            Waiting in Pending
          </span>
        ) : null}
      </div>
    );
  };

  const renderActions = (user: RoleTableUser) => {
    if (!drafts[user.id]) return null;
    return (
      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => clearDraft(user.id)}
          disabled={isSaving}
          aria-label={`Undo role change for ${user.name}`}
          className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
        >
          <Undo2 className="h-3.5 w-3.5" />
          Undo
        </button>
        <button
          type="button"
          onClick={() => openConfirm(user.id)}
          disabled={isSaving}
          aria-label={`Save role for ${user.name}`}
          className="inline-flex h-8 items-center gap-1 rounded-full bg-[#2a7797] px-3.5 text-xs font-bold text-white shadow-md hover:bg-[#1c5c59] disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          Save
        </button>
      </div>
    );
  };

  const renderWho = (user: RoleTableUser) => (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2a7797]/10 text-[11px] font-extrabold text-[#2a7797]">
        {initials(user.name)}
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[13px] font-bold text-slate-900">
          <span className="truncate">{user.name}</span>
          {user.id === currentUserId && (
            <span className="shrink-0 rounded-md bg-[#dceaf0] px-1.5 text-[9px] font-bold uppercase tracking-wider text-[#2a7797] font-quicksand">
              You
            </span>
          )}
        </p>
        <p className="truncate text-[11px] text-slate-500">{user.email}</p>
      </div>
    </div>
  );

  /** "2 programs", or null for non-learners with no enrollments. */
  const programsText = (user: RoleTableUser): string | null => {
    const count = activeEnrollmentCount(user.id);
    if (count === 0 && !isLearnerRole(user.role)) return null;
    return `${count} ${count === 1 ? "program" : "programs"}`;
  };

  const renderPrograms = (user: RoleTableUser) => {
    const text = programsText(user);
    return text ? (
      <span className="tabular-nums">{text}</span>
    ) : (
      <span className="text-slate-400">—</span>
    );
  };

  const columns: Column<RoleTableUser>[] = [
    {
      key: "name",
      label: "User",
      width: "28%",
      sortable: true,
      render: renderWho,
    },
    {
      key: "role",
      label: "Role",
      width: "28%",
      sortable: true,
      render: (user) => renderRoleControl(user, false),
    },
    {
      key: "programs",
      label: "Programs",
      width: "12%",
      render: renderPrograms,
    },
    {
      key: "created_at",
      label: "Joined",
      width: "14%",
      sortable: true,
      render: (user) => (
        <span className="tabular-nums">{formatJoined(user.created_at)}</span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      shortLabel: "",
      width: "18%",
      render: renderActions,
    },
  ];

  const filterOptions: { value: RoleFilter; label: string; count: number }[] = [
    { value: "all", label: "All", count: users.length },
    ...ROLE_SORT_ORDER.map((role) => ({
      value: role,
      label: userRoleLabel(role),
      count: roleCounts[role],
    })).filter(
      (option) => option.count > 0 || option.value === roleFilter,
    ),
  ];

  const isRemoving = confirmRole === "none";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search name or email"
            aria-label="Search users"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-9 w-full rounded-full border border-gray-200 bg-white pl-9 pr-4 text-xs outline-none shadow-sm transition-all focus:ring-2 focus:ring-[#2a7797]/30"
          />
        </div>
        <div
          className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible lg:pb-0"
          role="group"
          aria-label="Filter by role"
        >
          {filterOptions.map((option) => {
            const active = roleFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => setRoleFilter(option.value)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider font-quicksand ${
                  active
                    ? "border-[#9ccbdc] bg-white text-[#2a7797] ring-2 ring-[#2a7797]/20"
                    : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-white"
                }`}
              >
                {option.label}
                <span className="tabular-nums opacity-70">{option.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden sm:block">
        <DataTable
          columns={columns}
          data={rows}
          sortConfig={sortConfig}
          onSort={handleSort}
          emptyMessage="No users match this search."
          rowClassName={(user) =>
            drafts[user.id] ? "bg-[#eef7fa] hover:bg-[#e4f1f6]" : undefined
          }
        />
      </div>

      <ul className="grid gap-3 sm:hidden">
        {rows.map((user) => (
          <li
            key={user.id}
            className={`grid gap-3 rounded-2xl border p-3 ${
              drafts[user.id]
                ? "border-[#8cc0d3] bg-[#eef7fa]"
                : "border-slate-200 bg-surface"
            }`}
          >
            {renderWho(user)}
            {renderRoleControl(user, true)}
            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
              <span className="tabular-nums">
                {[programsText(user), `Joined ${formatJoined(user.created_at)}`]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              {renderActions(user)}
            </div>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="py-10 text-center text-sm font-medium text-gray-400">
            No users match this search.
          </li>
        )}
      </ul>

      <p className="text-[11px] text-slate-400">
        Showing {rows.length} of {users.length} users. Role changes are
        recorded in the audit log.
      </p>

      <ConfirmModal
        isOpen={confirmUser !== null && confirmRole !== undefined}
        title={isRemoving ? "Remove access" : "Change role"}
        tone={isRemoving ? "danger" : "default"}
        icon={isRemoving ? AlertTriangle : UserCog}
        message={
          confirmUser && confirmRole ? (
            <div className="space-y-3">
              <p>
                {isRemoving ? "Remove " : "Change "}
                <strong className="text-slate-700">{confirmUser.name}</strong>
                {isRemoving ? "'s access?" : "'s role?"}
              </p>
              <p className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
                <RolePill role={confirmUser.role} />
                <span className="text-slate-400">→</span>
                <RolePill role={confirmRole} />
              </p>
              <ul
                className={`list-disc space-y-1 rounded-2xl border py-3 pl-8 pr-4 text-[13px] text-slate-600 ${
                  isRemoving
                    ? "border-rose-200 bg-rose-50"
                    : "border-slate-100 bg-slate-50"
                }`}
              >
                {roleChangeImpact({
                  from: confirmUser.role,
                  to: confirmRole,
                  enrollmentCount: activeEnrollmentCount(confirmUser.id),
                  inTeamDirectory: confirmUser.in_team_directory,
                }).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {confirmPrograms.length > 0 && (
                <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Enroll in
                  <select
                    value={enrollProgramId}
                    onChange={(event) => setEnrollProgramId(event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-700"
                  >
                    <option value="">Enroll later</option>
                    {confirmPrograms.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          ) : null
        }
        confirmLabel={isRemoving ? "Remove access" : "Change role"}
        isConfirming={isSaving}
        onClose={() => {
          if (!isSaving) setConfirmUserId(null);
        }}
        onConfirm={() => void handleConfirm()}
      />
    </div>
  );
}

function RolePill({ role }: { role: UserRole }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1">
      <span className={`h-1.5 w-1.5 rounded-full ${ROLE_DOT[role]}`} />
      {userRoleLabel(role)}
    </span>
  );
}
