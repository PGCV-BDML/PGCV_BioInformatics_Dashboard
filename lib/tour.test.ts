import { describe, expect, it } from "vitest";
import deerExample from "@/docs/tour-content/visayan-spotted-deer.json";
import {
  FALLBACK_TOUR,
  isSafeTourAssetPath,
  isSafeTourAudioPath,
  isSafeTourLabMapPath,
  LAB_MAP_CSP,
  parseTourContent,
  resolveText,
  TourContentError,
  tourAssetUrl,
  tourMusicUrl,
} from "@/lib/tour";

function minimalTour(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    hero: { eyebrow: "Welcome", title: "Title", intro: "Intro", facts: [{ value: "120", label: "cores" }] },
    services: {
      title: "Services",
      intro: "From a gene to a genome",
      items: [
        {
          id: "barcoding",
          code: "BC",
          color: "magenta",
          name: "DNA Barcoding",
          tag: "fish",
          summary: { general: "General copy", students: "Student copy" },
        },
      ],
    },
    infrastructure: {
      title: "Infra",
      analogy: "Like 120 brains",
      items: [
        {
          id: "hpc",
          name: "HPC Server",
          image: "images/infrastructure/hpc-rack.png",
          description: "Computes everything",
          specs: [{ value: "120", unit: "cores", label: "processing power" }],
        },
      ],
    },
    trainings: { title: "Trainings", intro: "Workshops", items: [{ name: "Basic Coding", image: "images/trainings/basic-coding.jpg" }] },
    covid: { title: "COVID-19", intro: "Biosurveillance" },
    team: {
      title: "Team",
      intro: "The lab",
      members: [{ id: "micah", nickname: "Micah", fullName: "Micah Danielle Lojera", position: "Senior Research Associate", image: "images/team/micah.jpg" }],
    },
    videos: { title: "Videos", items: [] },
    contact: {
      title: "Contact",
      intro: "Write to us",
      emails: [{ label: "Bioinformatics Laboratory", address: "bioinfo.pgc.upvisayas@up.edu.ph" }],
      social: { handle: "@PGCVisayas", platforms: ["Facebook", 3, ""] },
      qrCodes: [
        { label: "Website", url: "https://pgcvisayas.upv.edu.ph/" },
        { label: "Bad link", url: "javascript:alert(1)" },
      ],
    },
    ...overrides,
  };
}

describe("parseTourContent", () => {
  it("parses a complete tour.json", () => {
    const tour = parseTourContent(minimalTour());
    expect(tour.services.items[0]).toMatchObject({ id: "barcoding", color: "magenta" });
    expect(tour.infrastructure.items[0]!.image).toBe("images/infrastructure/hpc-rack.png");
    expect(tour.team.members[0]!.fullName).toBe("Micah Danielle Lojera");
    expect(tour.contact.social?.platforms).toEqual(["Facebook"]);
    expect(tour.contact.qrCodes).toEqual([{ label: "Website", url: "https://pgcvisayas.upv.edu.ph/" }]);
  });

  it("rejects an unknown schema version", () => {
    expect(() => parseTourContent(minimalTour({ version: 2 }))).toThrow(TourContentError);
  });

  it("rejects audience text without a general version", () => {
    const raw = minimalTour();
    raw.hero.intro = { students: "Only students" } as unknown as string;
    expect(() => parseTourContent(raw)).toThrow(/hero\.intro\.general/);
  });

  it("falls back to purple for an unknown service color", () => {
    const raw = minimalTour();
    raw.services.items[0]!.color = "neon";
    expect(parseTourContent(raw).services.items[0]!.color).toBe("purple");
  });

  it("drops image paths outside images/", () => {
    const raw = minimalTour();
    raw.team.members[0]!.image = "../secrets.png";
    raw.trainings.items[0]!.image = "tour.json";
    const tour = parseTourContent(raw);
    expect(tour.team.members[0]!.image).toBeNull();
    expect(tour.trainings.items[0]!.image).toBeNull();
  });

  it("keeps only videos with a valid YouTube id or https URL", () => {
    const tour = parseTourContent(
      minimalTour({
        videos: {
          title: "Videos",
          items: [
            { id: "a", title: "YouTube", youtubeId: "abcdefghijk" },
            { id: "b", title: "Release asset", url: "https://github.com/x/releases/download/v1/a.mp4" },
            { id: "c", title: "Bad id", youtubeId: "nope" },
            { id: "d", title: "Plain http", url: "http://example.com/a.mp4" },
          ],
        },
      }),
    );
    expect(tour.videos.items.map((v) => v.id)).toEqual(["a", "b"]);
  });

  it("treats a missing videos block as no videos", () => {
    const raw = minimalTour();
    delete (raw as Record<string, unknown>).videos;
    expect(parseTourContent(raw).videos.items).toEqual([]);
  });
});

