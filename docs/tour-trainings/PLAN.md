# Plan: icons instead of photos on the trainings slide

**Status:** built with option B, the path (18 November 2026). The last section records where the build differs
from the mockup.

**Mockups** (in [mockups/](mockups/)), from [mockups/trainings.html](mockups/trainings.html) (open it in a browser to
see each slide at 1280 × 720):
- [mockups/icons.jpg](mockups/icons.jpg): the five icons.
- [mockups/option-a.jpg](mockups/option-a.jpg): **A, icon cards.** Five cards in a row, like the Services slide.
- [mockups/option-b.jpg](mockups/option-b.jpg): **B, a path.** The five along one line, from the command line to a
  whole genome, with a takeaway.
- [mockups/option-c.jpg](mockups/option-c.jpg): **C, grid with a way to join.** Three by two; the sixth panel gives the
  lab's email and handle from the Contact slide.
- [mockups/visual.jpg](mockups/visual.jpg): the Visual audience, for any option: big icons and names only.
- [mockups/all.jpg](mockups/all.jpg): all of the above on one page.

Every slide was measured with the decks' checks: nothing runs past the bottom margin, the title is one line, no text is
under 14px, and no card's text overflows it.

## The icons

Drawn like the Services icons (`app/tour/_components/service-icons.tsx`): a 48-unit grid, a 2.25 stroke, one accent in
the logo gradient, an entrance when the slide comes into view and a small loop on hover.

| Training | Icon | Colour |
|---|---|---|
| Basic Coding | A terminal window, its prompt and cursor (new) | Navy, as the Training service |
| Primer Designing | Two DNA strands, a forward and a reverse primer bound at either end (new) | Deep teal |
| DNA Barcoding | The Services slide's barcode | Magenta, as its service |
| 16S Metabarcoding Analysis | Microbes over stacked bars of relative abundance (new) | Teal, as Metagenomics |
| Whole Genome Assembly | The Services slide's reads-into-a-contig | Purple, as Sequence Assembly |

## What the build changes

- **`tour.json`** (pgcv-tour-content): each training loses `image` and gains `icon` (an id such as `"basic-coding"`)
  and `summary` (one line, per audience like the other slides' text). Option A also adds `io` (e.g.
  `"reads → genome"`); option B adds `scale` (e.g. `"One gene"`).
- **`lib/tour.ts`**: `TourTraining` and its validation follow; the fallback tour lists the five trainings so the
  slide is never empty.
- **`app/tour/_components/`**: the three new icons go beside the Services ones, and `trainings-slide.tsx` lays out the
  chosen option. A training added to `tour.json` without a drawn icon falls back to its initials, as services do.
- The slide's "Photos: …" source line goes. Neither the dashboard nor the content repo's static deck shows the photos
  in `images/trainings/` any more: the deck's trainings slide is the same path (a `path` layout in `deck-art.js`), with
  shorter summaries to stay within its word limit.

The one-line summaries in the mockups are drafts for the General audience. The Students and Technical versions were
written with the build, in `tour.json`.

## As built

- **The line.** One logo gradient from the first training to the last, as in the mockup. It is drawn in pieces, one
  from each disc to the next, so the same markup runs across the slide on the canvas and down it on a phone.
- **Content.** Each training in `tour.json` has `id`, `color`, `name`, `scale` and `summary` (Students, General and
  Technical), and the slide has a `takeaway`. Option A's `io` was not needed. Without an `id`, the name is used as one,
  and without a `color` the trainings take navy, deep teal, magenta, teal and purple in turn. So a `tour.json` that
  still lists only names and photos shows the right icons, without the words.
- **Visual audience.** The path with bigger discs and the names only, centred on the slide (the mockup showed this
  on option A's cards).
- **Fallback.** The built-in tour in `lib/tour.ts` lists the five trainings with their General text, so the slide shows
  even when GitHub can't be reached.
- **Checked** on the canvas in all four audiences with the tour's fit check (nothing over the margin, no card
  overflowing), and on a phone (390 px, no sideways scroll).
