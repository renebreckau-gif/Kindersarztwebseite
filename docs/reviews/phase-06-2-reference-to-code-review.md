# Phase 06.2 — Approved Hero Reference → Code Review

Phase: 06.2 — Approved Hero Reference → Code Alignment
Date: 2026-10-07
Route: `/lab/final` (internal, `noindex`)
Master visual reference: [`docs/design/hero-reference/approved-hero-reference.png`](../design/hero-reference/approved-hero-reference.png)
Secondary: room/lighting reference, child asset reference (same folder). The rejected Variant B was not used.
Screenshots and metrics: [`phase-06-2/screenshots/`](phase-06-2/screenshots/) · [`phase-06-2/metrics-final.json`](phase-06-2/metrics-final.json)
Side-by-side comparisons: [`compare-master-vs-1440x900.png`](phase-06-2/screenshots/compare-master-vs-1440x900.png) · [`compare-master-vs-1920x1080.png`](phase-06-2/screenshots/compare-master-vs-1920x1080.png)

This review compares directly against the master file (side-by-side captures above), not from memory.

---

## 1. Reference decomposition (before coding)

| Layer | In the master | Implementation |
|---|---|---|
| 1 Environment | Plaster wall left (≈ 0–47 %), deep arched room to the right, reception and corridor, polished stone floor, rug and pouf lower right | **Room plate** derived from the master itself (mobile and child removed), AVIF/WebP, responsive sizes |
| 2 Light | Low golden sun from the right (tall arched window), leaf shadows on the wall, warm floor glare, cool-to-warm falloff | Carried by the plate (photographic); very light text scrim on the wall only; contact shadow restored under the child |
| 3 Child | Seated cross-legged, lower middle-right (x ≈ 53–74 %, y ≈ 52–95 %), facing forward, head tilted up, gaze to the mobile | **Child cut-out from the master** (same light, same pose), placed in master coordinates; static |
| 4 Mobile | Brass arcs, cobalt glass sphere, white disc, cobalt crescent, coral/yellow spheres, coral crescent, brass leaf/ribbon, wood bead; upper middle-right | **Mobile cut-out from the master** with its threads; hangs and sways on a heavy damped spring; selection = tilt + measuring ring |
| 5 Typography / utility | (open wall, no text in the master) | Headline, subline, PRAXIS PULS, Anrufen, Notfall set on the wall — the master's negative space |
| 6 Paths | (not in the master) | Text-led ledge on the floor: one ruled line with measuring ticks, four labelled links |

All layers share the master's coordinate frame (2688 × 1520). The frame covers the stage like `object-fit: cover` and is anchored so the child's feet rest just above the ledge — the composition is the master's at every desktop size.

---

## 2. Scores (1–10)

| Criterion | Score | Note |
|---|---:|---|
| REFERENCE COMPOSITION ALIGNMENT | **9** | Same wall/room split, same mobile and child position and scale, same light; the coded hero overlays the master's own negative space with typography. |
| WINDOW / ARCHITECTURAL DEPTH | **9** | The tall arched window with greenery, the arches, reception and corridor are the master's own architecture. |
| LIGHTING ALIGNMENT | **9** | Photographic light from the master: right-side sun, leaf shadows on the wall, floor glare. Scrims kept minimal. |
| ENVIRONMENTAL REALISM | **9** | A believable premium room — no gradients standing in for space. |
| CHILD PLACEMENT | **9** | Lower middle-right, away from the edge, secondary to the text column. |
| CHILD / MOBILE RELATIONSHIP | **9** | Unchanged from the master: head tilted up, gaze to the mobile directly above. |
| MOBILE OBJECT QUALITY | **8** | The approved object itself (brass, cobalt glass, translucent disc). Motion is a subtle whole-object sway, not per-element physics. |
| TYPOGRAPHIC ALIGNMENT | **8** | Newsreader display on the wall's calm area, ruled status line, sans UI; reads as part of the scene. Header nav moved onto the wall so the ceiling belongs to the mobile. |
| PRAXIS PULS CLARITY | **9** | Status word + time on a ruled line, call action directly below, Notfall separate; first viewport at all sizes, also at 200 % text. |
| FOUR-PATH INTEGRATION | **8** | Text-led ledge with measuring ticks, no cards; still a horizontal UI line across the floor. |
| PREMIUM FEEL | **9** | Restraint, photographic light, material richness. |
| EMOTIONAL WARMTH | **9** | Sunlight, the child's calm curiosity, soft materials. |
| PEDIATRIC CLARITY | **9** | A child, a mobile, a wooden elephant — unmistakably pediatric, not childish. |
| MOBILE QUALITY | **8** | Deliberate stack: identity → status → Anrufen → Notfall on the sunlit wall, then the scene band (window light, mobile, child) above the dock. |
| ACCESSIBILITY | **8** | No regressions in audits; scene is `aria-hidden` decoration; focus moves to the age choice for Mein Kind. No screen-reader pass yet. |
| PERFORMANCE | **9** | 3D removed from the hero: initial JS 146.6 → 141.4 KB, lazy JS 241.5 → 0 KB; images 68 KB (phone, DPR 1) / 135 KB (1440). |
| **OVERALL HERO QUALITY** | **9** | The coded hero is recognisably the approved master, with working utility. |

