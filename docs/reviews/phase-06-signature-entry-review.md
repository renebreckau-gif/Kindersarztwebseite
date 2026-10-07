# Phase 06 — Signature Entry Review

Phase: 06 — Signature Entry Realization
Date: 2026-10-07
Route: `/lab/final` (internal, `noindex`)
Visual source of truth: the approved reference, **second / middle variant only**
Screenshots and metrics: [`phase-06/screenshots/`](phase-06/screenshots/) · [`phase-06/metrics-final.json`](phase-06/metrics-final.json)

> Status, opening times and reasons on this page are **demo fixtures** (`DEMO_PULS`) and carry a visible "Demo" tag. The phone number is the `VERIFIED_CURRENT` working number (F15), still subject to practice sign-off (LB-00). The headline is the locked north star ("Gesund groß werden."). The reference's own copy ("Neugier braucht gute Begleitung.", "Medizin, die mitwächst …", path descriptions, footer line) was **not** used: it is unapproved marketing copy, not practice content.

---

## 1. Scores (1–10)

| Criterion | Score | Note |
|---|---:|---|
| ART DIRECTION | **8** | One coherent world: sunlit arch room, brass, cobalt glass, serif statement. |
| REFERENCE ALIGNMENT | **8** | Composition, light direction, palette, pill language, path ledge and object vocabulary all follow the middle variant; no child photo (by brief). |
| DISTINCTIVENESS | **8** | The hanging brass arc in an arch of light is not a template hero; no stock, no illustration kit. |
| EMOTIONAL WARMTH | **8** | Peach/ivory falloff, warm shadow, soft materials. Real photography will raise this further. |
| PREMIUM FEEL | **8** | Restraint, large type, precise materials, generous negative space. |
| PEDIATRIC FIT | **7** | Reads as a child's mobile and "growing up" (Mein Kind rod), but without a child presence it is still adult-leaning. |
| PRACTICE PULSE CLARITY | **9** | Status + time in one lit pill directly under the statement, call button right below, Notfall separate. |
| OBJECT QUALITY | **7** | Clean, believable materials; procedural geometry still simple (no bevelled brass joints, no real glass refraction). |
| TYPOGRAPHY IN CONTEXT | **8** | Newsreader display at reference scale, sans subline and UI, serif path titles. |
| SPATIAL DEPTH | **7** | Arch, cast shadow, floor fall-off and bowl create a room; still flatter than the photographic reference. |
| LIGHTING QUALITY | **7** | Warm window light and soft shadow are convincing; no true light shafts on objects, CSS light only. |
| MOTION QUALITY | **8** | Heavy, damped springs; one entry settle; no bounce or dangling; selection tips the arc gently. |
| MOBILE QUALITY | **8** | Utility fully in the first viewport at 360/390/430; object visible but small. |
| ACCESSIBILITY | **8** | Real links/radios, focus rings, status never colour-only, UNKNOWN neutral, 200 % text without overflow; no screen-reader pass yet. |
| PERFORMANCE | **8** | 144 KB initial JS, 3D lazy (242 KB) only when allowed; 16.7 ms median frames at 4× CPU throttle on mobile. |
| **OVERALL SIGNATURE IMPACT** | **8** | Now a signature entry, not a convergence prototype. |

**Quality gate:** ART DIRECTION, REFERENCE ALIGNMENT, DISTINCTIVENESS, PREMIUM FEEL, PRACTICE PULSE CLARITY, MOBILE QUALITY and OVERALL are all ≥ 8 → gate passed. One focused refinement pass was still made during the phase (see §9).

---

## 2. What improved vs the previous `/lab/final`

