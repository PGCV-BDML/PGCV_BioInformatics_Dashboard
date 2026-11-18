import { describe, expect, it } from "vitest";
import { deckScale, deckScaleScript } from "./deck-scale";

describe("deckScale", () => {
  it("fits the page's width and the height under the header, as the decks do", () => {
    // 1440 x 900 with a 62px header: (1440 - 32) / 1280 = 1.1, (900 - 62 - 48) / 720 = 1.0972.
    expect(deckScale({ presenting: false, width: 1440, height: 900, header: 62 })).toEqual({ s: 1.0972, bleedX: 0, bleedY: 0 });
  });

  it("never shows a slide on the page at more than twice its size", () => {
    expect(deckScale({ presenting: false, width: 5120, height: 2880 }).s).toBe(2);
  });

  it("fills a 16:9 screen exactly in Present mode", () => {
    expect(deckScale({ presenting: true, width: 1920, height: 1080 })).toEqual({ s: 1.5, bleedX: 0, bleedY: 0 });
  });

  it("lets the background reach the edges of a 4:3 projector", () => {
    // 1024 x 768 at 0.8: the canvas grows by 120px above and below, the content keeps its place.
    expect(deckScale({ presenting: true, width: 1024, height: 768 })).toEqual({ s: 0.8, bleedX: 0, bleedY: 120 });
  });

  it("writes a pre-paint script that sets the same scale on the page", () => {
    const script = deckScaleScript("tour-main", "[data-tour-header]");
    const main = { style: { values: {} as Record<string, string>, setProperty(k: string, v: string) { this.values[k] = v; } } };
    const run = new Function("document", "window", script);
    run(
      {
        getElementById: (id: string) => (id === "tour-main" ? main : null),
        querySelector: () => ({ offsetHeight: 62 }),
        documentElement: { clientWidth: 1440 },
      },
      { innerHeight: 900 },
    );
    expect(main.style.values["--s"]).toBe("1.0972");
  });
});