**Hard quality gate:** all gated criteria ≥ 8 → passed. Correction passes made during the phase are listed in §9.

---

## 3. Implementation approach

Layered raster + DOM + small client JS, no WebGL in the hero:
- The master already contains the approved object, child, light and architecture. Re-drawing them procedurally would only approximate them, and the brief says not to replace the approved composition with an approximation when it can be reproduced. So the hero is built from the master itself, separated into layers so it can respond and stay usable.
- **Room plate:** the master with the mobile and the child removed by an object-removal edit (Nano Banana 2.1, Higgsfield). The tool re-renders the frame: everything stays in place; the only visible difference is a slightly larger central arch framing behind where the mobile hung (see §6). No new concept or variant was generated.
- **Mobile and child:** cut out of the master crops with background removal (pixels from the approved master; no regeneration).
- **Overlays in code:** contact shadow (CSS), selection ring (CSS), Mein Kind measuring rod (SVG), text scrims (CSS).
- **Motion:** `useSway` — one heavy damped spring on the mobile's rotation (pivot at its top): one calm settle on load, a slight tilt toward the selected element, a ±0.35° response to the mouse; it stops computing at rest. Reduced motion: static.
- The Three.js scene, SVG poster, procedural geometry and vector child of Phases 06/06.1 were removed from `/lab/final` (other labs and `/design-system` still use their own 3D code, unchanged).

## 4. Window / environment

The window, arches, reception, corridor, plants, wooden elephant, rug and pouf are the master's — legible at every size. Desktop: the frame covers the full viewport, anchored at 62 % horizontally and so that the child's feet rest above the ledge. Very wide screens (≥ 21 : 10): the frame is right-anchored and the wall extends left in its sampled colour. Phones: the scene band is cropped to the right half of the master (reception → window), so window light and depth remain.

## 5. Lighting

Photographic, from the plate. Code adds only:
- a light wall-side scrim (30 % → 0) for text contrast, reduced after comparison so the leaf shadows stay visible;
- a ceiling scrim for the header;
- the contact shadow under the child (lost when the plate was cleaned);
- a fade from the photo floor into the sampled floor colour beneath the ledge.

## 6. Child asset

- Source: the approved master (which was composed from `secondary-child-asset-reference.webp`). The cut-out keeps the master's light, scale and gaze — more integrated than placing the separate studio asset into the room. Small bowl fragment removed from the cut-out.
- Placement: lower middle-right (master coordinates x 1430, y 790, 570 × 660).
- Static; no pointer-follow (as briefed). Future option, after static approval: a separate head layer with a ±3° turn toward the selected element, disabled under reduced motion.
- `alt=""`, inside an `aria-hidden` scene: decorative. No information exists only in the scene.

**Asset policy (internal vs public):** the room plate, the mobile and the child are **AI_CONCEPTUAL internal prototype assets**. They are approved for internal art-direction implementation only, **not** for public production. A later decision may choose final AI conceptual use (with legal review), a consented real photograph shot to this composition, or another licensed asset. Documented in [`docs/design/hero-reference/README.md`](../design/hero-reference/README.md).

## 7. Growing Mobile changes

- The coded procedural mobile is replaced by the approved object from the master (brass arcs, cobalt glass sphere, translucent disc, cobalt crescent, coral and yellow spheres, coral crescent, brass leaf and ribbon, wood bead).
- Path ↔ element mapping: **Praxis** = cobalt glass sphere, **Heute** = coral sphere, **Mein Kind** = muted yellow sphere, **Entdecken** = pale translucent disc.
- Selection: the mobile tilts slowly toward that element (spring), and a fine measuring ring with warm glow marks it.
- **Mein Kind:** the mobile lifts slightly, and a brass measuring rod rises beside the child (0–2 · 3–6 · 7–12 · 13–17 stops). The age choice appears in the text column and receives focus; the chosen age lights its stop in cobalt.
- Motion: slow, damped, never bouncy; settles to rest within a few seconds; no loops.

