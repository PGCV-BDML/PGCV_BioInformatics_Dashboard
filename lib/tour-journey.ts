/**
 * Copy for the tour's "From sample to sequence" slide, shown right after
 * "What is bioinformatics?". It is the same for every visit, so it lives in
 * code rather than in tour.json.
 */

import type { TourText } from "@/lib/tour";

export const JOURNEY_STEP_IDS = ["sample", "sequencer", "storage", "server", "results"] as const;
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
    "From specimen to result: extraction, library preparation, sequencing by synthesis, automatic transfer to storage, then analysis on our HPC server.",
};

/** The machines named under the sequencing step. */
export const JOURNEY_SEQUENCERS = "Illumina NextSeq 1000 · iSeq 100";

/**
 * The address typed on the laptop in the analysis scene. Made up on purpose:
 * the tour is public, so it never shows the HPC server's real address.
 */
export const JOURNEY_HPC_ADDRESS = "10.0.0.25";

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
    id: "storage",
    name: "Storage",
    text: {
      general:
        "When a run finishes, the sequencer sends its files over the lab network straight to our storage server. Nobody has to carry them on a flash drive.",
      students:
        "The sequencer doesn't keep the data. As soon as it finishes, it sends the files down a cable to a giant storage server, all by itself.",
      technical:
        "At the end of each run, the output is copied automatically over the lab network to the storage server, with no portable drives in between.",
    },
    now: { general: "The reads, saved safely", technical: "Run output on the storage server" },
  },
  {
    id: "server",
    name: "Analysis",
    text: {
      general:
        "From our own laptops, we log in to the HPC server by typing its network (IP) address. It lines up the overlapping reads and rebuilds the full sequence, in hours instead of weeks.",
      students:
        "We don't sit at the supercomputer. We connect to it from our laptops by typing its address, then it fits the overlapping pieces together like a jigsaw.",
      technical:
        "Analysts connect to the HPC server over SSH from their own machines. Reads are quality-checked and trimmed, then mapped to a reference or assembled de novo.",
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
