"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Inbox,
  Edit3,
  UserRound,
  Mail,
  Building2,
  UsersRound,
} from "lucide-react";
import { PageHeader } from "../../components/pageheader";
import { LoadingState, ErrorState, EmptyState } from "../../components/state-views";
import TeamPresenceModal from "../../components/team-presence-modal";
import TeamRosterModal from "../../components/team-roster-modal";
import {
  User,
  UserAbsence,
  UserPresence,
  UserPresenceAvatarChanges,
  UserPresenceFormData,
  PresenceStatus,
  PRESENCE_STATUS_OPTIONS,
  SCHEDULED_ABSENCE_STATUSES,
} from "../../../types/database";
import {
  getTeamDirectoryUsers,
  getRowsFromDB,
  upsertUserPresence,
  saveDataToDB,
  getUserAbsences,
  replaceUserAbsences,
} from "@/lib/supabase";
import {
  absenceRowsToBlocks,
  absenceSavePlan,
  maxAbsenceDate,
  presenceNoteFromAbsenceRows,
  presenceStatusForSave,
  resolveEffectivePresenceStatus,
  scheduledAbsenceStatusFromRows,
} from "@/lib/calendar-absences";
import { teamBreadcrumbs } from "@/lib/breadcrumbs";
import { useDashboardUI } from "../../components/dashboard-ui-context";
import { usePortal } from "../../components/portal-context";
import { useToast } from "../../components/toast";
import {
  removeUserAvatar,
  resolveAvatarDisplayUrl,
  uploadUserAvatar,
} from "@/lib/user-avatar";

type TeamMemberRow = User & {
  presence: UserPresence | null;
  absences: UserAbsence[];
};

const FILTER_OPTIONS: { value: PresenceStatus | "All"; label: string }[] = [
  { value: "All", label: "All" },
  ...PRESENCE_STATUS_OPTIONS,
];

const STATUS_STYLES: Record<
  PresenceStatus,
  { chip: string; dot: string }
