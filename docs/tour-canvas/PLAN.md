# Plan: the lab tour on the presentations' 1280 × 720 canvas

**Status:** built, with the recommendation taken on all four decisions in section 6 (18 November 2026).
Section 9 records where the build differs from the plan.

**Mockups** (in [mockups/](mockups/)):
- [mockups/slides.jpg](mockups/slides.jpg): all 19 slides as proposed, from [mockups/slides.html](mockups/slides.html)
  (open it in a browser to see each slide at 1280 × 720).
- [mockups/view-scroll.jpg](mockups/view-scroll.jpg): the tour page in a 1440 × 900 window.
- [mockups/view-present.jpg](mockups/view-present.jpg): Present mode on a 1920 × 1080 screen.
- [mockups/view-projector.jpg](mockups/view-projector.jpg): Present mode on a 1024 × 768 (4:3) projector.
- [mockups/view-phone-a.jpg](mockups/view-phone-a.jpg) and [mockups/view-phone-b.jpg](mockups/view-phone-b.jpg):
  the two options for phones (decision 1).
- [mockups/title-slide.html](mockups/title-slide.html): the three directions for the title slide, live (open it in a
  browser to see them move), and [mockups/title-slide.jpg](mockups/title-slide.jpg): the one built, moving and still.
- [mockups/closing-slide.jpg](mockups/closing-slide.jpg): the three directions for the last slide, with the title
  slide's look, and the Visual version; [mockups/closing-slide-built.jpg](mockups/closing-slide-built.jpg): the one
  built, for both audiences and on a 4:3 projector, beside the title slide it bookends.

The mockups use the dashboard's real text and its own figures (the Venn diagram, the sample-results charts, the
variant tree and map, the 3D virus), drawn at the size they would have on the canvas. Photos are grey
placeholders: the staff portraits and training photos live in the private content repo and stay there. A yellow
note on a slide marks something that changes beyond the layout.

Every slide in the mockups was measured: none runs past its bottom margin, no title is over two lines, and no text
is under 14px, which are the checks the decks in bioinfo-presentations run.

## 1. What changes

