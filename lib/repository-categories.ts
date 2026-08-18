import type { Repository, RepositoryCategory } from "@/types/database";

export const REPOSITORY_CATEGORIES: RepositoryCategory[] = [
  "training",
  "research",
  "collaborator",
  "client",
  "quotation",
  "services",
  "records",
  "analysis",
  "template",
  "automated_pipeline",
  "form",
  "internship",
  "covid_19",
  "project",
  "pipelines",
  "datasets",
  "client_sequences",
  "turnover_forms",
  "other",
];

export const REPOSITORY_CATEGORY_LABELS: Record<RepositoryCategory, string> = {
  training: "Training",
  research: "Research",
  collaborator: "Collaborator",
  client: "Client",
  quotation: "Quotation",
  services: "Services",
  records: "Records",
  analysis: "Analysis",
  template: "Template",
  automated_pipeline: "Automated Pipeline",
  form: "Form",
  internship: "Internship",
  covid_19: "COVID-19",
  project: "Project",
  pipelines: "Pipelines",
  datasets: "Datasets",
  client_sequences: "Client Sequences",
  turnover_forms: "Turnover Forms",
  other: "Other",
};

export const REPOSITORY_CATEGORY_OPTIONS = REPOSITORY_CATEGORIES.map((value) => ({
  value,
  label: REPOSITORY_CATEGORY_LABELS[value],
}));

/** Soft chip styles — distinct enough for filters without competing with kind badges. */
export const REPOSITORY_CATEGORY_STYLES: Record<RepositoryCategory, string> = {
  training: "bg-rose-50 text-rose-800 border-rose-200/70",
  research: "bg-amber-50 text-amber-900 border-amber-200/70",
  collaborator: "bg-yellow-50 text-yellow-800 border-yellow-200/70",
  client: "bg-slate-100 text-slate-700 border-slate-300/70",
  quotation: "bg-pink-50 text-pink-800 border-pink-200/70",
  services: "bg-sky-50 text-sky-800 border-sky-200/70",
  records: "bg-purple-50 text-purple-800 border-purple-200/70",
  analysis: "bg-lime-50 text-lime-800 border-lime-200/70",
  template: "bg-stone-100 text-stone-700 border-stone-300/70",
  automated_pipeline: "bg-orange-50 text-orange-900 border-orange-200/70",
  form: "bg-cyan-50 text-cyan-800 border-cyan-200/70",
  internship: "bg-orange-50 text-orange-800 border-orange-200/70",
  covid_19: "bg-violet-50 text-violet-800 border-violet-200/70",
  project: "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200/70",
  pipelines: "bg-teal-50 text-teal-800 border-teal-200/70",
  datasets: "bg-indigo-50 text-indigo-800 border-indigo-200/70",
  client_sequences: "bg-blue-50 text-blue-800 border-blue-200/70",
  turnover_forms: "bg-emerald-50 text-emerald-800 border-emerald-200/70",
  other: "bg-gray-100 text-gray-700 border-gray-300/70",
};

export function isRepositoryCategory(value: string): value is RepositoryCategory {
  return (REPOSITORY_CATEGORIES as string[]).includes(value);
}

/** Tags from repository_tag, falling back to the legacy single category column. */
export function resolveRepositoryCategories(
  row: Pick<Repository, "category" | "categories">,
): RepositoryCategory[] {
  const tags = row.categories?.length ? row.categories : [row.category];
  return REPOSITORY_CATEGORIES.filter((category) => tags.includes(category));
}
