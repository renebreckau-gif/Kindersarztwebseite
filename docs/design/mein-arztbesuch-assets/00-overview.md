# Mein Arztbesuch — Asset Briefs: Overview

Phase: 08 · Date: 2026-10-07 · Asset: **D1 (V1 SIGNATURE S04)**, priority **P1**
World rules: [../mein-arztbesuch-art-direction.md](../mein-arztbesuch-art-direction.md) (all section references below point there)
Content source: `src/content/discovery.ts` (child copy, why-texts, alt texts, approvals)

**No image in this folder is final, and none was generated in Phase 08.** These briefs are production decisions for step 3 (ASSET PRODUCTION). They may only be executed after step 2: one **approved visual reference** (style frame).

## Sequence

| # | Scene | Hero object | Figures | Story job | Medical approval |
|---|---|---|---|---|---|
| 01 | [Ankommen](01-ankommen.md) | Door arch | Child + companion, full | We arrive; the visit begins | — |
| 02 | [Warten](02-warten.md) | Bench | Child + companion, full, seated | Waiting is normal | — |
| 03 | [Messen & Wiegen](03-messen-wiegen.md) | Measuring rod (+ scale platform) | Child full, companion at the edge | Growing is seen and measured | required |
| 04 | [Abhören](04-abhoeren.md) | Stethoscope | Child upper body, doctor's hand only | Heart and breath can be heard | required |
| 05 | [Ohren & Hals](05-ohren-hals.md) | Otoscope lamp | Child head and shoulders, doctor's hand only | A small light helps to look | required |
| 06 | [Fertig](06-fertig.md) | Door arch (mirrored) | Child + companion, full, leaving | Done; you know a bit more | — |

The rhythm runs **wide → wide → full figure → close → close → wide**. The camera comes closer for the examinations and steps back for arriving and leaving, so the child always sees the way out again.

## Shared technical spec (applies to every brief)

| Field | Value |
|---|---|
| Master | 4 : 3, **2400 × 1800 px**, sRGB, 16-bit layered source |
| Grid | 12 columns × 9 rows (200 px cells). Cells are named C1–C12 (left→right) and R1–R9 (top→bottom) |
| Horizon / floor line | Row R7 top edge = **y 1332 (74 %)** |
| Key light | Upper right, ~2 o'clock, 35° elevation, warm #FFE4C4 |
| Fill | Lower left, cobalt #4A5CFF ~18 % |
| Camera | Child eye height (~95 cm model scale), 50 mm equivalent, tilt ≤ 5° down; identical in all scenes |
| Desktop display | 7/12 column, ~760 × 570 css px at 1440 |
| Mobile display | Full width, 328–398 css px; safe zone = central 80 % W × 84 % H (x 240–2160, y 144–1656) |
| Corner keep-out | 4 % from each corner (rounded 18 px frame) |
| Layers | `bg` (night gradient), `floor`, `object`, `figures`, `fx` (light/glow), each with alpha |
| Exports | Flattened AVIF + WebP at 2400 / 1600 / 960; per-scene AVIF@1600 ≤ 140 KB |
| Naming | `d1-0X-<slug>-<layer>@<width>.<ext>` |
| Classification | Each scene: ORIGINAL ART (preferred) or AI_CONCEPTUAL, recorded in `discovery.ts` |

## Copy rules the images must respect

The text in `discovery.ts` was written with short sentences, "du", no promises about pain or fear, no "mutig/tapfer", no claims that every visit runs this way, and no practice details (waiting room, toys, times). The images follow the same rules: they show **what can happen, not how it feels**, and nothing practice-specific. Tests enforce the text side (`src/content/__tests__/discovery.test.ts`).

## Step 2 recommendation — the approved visual reference

Produce **scene 03 (Messen & Wiegen) first** as the style frame. It contains the full child figure, the companion (partly), a medical object, a growth accent and the floor and horizon, so it tests every world rule at once. When it is approved: produce the model sheet (child + companion), then 01 → 02 → 04 → 05 → 06.

## Acceptance checklist per delivered scene

1. Matches the style frame side by side (light, camera, palette, figure proportions).
2. Hero object and face are inside the mobile safe zone; legibility test at 328 px passes (art direction §14).
3. Hero object to background contrast ≥ 3 : 1.
4. Nothing from art direction §12 appears.
5. Physician confirms the instrument's form (03–05).
6. Practice confirms the scene does not contradict visits there.
7. `discovery.ts` updated: `visual.class`, `contentApproval`, `practiceApproval`, `medicalApproval`, `approvedBy`, `lastReviewedAt`.
