export interface ServiceConfigItem {
  id: string;
  title: string;
  href: string;
}

export const SERVICES_CONFIG: ServiceConfigItem[] = [
  {
    id: "sequence-analysis",
    title: "3.1 — Client Sequence Analysis",
    href: "/dashboard/services",
  },
  {
    id: "training",
    title: "3.2 — Training",
    href: "/dashboard/services/training",
  },
  {
    id: "internship",
    title: "3.3 — Internship",
    href: "/dashboard/services/internship",
  },
];
