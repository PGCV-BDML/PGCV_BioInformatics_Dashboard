import { supabase } from "@/lib/supabase";
import { isLearnerRole, isStaffRole } from "@/lib/portal";
import type { TrainingProgram, UserRole } from "@/types/database";

export type AssignableRole = Exclude<UserRole, "none">;

export const ASSIGNABLE_ROLE_OPTIONS: { value: AssignableRole; label: string }[] =
  [
    { value: "trainee", label: "Trainee" },
    { value: "intern", label: "Intern" },
    { value: "team_member", label: "Team member" },
    { value: "team_lead", label: "Team lead" },
    { value: "reviewing_officer", label: "Reviewing officer" },
    { value: "approving_officer", label: "Approving officer" },
  ];

/** Every role, including "none", for the All users table. */
export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  ...ASSIGNABLE_ROLE_OPTIONS,
  { value: "none", label: "No role" },
];

export function userRoleLabel(role: UserRole): string {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

/**
 * Programs a newly assigned learner can be enrolled in: trainees join
 * trainings, interns join internships, and finished programs are left out.
 * Other roles have no program to join.
 */
export function enrollablePrograms(
  programs: TrainingProgram[],
  role: UserRole,
): TrainingProgram[] {
  const type =
    role === "trainee" ? "training" : role === "intern" ? "internship" : null;
  if (!type) return [];
  return programs
    .filter(
      (program) =>
        program.type === type &&
        program.status !== "completed" &&
        program.status !== "archived",
    )
    .sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Why a row's role can't be edited, or null when it can. Mirrors the
 * protect_user_role_column() trigger so the table explains the rule
 * before a save would fail.
 */
export function roleLockReason(
  user: { id: string; role: UserRole },
  currentUserId: string | null,
  teamLeadCount: number,
): string | null {
  if (user.id === currentUserId) {
    return "Another team lead must change your role";
  }
  if (user.role === "team_lead" && teamLeadCount <= 1) {
    return "At least one team lead is required";
  }
  return null;
}

/**
 * What the person gains or loses with a new role, in the words shown in
 * the confirm dialog.
 */
export function roleChangeImpact({
  from,
  to,
  enrollmentCount,
  inTeamDirectory,
}: {
  from: UserRole;
  to: UserRole;
  enrollmentCount: number;
  inTeamDirectory: boolean;
}): string[] {
  if (to === "none") {
    return [
      "They lose access to the dashboard and see the waiting page on their next visit.",
      "They move back to the Pending tab, where you can assign a role again.",
      "Their records, tasks and comments are kept.",
    ];
  }

  const lines: string[] = [];
  const wasStaff = isStaffRole(from);
  const isStaff = isStaffRole(to);

  if (isStaff && !wasStaff) {
    lines.push(
      "Gets the full staff dashboard, including projects, sequence analyses, clients and tasks.",
    );
  }
  if (wasStaff && !isStaff) {
    lines.push(
      "Loses the staff dashboard, including projects, sequence analyses and client records.",
    );
  }
  if (to === "team_lead") {
    lines.push(
      "Can assign roles, enroll participants and read the audit log, and gets access request alerts.",
    );
  }
  if (from === "team_lead") {
    lines.push(
      "Can no longer assign roles, enroll participants or read the audit log.",
    );
  }
  if (to === "reviewing_officer") {
    lines.push(
      "Sees their notifications and can view sequence analyses without editing.",
    );
  }
  if (to === "approving_officer") {
    lines.push(
      "Sees their notifications, the Wish List and the COVID-19 Sample Tracker without editing.",
    );
  }
  if (to === "trainee") {
    lines.push("Only sees the trainings they're enrolled in.");
  }
  if (to === "intern") {
    lines.push("Only sees the internships they're enrolled in.");
  }
  if (isLearnerRole(from) && enrollmentCount > 0) {
    lines.push(
      enrollmentCount === 1
        ? "Their 1 program enrollment stays. Remove it from the program's Participants page if it's no longer needed."
        : `Their ${enrollmentCount} program enrollments stay. Remove them from each program's Participants page if they're no longer needed.`,
    );
  }
  if (isStaff && !wasStaff && !inTeamDirectory) {
    lines.push(
      "They won't appear on the Team page until you add them under Manage roster.",
    );
  }
  if (from === "none") {
    lines.push("Their access request is marked as handled.");
  }
  return lines;
}

/**
 * Change a user's role only if it is still `from`. Returns false when
 * someone else changed it first, so the caller can reload instead of
 * overwriting their change.
 */
export async function updateUserRole(
  userId: string,
  from: UserRole,
  to: UserRole,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("users")
    .update({ role: to })
    .eq("id", userId)
    .eq("role", from)
    .select("id");

  if (error) throw error;
  return (data ?? []).length > 0;
}

const ROLE_GUARD_MESSAGES = [
  "You can't change your own role",
  "At least one team lead is required",
];

/** The guard trigger's own message when it blocked the change. */
export function roleChangeErrorMessage(error: unknown): string {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : "";
  if (message.startsWith("Only team_lead")) {
    return "Only team leads can change roles.";
  }
  if (ROLE_GUARD_MESSAGES.some((guard) => message.startsWith(guard))) {
    return message;
  }
  return "Couldn't change the role. Please try again.";
}
