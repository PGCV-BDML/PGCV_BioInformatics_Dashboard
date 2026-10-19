import { describe, expect, it } from "vitest";
import {
  groupPresentationItems,
  parsePresentationManifest,
  presentationIdFromLink,
  presentationLinkForId,
} from "@/lib/presentation-library";

describe("parsePresentationManifest", () => {
  it("maps a root HTML deck and a deck inside a folder", () => {
    const items = parsePresentationManifest({
      presentations: [
        {
          id: "basic-coding",
          name: "Basics of the Linux Command Line",
          entry: "basic-coding.html",
          track: "Foundations",
          summary: "Linux command line.",
        },
        {
          id: "intro-linux",
          name: "Intro to Linux",
          folder: "Intro-to-Linux",
          entry: "index.html",
          duration: "20 min",
        },
      ],
    });

    expect(items).toEqual([
      {
        id: "basic-coding",
        title: "Basics of the Linux Command Line",
        path: "basic-coding.html",
        group: "Foundations",
        duration: null,
        summary: "Linux command line.",
        retired: false,
      },
      {
        id: "intro-linux",
        title: "Intro to Linux",
        path: "Intro-to-Linux/index.html",
        group: "Presentations",
        duration: "20 min",
        summary: null,
        retired: false,
      },
    ]);
  });

  it("skips unfinished entries, office files, and unsafe paths", () => {
    const items = parsePresentationManifest({
      presentations: [
        { id: "draft", name: "Draft", entry: null },
        {
          id: "slides",
          name: "Slides",
          entry: "module-4.pptx",
        },
        {
          id: "escape",
          name: "Escape",
          entry: "../secret.html",
        },
        {
          id: "basic-coding",
          name: "Basics of the Linux Command Line",
          entry: "basic-coding.html",
        },
      ],
    });

    expect(items.map((item) => item.id)).toEqual(["basic-coding"]);
  });

  it("keeps retired decks but flags them", () => {
    const [item] = parsePresentationManifest({
      presentations: [
        {
          id: "old-tour",
          name: "Old tour",
          entry: "old-tour.html",
          retired: true,
        },
      ],
    });
    expect(item?.retired).toBe(true);
  });
});

describe("presentation links", () => {
  it("round-trips a catalog id and rejects other links", () => {
    expect(presentationIdFromLink(presentationLinkForId("basic-coding"))).toBe(
      "basic-coding",
    );
    expect(presentationIdFromLink("github-module:basic-coding")).toBeNull();
    expect(presentationIdFromLink("github-presentation:../x")).toBeNull();
  });
});

describe("groupPresentationItems", () => {
  it("groups by track and keeps catalog order", () => {
    const groups = groupPresentationItems(
      parsePresentationManifest({
        presentations: [
          {
            id: "basic-coding",
            name: "Basic Coding",
            entry: "basic-coding.html",
            track: "Foundations",
          },
          {
            id: "lab-tour",
            name: "Lab Tour",
            entry: "lab-tour.html",
            track: "Tours",
          },
          {
            id: "bash",
            name: "Bash",
            entry: "bash.html",
            track: "Foundations",
          },
        ],
      }),
    );
    expect(groups.map(([group, items]) => [group, items.map((item) => item.id)])).toEqual([
      ["Foundations", ["basic-coding", "bash"]],
      ["Tours", ["lab-tour"]],
    ]);
  });
});
