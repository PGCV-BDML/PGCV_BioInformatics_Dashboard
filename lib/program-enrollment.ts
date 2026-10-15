import type { EnrollmentStatus } from "@/types/database";

/**
 * A participant on a program's Participants tab: still enrolled or completed,
 * and still a trainee or intern. Dropped rows and people whose role changed
 * are omitted.
 */
export function isListedParticipant(
  status: EnrollmentStatus,
  userId: string,
  learnerIds: ReadonlySet<string>,
): boolean {
  return (
    (status === "enrolled" || status === "completed") &&
    learnerIds.has(userId)
  );
}

export function countListedParticipantsByProgram(
  enrollments: Array<{
    program_id: string;
    user_id: string;
    status: EnrollmentStatus;
  }>,
  learnerIds: ReadonlySet<string>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const enrollment of enrollments) {
    if (
      !isListedParticipant(enrollment.status, enrollment.user_id, learnerIds)
    ) {
      continue;
    }
    counts.set(
      enrollment.program_id,
      (counts.get(enrollment.program_id) ?? 0) + 1,
    );
  }
  return counts;
}
