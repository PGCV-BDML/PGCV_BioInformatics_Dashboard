import type { FaqTag } from "@/types/database";

export const FAQ_TAGS: FaqTag[] = [
  "metabarcoding",
  "amplicon",
  "wgs",
  "transcriptomics",
  "phylogenetics",
  "metagenomics",
  "covid-19",
  "installation",
  "hpc",
  "troubleshooting",
  "programming",
];

export const FAQ_TAG_LABELS: Record<FaqTag, string> = {
  metabarcoding: "Metabarcoding",
  amplicon: "Amplicon",
  wgs: "WGS",
  transcriptomics: "Transcriptomics",
  phylogenetics: "Phylogenetics",
  metagenomics: "Metagenomics",
  "covid-19": "COVID-19",
  installation: "Installation",
  hpc: "HPC",
  troubleshooting: "Troubleshooting",
  programming: "Programming",
};

export const FAQ_TAG_OPTIONS = FAQ_TAGS.map((value) => ({
  value,
  label: FAQ_TAG_LABELS[value],
}));

export const FAQ_TAG_STYLES: Record<FaqTag, string> = {
  metabarcoding: "bg-teal-50 text-teal-800 border-teal-200/70",
  amplicon: "bg-cyan-50 text-cyan-800 border-cyan-200/70",
  wgs: "bg-indigo-50 text-indigo-800 border-indigo-200/70",
  transcriptomics: "bg-violet-50 text-violet-800 border-violet-200/70",
  phylogenetics: "bg-lime-50 text-lime-800 border-lime-200/70",
  metagenomics: "bg-emerald-50 text-emerald-800 border-emerald-200/70",
  "covid-19": "bg-red-50 text-red-800 border-red-200/70",
  installation: "bg-sky-50 text-sky-800 border-sky-200/70",
  hpc: "bg-slate-100 text-slate-700 border-slate-300/70",
  troubleshooting: "bg-rose-50 text-rose-800 border-rose-200/70",
  programming: "bg-orange-50 text-orange-800 border-orange-200/70",
};

export function isFaqTag(value: string): value is FaqTag {
  return (FAQ_TAGS as string[]).includes(value);
}

export function uniqueFaqTags(tags: readonly string[]): FaqTag[] {
  const seen = new Set<FaqTag>();
  const next: FaqTag[] = [];
  for (const tag of tags) {
    if (!isFaqTag(tag) || seen.has(tag)) continue;
    seen.add(tag);
    next.push(tag);
  }
  return next;
}
