import type { FaqTag } from "@/types/database";

export const FAQ_TAGS: FaqTag[] = [
  "installation",
  "conda",
  "python",
  "metabarcoding",
  "amplicon",
  "wgs",
  "rna-seq",
  "phylogenetics",
  "troubleshooting",
  "biology",
  "hpc",
  "advice",
  "programming",
];

export const FAQ_TAG_LABELS: Record<FaqTag, string> = {
  installation: "Installation",
  conda: "Conda",
  python: "Python",
  metabarcoding: "Metabarcoding",
  amplicon: "Amplicon",
  wgs: "WGS",
  "rna-seq": "RNA-seq",
  phylogenetics: "Phylogenetics",
  troubleshooting: "Troubleshooting",
  biology: "Biology",
  hpc: "HPC",
  advice: "Advice",
  programming: "Programming",
};

export const FAQ_TAG_OPTIONS = FAQ_TAGS.map((value) => ({
  value,
  label: FAQ_TAG_LABELS[value],
}));

export const FAQ_TAG_STYLES: Record<FaqTag, string> = {
  installation: "bg-sky-50 text-sky-800 border-sky-200/70",
  conda: "bg-emerald-50 text-emerald-800 border-emerald-200/70",
  python: "bg-amber-50 text-amber-900 border-amber-200/70",
  metabarcoding: "bg-teal-50 text-teal-800 border-teal-200/70",
  amplicon: "bg-cyan-50 text-cyan-800 border-cyan-200/70",
  wgs: "bg-indigo-50 text-indigo-800 border-indigo-200/70",
  "rna-seq": "bg-violet-50 text-violet-800 border-violet-200/70",
  phylogenetics: "bg-lime-50 text-lime-800 border-lime-200/70",
  troubleshooting: "bg-rose-50 text-rose-800 border-rose-200/70",
  biology: "bg-green-50 text-green-800 border-green-200/70",
  hpc: "bg-slate-100 text-slate-700 border-slate-300/70",
  advice: "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200/70",
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
