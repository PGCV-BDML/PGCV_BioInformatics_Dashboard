import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * On the canvas a slide is always 1280 x 720, whatever the window's width, so
 * a window breakpoint (sm: md: lg: xl: 2xl:) inside a slide would lay it out
 * differently on a laptop and on a projector. Slides use `canvas:` for their
 * canvas layout and plain classes for the phone's.
 */
const HERE = __dirname;
const SLIDE_PIECES = [
  "bioinfo-venn.tsx",
  "phylo-map.tsx",
  "phylo-tree.tsx",
  "project-feature.tsx",
  "research-agenda.tsx",
  "sample-journey.tsx",
  "service-showcase.tsx",
  "slide-frame.tsx",
  "training-icons.tsx",
  "virus-viewer.tsx",
];
const files = [
  ...readdirSync(join(HERE, "slides"))
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => join("slides", f)),
  ...SLIDE_PIECES,
];
const WINDOW_BREAKPOINT = /(?<![\w-])(sm|md|lg|xl|2xl):[\w[]/g;

describe("slides on the canvas", () => {
  it.each(files)("%s uses no window breakpoint", (file) => {
    const source = readFileSync(join(HERE, file), "utf8");
    expect(source.match(WINDOW_BREAKPOINT) ?? []).toEqual([]);
  });

  it("finds the slides", () => {
    expect(files.length).toBeGreaterThan(SLIDE_PIECES.length + 10);
  });
});
