import {
  moduleIdFromModuleLink,
  repoPathFromModuleLink,
} from "@/lib/module-library";

export const MATERIAL_CLOSED_ERROR =
  "This material isn't open yet. Your instructor will open it when it's time.";

export function isStaffRole(role: string | null | undefined): boolean {
  return role === "team_lead" || role === "team_member";
}

export function isLearnerRole(role: string | null | undefined): boolean {
  return role === "trainee" || role === "intern";
}

/**
 * Staff can always open a module or presentation. Trainees and interns can
 * open it only while staff have left it open.
 */
export function canOpenAssignedMaterial(
  role: string | null | undefined,
  isOpen: boolean | null | undefined,
): boolean {
  if (isStaffRole(role)) return true;
  if (!isLearnerRole(role)) return false;
  return isOpen !== false;
}

/** The stored module link must be the library item the caller asked to open. */
export function moduleRowMatchesTarget(
  htmlContentLink: string | null | undefined,
  target: { id?: string; path?: string },
): boolean {
  if (target.id) return moduleIdFromModuleLink(htmlContentLink) === target.id;
  if (target.path) return repoPathFromModuleLink(htmlContentLink) === target.path;
  return false;
}
