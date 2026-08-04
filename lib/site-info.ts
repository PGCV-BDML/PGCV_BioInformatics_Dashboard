export const LAB_NAME =
  "Philippine Genome Center Visayas — Bioinformatics and Data Management Laboratory";

export const LAB_SHORT = "PGCV-BDML";

export const APP_VERSION = "0.1.0";

export const APP_MVP_LABEL = "Internship MVP · June–July 2026";

export const SITE_LINKS = {
  labWebsite: {
    label: "pgcvisayas.upv.edu.ph",
    href: "https://pgcvisayas.upv.edu.ph/",
  },
  omicsPortal: {
    label: "omics.pgcvisayas.upv.edu.ph",
    href: "https://omics.pgcvisayas.upv.edu.ph/",
  },
  facebook: {
    label: "@PGCVisayas",
    href: "https://facebook.com/PGCVisayas",
  },
  github: {
    label: "GitHub repository",
    href: "https://github.com/PGCV-BDML/PGCV_BioInformatics_Dashboard",
  },
} as const;

export const CONTACT_EMAILS = {
  bioinformatics: "bioinfo.pgc.upvisayas@gmail.com",
  sequencing: "sequencing.pgc.upvisayas@up.edu.ph",
  office: "pgc.upvisayas@up.edu.ph",
} as const;

export type DevTeamMember = {
  track: string;
  name: string;
  school: string;
};

export const DEVELOPMENT_TEAM: DevTeamMember[] = [
  {
    track: "CompSci",
    name: "Mark Leonel Misola",
    school: "UP Visayas",
  },
  {
    track: "CompSci",
    name: "Chakinzo Sombito",
    school: "UP Visayas",
  },
  {
    track: "CompSci",
    name: "Angelique Margaret Ardeña",
    school: "UP Visayas",
  },
  {
    track: "Biology",
    name: "Kirsten Ashley Macadaeg",
    school: "UP Los Baños",
  },
  {
    track: "Biology",
    name: "Jan Jorenz Nemenzo",
    school: "Visayas State University",
  },
  {
    track: "Biology",
    name: "John Mar Lavilla",
    school: "Pamantasan ng Lungsod ng Maynila",
  },
];

export const TECH_STACK = [
  "Next.js (App Router)",
  "React",
  "Tailwind CSS",
  "Supabase (Auth + PostgreSQL)",
  "Vercel",
  "Recharts",
] as const;
