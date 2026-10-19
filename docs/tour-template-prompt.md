# Prompt: standalone Lab Tour slide template

Paste everything below the line into Claude. It describes the `/tour` presentation's
design system and behaviour (taken from `app/tour/`) so the result matches the look
without depending on this app. Put `pgcv_logo.png` and the Aileron font files
(`public/assets/`, `public/fonts/`) next to the generated HTML file.

A ready-built version, made from the tour code itself, is
[lab-tour-template.html](lab-tour-template.html): fonts, logo and QR encoder are
embedded, so it works offline. Edit its `DECK` object to make a new deck.

---

Build a reusable slide-presentation template as ONE self-contained HTML file: plain
HTML, CSS and vanilla JavaScript, with no framework and no build step. It must open
by double-clicking the file. The only external resource is Quicksand from Google Fonts.

The template recreates the visual language of a lab-tour presentation for the
Bioinformatics and Data Management Laboratory, Philippine Genome Center (PGC) Visayas.
It is a scrolling page of full-width sections that also works as a fullscreen
slideshow ("Present mode").

## 1. Content as data

Keep ALL slide content in one `const DECK = {...}` object at the top of the script,
and render the slides from it. Adding, removing or reordering a slide must only need
an edit to DECK. Each slide has a `type` (one of the layouts in section 4), an
`eyebrow` label, a `title`, and type-specific fields.

Any text field can be a plain string OR an object with one version per audience:
`{ general: "...", students: "...", technical: "...", visual: "..." }`. `general` is
required. Missing audiences fall back to `general`. Fill DECK with realistic
placeholder content about a genomics/bioinformatics lab, so every layout shows at
least once.

## 2. Design tokens (use exactly these)

Define them as CSS custom properties on `:root`.

Colours:
- Page background `#f7f6fa`; body text `#333333`; muted text `#5b6770`
- Teal `#12ca99`, used for accents, bars and dots only. It is too light for text on white.
- Teal ink `#0a7558`, for small teal text on light backgrounds
- Deep teal `#2a7797`, for primary buttons (hover `#236681`, plus glow `0 0 20px rgba(18,202,153,.35)`)
- Purple `#5e205e`; magenta `#912a8c`; navy `#2b3278`, used for headings on light slides
- Night navy `#1c2152`, for the footer, the floating control bar and overlays
- Lavender `#f0e8f2`, an alternate light-slide background
- Mint `#9ff0d8`, for eyebrow text on dark slides
- Logo gradient (art and thin rules only, never body text): `#ff8601` orange →
  `#e5332a` red → `#c51b4a` crimson → `#9c1f7a` magenta → `#8a2990` purple →
  `#65328f` violet → `#3b3694` indigo → `#0176c3` blue

Type:
- Body and headings: "Aileron" (400, 700, 900) via `@font-face` from
  `fonts/AILERON-REGULAR.otf`, `fonts/AILERON-BOLD.otf`, `fonts/AILERON-BLACK.otf`.
  Fallback stack: `"Inter", system-ui, sans-serif`.
- Eyebrows, kickers and small labels: Quicksand 700, uppercase, letter-spacing 0.12–0.2em.
- Slide titles: weight 900, tight tracking, 44px desktop with line-height 1.1, 30px mobile.
- The hero title is 60px desktop with line-height 1.05.

Shape and motion:
- Content max width 72rem (1152px) with 16px side padding (32px from 768px).
  Light slides have 64px vertical padding (96px from 768px).
- Card: white, radius 16px, border `1px solid rgba(43,50,120,.10)`,
  shadow `0 10px 30px -12px rgba(43,50,120,.18)`. Hover lifts it 4px.
- Pills are fully rounded.
- Easing everywhere: `cubic-bezier(0.22, 1, 0.36, 1)`.

## 3. Page chrome

- **Sticky header:** white at 95% opacity with backdrop blur and a 3px teal bottom
  border. On the left are the logo (`pgcv_logo.png`, about 48px tall) and, after a thin
  divider, "BIOINFORMATICS & / DATA MANAGEMENT LAB" in two lines (Quicksand 10px, bold,
  uppercase, navy). On the right are the audience toggle and a "Present" button
  (deep teal pill with a maximize icon). Inline SVG icons only.
