import type { UserRole } from "@/types/database";

export const STAFF_ROLES: UserRole[] = ["team_lead", "team_member"];
export const LEARNER_ROLES: UserRole[] = ["trainee", "intern"];
export const OFFICER_ROLES: UserRole[] = [
  "reviewing_officer",
  "approving_officer",
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
    return (
      pathname === "/dashboard/notifications" ||
      pathname.startsWith("/dashboard/notifications/")
    );
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
