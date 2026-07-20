// ponytail: mock data — replace with real Supabase analytics per ROADMAP.md #27 Phase 1 §1.1

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

export const yearlyMockDB: Record<string, DashboardStats> = {
  "2026": {
    activeProjects: 24,
    completedProjects: 45,
    backlogProjects: 8,
    newProjectsThisMonth: 6,
    activeCollaborations: 3,
    completedCollaborations: 12,
    reportsDelivered: 18,
    reportsNew: 18,
    totalTrainings: 7,
    ongoingTrainings: 2,
    totalInterns: 31,
  },
  "2025": {
    activeProjects: 14,
    completedProjects: 64,
    backlogProjects: 3,
    newProjectsThisMonth: 0,
    activeCollaborations: 5,
    completedCollaborations: 8,
    reportsDelivered: 64,
    reportsNew: 4,
    totalTrainings: 5,
    ongoingTrainings: 0,
    totalInterns: 28,
  },
  "2024": {
    activeProjects: 2,
    completedProjects: 51,
    backlogProjects: 1,
    newProjectsThisMonth: 0,
    activeCollaborations: 1,
    completedCollaborations: 10,
    reportsDelivered: 70,
    reportsNew: 0,
    totalTrainings: 4,
    ongoingTrainings: 0,
    totalInterns: 20,
  },
};
