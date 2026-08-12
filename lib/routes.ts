export type ProgramType = "training" | "internship";

export const routes = {
  about: "/dashboard/about",
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
    /** Deep-link the Service Report Tracker to a sequencer run ID. */
    trackerByRunId: (runId: string) =>
      `/dashboard/services/tracker?run_id=${encodeURIComponent(runId.trim())}`,
    /** COVID-19 Sample Tracker (genomic surveillance; not client sequence analysis). */
    covidSampleTracker: "/dashboard/services/covid-sample-tracker",
    covidSampleTrackerByRunId: (runId: string) =>
      `/dashboard/services/covid-sample-tracker?run_id=${encodeURIComponent(runId.trim())}`,
    detail: (id: string) => `/dashboard/services/${id}`,
  },
  repositories: {
    list: "/dashboard/repositories",
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
