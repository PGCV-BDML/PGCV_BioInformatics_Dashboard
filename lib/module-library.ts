import type { ProgramType } from "@/lib/routes";

export type ModuleLibraryItem = {
  id: string;
  title: string;
  htmlPath: string;
  /** Which program types this asset is intended for */
  tags: ProgramType[];
  /** Optional UI group label in the picker */
  group?: string;
};

export type ModuleLibraryPack = {
  id: string;
  title: string;
  description: string;
  itemIds: string[];
  tags: ProgramType[];
};

/**
 * Prepared HTML modules shipped under public/assets/Training.
 * Add new files here after committing assets to the repo.
 */
export const MODULE_LIBRARY: ModuleLibraryItem[] = [
  {
    id: "setting-up-workstation",
    title: "Setting Up Workstation",
    htmlPath: "/assets/Training/setting-up-workstation.html",
    tags: ["training", "internship"],
    group: "Foundations",
  },
  {
    id: "basic-coding-module",
    title: "Basic Coding Module",
    htmlPath: "/assets/Training/basic-coding-module.html",
    tags: ["training", "internship"],
    group: "Foundations",
  },
  {
    id: "dna-barcoding-module",
    title: "DNA Barcoding Module",
    htmlPath: "/assets/Training/dna-barcoding-module.html",
    tags: ["training", "internship"],
    group: "Core methods",
  },
  {
    id: "transcriptome-module",
    title: "Transcriptome Module",
    htmlPath: "/assets/Training/transcriptome-module.html",
    tags: ["training", "internship"],
    group: "Core methods",
  },
  {
    id: "phylogenetic-analysis-internship-module",
    title: "Phylogenetic Analysis Module",
    htmlPath: "/assets/Training/phylogenetic-analysis-internship-module.html",
    tags: ["training", "internship"],
    group: "Core methods",
  },
  {
    id: "16s-metagenomics-module",
    title: "16S Metagenomics Module",
    htmlPath: "/assets/Training/Metagenomics/16s-metagenomics-module.html",
    tags: ["training", "internship"],
    group: "Metagenomics",
  },
  {
    id: "r-short-course",
    title: "R Short Course",
    htmlPath: "/assets/Training/Metagenomics/R-short-course.html",
    tags: ["training", "internship"],
    group: "Metagenomics",
  },
  {
    id: "whole-genome-assembly-module-with-lecture",
    title: "Whole Genome Assembly (with lecture)",
    htmlPath:
      "/assets/Training/Whole Genome Assembly/whole-genome-assembly-module-with-lecture.html",
    tags: ["training", "internship"],
    group: "Whole Genome Assembly",
  },
  {
    id: "tygs-guide",
    title: "TYGS Guide",
    htmlPath:
      "/assets/Training/Whole Genome Assembly/Other Downstream Analyses/tygs-guide.html",
    tags: ["training", "internship"],
    group: "Whole Genome Assembly",
  },
  {
    id: "proksee-guide",
    title: "Proksee Guide",
    htmlPath:
      "/assets/Training/Whole Genome Assembly/Other Downstream Analyses/proksee-guide.html",
    tags: ["training", "internship"],
    group: "Whole Genome Assembly",
  },
  {
    id: "ggdc-guide",
    title: "GGDC Guide",
    htmlPath:
      "/assets/Training/Whole Genome Assembly/Other Downstream Analyses/ggdc-guide.html",
    tags: ["training", "internship"],
    group: "Whole Genome Assembly",
  },
];

export const MODULE_LIBRARY_PACKS: ModuleLibraryPack[] = [
  {
    id: "pack-metagenomics",
    title: "Metagenomics pack",
    description: "16S metagenomics + R short course",
    itemIds: ["16s-metagenomics-module", "r-short-course"],
    tags: ["training", "internship"],
  },
  {
    id: "pack-wga",
    title: "Whole Genome Assembly pack",
    description: "WGA lecture module + TYGS, Proksee, and GGDC guides",
    itemIds: [
      "whole-genome-assembly-module-with-lecture",
      "tygs-guide",
      "proksee-guide",
      "ggdc-guide",
    ],
    tags: ["training", "internship"],
  },
];

export function getLibraryItem(id: string): ModuleLibraryItem | undefined {
  return MODULE_LIBRARY.find((item) => item.id === id);
}

export function libraryForProgramType(
  programType: ProgramType,
): ModuleLibraryItem[] {
  return MODULE_LIBRARY.filter((item) => item.tags.includes(programType));
}

export function packsForProgramType(
  programType: ProgramType,
): ModuleLibraryPack[] {
  return MODULE_LIBRARY_PACKS.filter((pack) =>
    pack.tags.includes(programType),
  );
}

export function expandPackItemIds(packId: string): ModuleLibraryItem[] {
  const pack = MODULE_LIBRARY_PACKS.find((p) => p.id === packId);
  if (!pack) return [];
  return pack.itemIds
    .map((id) => getLibraryItem(id))
    .filter((item): item is ModuleLibraryItem => Boolean(item));
}