- **From diagram to room.** The old version was a structurally correct layout on flat paper with a schematic, multi-beam mobile. Now the entry is a warm, sunlit space: an arched window of light, soft wall gradient, floor fall-off, a cast shadow on the wall, a ceramic bowl below the object.
- **Object rebuilt to the reference.** One sweeping brass arc on a single pivot instead of three stacked beams; cobalt **glass sphere** as the focal element; coral and muted-yellow **half-discs**; pale translucent **ring**; ceramic bowl as base.
- **Typography at the reference's scale.** Two-line serif wordmark; "Gesund groß werden." at ~90 px (1440) set as the composition's anchor; sans subline.
- **PRAXIS PULS as part of the picture.** A lit translucent pill ("Praxis geöffnet / Heute bis 12:00 Uhr"), a deep cobalt pill "Anrufen 03476 851157", an outlined red "Notfall" — exactly the reference hierarchy.
- **Four paths as a ledge, not cards.** One translucent panel with hairline separators, line icons drawn from the object's own shapes, serif titles, short orientation lines; selected path gets a cobalt top rule and cobalt title.
- **Design-system tokens adopted** (`tokens.css` / `base.css` via `app/lab/final/layout.tsx`).
- **All five PULS states** (open, closed, special, closure, unknown) instead of three.

## 3. What now matches the approved reference

- Warm peach/ivory room light, falling off from an arched window on the right.
- Left-aligned large serif statement with a sans subline beneath.
- Status pill with green dot + bold state + time line; deep cobalt call pill with the number; separate outlined red Notfall pill.
- Header: two-line serif wordmark left, four path links right, round dark button at the far right (here: Menü, not search — the IA has no search).
- Curved brass arm mobile with cobalt glass sphere, coral half-disc, pale ring, yellow half-disc, matte ceramic bowl.
- Bottom row of four paths with thin line icons, serif titles and short descriptions on a light translucent panel separated by hairlines.
- Large negative space; quiet, premium tone; no stock imagery.

## 4. What still differs

- **No child.** The reference's seated child looking up is the emotional centre of the image; it is deliberately absent (brief: no child photo / AI child this phase). The composition leaves the lower right of the arch open enough for a later, subtle presence without reserving an empty hero hole.
- **Photographic light vs CSS light.** The reference has real sun patches, bloom and soft floor reflections; ours is gradient light. Shafts are suggested, not visible as beams.
- **Object scale.** In the reference the mobile fills more of the frame (especially on mobile). Here it yields to utility on phones.
- **Copy.** Reference headline/subline/descriptions not used (unverified marketing copy); the footer line "Mit Kindern die Welt entdecken." and "01 — 04" were left out (the four paths are not a sequence).
- **Search button** replaced by Menü (no search in the IA).

## 5. What still feels too prototypical

- Element geometry is primitive-perfect (a sphere, a half-disc, a torus); brass joints and caps are simple boxes/cylinders.
- The glass sphere is glossy enamel rather than true glass with refraction/depth.
- The ceramic bowl is a flat SVG drawing in the poster world, not part of the 3D light.
- On mobile the object reads as a small ornament in the top-right corner.
- The arch is a single shape without wall thickness detail or sill.

## 6. What should later be improved with final geometry or generated assets

- **Final object model** (glTF, < 300 KB, Draco/Meshopt): turned brass with real bevels and joints, a hand-blown cobalt glass sphere with thickness/attenuation, slightly irregular soft-touch discs, a real stone/ceramic bowl.
- **Baked lighting/AO texture** for the object set so it sits in the room's light.
- **Room plate** (optional, generated or photographed, conceptual only, `AI_CONCEPTUAL` class if generated): an empty, warm arched room at low resolution/blur as a background layer, AVIF < 80 KB. Candidate prompt direction documented here only — no generation this phase.
- **Real photography** (consented, documentary, `REAL`) for the later subtle child presence — never AI children.

## 7. What should not be solved with code

- The child presence and the emotional warmth it brings (photography + consent, not WebGL).
- Final wording of the statement, subline and path descriptions (practice + editorial sign-off).
- Real opening hours and status data (facts, `VERIFIED_CURRENT` only).
- Photographic light quality (a photographed/rendered plate beats ever more CSS gradients).

---

## 8. Visual comparison vs the reference