describe("resolveText", () => {
  it("uses the audience version when present and general otherwise", () => {
    const text = { general: "General", students: "Students" };
    expect(resolveText(text, "students")).toBe("Students");
    expect(resolveText(text, "technical")).toBe("General");
    expect(resolveText("Plain", "technical")).toBe("Plain");
  });
});

describe("tour asset paths", () => {
  it("only allows images under images/", () => {
    expect(isSafeTourAssetPath("images/team/micah.jpg")).toBe(true);
    expect(isSafeTourAssetPath("images/infrastructure/hpc-rack.PNG")).toBe(true);
    expect(isSafeTourAssetPath("tour.json")).toBe(false);
    expect(isSafeTourAssetPath("images/../tour.json")).toBe(false);
    expect(isSafeTourAssetPath("images/.hidden.jpg")).toBe(false);
    expect(isSafeTourAssetPath("images/notes.md")).toBe(false);
    expect(isSafeTourAssetPath("images\\team\\a.jpg")).toBe(false);
  });

  it("builds proxy URLs only for safe paths", () => {
    expect(tourAssetUrl("images/team/micah.jpg")).toBe("/api/tour/asset/images/team/micah.jpg");
    expect(tourAssetUrl("README.md")).toBeNull();
    expect(tourAssetUrl(null)).toBeNull();
  });

  it("only allows music under audio/", () => {
    expect(isSafeTourAudioPath("audio/corporate.mp3")).toBe(true);
    expect(isSafeTourAudioPath("audio/loop.M4A")).toBe(true);
    expect(isSafeTourAudioPath("images/team/micah.jpg")).toBe(false);
    expect(isSafeTourAudioPath("audio/../tour.json")).toBe(false);
    expect(isSafeTourAudioPath("audio/notes.txt")).toBe(false);
    expect(tourMusicUrl("audio/corporate.mp3")).toBe("/api/tour/asset/audio/corporate.mp3");
    expect(tourMusicUrl("images/team/micah.jpg")).toBeNull();
    expect(tourAssetUrl("audio/corporate.mp3")).toBeNull();
  });

  it("keeps a safe music path and drops anything else", () => {
    expect(parseTourContent(minimalTour({ music: "audio/corporate.mp3" })).music).toBe("audio/corporate.mp3");
    expect(parseTourContent(minimalTour({ music: "tour.json" })).music).toBeNull();
    expect(parseTourContent(minimalTour()).music).toBeNull();
  });
});

describe("FALLBACK_TOUR", () => {
  it("survives a round trip through the parser", () => {
    expect(() => parseTourContent({ version: 1, ...FALLBACK_TOUR })).not.toThrow();
  });

  it("parses optional projects and the variant tree block", () => {
    const tour = parseTourContent(
      minimalTour({
        projects: {
          title: "Projects",
          intro: "Genomes we assembled",
          items: [
            {
              id: "rusa",
              title: "First draft genome of the Visayan spotted deer",
              species: "Rusa alfredi",
              summary: "Summary",
              highlights: [{ value: "2.6", unit: "Gb", label: "assembly" }],
              partners: ["Partner", ""],
            },
          ],
        },
        nextstrain: { title: "Variant tree", intro: "Intro", tree: "nextstrain/tree.json" },
      }),
    );
    expect(tour.projects.items[0]).toMatchObject({ species: "Rusa alfredi", image: null, partners: ["Partner"] });
    expect(tour.nextstrain?.tree).toBe("nextstrain/tree.json");
  });

  it("leaves projects empty and the variant tree off when omitted or unsafe", () => {
    expect(parseTourContent(minimalTour()).projects.items).toEqual([]);
    expect(parseTourContent(minimalTour()).nextstrain).toBeNull();
    const unsafe = minimalTour({ nextstrain: { title: "T", intro: "I", tree: "../secrets.json" } });
    expect(parseTourContent(unsafe).nextstrain).toBeNull();
  });

  it("reads the 3D virus block only with safe pgc-covid-exhibit paths", () => {
    const virusModel = {
      title: "Meet the virus",
      intro: { general: "Turn it around" },
      scene: "pgc-covid-exhibit/models/virus-scene.json",
      structure: "pgc-covid-exhibit/models/spike-7KJ2.pdb",
      data: "pgc-covid-exhibit/public-data.json",
    };
    expect(parseTourContent(minimalTour({ virusModel })).virusModel).toMatchObject(virusModel);
    expect(parseTourContent(minimalTour()).virusModel).toBeNull();
    const unsafe = minimalTour({ virusModel: { ...virusModel, structure: "images/../tour.pdb" } });
    expect(parseTourContent(unsafe).virusModel).toBeNull();
  });
});

