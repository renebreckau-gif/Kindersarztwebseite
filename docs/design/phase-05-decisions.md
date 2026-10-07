# Phase 05 Decisions

Phase: 05 — Visual Design System & Interaction Language
Date: 2026-10-07
Documents: [design-system.md](design-system.md) · [motion-system.md](motion-system.md) · [3d-language.md](3d-language.md) · [photography-direction.md](photography-direction.md) · [placeholder-system.md](placeholder-system.md) · [responsive-design.md](responsive-design.md) · review: [phase-05-design-system-review.md](../reviews/phase-05-design-system-review.md)
Code: `src/design-system/` (tokens, base, primitives) · route `/design-system` · capture: `scripts/ds-capture.mjs`

## Review before commit

| Check | Result |
|---|---|
| Generic SaaS aesthetics | No pills, gradients, glass or soft shadows; one physical key edge |
| Generic healthcare aesthetics | No stock, no medical icons, no hospital blue |
| Over-rounded UI | Radii 0 / 4 / 10 only |
| Too many cards | Cards reserved for people and ENTDECKEN chapters |
| Too many accent colours | One accent per production view; documentation intentionally shows all |
| Weak German typography | Long-word stress test at 320/220/160 px and 200 %: wraps, never clips |
| Mobile overflow | Fixed (360 px and 200 % text); verified by capture audit |
| Desktop-first assumptions | Mobile order and dock designed first |
| Hidden utility | Status, phone, Notfall in header/dock and first viewport |
| Weak focus states | 3 px designed ring, yellow on ink |
| Colour-only communication | Status = shape + word (+ colour) |
| Unnecessary animation / JS | CSS-only demos; JS only for the 3D stage (lazy) |
| Unnecessary dependencies | None added |
| Unverified practice information | Demo fixtures only (`0000 123456`, "Dr. med. Beispiel", "(Demo)") |
| Placeholders mistaken for reality | Hatched drawings with badges, no faces, no stock |

## FINAL COLOR SYSTEM
Paper #F3EFE7 and Ink #171A1D carry ~70 %; Cobalt #4A5CFF (graphics/focus/selection) with #3446E8 for text links; Coral, Yellow, Lilac as single-purpose accents, never text; Green #3E9B72 only as the OPEN dot; Red #C63831/#A82B25 only for emergency; ENTDECKEN night mode #0F1220 with luminous cobalt #8C9BFF. Semantic tokens only in components.

## FINAL TYPOGRAPHY DIRECTION
**Keep Newsreader + Instrument Sans.** Serif for statements, headings and lead; sans for UI, body, numbers (tabular). Thirteen roles on one fluid scale. Latin subset, no width axis, **no optical-size axis** (fonts 186 KB instead of 526 KB); revisit a display-only optical-size subset later. Sentence case everywhere; italic only for status detail lines.

## FINAL SPACING / GRID PRINCIPLES
4-px spacing scale (2–128 px) + fluid section and gutter tokens; 4/6/12-column grid; reading 38 rem, content 76 rem, wide 90 rem; asymmetry through column choice; every grid track `minmax(0, 1fr)`.

## FINAL COMPONENT LANGUAGE
Rules before boxes: Messlinie section starts, InfoBlocks, rule-separated lists; Notice/Warning as tinted blocks with an ink rule; cards only for people and chapters. Actions: ink key on a cobalt edge (primary), drawn outline (secondary), measured underline (quiet), deep red key (emergency). Status: shape-coded marks + words in chip, inline, hero and dock forms. Instruments: age scale (rising ticks) and day ruler.

## FINAL MOTION PRINCIPLES
Physical, calm, precise, slightly playful; motion answers actions; durations by purpose (90 / 160 / 260 / 360 / 520 / 720 ms + springs); physical overshoot only for object/discovery; one reveal per page; designed reduced-motion alternatives per component; utility never animates.

## FINAL MOBILE PRINCIPLES
Phone first: identity → status → action → content; dock (Anrufen · Heute · Notfall · Menü) fixed, early in DOM, 2 × 2 with enlarged base font; targets ≥ 48 px; words wrap, never clip; no horizontal scroll at 360 px or 200 % text; 3D optional and lazy.

## FINAL 3D MATERIAL DIRECTION
Warm ceramic, dark anodized structure, cobalt enamel (single active element), coral soft-touch, discovery yellow; soft paper-studio lighting; orthographic still camera; precise instrument-like edges (Phase 06); designed SVG poster as fallback; render-on-demand.

## FINAL PHOTOGRAPHY DIRECTION
REAL: natural, warm, documentary, bright not clinical, consistent staff portraits (4 : 5, same light), consent first. AI_CONCEPTUAL: conceptual/atmospheric only, never patients, staff or rooms, avoid uncanny perfection and distress. No stock.

## FINAL PLACEHOLDER RULES
Hatched paper frames with corner marks, abstract geometric glyphs (no faces), kind label and class badge (Platzhalter / KI-Konzept / Echt); never on production pages; confirmed people without photo get a neutral frame without badge; unconfirmed people are not shown.

## TOP 5 VISUAL RISKS
1. Cream + serif palette drifting toward a generic editorial look if the measurement vocabulary is not used consistently.
2. Desktop openings feeling like a fashion magazine (too much air, too little content).
3. Too adult for children outside ENTDECKEN until real photography and the final object exist.
4. Accent colours multiplying on real pages (more than one per view).
5. Display type without optical sizing looking slightly heavy at very large sizes.

## TOP 5 MOBILE RISKS
1. Real OS large-text settings (not just root scaling) on small phones — dock and status hero.
2. Long German compounds in narrow components not yet built (tables, breadcrumbs).
3. Landscape phones with the Growing Mobile on the entry page.
4. Low-end GPUs with the 3D layer (still untested on real devices).
5. Sticky header + dock reducing usable height on short screens.

## TOP 5 ACCESSIBILITY RISKS
1. No real screen-reader pass yet (NVDA, VoiceOver, TalkBack).
2. Cobalt #4A5CFF at 4.3 : 1 must stay restricted to large text/graphics; misuse for small text would fail.
3. Green OPEN dot (3.0 : 1) relies on the word — never ship the dot alone.
4. Forced-colours mode only partly tested.
5. Future interactive components (menu sheet, disclosures) must keep focus management as specified.

## ANY CHANGES REQUIRED TO THE LOCKED STRATEGY
**None.** The locked strategy (Warm Editorial + Cobalt, Growing Mobile, PRAXIS PULS, four paths, German, fact policy, privacy, Mein Arztbesuch) is unchanged. One implementation note: `/lab/final` will adopt these tokens in Phase 06; its composition stays as approved.
