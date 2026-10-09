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

/**
 * Programs a newly assigned learner can be enrolled in: trainees join
 * trainings, interns join internships, and finished programs are left out.
 * Other roles have no program to join.
 */
export function enrollablePrograms(
  programs: TrainingProgram[],
  role: AssignableRole,
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
