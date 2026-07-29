import type { TaskCategory } from "@/types/database";

export const TASK_CATEGORIES: TaskCategory[] = [
  "client_communication",
  "code_workflow_optimization",
  "sequence_analysis",
  "tour",
  "meeting",
  "internship",
  "collaboration",
  "engagements",
  "projects",
  "professional_development",
  "future_planning",
  "skill_development",
  "events",
];

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  client_communication: "Client Communication",
  code_workflow_optimization: "Code/Workflow Optimization",
  sequence_analysis: "Sequence Analysis",
  tour: "Tour",
  meeting: "Meeting",
  internship: "Internship",
  collaboration: "Collaboration",
  engagements: "Engagements",
  projects: "Projects",
  professional_development: "Professional Development",
  future_planning: "Future Planning",
  skill_development: "Skill Development",
  events: "Events",
};

export const TASK_CATEGORY_OPTIONS = TASK_CATEGORIES.map((value) => ({
  value,
  label: TASK_CATEGORY_LABELS[value],
}));

/** Soft chip styles — distinct enough for filters without competing with priority colors. */
export const TASK_CATEGORY_STYLES: Record<TaskCategory, string> = {
  client_communication: "bg-sky-50 text-sky-800 border-sky-200/70",
  code_workflow_optimization: "bg-violet-50 text-violet-800 border-violet-200/70",
  sequence_analysis: "bg-teal-50 text-teal-800 border-teal-200/70",
  tour: "bg-orange-50 text-orange-800 border-orange-200/70",
  meeting: "bg-indigo-50 text-indigo-800 border-indigo-200/70",
  internship: "bg-lime-50 text-lime-800 border-lime-200/70",
  collaboration: "bg-cyan-50 text-cyan-800 border-cyan-200/70",
  engagements: "bg-rose-50 text-rose-800 border-rose-200/70",
  projects: "bg-slate-100 text-slate-700 border-slate-300/70",
  professional_development: "bg-amber-50 text-amber-900 border-amber-200/70",
  future_planning: "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200/70",
  skill_development: "bg-emerald-50 text-emerald-800 border-emerald-200/70",
  events: "bg-pink-50 text-pink-800 border-pink-200/70",
};

export function isTaskCategory(value: string): value is TaskCategory {
  return (TASK_CATEGORIES as string[]).includes(value);
}
