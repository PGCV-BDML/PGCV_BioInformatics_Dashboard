import { supabase } from "@/lib/supabase";
import {
  filterAnalysesByYear,
  getAnalysisYear,
  type AnalysisDashboardRow,
} from "@/lib/analysis-dashboard-stats";

// ===========================================================================
// DashboardStats type — shape consumed by dashboard-stat-cards component
// ===========================================================================

export type DashboardStats = {
  activeProjects: number;
  completedProjects: number;
  backlogProjects: number;
  newProjectsThisMonth: number;
  activeCollaborations: number;
  completedCollaborations: number;
  /** Analyses in the selected year that have an SR number or report link. */
  reportsGenerated: number;
  /** Analyses in the selected year still missing an SR number/link. */
  reportsPending: number;
  /** @deprecated Alias of reportsGenerated */
  reportsDelivered: number;
  /** @deprecated Alias of reportsPending */
  reportsNew: number;
  totalTrainings: number;
  ongoingTrainings: number;
  completedTrainings: number;
  totalInternPrograms: number;
  ongoingInternPrograms: number;
  /** @deprecated Use totalInternPrograms — kept for older call sites */
  totalInterns: number;
};

function hasServiceReport(row: AnalysisDashboardRow): boolean {
  return Boolean(
    (row.service_report_number && String(row.service_report_number).trim()) ||
      (row.service_report_link && String(row.service_report_link).trim()),
  );
}

// ===========================================================================
// Helpers
// ===========================================================================

/** Return true when a date/string falls in the given year (e.g. "2026"). */
function matchesYear(dateVal: string | Date | null | undefined, year: string): boolean {
  if (!dateVal) return false;
  return new Date(dateVal).getFullYear().toString() === year;
}

// ===========================================================================
// getDashboardStats – real Supabase aggregations replacing yearlyMockDB
// ===========================================================================

/**
 * Fetch dashboard KPI numbers for a given year.
 *
 * Service-report KPIs come from `analysis` (SR number / link / date) — the same
 * source as Sequence Analysis — not the sparse `service_report` delivery table.
 */
export async function getDashboardStats(selectedYear: string): Promise<DashboardStats> {
  const [projResult, collabResult, analysisResult, programResult] = await Promise.all([
    supabase.from("project").select("status, start_date"),
    supabase.from("collaboration").select("status, start_date, created_at"),
    supabase
      .from("analysis")
      .select(
        "service_report_number, service_report_date, service_report_link, started_at",
      ),
    supabase.from("training_program").select("type, status, start_date, created_at"),
  ]);

  if (projResult.error) throw new Error(`Project query: ${projResult.error.message}`);
  if (collabResult.error) throw new Error(`Collaboration query: ${collabResult.error.message}`);
  if (analysisResult.error) throw new Error(`Analysis query: ${analysisResult.error.message}`);
  if (programResult.error) throw new Error(`Training program query: ${programResult.error.message}`);

  const projects = projResult.data ?? [];
  const collabs = collabResult.data ?? [];
  const analyses = (analysisResult.data ?? []) as AnalysisDashboardRow[];
  const programs = programResult.data ?? [];

  // -- Projects --
  // project_status enum (live DB): 'ongoing' | 'for_approval' | 'submitted' | 'on_hold' | 'completed'
  // NOTE: migration 19_initial_schema.sql only defines the first 3; 'on_hold'
  // and 'completed' were added to the live DB via direct SQL (schema drift).
  const projectsInYear = projects.filter((p) => matchesYear(p.start_date, selectedYear));
  const activeProjects = projectsInYear.filter((p) => p.status === "ongoing").length;
  const completedProjects = projectsInYear.filter((p) => p.status === "completed").length;
  const backlogProjects = projectsInYear.filter((p) => p.status === "on_hold").length;
  const newProjectsThisMonth = projectsInYear.filter(
    (p) => p.status === "for_approval" || p.status === "submitted",
  ).length;

  // -- Collaborations --
  // collab_status enum: 'for_approval' | 'ongoing' | 'finished'
  // Use start_date if available, otherwise fall back to created_at.
  const collabsInYear = collabs.filter(
    (c) => matchesYear(c.start_date, selectedYear) || matchesYear(c.created_at, selectedYear),
  );
  const activeCollaborations = collabsInYear.filter((c) => c.status === "ongoing").length;
  const completedCollaborations = collabsInYear.filter((c) => c.status === "finished").length;

  // -- Service Reports (from analysis tracker) --
  // Year = service_report_date → SR# year → started_at (same as Sequence Analysis).
  const analysesInYear = filterAnalysesByYear(analyses, selectedYear);
  const reportsGenerated = analysesInYear.filter(hasServiceReport).length;
  const reportsPending = analysesInYear.filter((row) => !hasServiceReport(row)).length;

  // -- Training Programs --
  // training_type enum: 'training' | 'internship'
  // training_program_status: 'draft' | 'ongoing' | 'completed' | 'archived'
  const programsInYear = programs.filter(
    (p) => matchesYear(p.start_date, selectedYear) || matchesYear(p.created_at, selectedYear),
  );
  const trainingsInYear = programsInYear.filter((p) => p.type === "training");
  const totalTrainings = trainingsInYear.filter((p) => p.status !== "archived").length;
  const ongoingTrainings = trainingsInYear.filter((p) => p.status === "ongoing").length;
  const completedTrainings = trainingsInYear.filter((p) => p.status === "completed").length;

  const internProgramsInYear = programsInYear.filter(
    (p) => p.type === "internship" && p.status !== "archived",
  );
  const totalInternPrograms = internProgramsInYear.length;
  const ongoingInternPrograms = internProgramsInYear.filter(
    (p) => p.status === "ongoing",
  ).length;

  return {
    activeProjects,
    completedProjects,
    backlogProjects,
    newProjectsThisMonth,
    activeCollaborations,
    completedCollaborations,
    reportsGenerated,
    reportsPending,
    reportsDelivered: reportsGenerated,
    reportsNew: reportsPending,
    totalTrainings,
    ongoingTrainings,
    completedTrainings,
    totalInternPrograms,
    ongoingInternPrograms,
    totalInterns: totalInternPrograms,
  };
}

// ===========================================================================
// getServiceReportsByYear – chart data for ServiceReportsChart
// ===========================================================================

/**
 * Count analyses that have a service report, grouped by analysis year
 * (service_report_date → SR# year → started_at).
 */
export async function getServiceReportsByYear(): Promise<{ year: string; Delivered: number }[]> {
  const { data, error } = await supabase
    .from("analysis")
    .select(
      "service_report_number, service_report_date, service_report_link, started_at",
    );

  if (error) throw new Error(`Analysis query: ${error.message}`);

  const analyses = (data ?? []) as AnalysisDashboardRow[];

  const yearMap = new Map<string, number>();
  for (const row of analyses) {
    if (!hasServiceReport(row)) continue;
    const year = getAnalysisYear(row);
    if (!year) continue;
    yearMap.set(year, (yearMap.get(year) ?? 0) + 1);
  }

  return Array.from(yearMap.entries())
    .map(([year, count]) => ({ year, Delivered: count }))
    .sort((a, b) => parseInt(a.year) - parseInt(b.year));
}