| Aspect | Reference (middle variant) | Phase 06 `/lab/final` | Gap |
|---|---|---|---|
| Lighting | Low sun through an arched window, visible patches, bloom | Warm window glow, wall fall-off, soft shadow, floor warmth | Medium — no visible beams/patches on objects |
| Atmosphere | Calm, sunny, slightly dreamy | Calm, warm, quiet | Small |
| Spatial depth | Real room, floor, depth of field | Arch + floor gradient + cast shadow + bowl | Medium |
| Typographic confidence | Big serif statement, small sans | Same ratio, same left alignment | Small |
| Object quality | Rendered brass/glass with real reflections | Real-time PBR with environment reflections, simple geometry | Medium |
| Materiality | Brass, cobalt glass, soft coral, ceramic | Same palette and roles | Small |
| Negative space | Generous | Generous (desktop); compact (mobile, by priority) | Small |
| Premium feel | High | High on desktop | Small |
| Emotional warmth | High (child + light) | Warm, but without the child | Medium |

---

## 9. Refinement pass (during this phase)

1. Cobalt sphere read lavender/plastic → deeper glass colour, lower environment intensity, removed sheen/iridescence; SVG poster gradient deepened.
2. Object lacked presence → element sizes +10–15 %, thicker arc, larger stage on desktop.
3. Window mullion cut through the object → removed; window light brightened; sun patches added.
4. Paths ledge slipped below the 900 px fold → stage height bound to 47 svh, tighter vertical rhythm. Now fully visible at 1440 × 900.
5. Poster threads invisible (SVG `objectBoundingBox` gradient on zero-width lines) → solid brass for straight wires.
6. 200 % text broke the headline mid-word on phones → statement column now `minmax(min-content, …)`; the object yields instead.

---

## 10. Brutal questions

**Does this still look like a normal website?** No longer at first glance. The first viewport reads as a lit room with an object, not as header + hero + cards. Below the fold (lab sections) it is still plain — by design, content pages are not part of this phase.

**Does it feel too HTML-like?** The pills and the translucent ledge are honest UI; the room and the object carry the image. The bowl and the arch are flat-ish and give away "CSS" on close inspection.

**Does it belong to the same visual world as the reference?** Yes — same light direction, palette, materials, type relationship and component vocabulary. The missing child and photographic light are the visible differences.

**Is the lighting warm enough?** Warm, yes; dramatic, no. The reference's sun patches are stronger. Acceptable for a code-only layer; a room plate would close the gap.

**Does the object feel intentional?** Yes: one arc, one pivot, four elements that map to four paths, a measuring rod for Mein Kind. It no longer looks like a demo mobile.

**Does the space feel warm?** Yes, peach/ivory with warm shadows; no clinical white, no hospital blue.

**Does it feel premium without becoming cold?** Yes; restraint and material quality, warmed by the light and coral/yellow.

**Is it obviously pediatric?** Moderately. A mobile is a child's object and "Gesund groß werden" is explicit; the child presence (later, real photography) is what makes it unmistakable.

**Is PRAXIS PULS instantly understandable?** Yes. One pill: mark + state + time; UNKNOWN shows no mark and neutral wording ("Aktuelle Sprechzeiten / Bitte aktuelle Informationen prüfen."); the call action is always directly below.

**Are the four paths easy to use?** Yes: four labelled links in one row (2 × 2 on phones), ≥ 48 px targets, keyboard focus ring, `aria-current` on selection; they work without JavaScript (`?pfad=…`).

**Is mobile still utility-first?** Yes. At 360 × 800, 390 × 844 and 430 × 932 identity, status, time, Anrufen, Notfall and the dock are all in the first viewport; the paths begin above the dock.

**Can a parent immediately find status, opening information, phone and emergency access?** Yes — in that order, within the first ~530 px on a 390 px phone, plus the dock (Anrufen · Heute · Notfall · Menü).

