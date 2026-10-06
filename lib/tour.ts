/**
 * Lab Tour content model. The live copy is tour.json in the private
 * pgcv-tour-content repo (see lib/tour-content.ts); FALLBACK_TOUR below is
 * used when GitHub is unreachable or the file fails validation, so a tour
 * never shows an error page in front of visitors.
 */

import { isSafeTourPhyloPath } from "@/lib/tour-phylo";

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

export const PROJECT_STEP_STATES = ["done", "now", "next"] as const;
export type ProjectStepState = (typeof PROJECT_STEP_STATES)[number];

export type TourProjectStep = { label: string; note: string; state: ProjectStepState };

export type TourProject = {
  id: string;
  title: string;
  /** Scientific name, shown in italics, e.g. "Rusa alfredi". */
  species: string | null;
  /** Everyday name shown after the species, e.g. "Philippine spotted deer". */
  commonName: string | null;
  status: string | null;
  image: string | null;
  /** Which part of the photo stays in frame when it is cropped, as CSS "x% y%". */
  imageFocus: string | null;
  /** Caption on the photo, e.g. "Meet Abraham". */
  imageTitle: string | null;
  /** Shown on the photo; required in practice for any photo we didn't take. */
  imageCredit: string | null;
  /** Red List badge on the photo, e.g. { code: "EN", label: "Endangered · IUCN Red List" }. */
  conservation: { code: string; label: string } | null;
  /** Short extra chips on the photo, e.g. "~700 adults left in the wild". */
  facts: string[];
  /** Where the species lives; `former` islands are shown struck through. */
  range: { title: string; current: string[]; former: string[] } | null;
  summary: TourText;
  highlights: TourSpec[];
  /** Sample-to-result timeline. */
  steps: TourProjectStep[];
  /** "What's next" line under the timeline. */
  next: TourText | null;
  partners: string[];
  /** Paper to cite; `url` (usually the DOI link) also becomes a QR code. */
  citation: { text: string; url: string; note: string | null } | null;
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
  projects: { title: string; intro: TourText; items: TourProject[] };
  covid: { title: string; intro: TourText };
  /** Variant tree slide; `tree` is a nextstrain/*.json path in the content repo. */
  nextstrain: { title: string; intro: TourText; tree: string } | null;
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

function strList(value: unknown, where: string): string[] {
  return arr(value ?? [], where).flatMap((v) => (typeof v === "string" && v.trim() ? [v.trim()] : []));
}

/** "35% 50%"-style crop focus; anything else falls back to the centre. */
function focus(value: unknown): string | null {
  const v = optStr(value);
  return v && /^(100|\d{1,2})% (100|\d{1,2})%$/.test(v) ? v : null;
}

/** Only http(s) links, so a typo can never become a javascript: URL or QR code. */
function httpsUrl(value: unknown): string | null {
  const url = optStr(value);
  if (!url) return null;
  try {
    return ["https:", "http:"].includes(new URL(url).protocol) ? url : null;
  } catch {
    return null;
  }
}

function project(p: unknown, i: number): TourProject {
  const where = `projects.items[${i}]`;
  const o = obj(p, where);

  const conservation = o.conservation == null ? null : obj(o.conservation, `${where}.conservation`);
  const range = o.range == null ? null : obj(o.range, `${where}.range`);
  const citation = o.citation == null ? null : obj(o.citation, `${where}.citation`);
  const citationUrl = citation ? httpsUrl(citation.url) : null;

  return {
    id: str(o.id, `${where}.id`),
    title: str(o.title, `${where}.title`),
    species: optStr(o.species),
    commonName: optStr(o.commonName),
    status: optStr(o.status),
    image: image(o.image),
    imageFocus: focus(o.imageFocus),
    imageTitle: optStr(o.imageTitle),
    imageCredit: optStr(o.imageCredit),
    conservation: conservation
      ? { code: str(conservation.code, `${where}.conservation.code`), label: str(conservation.label, `${where}.conservation.label`) }
      : null,
    facts: strList(o.facts, `${where}.facts`),
    range: range
      ? {
          title: optStr(range.title) ?? "Where it lives",
          current: strList(range.current, `${where}.range.current`),
          former: strList(range.former, `${where}.range.former`),
        }
      : null,
    summary: text(o.summary, `${where}.summary`),
    highlights: arr(o.highlights ?? [], `${where}.highlights`).map((h, j) => {
      const ho = obj(h, `${where}.highlights[${j}]`);
      return {
        value: str(ho.value, `${where}.highlights[${j}].value`),
        unit: optStr(ho.unit) ?? "",
        label: optStr(ho.label) ?? "",
      };
    }),
    steps: arr(o.steps ?? [], `${where}.steps`).map((st, j) => {
      const so = obj(st, `${where}.steps[${j}]`);
      const state = optStr(so.state);
      return {
        label: str(so.label, `${where}.steps[${j}].label`),
        note: optStr(so.note) ?? "",
        // Anything unrecognised reads as finished rather than failing the whole tour.
        state: PROJECT_STEP_STATES.find((s) => s === state) ?? "done",
      };
    }),
    next: o.next == null ? null : text(o.next, `${where}.next`),
    partners: strList(o.partners, `${where}.partners`),
    citation:
      citation && citationUrl
        ? { text: str(citation.text, `${where}.citation.text`), url: citationUrl, note: optStr(citation.note) }
        : null,
  };
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
  const projects = obj(root.projects ?? { title: "Projects", intro: "Projects", items: [] }, "projects");
  const nextstrain = root.nextstrain ? obj(root.nextstrain, "nextstrain") : null;
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
    projects: {
      title: str(projects.title, "projects.title"),
      intro: text(projects.intro, "projects.intro"),
      items: arr(projects.items ?? [], "projects.items").map(project),
    },
    covid: {
      title: str(covid.title, "covid.title"),
      intro: text(covid.intro, "covid.intro"),
    },
    nextstrain:
      nextstrain && isSafeTourPhyloPath(optStr(nextstrain.tree) ?? "")
        ? {
            title: str(nextstrain.title, "nextstrain.title"),
            intro: text(nextstrain.intro, "nextstrain.intro"),
            tree: str(nextstrain.tree, "nextstrain.tree"),
          }
        : null,
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
  projects: { title: "Research projects", intro: "Genomes we have sequenced and assembled.", items: [] },
  covid: {
    title: "COVID-19 genomic surveillance",
    intro: "Our lab was at the forefront of the region's biosurveillance effort during the pandemic.",
  },
  nextstrain: null,
  team: { title: "Meet our bioinfo team", intro: "The Bioinformatics and Data Management Laboratory, PGC Visayas.", members: [], joinCard: null },
  videos: { title: "Videos", items: [] },
  contact: {
    title: "Have a sample, a dataset or a question?",
    intro: "Request a service, join a training, or apply for an internship.",
    emails: [{ label: "Bioinformatics Laboratory", address: "bioinfo.pgc.upvisayas@up.edu.ph" }],
    social: { handle: "@PGCVisayas", platforms: [] },
  },
};
