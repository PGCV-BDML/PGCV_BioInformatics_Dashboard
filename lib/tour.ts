/**
 * Lab Tour content model. The live copy is tour.json in the private
 * pgcv-tour-content repo (see lib/tour-content.ts); FALLBACK_TOUR below is
 * used when GitHub is unreachable or the file fails validation, so a tour
 * never shows an error page in front of visitors.
 */

export const AUDIENCES = ["students", "general", "technical"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const AUDIENCE_LABELS: Record<Audience, string> = {
  students: "Students",
  general: "General",
  technical: "Technical",
};

/** A plain string, or one string per audience with `general` required. */
export type TourText = string | ({ general: string } & Partial<Record<Audience, string>>);

export const SERVICE_COLORS = ["purple", "magenta", "mint", "coral", "indigo"] as const;
export type ServiceColor = (typeof SERVICE_COLORS)[number];

export type TourService = {
  id: string;
  code: string;
  color: ServiceColor;
  name: string;
  tag: string;
  summary: TourText;
};

export type TourSpec = { value: string; unit: string; label: string };

export type TourInfrastructureItem = {
  id: string;
  kicker: string;
  name: string;
  image: string | null;
  description: TourText;
  specs: TourSpec[];
};

export type TourTraining = { name: string; image: string | null };

export type TourMember = {
  id: string;
  nickname: string;
  fullName: string;
  position: string;
  image: string | null;
};

export type TourVideo = {
  id: string;
  title: string;
  duration: string | null;
  youtubeId: string | null;
  url: string | null;
};

export type TourContent = {
  hero: {
    eyebrow: string;
    title: string;
    intro: TourText;
    facts: { value: string; label: string }[];
  };
  services: { title: string; intro: TourText; items: TourService[] };
  infrastructure: { title: string; analogy: TourText; items: TourInfrastructureItem[] };
  trainings: { title: string; intro: TourText; items: TourTraining[] };
  covid: { title: string; intro: TourText };
  team: {
    title: string;
    intro: TourText;
    members: TourMember[];
    joinCard: { title: string; body: string } | null;
  };
  videos: { title: string; items: TourVideo[] };
  contact: {
    title: string;
    intro: TourText;
    emails: { label: string; address: string }[];
    social: { handle: string; platforms: string[] } | null;
  };
};

export function resolveText(text: TourText, audience: Audience): string {
  if (typeof text === "string") return text;
  return text[audience] || text.general;
}

/** Repo-relative image paths we are willing to proxy from the content repo. */
export function isSafeTourAssetPath(path: string): boolean {
  if (!path || path.length > 256 || path.includes("\\")) return false;
  const segments = path.split("/");
  if (segments[0] !== "images" || segments.length < 2) return false;
  if (!segments.every((s) => s.length > 0 && !s.startsWith("."))) return false;
  return /\.(jpe?g|png|webp)$/i.test(path);
}

export function tourAssetUrl(path: string | null): string | null {
  if (!path || !isSafeTourAssetPath(path)) return null;
  return `/api/tour/asset/${path.split("/").map(encodeURIComponent).join("/")}`;
}

// --- Parsing -----------------------------------------------------------------

export class TourContentError extends Error {}

type Obj = Record<string, unknown>;

function obj(value: unknown, where: string): Obj {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TourContentError(`${where} must be an object`);
  }
  return value as Obj;
}

function str(value: unknown, where: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new TourContentError(`${where} must be a non-empty string`);
  }
  return value.trim();
}

