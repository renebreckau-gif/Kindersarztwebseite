# D1-03 — Messen & Wiegen

Brief for scene 03 of `/entdecken/mein-arztbesuch` · Phase 08 · 2026-10-07 · **not produced**
Shared spec (master 2400 × 1800, 12 × 9 grid of 200 px cells C1–C12 / R1–R9, floor line y 1332, key light upper right, safe zone x 240–2160 / y 144–1656): [00-overview.md](00-overview.md) · World rules: [../mein-arztbesuch-art-direction.md](../mein-arztbesuch-art-direction.md)
Content: `src/content/discovery.ts` → scene `messen-wiegen` · File names: `d1-03-messen-wiegen-<layer>@<width>.<ext>`

## 1. PURPOSE

Explains measuring height (and, in the copy, weight). Job: *you can see how a child grows.* This is the **recommended style frame** (00-overview): full figure, companion, a medical object, a growth accent.

## 2. STORY MOMENT

The child stands upright on a low platform with heels against a tall measuring rod; a yellow marker rests on the rod at the top of the child's head. Copy: „Manchmal wird geschaut, wie groß du gerade bist. Und wie schwer.“

## 3. EMOTION

Attentive and a little proud: chin level, eyes looking up toward the marker (not at the camera), a small closed-mouth smile.

## 4. PRIMARY SUBJECT

**Measuring rod**: vertical brushed-brass rod (width ~44 px) at x 1000 (C5–C6), from the platform (y 1290) up to y 180, with fine engraved ticks every 40 px on its left side (**no numerals**). The **yellow marker** (discovery yellow sphere-slider, Ø 120 px) sits on the rod at y 430, exactly at the top of the head.

## 5. SECONDARY OBJECTS

- **Child**: full figure in front of the rod, ~860 px tall (y 430–1290), facing ¾ toward the viewer and turned slightly right; arms relaxed; socks on (shoes beside the platform); clothes stay on.
- **Scale platform**: low warm-ceramic platform (w 520, h 44) under the child at y 1290–1332. It has **no display and no numbers**.
- **Companion**: at the left edge (x ≤ 360), cut at the shoulder. Visible: cobalt sleeve, hand holding the child's shoes.
- The child's shoes on the floor at x ~560.

## 6. ENVIRONMENT

Night stage and floor. No height chart wall stickers, no animals on the rod, no examination table.

## 7. COMPOSITION

Strong vertical (rod + child) on the left/centre third line (x 1000). The marker is the brightest point (eye target). The right side C8–C12 is calm darkness with the falling key light.

## 8. CAMERA ANGLE

Child eye height (y ≈ 600 for a standing child), 50 mm, straight on, 0° tilt, so the rod stays perfectly vertical.

## 9. LIGHT

Key from the upper right grazes the brass ticks (they sparkle subtly) and lights the child's face. The marker has a soft warm self-glow (fx). Cobalt fill on the platform's left side.

## 10. COLOR

Night; rod brass #C9A25E; marker #F1CF68; platform ceramic #EEE9DF; child top coral #F28B74 **or** yellow per the model sheet (decide at the style frame; it must contrast with the marker); companion sleeve #4A5CFF.

## 11. MATERIAL

Brushed brass rod with engraved ticks; satin yellow marker; ceramic platform; felt clothes; cotton socks.

## 12. NEGATIVE SPACE

C8–C12 × R1–R6; C1–C4 × R1–R3. Nothing may compete with the marker.

## 13. DESKTOP ASPECT / CROP

Full master; the vertical rod reads as a „bookmark“ next to the text column.

## 14. MOBILE ASPECT / CROP

Rod x 980–1024 and marker y 370–490 inside the safe zone; child head ≥ 176 px; ticks ≥ 5 px apart at 328 px. If not, increase the spacing to 48 px.

## 15. SEPARATE LAYERS

`bg` · `floor` · `object` (rod + platform) · `marker` (separate, for motion) · `fx` (marker glow) · `figures` (child, companion arm, shoes).

## 16. POTENTIAL MOTION

Optional, once: the marker slides from y 600 up to y 430 (1.2 s, ease-out) and settles; ticks do not animate. The end frame equals the master.

## 17. CLASSIFICATION

**ORIGINAL ART preferred** (commissioned illustrator/3D artist working to the style frame). AI_CONCEPTUAL is allowed only if (a) generated from the approved style frame and model sheet, (b) every frame is retouched to the rules, and (c) the class is recorded in `discovery.ts`. Never photoreal; never REAL (no photographs of children).

## 18. ACCESSIBILITY ROLE

Alt: „Ein Kind steht gerade vor einem Messstab. Eine gelbe Markierung zeigt, wie groß es ist.“

## 19. WHAT NOT TO GENERATE

- Numbers, a growth chart, percentiles, a scale display, „kg“ or „cm“.
- Undressing beyond shoes; underwear; a baby in a nappy.
- An adult pressing the child's head; a cartoon giraffe height chart.
- A doctor or assistant figure.

## 20. CONSISTENCY

The rod is the same brass as the Growing Mobile's arcs; the marker is the ENTDECKEN yellow sphere (the growth element). The figures are identical to 01/02.