describe("lab map", () => {
  it("reads the lab map block only with a safe lab-map/*.html path", () => {
    const labMap = { title: "Explore the lab", intro: { general: "Walk the rooms" }, src: "lab-map/index.html" };
    expect(parseTourContent(minimalTour({ labMap })).labMap).toMatchObject(labMap);
    expect(parseTourContent(minimalTour()).labMap).toBeNull();
    for (const src of ["index.html", "lab-map/../tour.json", "lab-map/.secret.html", "lab-map/map.js", "images/x.html"]) {
      expect(parseTourContent(minimalTour({ labMap: { ...labMap, src } })).labMap).toBeNull();
    }
  });

  it("is served sandboxed, without same-origin access, and framed only by the tour", () => {
    expect(isSafeTourLabMapPath("lab-map/v2/index.HTML")).toBe(true);
    expect(LAB_MAP_CSP).toMatch(/^sandbox allow-scripts;/);
    expect(LAB_MAP_CSP).not.toContain("allow-same-origin");
    expect(LAB_MAP_CSP).toContain("frame-ancestors 'self'");
  });
});

describe("featured project fields", () => {
  const withProject = (item: Record<string, unknown>) =>
    parseTourContent(minimalTour({ projects: { title: "P", intro: "I", items: [{ id: "x", title: "T", summary: "S", ...item }] } }))
      .projects.items[0]!;

  it("parses the documented Visayan spotted deer example", () => {
    const deer = parseTourContent(minimalTour({ projects: deerExample })).projects.items[0]!;
    expect(deer).toMatchObject({
      species: "Rusa alfredi",
      image: "images/projects/abraham.jpg",
      conservation: { code: "EN" },
      range: { current: ["Panay", "Negros"], former: ["Cebu", "Guimaras", "Masbate"] },
      citation: { url: "https://doi.org/10.46471/gigabyte.150" },
    });
    expect(deer.steps).toHaveLength(5);
    expect(deer.steps.every((step) => step.state === "done")).toBe(true);
    expect(resolveText(deer.next!, "technical")).toMatch(/Hi-C/);
  });

  it("defaults every new field when it is left out", () => {
    expect(withProject({})).toMatchObject({
      commonName: null,
      imageFocus: null,
      imageTitle: null,
      imageCredit: null,
      conservation: null,
      facts: [],
      range: null,
      steps: [],
      next: null,
      citation: null,
    });
  });

  it("accepts only percentage pairs as a photo focus", () => {
    expect(withProject({ imageFocus: "35% 55%" }).imageFocus).toBe("35% 55%");
    expect(withProject({ imageFocus: "left; background: red" }).imageFocus).toBeNull();
    expect(withProject({ imageFocus: "150% 0%" }).imageFocus).toBeNull();
  });

  it("reads an unknown step state as done", () => {
    expect(withProject({ steps: [{ label: "Sample", state: "finished" }] }).steps[0]).toEqual({
      label: "Sample",
      note: "",
      state: "done",
    });
  });

  it("drops a citation whose link is not http(s)", () => {
    expect(withProject({ citation: { text: "Paper", url: "javascript:alert(1)" } }).citation).toBeNull();
    expect(withProject({ citation: { text: "Paper", url: "not a url" } }).citation).toBeNull();
  });
});