function optStr(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function arr(value: unknown, where: string): unknown[] {
  if (!Array.isArray(value)) throw new TourContentError(`${where} must be an array`);
  return value;
}

function text(value: unknown, where: string): TourText {
  if (typeof value === "string") return str(value, where);
  const o = obj(value, where);
  const out: { general: string } & Partial<Record<Audience, string>> = {
    general: str(o.general, `${where}.general`),
  };
  for (const audience of AUDIENCES) {
    const v = optStr(o[audience]);
    if (v) out[audience] = v;
  }
  return out;
}

function image(value: unknown): string | null {
  const path = optStr(value);
  return path && isSafeTourAssetPath(path) ? path : null;
}

export function parseTourContent(raw: unknown): TourContent {
  const root = obj(raw, "tour.json");
  if (root.version !== 1) {
    throw new TourContentError("tour.json version must be 1");
  }

  const hero = obj(root.hero, "hero");
  const services = obj(root.services, "services");
  const infra = obj(root.infrastructure, "infrastructure");
  const trainings = obj(root.trainings, "trainings");
  const covid = obj(root.covid, "covid");
  const team = obj(root.team, "team");
  const videos = obj(root.videos ?? { title: "Videos", items: [] }, "videos");
  const contact = obj(root.contact, "contact");
  const joinCard = team.joinCard ? obj(team.joinCard, "team.joinCard") : null;
  const social = contact.social ? obj(contact.social, "contact.social") : null;

  return {
    hero: {
      eyebrow: str(hero.eyebrow, "hero.eyebrow"),
      title: str(hero.title, "hero.title"),
      intro: text(hero.intro, "hero.intro"),
      facts: arr(hero.facts, "hero.facts").map((f, i) => {
        const o = obj(f, `hero.facts[${i}]`);
        return {
          value: str(o.value, `hero.facts[${i}].value`),
          label: str(o.label, `hero.facts[${i}].label`),
        };
      }),
    },
    services: {
      title: str(services.title, "services.title"),
      intro: text(services.intro, "services.intro"),
      items: arr(services.items, "services.items").map((s, i) => {
        const o = obj(s, `services.items[${i}]`);
        const color = o.color as ServiceColor;
        return {
          id: str(o.id, `services.items[${i}].id`),
          code: str(o.code, `services.items[${i}].code`),
          color: SERVICE_COLORS.includes(color) ? color : "purple",
          name: str(o.name, `services.items[${i}].name`),
          tag: optStr(o.tag) ?? "",
          summary: text(o.summary, `services.items[${i}].summary`),
        };
      }),
    },
    infrastructure: {
      title: str(infra.title, "infrastructure.title"),
      analogy: text(infra.analogy, "infrastructure.analogy"),
      items: arr(infra.items, "infrastructure.items").map((it, i) => {
        const o = obj(it, `infrastructure.items[${i}]`);
        return {
          id: str(o.id, `infrastructure.items[${i}].id`),
          kicker: optStr(o.kicker) ?? "",
          name: str(o.name, `infrastructure.items[${i}].name`),
          image: image(o.image),
          description: text(o.description, `infrastructure.items[${i}].description`),
          specs: arr(o.specs ?? [], `infrastructure.items[${i}].specs`).map((sp, j) => {
            const so = obj(sp, `infrastructure.items[${i}].specs[${j}]`);
            return {
              value: str(so.value, `infrastructure.items[${i}].specs[${j}].value`),
              unit: optStr(so.unit) ?? "",
              label: optStr(so.label) ?? "",
            };
          }),
        };
      }),
    },
    trainings: {
      title: str(trainings.title, "trainings.title"),
      intro: text(trainings.intro, "trainings.intro"),
      items: arr(trainings.items, "trainings.items").map((t, i) => {
        const o = obj(t, `trainings.items[${i}]`);
        return { name: str(o.name, `trainings.items[${i}].name`), image: image(o.image) };
      }),
    },
    covid: {
      title: str(covid.title, "covid.title"),
      intro: text(covid.intro, "covid.intro"),
    },
    team: {
      title: str(team.title, "team.title"),
      intro: text(team.intro, "team.intro"),
      members: arr(team.members, "team.members").map((m, i) => {
        const o = obj(m, `team.members[${i}]`);
        return {
          id: str(o.id, `team.members[${i}].id`),
          nickname: str(o.nickname, `team.members[${i}].nickname`),
          fullName: optStr(o.fullName) ?? str(o.nickname, `team.members[${i}].nickname`),
          position: str(o.position, `team.members[${i}].position`),
          image: image(o.image),
        };
      }),
      joinCard: joinCard
        ? { title: str(joinCard.title, "team.joinCard.title"), body: str(joinCard.body, "team.joinCard.body") }
        : null,
    },
    videos: {
      title: optStr(videos.title) ?? "Videos",
      items: arr(videos.items ?? [], "videos.items").flatMap((v, i) => {
        const o = obj(v, `videos.items[${i}]`);
        const youtubeId = optStr(o.youtubeId);
        const url = optStr(o.url);
        const validYoutube = youtubeId && /^[A-Za-z0-9_-]{11}$/.test(youtubeId) ? youtubeId : null;
        const validUrl = url && /^https:\/\//.test(url) ? url : null;
        if (!validYoutube && !validUrl) return [];
        return [{
          id: str(o.id, `videos.items[${i}].id`),
          title: str(o.title, `videos.items[${i}].title`),
          duration: optStr(o.duration),
          youtubeId: validYoutube,
          url: validYoutube ? null : validUrl,
        }];
      }),
    },
    contact: {
      title: str(contact.title, "contact.title"),
      intro: text(contact.intro, "contact.intro"),
      emails: arr(contact.emails, "contact.emails").map((e, i) => {
        const o = obj(e, `contact.emails[${i}]`);
        return {
          label: str(o.label, `contact.emails[${i}].label`),
          address: str(o.address, `contact.emails[${i}].address`),
        };
      }),
      social: social
        ? {
            handle: str(social.handle, "contact.social.handle"),
            platforms: arr(social.platforms ?? [], "contact.social.platforms").flatMap((p) =>
              typeof p === "string" && p.trim() ? [p.trim()] : [],
            ),
          }
        : null,
    },
  };
}

// --- Built-in fallback (text only; no portraits) ------------------------------

export const FALLBACK_TOUR: TourContent = {
  hero: {
    eyebrow: "Welcome to the lab tour",
    title: "Reading the genomes of the Visayas",
    intro:
      "The Bioinformatics and Data Management Laboratory of the Philippine Genome Center Visayas turns raw DNA and RNA sequence data into answers — and trains the next generation of bioinformaticians.",
    facts: [
      { value: "120", label: "CPU cores in our HPC server" },
      { value: "360 TB", label: "of genomic data storage" },
      { value: "5", label: "bioinformatics services" },
    ],
  },
  services: {
    title: "Our services",
    intro: "From a single gene to a whole genome — for researchers, hospitals, agencies and schools.",
    items: [
      { id: "sequence-assembly", code: "SA", color: "purple", name: "Sequence Assembly", tag: "amplicons to whole genomes", summary: "Rebuilding a full DNA sequence from many small fragments — from PCR amplicons up to whole genomes." },
      { id: "dna-barcoding", code: "BC", color: "magenta", name: "DNA Barcoding", tag: "fish · plants · microbes", summary: "Identifying species from a short, standard stretch of DNA." },
      { id: "metagenomics", code: "MG", color: "mint", name: "Metagenomics", tag: "16S / 18S rRNA", summary: "Finding out which microbes live together in an environment." },
      { id: "transcriptomics", code: "TX", color: "coral", name: "Transcriptomics", tag: "RNA-seq", summary: "Measuring which genes are switched on or off, and how strongly." },
      { id: "training", code: "TR", color: "indigo", name: "Bioinformatics Training", tag: "students · researchers", summary: "Hands-on courses from basic coding to whole-genome analysis." },
    ],
  },
  infrastructure: {
    title: "Our computing infrastructure",
    analogy: "A laptop would take weeks to process one genome. Our HPC server does it in hours.",
    items: [
      {
        id: "hpc",
        kicker: "High-performance computing",
        name: "HPC Server",
        image: null,
        description: "Where every assembly, barcoding tree and gene expression analysis is computed.",
        specs: [
          { value: "120", unit: "cores", label: "processing power" },
          { value: "640", unit: "GB", label: "RAM (memory)" },
          { value: "360", unit: "TB", label: "storage" },
        ],
      },
    ],
  },
  trainings: { title: "Bioinformatics trainings", intro: "Hands-on workshops run in our own computer lab.", items: [] },
  covid: {
    title: "COVID-19 genomic surveillance",
    intro: "Our lab was at the forefront of the region's biosurveillance effort during the pandemic.",
  },
  team: { title: "Meet our bioinfo team", intro: "The Bioinformatics and Data Management Laboratory, PGC Visayas.", members: [], joinCard: null },
  videos: { title: "Videos", items: [] },
  contact: {
    title: "Have a sample, a dataset or a question?",
    intro: "Request a service, join a training, or apply for an internship.",
    emails: [{ label: "Bioinformatics Laboratory", address: "bioinfo.pgc.upvisayas@up.edu.ph" }],
    social: { handle: "@PGCVisayas", platforms: [] },
  },
};