**Is any visual ambition hurting usability?** No measured case: no overflow at any size or at 200 % text, no small targets, the 3D layer is lazy and skipped for reduced motion, Save-Data, low power and `?3d=0`. At 200 % text the object shrinks so words never break.

**Is anything decorative without purpose?** The ceramic bowl is purely atmospheric (it grounds the object and echoes the reference). The light shapes are decorative but cheap (CSS, no images) and they establish the room. Everything else carries meaning (each element = a path; the rod = age).

---

## 11. Mobile, accessibility and performance observations

- **Viewports:** 1920 × 1080, 1440 × 900, 430 × 932, 390 × 844, 360 × 800 — no horizontal overflow; status and actions in the first viewport at all five.
- **200 % text:** no overflow; status moves below the first viewport on phones (headline grows); the dock keeps Anrufen/Heute/Notfall reachable.
- **States:** OPEN (dot), CLOSED (ring), SPECIAL (half), CLOSURE (barred ring), UNKNOWN (no mark, neutral pill, neutral border). Never colour-only.
- **Emergency:** separate red outlined action in the hero and in the dock; the 112 block lives at `#notfall`.
- **Keyboard:** skip link, header nav, actions, four paths, age radios and "Zurück zur Übersicht" are native elements with a 3 px cobalt focus ring.
- **Reduced motion / no 3D:** designed SVG poster with identical geometry, cast shadow and bowl; no canvas, no JS chunk for 3D.
- **Performance (headless Chrome 155, RTX 2060):** initial JS 144 KB; lazy 3D 242 KB only when allowed; median frame 16.7 ms (p95 16.8 ms) at 1440 and at 390 with 4× CPU throttle; first-ever load at 1920 shows a one-off 1.2 s long task (cold shader compile in the first capture of the run).
- **Not yet tested:** real phones/GPUs, screen readers, forced-colours in depth.

## 12. Token / system changes (documented)

The Phase 05 system said "no pills, gradients, glass or soft shadows". The approved reference explicitly uses pill actions, translucent panels and soft light. These are adopted **scoped to the signature entry** (`src/lab/final/signature.module.css`, `.page` scope):

- `--room-ivory #F8F2E9`, `--room-wall #F3E6D6`, `--room-peach #F1D5BD`, `--room-glow #FFFAF1`, `--room-floor #E6D0BB`, `--room-shade #8A6248`
- `--glass-panel rgb(255 251 245 / .62)`, `--glass-edge rgb(255 255 255 / .75)`
- `--radius-pill 999px`, `--radius-ledge 22px`
- `--call-bg #3446E8` (= `--palette-cobalt-text`, 6.9 : 1 with white), `--call-bg-deep #2433C4`
- Signature material palette (`SIGNATURE` in `signature-poster.tsx`): brass `#B8925A` family, cobalt glass `#2438D0` / deep `#101A78`, coral `#EE8466`, yellow `#EDC85E`, ring `#F4F0FA`.

The global token file is unchanged. If the human review approves this direction, Phase 07 should promote these into `tokens.css` and update `design-system.md` and `phase-05-decisions.md`.

## 13. Files

- `app/lab/final/layout.tsx` (new) — design-system tokens/base, `noindex`
- `app/lab/final/page.tsx` (rewritten)
- `src/lab/final/signature-geometry.ts` (new) — arc, pivot, threads, elements, Mein Kind rod
- `src/lab/final/signature-poster.tsx` (new) — SVG poster + cast shadow
- `src/lab/final/signature-scene.tsx` (new) — R3F scene, render on demand
- `src/lab/final/signature-object.tsx` (new) — object zone, four paths, age choice
- `src/lab/final/entry-chrome.tsx` (new) — header, PULS statement, dock
- `src/lab/final/path-icons.tsx` (new)
- `src/lab/final/signature.module.css` (new)
- `src/lab/chrome.tsx` — `LabToolbar` accepts custom states
- `scripts/lab-capture.mjs` — output dir, quick mode, extra Phase 06 captures
- removed: `src/lab/proto-final.tsx`, `src/lab/proto-final.module.css`
