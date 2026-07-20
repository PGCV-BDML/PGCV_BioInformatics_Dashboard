import { supabase } from "@/lib/supabase";

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
  reportsDelivered: number;
  reportsNew: number;
  totalTrainings: number;
  ongoingTrainings: number;
  totalInterns: number;
};

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
 * Fetch dashboard KPI numbers for a given year from four Supabase tables.
 *
 * All four tables are queried in parallel. Because each table has very few
 * rows (project ~3, collaboration ~?, service_report ~2, training_program ~4),
 * we fetch all rows and count client-side. This is simpler than issuing a
 * dozen individual count-head queries and equally valid for small datasets.
 */
export async function getDashboardStats(selectedYear: string): Promise<DashboardStats> {
  const [projResult, collabResult, reportResult, programResult] = await Promise.all([
    supabase.from("project").select("status, start_date"),
    supabase.from("collaboration").select("status, start_date, created_at"),
    supabase.from("service_report").select("delivered_at, created_at"),
    supabase.from("training_program").select("type, start_date, created_at"),
  ]);

  if (projResult.error) throw new Error(`Project query: ${projResult.error.message}`);
  if (collabResult.error) throw new Error(`Collaboration query: ${collabResult.error.message}`);
  if (reportResult.error) throw new Error(`Service report query: ${reportResult.error.message}`);
  if (programResult.error) throw new Error(`Training program query: ${programResult.error.message}`);

  const projects = projResult.data ?? [];
  const collabs = collabResult.data ?? [];
  const reports = reportResult.data ?? [];
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

  // -- Service Reports --
  // delivered_at is nullable timestamptz. reportsNew is ALL pending reports
  // regardless of year (no year filter applied).
  const reportsDelivered = reports.filter(
    (r) => r.delivered_at && matchesYear(r.delivered_at, selectedYear),
  ).length;
  const reportsNew = reports.filter((r) => !r.delivered_at).length;

  // -- Training Programs --
  // training_type enum: 'training' | 'internship'
  // No status column exists, so ongoingTrainings is set equal to totalTrainings
  // as an upper-bound ceiling. Upgrade path: add a status column to
  // training_program and filter by status='ongoing' here.
  const programsInYear = programs.filter(
    (p) => matchesYear(p.start_date, selectedYear) || matchesYear(p.created_at, selectedYear),
  );
  const totalTrainings = programsInYear.filter((p) => p.type === "training").length;
  const totalInterns = programsInYear.filter((p) => p.type === "internship").length;
  // ponytail: training_program has no status column — using total as ceiling
  const ongoingTrainings = totalTrainings;

  return {
    activeProjects,
    completedProjects,
    backlogProjects,
    newProjectsThisMonth,
    activeCollaborations,
    completedCollaborations,
    reportsDelivered,
    reportsNew,
    totalTrainings,
    ongoingTrainings,
    totalInterns,
  };
}

// ===========================================================================
// getServiceReportsByYear – chart data for ServiceReportsChart
// ===========================================================================

/**
 * Query all service_reports, group by year of delivered_at, and return
 * sorted array of { year, Delivered } objects. Only years that have at
 * least one delivered report are included.
 */
export async function getServiceReportsByYear(): Promise<{ year: string; Delivered: number }[]> {
  const { data, error } = await supabase.from("service_report").select("delivered_at");

  if (error) throw new Error(`Service report query: ${error.message}`);

  const reports = data ?? [];

  const yearMap = new Map<string, number>();
  for (const report of reports) {
    if (report.delivered_at) {
      const year = new Date(report.delivered_at).getFullYear().toString();
      yearMap.set(year, (yearMap.get(year) ?? 0) + 1);
    }
  }

  return Array.from(yearMap.entries())
    .map(([year, count]) => ({ year, Delivered: count }))
    .sort((a, b) => parseInt(a.year) - parseInt(b.year));
}
