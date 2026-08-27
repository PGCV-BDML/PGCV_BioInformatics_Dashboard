import { supabase } from "@/lib/supabase";
import type {
  AnalysisServiceReportVersion,
  ServiceReportVersionKind,
} from "@/types/database";

export type { AnalysisServiceReportVersion, ServiceReportVersionKind };

export type ServiceReportVersion = AnalysisServiceReportVersion;

export function serviceReportVersionLabel(
  kind: ServiceReportVersionKind,
): string {
  switch (kind) {
    case "upload":
      return "Original";
    case "revision":
      return "Revision";
    case "reviewed":
      return "Peer reviewed";
    case "signed":
      return "Signed";
  }
}

function versionTime(version: ServiceReportVersion): number {
  const time = new Date(version.uploaded_at).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/**
 * Files to list under "Previous versions": not the current pointer,
 * and hide a peer-review stamp once a later signed copy exists.
 */
export function previousServiceReportVersions(
  versions: ServiceReportVersion[],
  currentPath: string | null | undefined,
): ServiceReportVersion[] {
  const current = currentPath?.trim() ?? "";
  const chronological = [...versions].sort((a, b) => {
    const delta = versionTime(a) - versionTime(b);
    if (delta !== 0) return delta;
    return a.id.localeCompare(b.id);
  });

  function hasLaterSigned(version: ServiceReportVersion): boolean {
    const when = versionTime(version);
    return chronological.some((other) => {
      if (other.kind !== "signed") return false;
      const otherWhen = versionTime(other);
      if (otherWhen > when) return true;
      return otherWhen === when && other.id > version.id;
    });
  }

  return versions
    .filter((version) => version.file_path.trim() !== current)
    .filter(
      (version) => !(version.kind === "reviewed" && hasLaterSigned(version)),
    )
    .sort((a, b) => {
      const delta = versionTime(b) - versionTime(a);
      if (delta !== 0) return delta;
      return b.id.localeCompare(a.id);
    });
}

/** History list including the current file, newest first. */
export function listedServiceReportVersions(
  versions: ServiceReportVersion[],
  currentPath: string | null | undefined,
): ServiceReportVersion[] {
  const current = currentPath?.trim() ?? "";
  const previous = previousServiceReportVersions(versions, currentPath);
  const currentRow = versions.find(
    (version) => version.file_path.trim() === current,
  );
  if (currentRow) return [currentRow, ...previous];
  return previous;
}

/** History rows for one analysis, newest first. Empty if the table is missing. */
export async function getServiceReportVersions(
  analysisId: string,
): Promise<ServiceReportVersion[]> {
  const { data, error } = await supabase
    .from("analysis_service_report_version")
    .select(
      "id, analysis_id, file_path, file_name, file_size, kind, uploaded_by, uploaded_at",
    )
    .eq("analysis_id", analysisId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("Failed to load service report versions:", error);
    return [];
  }

  return (data ?? []) as ServiceReportVersion[];
}