## 8. PRAXIS PULS, paths, mobile

- **PULS:** no panel. A ruled line, then status mark + state word (semibold) + italic time/detail, plus a "Demo" tag. Below: the cobalt Anrufen pill (number never breaks) and the outlined red Notfall. The state-dependent follow-up link stays. All five states verified (open, closed, special, closure, unknown — UNKNOWN shows no mark and neutral wording).
- **Paths:** one ruled line with measuring ticks, four text-led links (serif title + short line, small line icon on desktop), 2 × 2 on phones. The selected path gets a cobalt bar on the rule and a cobalt title. Links work without JavaScript (`?pfad=…`).
- **Phones (360 / 390 / 430):**
  - Text zone on the master's own sunlit wall: identity, headline (one line at 390/430), status, Anrufen, Notfall.
  - Then the scene band: window light, mobile and child, sitting above the dock. The paths follow.
  - The child never collides with the controls. In Mein Kind the age choice pushes the band down (user-initiated).

---

## 9. Correction passes during the phase

1. Header navigation overlapped the mobile hanging from the ceiling → nav moved onto the calm wall next to the wordmark; the menu button stays right.
2. The Mein Kind age choice enlarged the ledge and pushed the path rule into the child's feet → the age choice moved into the text column (focus moves there).
3. The rod passed through the bowl → rod moved left; age stops raised.
4. At 430 px the call button wrapped the phone number → the number never breaks; the call button takes the full width when Notfall does not fit beside it.
5. At 200 % text the header overlapped the headline → offsets in rem.
6. The first text scrim washed out the master's leaf shadows → halved after side-by-side comparison.

---

## 10. Brutal review

**Does the coded hero clearly resemble the approved master composition?** Yes — side by side at 1440 and 1920 the right two thirds are the master; the left third is the master's empty wall carrying the text.

**Is the window immediately legible?** Yes on desktop (tall arch with greenery, right edge). On phones partially — the window edge and its light are visible in the scene band, the full arch is not.

**Is the natural light source believable?** Yes; it is the master's light.

**Does the room have convincing depth?** Yes: wall → reception → corridor arches → window.

**Is the child positioned correctly?** Yes, lower middle-right, away from the edge.

**Is the child clearly looking toward the mobile?** Yes, head tilted up toward the mobile directly above her.

**Does the child feel naturally integrated?** Yes — same light, scale and floor; the contact shadow was restored after cleaning the plate.

**Does the object feel like part of the room?** Yes; it is the room's object, lit by the same sun.

**Does the hero still look too much like a normal website?** Much less: there is a scene, not a layout. The remaining website signals are the cobalt call pill, the outlined Notfall pill and the paths rule — deliberate, because utility must look operable.

**Does the left side retain enough calm space for utility?** Yes; the master's wall is the calmest area of the image.

**Does PRAXIS PULS remain more important than decoration?** Yes: first content after the headline, high contrast, first viewport at every size and at 200 % text.

**Do the four paths feel integrated rather than boxed?** Yes — no boxes; a ruled measuring line on the floor. Still a UI line, but quiet.

**Is the mobile version intentionally composed?** Yes: utility on the sunlit wall first, then a cropped scene band with window light, mobile and child above the dock — not a cropped desktop.

**What still cannot be achieved satisfactorily without dedicated production assets?**
- per-element mobile physics (each element turning on its own thread) — needs a real 3D model or per-element cut-outs with exact pivots;
- a child presence approved for public use (consented photography or a decided AI policy);
- a production room plate (photographed or rendered at higher resolution, with a clean ceiling region and no AI re-render artefacts);
- a full-arch window on phones (needs a portrait-specific plate).

---

## 11. What still differs from the master

- **Central arch:** the cleaned plate's arch behind the mobile is slightly larger than in the master (artefact of the removal edit).
- **Floor below the child:** the master's lower edge (rug, pouf, bowl area) is cropped by the ledge on desktop; the bottom fades into the sampled floor colour.
- **Contact shadow:** the child's contact shadow is reconstructed in CSS, softer than the original.
- **Added content:** header, text, status, buttons and paths are added (the master is a pure image).
- **Phones:** the mobile and child are smaller than in the master, by priority.