- **Audience toggle:** a segmented pill radiogroup with Students / General /
  Technical / Visual. The selected option is a navy fill with white text, and the
  others are navy text on white. The choice re-renders every text field.
- **Footer:** night navy. The logo sits on a white rounded chip, followed by the lab's
  full name and the line "No client or patient information is shown."

## 4. Slide layouts

Every slide opens with the same header block, except the hero:
- **Eyebrow:** a 32×2px teal bar (it grows in from the left), then "02 · LABEL" in
  Quicksand 12px bold uppercase with 0.2em tracking, teal ink. The number is the
  slide's position, zero-padded.
- **Title (h2):** navy, weight 900.
- **Intro paragraph:** 18px, muted, max width 48rem.

Light slides sit on the page background, or on lavender if they set `lavender: true`.
Behind them is a dot grid (1px navy dots at 20% opacity on a 22px grid), masked by a
radial gradient so it only shows near one corner, plus one soft blurred glow in a logo
colour. Alternate the corner between slides. When a light slide directly follows
another light slide, draw a 1px divider at its top, using the logo gradient faded to
transparent at both ends at 50% opacity.

Implement these layout types:

1. **`hero` (dark, first slide):** a 135° gradient from navy 0%, purple 45%, deep teal
   85% to teal 130%. A left-to-right overlay `rgba(28,33,82,.7)` → transparent at 80%
   keeps the headline readable. Behind it, add a few large blurred radial "aurora"
   blobs in logo colours that drift slowly, and a faint texture of A/C/G/T letter rows
   (monospace, white, 7% opacity, masked to fade out behind the headline). On the
   right, draw a large decorative double-helix SVG stroked with the logo gradient.
   Content:
   - an eyebrow pill (white/10 background, white/20 border, teal dot, mint text)
   - an h1
   - an intro paragraph at white/85
   - a row of "fact" glass cards (white/8% background, white/15 border, blur,
     radius 16px), each with a big 36px weight-900 number above a small white/75 label
   A 6px bar along the bottom edge uses the gradient orange → crimson → purple → blue.
2. **`cards`:** a 3-column grid of white cards. Each card has a 4px top stripe in its
   own colour, an icon in that colour, a bold navy name, a muted summary, and a tag pill
   pinned to the bottom (that colour at 8% opacity as background, the colour as text).
3. **`concept`:** two columns. On the left is a definition and a short list where each
   item's lead word is bold in its own colour. On the right is an SVG diagram (for the
   placeholder, a 3-circle Venn with labelled overlaps).
4. **`stepper`:** 3–6 numbered steps shown one at a time, each with a title, text and
   an illustration area. A progress track marks the current step. While presenting
   (without auto-advance), the arrow keys go through the steps before moving to the
   next slide. Otherwise the steps play on a timer.
5. **`feature`:** a photo on a radial-gradient panel (`#ffffff` → `#dff3ee`), next to a
   teal-ink kicker, a 30px weight-900 navy name and a description. Under them are 3 stat
   tiles: light grey (`#f7f6fa`), radius 16px, a 4px left border in a colour (teal ink,
   deep teal, purple in turn), a 48px weight-900 number in that colour, a unit in bold
   navy at 80%, and a small muted label.
6. **`photos`:** a grid of photo tiles. Each caption sits on a bottom gradient overlay
   (`rgba(28,33,82,.92)` → transparent) in white bold text.
7. **`stats`:** on the left, KPI cards with a 6px coloured left stripe and big numbers
   that count up when the slide appears. On the right, a card with a bar chart: bars
   grow from the bottom one after another, there are y-axis ticks, and hovering a bar
   shows a night-navy tooltip.
8. **`projects`:** two-column cards with a status kicker, a weight-900 navy title, an
   optional italic purple species name, and a summary.
9. **`team`:** a grid of portrait cards. Each has a photo (aspect 310/366, lavender
   placeholder), a 4px teal top border on the caption, the nickname in weight 900 navy,
   the full name small, and the position in Quicksand uppercase teal ink.
