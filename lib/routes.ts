export type ProgramType = "training" | "internship";

export const routes = {
  about: "/dashboard/about",
  protocols: {
    list: "/dashboard/protocols",
    detail: (slug: string) => `/dashboard/protocols/${encodeURIComponent(slug)}`,
  },
  team: {
    list: "/dashboard/team",
  },
  clients: {
    list: "/dashboard/clients",
    /** Prefill Clients module search (e.g. soft-matched Client ID). */
    byQuery: (query: string) =>
      `/dashboard/clients?q=${encodeURIComponent(query.trim())}`,
  },
  services: {
    list: "/dashboard/services",
    tracker: "/dashboard/services/tracker",
    /** Open the Service Report Tracker with the add-analysis form. */
    trackerAdd: "/dashboard/services/tracker?add=1",
    /** Deep-link the Service Report Tracker to a sequencer run ID. */
    trackerByRunId: (runId: string) =>
      `/dashboard/services/tracker?run_id=${encodeURIComponent(runId.trim())}`,
    /** Deep-link the Service Report Tracker to a Client ID. */
    trackerByClientId: (clientId: string, year?: string) => {
      const params = new URLSearchParams();
      const trimmed = clientId.trim();
      if (trimmed) params.set("client_id", trimmed);
      if (year && year !== "all") params.set("year", year);
      const qs = params.toString();
      return qs
        ? `/dashboard/services/tracker?${qs}`
        : "/dashboard/services/tracker";
    },
    /** Launchpad of external service report generator tools. */
    reportGenerator: "/dashboard/services/report-generator",
    /** COVID-19 Sample Tracker (genomic surveillance; not client sequence analysis). */
    covidSampleTracker: "/dashboard/services/covid-sample-tracker",
    covidSampleTrackerByRunId: (runId: string) =>
      `/dashboard/services/covid-sample-tracker?run_id=${encodeURIComponent(runId.trim())}`,
    detail: (id: string) => `/dashboard/services/${id}`,
  },
  repositories: {
    list: "/dashboard/repositories",
  },
  tasks: {
    list: "/dashboard/tasks",
    /** Open Tasks with the add-task form. */
    add: "/dashboard/tasks?add=1",
  },
  incidents: {
    list: "/dashboard/incidents",
  },
  training: {
    list: "/dashboard/training",
    detail: (id: string) => `/dashboard/training/${id}`,
    onboarding: (id: string) => `/dashboard/training/${id}/onboarding`,
    participants: (id: string) => `/dashboard/training/${id}/participants`,
    assessment: (id: string) => `/dashboard/training/${id}/assessment`,
    evaluation: (id: string) => `/dashboard/training/${id}/evaluation`,
    certificate: (id: string) => `/dashboard/training/${id}/certificate`,
  },
  internship: {
    list: "/dashboard/internship",
    detail: (id: string) => `/dashboard/internship/${id}`,
    onboarding: (id: string) => `/dashboard/internship/${id}/onboarding`,
    participants: (id: string) => `/dashboard/internship/${id}/participants`,
    assessment: (id: string) => `/dashboard/internship/${id}/assessment`,
    evaluation: (id: string) => `/dashboard/internship/${id}/evaluation`,
    certificate: (id: string) => `/dashboard/internship/${id}/certificate`,
  },
} as const;

export function programRoutes(type: ProgramType) {
  return type === "training" ? routes.training : routes.internship;
}