The decks in [bioinfo-presentations](https://github.com/bioinfopgcupvisayas/bioinfo-presentations)
(`template/lab-tour.html`, `others/presentation-guide.md` Part 2) lay every slide out on one fixed 1280 × 720
canvas and scale the whole deck with one factor. The dashboard's `/tour` lays each section out at the width of the
window, as tall as its content, and in Present mode zooms each one on its own to fit the screen.

| | Now | After |
|---|---|---|
| Slide size | As tall as its content. At 1440 px wide the sections run from 640 px (Welcome) to 2,130 px (Sample results); a 16:9 slide that wide is 810 px | Every slide is 1280 × 720 (16:9), the decks' canvas |
| Scale | Present mode zooms each slide on its own, from 0.6× to 1.5× (`slide-fit.ts`), so titles change size from slide to slide | One scale for the whole tour, from the window, as in the decks. A 46 px title shows at 69 px on a 1080p screen, on every slide |
| Frame | Each section has its own header: the intro sits beside the title on some slides and under it on others. No footer | The decks' frame: eyebrow, 46 px title, 22 px intro under it, the main element, a teal takeaway, a one-line source, and a footer with the logo, "Lab tour · PGC Visayas" and "11 / 19" |
| Page | One long page of full-width bands | The slides as 16:9 cards on the grey desk, one per screen, like a deck opened in a browser |
| Present mode | Each band fills the screen, with its content stretched toward the edges | The slide fills the screen. On a 16:10 or 4:3 screen its background reaches the edges and its content keeps the 16:9 box in the middle |
| Slides | 15 sections | 19 slides: Sample results becomes four (one service each, as in the deck) and Projects becomes two |
| Text that doesn't fit | Shrunk with the slide, down to 0.6× | Never shrunk. In development the tour names the slide that runs past its margin, and the words are cut (section 5) |

**The static deck.** pgcv-tour-content already holds the tour as a deck built from the template, and its
`REDESIGN_PLAN.md` (Phase 6) ends with the dashboard's `/tour` redirecting to it. This plan keeps the dashboard's
own tour instead, with its live COVID-19 numbers and no second site. If the redirect is still the plan, this work
isn't needed.

## 2. Slide by slide

"Layout" names the deck layout each slide follows. "From" is today's component in `app/tour/_components/`.

| # | Slide | Layout | From | What changes |
|---|---|---|---|---|
| 1 | Welcome | `hero` (dark) | `HeroSection` | Title, intro and the two facts on the left; the helix art on the right. No footer, as on the decks' title slide |
| 2 | What is bioinformatics? | `split` | `IntroSection` | Definition and the three fields on the left, the Venn diagram (470 px) on the right |
| 3 | From sample to sequence | `steps` | `JourneySection` | Stage (528 × 300) on the left, the step's text on the right, the five steps underneath. The arrow keys still step through it |
| 4 | Our services | `cards` | `ServicesSection` | Five cards in one row, 210 px each, text at 18 px |
| 5–8 | Who is this specimen? · A complete genome, mapped · Who lives in the water? · Which genes switched on? | `results` (the deck's) | `ShowcaseSection` | One slide per service: its two figures side by side (506 × 299 each), the caption as the takeaway, "Sample data for illustration, not from a real project" as the source. The section's intro is dropped. Four figures need bigger text (below) |
| 9 | Bioinformatics trainings | `photos` | `TrainingsSection` | Five photos in one row (210 × 398) |
| 10 | Explore the lab | `embed` | `LabMapSection` | The lab map's frame fills the main area (1112 × 410). In Present mode the page still holds still while the pointer is over it |
| 11 | Our computing infrastructure | `feature` | `InfrastructureSection` | The "In simple terms" analogy becomes the intro. Two cards, each with its photo, 18 px text and three specs. The Storage Cluster text is cut (section 5) |
| 12 | Genomes for Philippine wildlife | `projects` | `ProjectsSection` | The photo on the left; status, title, species, summary and the four highlights on the right. The intro is dropped (section 5) |
| 13 | From sample to genome | new, from `FeaturedProject` | `ProjectsSection` | The deer project's five steps, its range and partner, what's next, and the citation with its QR code. Same fields as today, on a slide of their own |
| 14 | COVID-19 genomic surveillance | `stats` | `CovidSection` | Three tiles on the left, the per-quarter chart on the right. Still live from the database |
| 15 | Watching the virus change | `tree` (the deck's) | `VariantTreeSection` | Toolbar, tree, map, legend and count in one card; the monthly bars along its foot. "Show as a table" opens a dialog |
| 16 | Meet the virus up close | `virus` (the deck's) | `VirusModelSection` | The viewer on the left (648 × 367), the twelve mutations in a 4 × 3 grid on the right |
| 17 | Our research agenda | `cards` | `AgendaSection` | Five areas in one row, two projects each |
| 18 | Meet our bioinfo team | `team` | `TeamSection` | Seven posters, four over three (168 × 210). The intro is dropped (section 5) |
| – | Videos | `videos` | `VideosSection` | Up to three videos in a row, shown only when there are some (none today) |
| 19 | Have a sample, a dataset or a question? | `contact` (dark) | `ContactSection` | Title, intro and social accounts on the left, the three emails on the right, the four QR codes along the bottom |

The slide numbers count what is shown: without a lab map, tree or virus, the tour has fewer slides and the footer
says so.

**Figures with small text.** The sample-results figures are drawn with 11 px text in 300–320 px wide pictures
(`service-showcase.tsx`). In a 506 × 299 box, four of them would show it under 14 px, the smallest size the decks
allow: the barcode tree (13.6 px), the genome ring (11 px), the abundance heatmap (12.8 px) and the gene heatmap
(10.4 px). Their text is drawn bigger in the figure itself (13–15 in the picture's own units), as the decks' guide
says: never shrink, draw the picture's text bigger.

## 3. How it is built

### 3.1 The canvas

- `app/tour/_components/slide-canvas.tsx` (new): `useDeckScale(presenting, headerRef)` sets one scale `--s` on
  `<main>`, worked out as the decks' engine does (`scaleDeck()` in `template/starter.html`):
  - on the page: `min((clientWidth − 32) / 1280, (innerHeight − header − 48) / 720, 2)`;
  - in Present mode: `min(innerWidth / 1280, innerHeight / 720)`, plus `--bleed-x` and `--bleed-y`, the extra
    room on a screen that isn't 16:9.
- Each slide is laid out at 1280 × 720 and scaled with CSS `zoom: var(--s)`. The decks use
  `transform: scale()`; `zoom` gives the same picture here and suits the dashboard better: Present mode already
  uses it, the variant tree, the province map and the 3D virus already convert pointer positions under it
  (`phylo-map.tsx`, `phylo-tree.tsx`, `fixPickingUnderZoom` in `virus-viewer.tsx`), and the WebGL canvas and the lab
  map's frame are laid out at their scaled size, so they stay sharp.
- A few lines of inline script in the page set `--s` before the first paint, so the server's HTML doesn't show at
  1280 px wide for a moment on a smaller window.

### 3.2 The frame

- `app/tour/_components/slide-frame.tsx` (new): `<LightSlide eyebrow title intro takeaway source>` and
  `<DarkSlide>`. The footer (logo, "Lab tour · PGC Visayas", "n / N") comes from the slide list.
- `slide-frame.module.css` (new): the decks' tokens copied as they are: margins 68 / 84 / 80 px; type 46 px titles,
  26 px takeaways, 22 px intros and body, 18 px cards, 14 px labels, 13 px sources; the logo-gradient line and the
  dot grid. `mockups/slides.html` has a working copy of the frame's CSS.
- Aileron and Quicksand already load in the dashboard, so nothing new is downloaded.

### 3.3 One layout inside a slide

Inside the canvas the window's width no longer says how wide the slide is: a 1024 px laptop shows the 1280 px
canvas at 0.78. So the slides stop using the window's breakpoints (`sm:` to `2xl:`) and the Present-mode overrides
(`PRESENT_WIDE`, `PRESENT_SPLIT_HEADER`, `PRESENT_COLUMNS` and the rest at the top of `tour-sections.tsx`). Each
slide lays out once, for 1280 × 720, under one variant:

```css
@custom-variant canvas (@media (width >= 48rem));   /* app/globals.css */
```

Below 768 px the slides keep today's stacked phone layout, if decision 1 goes that way. A test fails when a
component in `app/tour/_components/slides/` uses any other breakpoint.

### 3.4 Present mode

- Each section fills the screen on the night background, with the slide centred in it and its margins grown by
  the bleed; scroll snapping as now.
- `slide-fit.ts` and its test are deleted.
- The control bar, audience switch, music, auto-advance, keys, steps and the helix progress stay as they are; the
  progress gets one tick per slide. Like the decks' controls, the bar sits in the slide's bottom margin and fades
  when the mouse is still.

### 3.5 The slide list

`sectionIds` in `tour-experience.tsx` becomes a list of slides, each `{ id, nav, render }`. The four Sample results
slides come from `SHOWCASE_COPY` and `ShowcaseFigures({ id })`, which already draws one service at a time. The second
Projects slide comes from the project's `steps`, `range`, `next`, `partners` and `citation`. `tour-sections.tsx`
(1,324 lines) is split into `slides/`, one file per slide, as each is moved.

### 3.6 The fit check

In development, after the fonts load and whenever the audience changes, each slide is measured with the decks'
rules: content past the bottom margin, a title over two lines, text under 14 px. Each problem is logged (for example
`Lab tour: slide 11 runs 14px past its bottom margin (students)`) and the slide gets a red outline.

On the live site a slide that still runs over (after a `tour.json` edit, say) is shrunk just enough to fit, never
below 0.85, so no words are cut off in front of visitors. The development check still names it.

### 3.7 Audiences

Visual keeps dropping intros, captions and descriptions, but its titles stay at 46 px, as everywhere else: one
type scale, as in the decks. Its slides get the room instead.

## 4. Steps

1. **Canvas and frame.** `useDeckScale`, `LightSlide`, `DarkSlide`, the tokens. Move Welcome, What is
   bioinformatics? and Contact onto them; the page and Present mode work with the other sections still as they are.
2. **The other slides,** one commit each, in tour order, deleting their `PRESENT_*` overrides as they go.
3. **The splits:** Sample results into four, Projects into two.
4. **The fit check,** then fix what it finds in all four audiences, and draw the four small-text figures' labels
   bigger. Cuts to `tour.json` go in a pull request in pgcv-tour-content.
5. **Phones** (decision 1).
6. **Tests and checks:**
   - update `tour-experience.test.tsx`: section ids become slide ids, and the order tests follow;
   - delete `slide-fit.test.ts`;
   - add tests for one scale on every slide, the slide count and numbering, the Sample results and Projects splits,
     and the breakpoint rule;
   - `npm test`, `npm run lint`, `npm run build`;
   - screenshots at 1920 × 1080, 1440 × 900, 1024 × 768 and 390 × 844, compared with these mockups.

## 5. Words that change

In the General version; step 4 checks the other audiences.

| Slide | Now | Proposed | Where |
|---|---|---|---|
| 11 · Storage Cluster | "Our newest addition, now being set up: three storage servers that will keep every file in three copies, so our data stays safe even if a server fails. A 100 Gb/s network will link them to the HPC cluster, and the locked, monitored cabinet has its own backup power and cooling." (55 words) | "Three storage servers, now being set up, will keep every file in three copies on a 100 Gb/s link to the HPC cluster." (22 words) | `tour.json` |
| 12 · Projects | Intro: "Beyond public health, we assemble reference genomes for species found nowhere else, so conservationists can measure and protect their genetic diversity." | Dropped: the photo and summary need the room | `tour.json` |
| 18 · Team | Intro: "The Bioinformatics and Data Management Laboratory, Philippine Genome Center Visayas." | Dropped: the footer and the posters carry the lab's name | `tour.json` |
| 5–8 · Sample results | The section intro ("Every project ends with a report full of figures like these…") | Dropped: each slide's title and takeaway say what the figures show | `lib/tour-showcase.ts` |

Slide 13's title, "From sample to genome", is the label the project card already uses. No other General text
changes in the mockups.

## 6. Decisions for you

1. **Phones.**
   - **A.** The whole slide scales down, as the decks do. On a 390 px phone the body text shows at about 6 px
     (`view-phone-a.jpg`); turned sideways, about 9 px on the page and 12 px in Present mode.
   - **B (recommended).** Below 768 px the slides reflow into today's stacked phone layout (`view-phone-b.jpg`). From
     768 px up (tablets, laptops, projectors) every slide is the 16:9 canvas.
2. **Light slides' backgrounds.**
   - **Recommended:** the decks' page: off-white, the logo-gradient line along the top and the dot grid in the
     corner (as in the mockups). `section-backdrop.tsx`, `light-motifs.tsx` and `backdrop.module.css` are then
     deleted.
   - **Or** keep the dashboard's motifs (DNA letters, networks, circuit traces) behind the frame. They were drawn for
     full-width bands and would need placing again for the canvas.
3. **Team.**
   - **Recommended:** four posters over three, 168 × 210 each, as the tour does now in Present mode.
   - **Or** seven in one row, 145 × 181, as in the deck.
4. **Numbered eyebrows.**
   - **Recommended:** drop the numbers ("07 · Under the hood" becomes "Under the hood"), since the footer numbers
     every slide, as in the decks.
   - **Or** keep them, numbered by slide.

## 7. Risks

| Risk | Response |
|---|---|
| Text looks small on a small laptop: at 1024 px wide the canvas shows at 0.78, so a 46 px title is 36 px | The same as the decks; Present mode fills the screen |
| A `tour.json` edit makes a slide run over on the live site | The live site shrinks that slide just enough (never below 0.85); the development check names it |
| Pointer positions under `zoom` (tree hover, map tooltips, the month slider, clicking the orange spike) | The code already handles `zoom` for Present mode; each is tried by hand in step 6 |
| The first paint, before the script runs | The inline script sets the scale before the slides paint |
| The tree, the 3D virus and the lab map need more height than a slide has | Laid out in the mockups at their real sizes: tree card 1112 × 367, viewer 648 × 367, map 1112 × 410 |

## 8. Not in this plan

- New slides beyond the two splits: the deck's "Which service fits?" quiz stays in the deck.
- Speaker notes and speaker view, which the decks have and the dashboard tour doesn't.
- Printing one slide per page (possible later with a print stylesheet).
- Changes to `tour.json` beyond the cuts in section 5.

## 9. As built

All 19 slides pass the fit check in all four audiences (Students, General, Technical, Visual): nothing past the
bottom margin, no title over two lines, no HTML text under 14 px. Where the build differs from the plan above:

- **Copy cut in `tour.json`** (pgcv-tour-content, branch `claude/sweet-faraday-uwamz4`): the Storage Cluster text in
  all three audiences, the HPC Cluster's Technical text, and the Technical summaries of Sequence Assembly, DNA Barcoding
  and Bioinformatics Training. Until that branch reaches `main`, the live site shrinks those slides as far as 0.85×.
- **Research agenda, Technical:** the full project titles (up to 156 characters) don't fit five columns, or five rows.
  On the canvas Technical shows each project's name and partners, as the deck does; phones keep the full titles.
- **COVID-19:** the four live tiles first sat in a row above the chart. Since 18 November 2026 they are a column on
  the left (300 px, sharing its height), as planned, and the chart fills the rest, so it is taller and its bars wider.
- **Variant tree:** the headline numbers (genomes, dates, provinces) sit at the right of the title's row, and the
  province map's labels are drawn at 24 units so they show at 14 px.
- **Sample results:** only two figures needed bigger text once measured: the genome ring (14) and the gene heatmap
  (13, on taller rows). The Venn diagram's overlap labels went from 11 to 12.
- **Sample to sequence:** the stage is 500 x 284, so the longest Technical step fits beside it.
- **Present mode:** the control bar fades after three still seconds, as in the decks, so it doesn't hide the footer.
- **Projects (slides 12 and 13 merged, 18 November 2026):** each project is now one slide, in three columns: the
  photo, with where the species lives along its foot; the story and the four numbers in a 2 × 2 grid; and the five
  steps as a timeline ending in what's next, with the partner under it. The paper's link and QR code sit beside the
  slide's title, and its note (other partners, GenBank) joins the photo credit in the source line. To fit, the text
  is smaller than elsewhere (16 px summary, 26 px project title, 24 px numbers, 14 px notes and labels); Visual keeps
  the photo, the numbers, the steps' names and the QR code.

- **Title slide** (chosen from three live mockups on 18 November 2026: the helix, with the reads mockup's fact cards):
  the white PGC Visayas logo beside the eyebrow; a double helix turning down the right side, its bases flying into a
  FASTQ read that types itself out; the 240 cores drawn as 240 squares lighting up as jobs run, and the 360 TB as a
  filling gauge. The words rise once and hold still; the art is still for reduced motion and pauses off screen. The
  fit check now measures the dark slides too.

- **Last slide** (chosen on 18 November 2026 from three mockups of the title slide's look: C, the thread, and B's
  layout for the Visual audience): the title slide's gradient, aurora, shade, white logo and logo-colour line; the
  eyebrow "Thank you for visiting", a bookend to "Welcome to the lab tour"; the title at 60 px with its last word in
  the mint-to-sky gradient; the words and social accounts top left and the emails top right, as the title slide's
  glass cards. The title slide's helix lies across the lower half, and the QR codes hang on it (`threadSpots`: evenly
  spaced, at most 330 px apart). A glow runs along it every 8 seconds and each code lifts as it passes. For the Visual
  audience the slide is "Scan to connect" and its codes: two columns of 184 px codes (smaller with more rows,
  `scanSpots`) in front of the helix where the title slide has it, and a viewfinder that frames each code in turn
  every 2.5 seconds. The helix is one component for both slides now (`turning-helix.tsx`), and so are the dark
  slides' shared parts (`slides/dark-parts.tsx`); the contact slide's corner logo helix and its own aurora are gone.
  The art is placed with the content, so in Present mode on a 4:3 projector the codes stay on the helix. Both dark
  slides now tell whether they are on screen from a box the size of the slide, not from the art: on a phone the art
  is hidden, so the title slide's fact cards had stopped partway through their entrance, and the contact slide's
  codes would not have shown at all. No `tour.json` change.

