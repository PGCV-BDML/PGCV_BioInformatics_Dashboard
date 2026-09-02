import type { UserRole } from "@/types/database";

export const STAFF_ROLES: UserRole[] = ["team_lead", "team_member"];
export const LEARNER_ROLES: UserRole[] = ["trainee", "intern"];
export const OFFICER_ROLES: UserRole[] = [
  "reviewing_officer",
  "approving_officer",
];
export const ALL_USER_ROLES: UserRole[] = [
  ...STAFF_ROLES,
  ...LEARNER_ROLES,
  ...OFFICER_ROLES,
  "none",
];

export type PortalPreviewMode = "trainee" | "intern" | null;

export const PORTAL_PREVIEW_KEY = "pgcv-portal-preview";

export function isStaffRole(role: UserRole | null | undefined): boolean {
  return role != null && STAFF_ROLES.includes(role);
}

export function isLearnerRole(role: UserRole | null | undefined): boolean {
  return role != null && LEARNER_ROLES.includes(role);
}

export function isOfficerRole(role: UserRole | null | undefined): boolean {
  return role != null && OFFICER_ROLES.includes(role);
}

export function canEnrollParticipants(
  role: UserRole | null | undefined,
): boolean {
  return role === "team_lead";
}

/** Staff may create and edit sequence analysis records. */
export function canEditSequenceAnalysis(
  role: UserRole | null | undefined,
): boolean {
  return isStaffRole(role);
}

/**
 * Staff and reviewing officers may open Sequence Analysis (dashboard,
 * tracker, and analysis detail). Approving officers do not.
 */
export function canViewSequenceAnalysis(
  role: UserRole | null | undefined,
): boolean {
  return isStaffRole(role) || role === "reviewing_officer";
}

const SEQUENCE_ANALYSIS_STAFF_ONLY_SLUGS = new Set([
  "report-generator",
  "covid-sample-tracker",
  "sequencing-run-checklist",
]);

/** Dashboard, tracker, and `/dashboard/services/:id` — not generator or COVID. */
export function isSequenceAnalysisReadPath(pathname: string): boolean {
  if (pathname === "/dashboard/services" || pathname === "/dashboard/services/") {
    return true;
  }
  if (
    pathname === "/dashboard/services/tracker" ||
    pathname.startsWith("/dashboard/services/tracker/")
  ) {
    return true;
  }
  const match = /^\/dashboard\/services\/([^/]+)\/?$/.exec(pathname);
  const slug = match?.[1];
  if (!slug) return false;
  return !SEQUENCE_ANALYSIS_STAFF_ONLY_SLUGS.has(slug);
}

/** Role used for UI chrome (nav, tabs). Preview only affects staff. */
export function getEffectiveRole(
  realRole: UserRole | null,
  preview: PortalPreviewMode,
): UserRole | null {
  if (realRole && isStaffRole(realRole) && preview) {
    return preview;
  }
  return realRole;
}

export function getHomePathForRole(role: UserRole | null): string {
  switch (role) {
    case "trainee":
      return "/dashboard/training";
    case "intern":
      return "/dashboard/internship";
    case "reviewing_officer":
    case "approving_officer":
      return "/dashboard/notifications";
    case "none":
    case null:
      return "/dashboard/pending";
    default:
      return "/dashboard";
  }
}

/** Shared pages every signed-in restricted role may open (footer, etc.). */
function isSharedDashboardPath(pathname: string): boolean {
  return (
    pathname === "/dashboard/about" ||
    pathname.startsWith("/dashboard/about/")
  );
}

/** Paths a learner, officer (or staff in learner preview) may open. */
export function isPathAllowedForRole(
  pathname: string,
  role: UserRole | null,
): boolean {
  if (!role || role === "none") {
    return (
      pathname === "/dashboard/pending" ||
      pathname.startsWith("/dashboard/pending/")
    );
  }
  if (isStaffRole(role)) return true;

  if (isSharedDashboardPath(pathname)) return true;

  if (role === "trainee") {
    return (
      pathname === "/dashboard/training" ||
      pathname.startsWith("/dashboard/training/")
    );
  }

  if (role === "intern") {
    return (
      pathname === "/dashboard/internship" ||
      pathname.startsWith("/dashboard/internship/")
    );
  }

  if (isOfficerRole(role)) {
    const notificationsOk =
      pathname === "/dashboard/notifications" ||
      pathname.startsWith("/dashboard/notifications/");
    if (role === "reviewing_officer" && isSequenceAnalysisReadPath(pathname)) {
      return true;
    }
    return notificationsOk;
  }

  return true;
}

export function readPortalPreview(): PortalPreviewMode {
  if (typeof window === "undefined") return null;
  const value = sessionStorage.getItem(PORTAL_PREVIEW_KEY);
  if (value === "trainee" || value === "intern") return value;
  return null;
}

export function writePortalPreview(mode: PortalPreviewMode) {
  if (typeof window === "undefined") return;
  if (!mode) {
    sessionStorage.removeItem(PORTAL_PREVIEW_KEY);
  } else {
    sessionStorage.setItem(PORTAL_PREVIEW_KEY, mode);
  }
}
