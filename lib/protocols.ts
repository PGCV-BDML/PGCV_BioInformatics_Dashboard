export type ProtocolMeta = {
  slug: string;
  code: string;
  title: string;
  summary: string;
  category: string;
};

export const PROTOCOLS: ProtocolMeta[] = [
  {
    slug: "service-report-tracker",
    code: "SOP-BIOINFO-SR-001",
    title: "Tracking Service Reports",
    summary:
      "Record a client sequence analysis from intake through peer review, e-signature, approval, and client delivery.",
    category: "Sequence Analysis",
  },
  {
    slug: "training-programs",
    code: "SOP-BIOINFO-TR-001",
    title: "Training Programs",
    summary:
      "Set up a training cohort, enroll trainees, deliver modules and tests, collect the evaluation, and issue certificates.",
    category: "Training",
  },
  {
    slug: "internship-programs",
    code: "SOP-BIOINFO-IN-001",
    title: "Internship Programs",
    summary:
      "Set up an internship cohort, enroll interns, deliver modules and tests, collect the evaluation, and issue certificates.",
    category: "Internship",
  },
  {
    slug: "covid-sample-tracker",
    code: "SOP-BIOINFO-CV-001",
    title: "Tracking COVID-19 Samples",
    summary:
      "Record SARS-CoV-2 genomic surveillance runs from receipt through lineage assignment and GISAID / ISLAP upload.",
    category: "COVID-19",
  },
  {
    slug: "genome-assembly",
    code: "SOP-BIOINFO-GA-001",
    title: "Short-read Genome Assembly",
    summary:
      "QC, trim, downsample, assemble, map, and identify short paired-end reads with the PGCV utility script.",
    category: "Sequence Analysis",
  },
];

export const DEFAULT_PROTOCOL_SLUG = PROTOCOLS[0]?.slug ?? "service-report-tracker";

export function getProtocolBySlug(slug: string): ProtocolMeta | undefined {
  return PROTOCOLS.find((protocol) => protocol.slug === slug);
}
