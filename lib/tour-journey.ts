/**
 * Copy for the tour's "From sample to sequence" slide, shown right after
 * "What is bioinformatics?". It is the same for every visit, so it lives in
 * code rather than in tour.json.
 */

import type { TourText } from "@/lib/tour";

export const JOURNEY_STEP_IDS = ["sample", "sequencer", "server", "results"] as const;
export type JourneyStepId = (typeof JOURNEY_STEP_IDS)[number];

export type JourneyStep = {
  id: JourneyStepId;
  name: string;
  text: TourText;
  /** What the sample has become by the end of this step. */
  now: TourText;
};

export const JOURNEY_TITLE = "From sample to sequence";

export const JOURNEY_INTRO: TourText = {
  general: "What happens to a sample between the day it arrives and the day we send back results.",
  students: "How do you read DNA? Follow one sample from a tube to an answer.",
  technical:
    "From specimen to result: extraction, library preparation, sequencing by synthesis, then analysis on our HPC server.",
};

/** The machines named under the sequencing step. */
export const JOURNEY_SEQUENCERS = "Illumina NextSeq 1000 · iSeq 100";

export const JOURNEY_STEPS: JourneyStep[] = [
  {
    id: "sample",
    name: "Sample",
    text: {
      general: "It starts with a sample: a swab, blood, a leaf or a scoop of soil. The DNA inside is pulled out and cleaned.",
      students:
        "It starts with something that is, or was, alive: a swab, a drop of blood, a leaf or some soil. We pull the DNA out of its cells.",
      technical:
        "Nucleic acids are extracted from the specimen and checked for quantity and purity before library preparation.",
    },
    now: { general: "A few drops of DNA", technical: "Purified DNA or RNA" },
  },
  {
    id: "sequencer",
    name: "Sequencer",
    text: {
      general:
        "The DNA is cut into short pieces and loaded onto a glass flow cell. Each round, every piece gains one glowing letter and a camera photographs the colours.",
      students:
        "The DNA is chopped into short pieces that stick to a glass slide. Each round, every piece gets one glowing letter and a camera takes a photo. Colour = letter!",
      technical:
        "Adapter-tagged fragments are clustered on a flow cell and read by sequencing by synthesis: one fluorescent, reversibly terminated base per cycle, imaged and base-called. Drawn here with four colours; the NextSeq uses two, the iSeq one.",
    },
    now: { general: "Millions of short reads", technical: "FASTQ files: millions of reads with quality scores" },
  },
  {
    id: "server",
    name: "Server",
    text: {
      general: "Our HPC server lines up the overlapping reads and rebuilds the full sequence, in hours instead of weeks.",
      students:
        "The pieces overlap, like a jigsaw. Our HPC server finds where each one fits and rebuilds the whole sequence.",
      technical:
        "Reads are quality-checked and trimmed, then mapped to a reference or assembled de novo on our HPC server.",
    },
    now: { general: "One full sequence, or a genome", technical: "Alignments, assemblies and variant calls" },
  },
  {
    id: "results",
    name: "Results",
    text: {
      general:
        "We compare it with DNA from around the world to name the species, spot a variant or build a family tree, then send a report.",
      students: "We compare it with DNA from all over the world to answer the question: which species, which gene, which virus?",
      technical:
        "Results are compared against public databases for identification, phylogenetics and annotation, then written up in a service report.",
    },
    now: { general: "An answer, plus a report", students: "An answer!", technical: "Figures, tables and a service report" },
  },
];
