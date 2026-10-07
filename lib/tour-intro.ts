/**
 * Copy for the tour's "What is bioinformatics?" slide, shown before the
 * services. It is the same for every visit, so it lives in code rather than
 * in tour.json.
 */

import type { TourText } from "@/lib/tour";

export const INTRO_FIELD_IDS = ["statistics", "computing", "biology"] as const;
export type IntroFieldId = (typeof INTRO_FIELD_IDS)[number];

export type IntroField = { id: IntroFieldId; name: string; role: TourText };

export const INTRO_TITLE = "What is bioinformatics?";

export const INTRO_DEFINITION: TourText = {
  general: "Using computers and statistics to make sense of biological data, mostly DNA and RNA sequences.",
  students: "It's biology done with computers: we write programs that read DNA and use maths to find out what it means.",
  technical:
    "The computational and statistical analysis of biological data, from raw sequencing reads to assemblies, phylogenies and expression profiles.",
};

/** The three circles, in the order they are drawn: top left, top right, bottom. */
export const INTRO_FIELDS: IntroField[] = [
  {
    id: "statistics",
    name: "Statistics",
    role: {
      general: "tells real signal from noise.",
      students: "tells us if a result is real or just luck.",
      technical: "models error, tests hypotheses and corrects for multiple comparisons.",
    },
  },
  {
    id: "computing",
    name: "Computer science",
    role: {
      general: "handles billions of letters of DNA.",
      students: "lets us search millions of DNA letters in seconds.",
      technical: "supplies the algorithms, data structures and HPC to process terabytes of reads.",
    },
  },
  {
    id: "biology",
    name: "Biology",
    role: {
      general: "asks the questions and checks the answers.",
      students: "asks the questions: which species, which gene, which virus?",
      technical: "frames the question and validates results against what is known in the lab and field.",
    },
  },
];

/** Where two circles meet; bioinformatics is where all three do. */
export const INTRO_OVERLAPS: { fields: [IntroFieldId, IntroFieldId]; name: string }[] = [
  { fields: ["statistics", "computing"], name: "Data science" },
  { fields: ["statistics", "biology"], name: "Biostatistics" },
  { fields: ["computing", "biology"], name: "Computational biology" },
];
