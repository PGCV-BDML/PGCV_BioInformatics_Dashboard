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

type ProjectStatRow = {
  status: string | null;
  /** Present when schema is in sync; live DB has historically drifted without it. */
  start_date?: string | null;
  created_at?: string | null;
};

type CollabStatRow = {
  status: string | null;
  start_date?: string | null;
  created_at?: string | null;
};

type ProgramStatRow = {
  type: string | null;
  status: string | null;
  start_date?: string | null;
  created_at?: string | null;
};

async function loadRows<T>(
  label: string,
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const { data, error } = await query;
  if (error) {
    console.error(`Dashboard stats: ${label} query failed:`, error.message);
    throw new Error(`${label} query: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Fetch dashboard KPI numbers for a given year.
 *
 * Service-report KPIs come from `analysis` (SR number / link / date) — the same
 * source as Sequence Analysis — not the sparse `service_report` delivery table.
 *
 * Project year filtering uses `start_date` when present, otherwise `created_at`
 * (live DB has drifted without `project.start_date` in some environments).
 */
export async function getDashboardStats(selectedYear: string): Promise<DashboardStats> {
  const [projects, collabs, analyses, programs] = await Promise.all([
    loadRows<ProjectStatRow>(
      "Project",
      // Prefer created_at — start_date is missing on some live DBs (schema drift).
      supabase.from("project").select("status, created_at"),
    ),
    loadRows<CollabStatRow>(
      "Collaboration",
      supabase.from("collaboration").select("status, start_date, created_at"),
    ),
    loadRows<AnalysisDashboardRow>(
      "Analysis",
      supabase
        .from("analysis")
        .select(
          "service_report_number, service_report_date, service_report_link, started_at",
        ),
    ),
    loadRows<ProgramStatRow>(
      "Training program",
      supabase.from("training_program").select("type, status, start_date, created_at"),
    ),
  ]);

  // -- Projects --
  // project_status enum (live DB): 'ongoing' | 'for_approval' | 'submitted' | 'on_hold' | 'completed'
  // NOTE: migration 19_initial_schema.sql only defines the first 3; 'on_hold'
  // and 'completed' were added to the live DB via direct SQL (schema drift).
  const projectsInYear = projects.filter(
    (p) =>
      matchesYear(p.start_date, selectedYear) ||
      matchesYear(p.created_at, selectedYear),
  );
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