## 12. Asset size and performance

| Asset | Phone (DPR 1) | 1440 | 1920 |
|---|---:|---:|---:|
| Room plate | 30 KB (960 AVIF) | 61 KB (1600) | 102 KB (2400) |
| Mobile cut-out | 23 KB (420) | 38 KB (830) | 38 KB |
| Child cut-out | 14 KB (300) | 36 KB (570) | 36 KB |
| **Images total** | **68 KB** | **135 KB** | **176 KB** |

- WebP fallbacks for all assets; intrinsic sizes on every image (no CLS). The plate is `fetchpriority="high"`.
- JS: initial 141.4 KB; lazy 0 KB (was 241.5 KB of three.js/R3F).
- Frames: median 16.7 ms, p95 16.8 ms at 1440 and at 390 with 4× CPU throttle; no long tasks.
- Fonts unchanged (150 KB).
- In the capture run (cache disabled) a high-DPR viewport can request the plate twice (preload + image); a normal browser cache dedupes this.

## 13. Accessibility observations

- 23 captures: no horizontal overflow, no targets < 44 px, no clipped labels; status and primary action in the first viewport everywhere (including 200 % text on 390 and 1440).
- Scene layers are decorative (`aria-hidden`, `alt=""`); utility exists only in the DOM.
- Keyboard: skip link, header, actions, paths, age radios, "Zurück zur Übersicht"; focus moves to the age fieldset when Mein Kind is chosen; visible 3 px focus ring.
- Reduced motion: the mobile is static; rod and ring appear without animation. No-WebGL is no longer relevant to the hero (no WebGL used); `?3d=0` renders identically.
- Text over the photograph: ink on the lit wall (≥ 7 : 1); secondary text #3A3E43 on the shadowed wall ≈ 5.7 : 1.

## 14. Build / test

- `npm run build` ✓ · `npm run typecheck` ✓ · `npm test` 75 / 75 ✓
- Routes 200: `/`, `/lab`, `/lab/a`, `/lab/b`, `/lab/c`, `/lab/final`, `/design-system`
- PRAXIS PULS logic unchanged (domain untouched; all five demo states render).

---

## Addendum — mobile hero correction (Phase 06.2)

**Problem:** on narrow/portrait layouts the room's architecture appeared more than once (wall + opening + reception stacked into an impossible room).

**Root cause:** the phone layout used the room image twice at two different scales:
- as a CSS background behind the text zone, showing the left wall;
- in the scene band, which cropped from ≈ 36 % of the width.

The band therefore repeated the wall corner and the large opening arch directly under the wall zone — two crops of one room stacked vertically. The desktop composition was not affected.

**Implementation change (phones and portrait tablets, < 64em only):**
- **Text zone:** a plain CSS plaster wall in daylight (warm gradient, soft diagonal light, window glow from the right). No photo, so no architecture.
- **Scene band:** exactly one controlled crop of the master: its right half (x 50–100 %, y 4–96.5 %). It shows the corridor, the window light, the mobile and the child, each once. The crop is fixed by aspect ratio; never stretched, tiled or extended.
- **Band top:** a short 9 % fade into the wall.
- **Follow-up link** ("Sprechzeiten ansehen" etc.): now sits beside Notfall in the action row, which frees vertical space so the band does not start under the controls.
- **Image `sizes`:** updated for the new crop.

**Behaviour:**
- **360 × 800:** headline on two lines, status, Anrufen, then Notfall with the link beside it. The band shows the mobile (including the cobalt sphere) and the child directly below it; the child's feet stay above the dock.
- **390 × 844 / 430 × 932:** the same composition with more air; the paths begin at the dock.
- No duplicated entrance, window or arch; no seams; no stretched background; no child or dock collisions (23 captures, 0 audit issues).

**Intentionally hidden on mobile:** the wall corner and the large opening arch (master x < 50 %), most of the reception area, the left wall's photographic leaf shadows (replaced by CSS daylight), and the far-left room depth. The full composition remains on desktop.

**Desktop:** unchanged; the shared `.follow` link now sits in the action row and wraps below the buttons as before.

Screenshots: [`mobile-hero-360-390-430.png`](phase-06-2/screenshots/mobile-hero-360-390-430.png), `final-open-{360x800,390x844,430x932}.png`, `final-scene-band-390x844.png`.