10. **`videos`:** a 2-column grid of cards, each with a 16:9 YouTube embed
    (`youtube-nocookie.com`) and a title row with the duration on the right.
11. **`contact` (dark, last slide):** a 120° gradient from navy through purple to deep
    teal, with the helix art bottom-right.
    - Left side: an eyebrow in mint, the title, an intro, and social handle chips.
    - Right side: email cards in the hero glass style. The label sits above the address
      in mint uppercase, and the border turns teal on hover.
    - Optional QR codes appear on raised "embossed" white plates. Generate the QR codes
      with an inline JS generator, not an external API.

## 5. Present mode

- "Present" requests fullscreen. If that is refused, the layout still switches.
- The header hides, every slide becomes at least 100vh, its content is vertically
  centred, and `scroll-snap-type: y proximity` snaps slides to the top.
- If a slide's content is taller than the screen, scale it down to fit (CSS transform
  on an inner wrapper, measured on resize). Leave 64px at the bottom for the control bar.
- **Floating control bar** (fixed, bottom-centre): a night-navy pill at 85% opacity
  with blur, holding:
  - a helix progress indicator: a short SVG double helix with one rung per slide. One
    strand is white at 25% opacity, the other uses the gradient orange → magenta →
    `#2f9ae8`. Rungs up to the current slide are teal, the current rung is thicker, and
    clicking a rung jumps to its slide.
  - the audience toggle in its dark style (white fill on the selected option)
  - an "Auto-advance" toggle, teal when on
  - an exit (×) button
  While auto-advance is on, a 2px teal countdown line along the bottom of the bar fills
  over the slide's duration, and restarts on every slide change.
- **Keys:**
  - → ↓ PageDown Space go forward (stepper steps first)
  - ← ↑ PageUp go back (onto the previous slide's last step)
  - Home and End go to the first and last slide
  - Esc exits
  Ignore keys while focus is in an input or iframe.
- **Auto-advance:** 20 s per slide. A stepper slide gets 20 s × its step count. Wrap to
  the first slide after the last. Hold the current slide while the tab is hidden or an
  iframe has focus.
- Picking the Visual audience turns auto-advance on, and the other audiences turn it
  off. The button still overrides either.
- Track the current slide with an IntersectionObserver (rootMargin `-45% 0px -50% 0px`)
  so the keys continue from wherever the user scrolled to.

## 6. "Visual" audience

This mode is for a lobby screen nobody reads aloud. Slides keep their pictures and
numbers and drop most words:
- Hide intro and summary paragraphs.
- Enlarge the titles (to 72px desktop).
- The eyebrow shows only the number.
- Service cards become a big centred icon and the name.
- KPI slides keep only the headline number, at 72px.
- The contact slide becomes "Scan to connect" with only its QR codes.

Drive this with a `data-audience` attribute on the root plus CSS, so switching
audiences doesn't rebuild the layout.

## 7. Motion

- Each slide's elements enter when the slide scrolls into view:
  - headings and cards rise 12px and fade in over 0.6 s, with a 60–90 ms stagger
  - eyebrow bars grow on the x axis
  - chart bars grow on the y axis from the bottom
- Hold animations on their first frame until the slide is visible (a `data-reveal`
  attribute of pending/visible). Reset them once the slide has fully left the screen,
  so coming back replays them.
- In Present mode, photos slowly pan and zoom (Ken Burns, 22 s alternate).
- Animate only `transform`, `opacity` and SVG stroke dashes.
- Under `prefers-reduced-motion: reduce`, show everything in its final state with no
  animation. The auto-advance countdown line is hidden then.
- Without JavaScript the page should still read top to bottom with all content visible.

## 8. Quality bar

- Semantic HTML: one `<section>` per slide with `aria-label`, real headings, and
  `<dl>` for number + label pairs. Buttons have accessible names, the audience toggle
  is a radiogroup, and every control shows a visible teal focus ring.
- Responsive down to 375px wide with no horizontal scroll: grids collapse to one
  column, and the hero fact cards use 2 columns.
- Keep it to one file, clearly sectioned (tokens, base, layouts, present mode, motion,
  then data, render and controller in the script), with short comments, so a
  non-developer can edit DECK safely.