> = {
  in_office: {
    chip: "bg-emerald-50 text-emerald-700 border-emerald-100",
    dot: "bg-emerald-500",
  },
  in_lab: {
    chip: "bg-sky-50 text-sky-700 border-sky-100",
    dot: "bg-sky-500",
  },
  remote: {
    chip: "bg-violet-50 text-violet-700 border-violet-100",
    dot: "bg-violet-500",
  },
  on_leave: {
    chip: "bg-amber-50 text-amber-700 border-amber-100",
    dot: "bg-amber-500",
  },
  on_travel: {
    chip: "bg-orange-50 text-orange-700 border-orange-100",
    dot: "bg-orange-500",
  },
  in_meeting: {
    chip: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
  unavailable: {
    chip: "bg-rose-50 text-rose-700 border-rose-100",
    dot: "bg-rose-500",
  },
};

function statusLabel(status: PresenceStatus): string {
  return (
    PRESENCE_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
  );
}

function roleLabel(role: User["role"]): string {
  if (role === "team_lead") return "Team lead";
  if (role === "team_member") return "Team member";
  if (role === "reviewing_officer") return "Reviewing officer";
  if (role === "approving_officer") return "Approving officer";
  return role;
}

function formatUntil(date: string | null | undefined): string | null {
  if (!date) return null;
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

function sortTeamMembers(rows: TeamMemberRow[]): TeamMemberRow[] {
  return [...rows].sort((a, b) => {
    if (a.role !== b.role) {
      return a.role === "team_lead" ? -1 : 1;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

function attachPresence(
  users: User[],
  presenceByUser: Map<string, UserPresence>,
  absencesByUser: Map<string, UserAbsence[]>,
): TeamMemberRow[] {
  return sortTeamMembers(
    users.map((user) => {
      const rawPresence = presenceByUser.get(user.id) ?? null;
      const absences = absencesByUser.get(user.id) ?? [];
      const effective = resolveEffectivePresenceStatus(rawPresence, absences);

      if (!rawPresence && effective.status === "in_office") {
        return { ...user, absences, presence: null };
      }

      return {
        ...user,
        absences,
        presence: {
          ...(rawPresence ?? {
            user_id: user.id,
            note: null,
            updated_by: null,
          }),
          status: effective.status,
          until_date: effective.until_date,
        },
      };
    }),
  );
}

function groupAbsencesByUser(rows: UserAbsence[]): Map<string, UserAbsence[]> {
  const map = new Map<string, UserAbsence[]>();
  for (const row of rows) {
    const list = map.get(row.user_id) ?? [];
    list.push(row);
    map.set(row.user_id, list);
  }
  return map;
}

export default function TeamPage() {
  const [directoryMembers, setDirectoryMembers] = useState<TeamMemberRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<PresenceStatus | "All">(
    "All",
  );

  const [isEditing, setIsEditing] = useState(false);
  const [isManagingRoster, setIsManagingRoster] = useState(false);
  const [selected, setSelected] = useState<TeamMemberRow | null>(null);
  const [editFormData, setEditFormData] = useState<UserPresenceFormData | null>(
    null,
  );
  const [editAvatarPreviewUrl, setEditAvatarPreviewUrl] = useState<
    string | null
  >(null);
  /** Scheduled status the modal was opened with, so we know what to clear. */
  const [editScheduledStatus, setEditScheduledStatus] =
    useState<PresenceStatus | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingRoster, setIsSavingRoster] = useState(false);
  const [isOpeningEdit, setIsOpeningEdit] = useState(false);

  const { toggleSidebar } = useDashboardUI();
  const { profile, realRole } = usePortal();
  const { showToast } = useToast();

  const currentUserId = profile?.id ?? null;
  const isTeamLead = realRole === "team_lead";

  const reloadDirectoryMembers = useCallback(async () => {
    const [directoryUsers, presenceRows, absenceRows] = await Promise.all([
      getTeamDirectoryUsers<User>(),
      getRowsFromDB<UserPresence>("user_presence"),
      getRowsFromDB<UserAbsence>("user_absence"),
    ]);
    const presenceByUser = new Map(
      presenceRows.map((row) => [row.user_id, row]),
    );
    setDirectoryMembers(
      attachPresence(directoryUsers, presenceByUser, groupAbsencesByUser(absenceRows)),
    );
  }, []);

  useEffect(() => {
    toggleSidebar(isEditing || isManagingRoster);
  }, [isEditing, isManagingRoster, toggleSidebar]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [presenceRows, absenceRows] = await Promise.all([
          getRowsFromDB<UserPresence>("user_presence"),
          getRowsFromDB<UserAbsence>("user_absence"),
        ]);
        if (cancelled) return;

        const presenceByUser = new Map(
          presenceRows.map((row) => [row.user_id, row]),
        );

        const directoryUsers = await getTeamDirectoryUsers<User>();
        if (cancelled) return;
        setDirectoryMembers(
          attachPresence(
            directoryUsers,
            presenceByUser,
            groupAbsencesByUser(absenceRows),
          ),
        );
      } catch (err) {
        console.error("Failed to load team:", err);
        if (!cancelled) {
          setLoadError(
            "Couldn't load team members. If you recently added roster filtering, apply migration 20260803140000_user_team_directory.sql in Supabase, then refresh.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const members = directoryMembers;

  const canEditMember = useCallback(
    (member: TeamMemberRow) => {
      if (!currentUserId) return false;
      if (isTeamLead) return true;
      return member.id === currentUserId;
    },
    [currentUserId, isTeamLead],
  );

  const filtered = useMemo(() => {
    let records = members;
    if (activeFilter !== "All") {
      records = records.filter(
        (m) => (m.presence?.status ?? "in_office") === activeFilter,
      );
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return records;
    return records.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.institution ?? "").toLowerCase().includes(q) ||
        (m.designation ?? "").toLowerCase().includes(q) ||
        roleLabel(m.role).toLowerCase().includes(q) ||
        statusLabel(m.presence?.status ?? "in_office")
          .toLowerCase()
          .includes(q) ||
        (m.presence?.note ?? "").toLowerCase().includes(q),
    );
  }, [members, activeFilter, searchQuery]);

  const statusCounts = useMemo(() => {
    const roster = directoryMembers;
    const counts = new Map<PresenceStatus | "All", number>();
    counts.set("All", roster.length);
    for (const opt of PRESENCE_STATUS_OPTIONS) {
      counts.set(opt.value, 0);
    }
    for (const m of roster) {
      const status = m.presence?.status ?? "in_office";
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
    return counts;
  }, [directoryMembers]);

  useEffect(() => {
    if (!isTeamLead) setIsManagingRoster(false);
  }, [isTeamLead]);

  const initialData = editFormData;

  const handleCloseModal = useCallback(() => {
    setIsEditing(false);
    setSelected(null);
    setEditFormData(null);
    setEditAvatarPreviewUrl(null);
    setEditScheduledStatus(null);
  }, []);

  const handleOpenEdit = useCallback(
    async (member: TeamMemberRow) => {
      setSelected(member);
      setIsOpeningEdit(true);
      try {
        const absences = await getUserAbsences(member.id);
        const scheduledStatus = scheduledAbsenceStatusFromRows(absences);
        // Current location is independent of filed leave/travel. Opening the
        // form as "on leave" whenever dates exist made people switch back to
        // in office and wipe the calendar record.
        const status = member.presence?.status ?? "in_office";
        setEditScheduledStatus(scheduledStatus);
        setEditFormData({
          status,
          note: member.presence?.note || "",
          until_date: member.presence?.until_date || "",
          designation: member.designation || "",
          in_team_directory: member.in_team_directory,
          absence_blocks: scheduledStatus
            ? absenceRowsToBlocks(
                absences.filter((row) => row.status === scheduledStatus),
              )
            : [],
        });
        setEditAvatarPreviewUrl(resolveAvatarDisplayUrl(member));
        setIsEditing(true);
      } catch (err) {
        console.error("Failed to load absence dates:", err);
        showToast("Couldn't load absence dates. Please try again.", "error");
        setSelected(null);
      } finally {
        setIsOpeningEdit(false);
      }
    },
    [showToast],
  );

  const handleSubmit = useCallback(
    async (
      formData: UserPresenceFormData,
      avatarChanges?: UserPresenceAvatarChanges,
    ) => {
      if (!selected || !currentUserId) return;

      const designation = formData.designation.trim() || null;
      const isScheduled = SCHEDULED_ABSENCE_STATUSES.includes(formData.status);
      const { absenceRows, statusesToReplace } = absenceSavePlan(
        formData.status,
        formData.absence_blocks,
        editScheduledStatus,
      );
      const absenceDates = absenceRows.map((row) => row.absence_date);
      const storedStatus = presenceStatusForSave(formData.status, absenceDates);
      const untilDate = isScheduled
        ? maxAbsenceDate(absenceDates)
        : formData.until_date.trim() || null;
      // With scheduled absences the note lives on each block, so mirror the
      // one covering today (or next up) onto the team list.
      const note = isScheduled
        ? presenceNoteFromAbsenceRows(absenceRows)
        : formData.note.trim() || null;

      setIsSaving(true);
      try {
        if (avatarChanges?.remove) {
          await removeUserAvatar(selected.id);
        } else if (avatarChanges?.file) {
          await uploadUserAvatar(selected.id, avatarChanges.file);
        }

        const userPatch: {
          designation: string | null;
          in_team_directory?: boolean;
        } = {
          designation,
        };
        if (isTeamLead) {
          userPatch.in_team_directory = formData.in_team_directory;
        }

        await Promise.all([
          saveDataToDB("users", selected.id, userPatch),
          upsertUserPresence(selected.id, {
            status: storedStatus,
            note,
            until_date: untilDate,
            updated_by: currentUserId,
          }),
          replaceUserAbsences(
            selected.id,
            absenceRows,
            currentUserId,
            statusesToReplace,
          ),
        ]);

        await reloadDirectoryMembers();

        setIsEditing(false);
        setSelected(null);
        setEditFormData(null);
        setEditAvatarPreviewUrl(null);
        setEditScheduledStatus(null);
        showToast("Profile updated.", "success");
      } catch (err) {
        console.error("Failed to update profile:", err);
        showToast(
          err instanceof Error
            ? err.message
            : "Failed to update profile. Please try again.",
          "error",
        );
      } finally {
        setIsSaving(false);
      }
    },
    [
      selected,
      currentUserId,
      isTeamLead,
      editScheduledStatus,
      showToast,
      reloadDirectoryMembers,
    ],
  );

  const handleRosterSaved = useCallback(async () => {
    await reloadDirectoryMembers();
    showToast("Bioinformatics roster updated.", "success");
  }, [reloadDirectoryMembers, showToast]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-10">
      <PageHeader
        breadcrumbTrail={teamBreadcrumbs}
        title="Team"
        subtitle="Bioinformatics team presence — office, lab, leave, travel, and more."
        actions={
          <div className="relative w-full min-[480px]:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team…"
              className="w-full rounded-xl border border-slate-200 bg-white/80 pl-9 pr-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#2a7797]/40 focus:ring-2 focus:ring-[#2a7797]/10"
            />
          </div>
        }
      />

      {isTeamLead ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-[rgba(42,119,151,0.2)] bg-[#e6f4f8]/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#2a7797] font-aileron">
              Bioinformatics roster
            </p>
            <p className="text-xs text-slate-600 font-quicksand mt-0.5">
              Choose which staff appear on Team presence and calendar absences.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsManagingRoster(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[rgba(42,119,151,0.25)] bg-white px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#2a7797] hover:bg-[#f8fcfe] transition-colors font-quicksand shadow-sm"
          >
            <UsersRound className="h-4 w-4" />
            Manage roster
          </button>
        </div>
      ) : null}

      <TeamRosterModal
        isOpen={isManagingRoster}
        isSaving={isSavingRoster}
        onClose={() => setIsManagingRoster(false)}
        onSaveStart={() => setIsSavingRoster(true)}
        onSaveEnd={() => setIsSavingRoster(false)}
        onSaved={() => void handleRosterSaved()}
        onError={(message) => showToast(message, "error")}
      />

      <div className="relative flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => {
          const isActive = activeFilter === opt.value;
          const count = statusCounts.get(opt.value) ?? 0;
          if (opt.value !== "All" && count === 0 && !isActive) return null;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setActiveFilter(opt.value)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider font-quicksand transition-colors ${
                isActive
                  ? "border-[#2a7797]/30 bg-[#2a7797]/10 text-[#2a7797]"
                  : "border-slate-200 bg-white/70 text-slate-500 hover:border-slate-300"
              }`}
            >
              {opt.label}
              <span
                className={`tabular-nums ${
                  isActive ? "text-[#2a7797]/80" : "text-slate-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <LoadingState message="Loading team…" />
      ) : loadError ? (
        <ErrorState message={loadError} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No team members found"
          description={
            searchQuery || activeFilter !== "All"
              ? "Try a different search or status filter."
              : isTeamLead
                ? "No bioinformatics team members yet. Use Manage roster to select who appears here."
                : "Bioinformatics team members appear here."
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((member) => {
            const status = member.presence?.status ?? "in_office";
            const styles = STATUS_STYLES[status];
            const until = formatUntil(member.presence?.until_date);
            const editable = canEditMember(member);
            const isSelf = member.id === currentUserId;
            const avatarUrl = resolveAvatarDisplayUrl(member);

            return (
              <li
                key={member.id}
                className="group flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-slate-200/80 bg-white/80 px-5 py-4 shadow-sm shadow-slate-200/40"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="relative shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-200/80 bg-[#2a7797]/10 text-[#2a7797]">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserRound className="h-5 w-5" />
                      )}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${styles.dot}`}
                      title={statusLabel(status)}
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-slate-800 font-aileron truncate">
                        {member.name}
                        {isSelf ? (
                          <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-[#2a7797]/70">
                            You
                          </span>
                        ) : null}
                      </h2>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-quicksand">
                        {roleLabel(member.role)}
                      </span>
                    </div>

                    {member.designation ? (
                      <p className="text-[13px] text-slate-600 font-quicksand truncate">
                        {member.designation}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500 font-quicksand">
                      <span className="inline-flex items-center gap-1 min-w-0">
                        <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                        <span className="truncate">{member.email}</span>
                      </span>
                      {member.institution ? (
                        <span className="inline-flex items-center gap-1 min-w-0">
                          <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
                          <span className="truncate">{member.institution}</span>
                        </span>
                      ) : null}
                    </div>

                    {member.presence?.note ? (
                      <p className="text-[12px] text-slate-500 font-quicksand line-clamp-2">
                        {member.presence.note}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider font-quicksand ${styles.chip}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                    {statusLabel(status)}
                  </span>
                  {until ? (
                    <span className="text-[11px] text-slate-400 font-quicksand">
                      Until {until}
                    </span>
                  ) : null}
                  {editable ? (
                    <button
                      type="button"
                      onClick={() => void handleOpenEdit(member)}
                      disabled={isOpeningEdit}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 hover:border-[#2a7797]/30 hover:text-[#2a7797] transition-colors font-quicksand"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Update
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <TeamPresenceModal
        isOpen={isEditing}
        isSaving={isSaving}
        memberName={selected?.name ?? ""}
        initialData={initialData}
        initialAvatarPreviewUrl={editAvatarPreviewUrl}
        scheduledAbsenceStatus={editScheduledStatus}
        canManageDirectory={isTeamLead}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
