/**
 * PGC Visayas research agenda for the tour: five research areas with two
 * flagship projects each, summarised from the "PGC Visayas Research Agenda"
 * deck (2026). Short names and one-liners for Students and General; the
 * Technical audience gets each project's full title and its partners.
 */

import type { TourText } from "@/lib/tour";

export type AgendaIcon =
  | "health"
  | "food"
  | "conservation"
  | "microbes"
  | "evolution"
  | "shield"
  | "dna"
  | "fish"
  | "bug"
  | "paw"
  | "droplets"
  | "river"
  | "globe"
  | "clam"
  | "shrimp";

export type AgendaProject = {
  id: string;
  icon: AgendaIcon;
  name: string;
  summary: TourText;
  partners: string;
};

export type AgendaArea = {
  id: string;
  icon: AgendaIcon;
  name: TourText;
  projects: AgendaProject[];
};

export const AGENDA_TITLE = "Our research agenda";

export const AGENDA_INTRO: TourText = {
  general: "Five research areas, many partners, one goal: genomics for a better Philippines.",
  students: "We use DNA to help people, farms and nature. Here are some of the projects we work on.",
  technical: "PGC Visayas research priorities, with flagship collaborative projects and partner institutions.",
};

export const AGENDA: AgendaArea[] = [
  {
    id: "health",
    icon: "health",
    name: { general: "Health", technical: "Medicine and human health" },
    projects: [
      {
        id: "biosurveillance",
        icon: "shield",
        name: "Pandemic watch",
        summary: {
          general: "Tracking pathogen genomes in Luzon, Visayas and Mindanao",
          students: "Reading germ DNA to spot outbreaks early",
          technical:
            "Enhancing national pandemic preparedness and response through genomic biosurveillance, using the UP PGC network in Luzon, Visayas and Mindanao",
        },
        partners: "PGC System · DOH · UP-NIH · DBM",
      },
      {
        id: "filipinome",
        icon: "dna",
        name: "Filipino genomes",
        summary: {
          general: "Sequencing Filipinos for precision medicine",
          students: "Reading the DNA of Filipinos to improve health care",
          technical: "FILIPINOme project: whole genome sequencing of Filipinos for precision medicine",
        },
        partners: "Philippine Genome Center · UP-NIH",
      },
    ],
  },
  {
    id: "food",
    icon: "food",
    name: { general: "Food and farming", technical: "Agriculture and food security" },
    projects: [
      {
        id: "tilapia",
        icon: "fish",
        name: "Better tilapia",
        summary: {
          general: "Profiling SpiN tilapia hybrids to guide breeding",
          students: "Using DNA to breed better tilapia",
          technical:
            "IGP–UPV SpiN: integrative genomic profiling of UP Visayas SpiN tilapia hybrids to inform genetic improvement and breeding programs",
        },
        partners: "PGC Visayas · CFOS-IA",
      },
      {
        id: "sugarcane",
        icon: "bug",
        name: "Sugarcane pest",
        summary: {
          general: "Whole genome of the red-striped scale insect",
          students: "Reading the DNA of a bug that harms sugarcane",
          technical: "Whole genome sequencing and genomic characterization of the red-striped sugarcane scale insect",
        },
        partners: "PGC Visayas · Colab Life Sciences",
      },
    ],
  },
  {
    id: "conservation",
    icon: "conservation",
    name: { general: "Conservation", technical: "Environmental and conservation biology" },
    projects: [
      {
        id: "deer-genome",
        icon: "paw",
        name: "Spotted deer genome",
        summary: {
          general: "Draft genome of the endangered Visayan spotted deer",
          students: "Reading the DNA of a rare deer found only here",
          technical: "Draft genome of the endangered Visayan spotted deer (Rusa alfredi), a Philippine endemic species",
        },
        partners: "Silliman University · 2025",
      },
      {
        id: "deer-edna",
        icon: "droplets",
        name: "DNA in the wild",
        summary: {
          general: "Finding the deer from DNA it leaves behind",
          students: "Finding deer from the DNA they leave in soil and water",
          technical: "Establishing eDNA-based monitoring for the Visayan spotted deer (Rusa alfredi)",
        },
        partners: "Talarak Foundation · DENR-NIR · Silliman University · 2026",
      },
    ],
  },
  {
    id: "microbes",
    icon: "microbes",
    name: { general: "Microbes", technical: "Microbial genomics" },
    projects: [
      {
        id: "iloilo-river",
        icon: "river",
        name: "Superbugs in Iloilo River",
        summary: {
          general: "Surveying drug-resistant bacteria and their genes",
          students: "Looking for germs that medicine can't kill",
          technical: "Surveillance of antimicrobial-resistant bacteria and genes in Iloilo River",
        },
        partners: "Division of Biological Sciences, UP Visayas",
      },
      {
        id: "amr-vp",
        icon: "globe",
        name: "Superbugs across borders",
        summary: {
          general: "What drives resistance in Vietnam and the Philippines",
          students: "How medicine-proof germs spread between countries",
          technical:
            "Identifying drivers for the emergence and transmission of key human pathogens and AMR in Vietnam and the Philippines (AMR-VP)",
        },
        partners: "University of the Philippines Manila",
      },
    ],
  },
  {
    id: "evolution",
    icon: "evolution",
    name: { general: "Evolution", technical: "Evolutionary and population genetics" },
    projects: [
      {
        id: "angelwing-clam",
        icon: "clam",
        name: "Angelwing clam",
        summary: {
          general: "Population genetics to guide conservation breeding",
          students: "Using DNA to help a rare clam recover",
          technical:
            "Genomic variation among (meta)populations of the oriental angelwing clam (Pholas orientalis) in Western Visayas: basis for a conservation breeding program",
        },
        partners: "Aklan State University",
      },
      {
        id: "prawn",
        icon: "shrimp",
        name: "Freshwater prawn",
        summary: {
          general: "Mapping prawn populations for better broodstock",
          students: "Finding the best prawns to raise on farms",
          technical:
            "Genetic characterization of Macrobrachium populations in the Philippines for broodstock development and seed production",
        },
        partners: "Western Philippines University",
      },
    ],
  },
];
