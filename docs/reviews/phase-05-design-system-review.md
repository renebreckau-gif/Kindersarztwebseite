# Phase 05 Review — Design System

Date: 2026-10-07
Subject: `/design-system` (internal reference route) + tokens/primitives in `src/design-system/`
Evidence: 44 headless captures in [`phase-05/screenshots/`](phase-05/screenshots/), checks in [`phase-05/metrics.json`](phase-05/metrics.json) (overflow, off-screen elements, clipped text, small targets per capture), page-weight measurement, manual inspection in the browser at 360/390 px and 200 % text.

Caveats: Chrome only; 200 % text simulated by scaling the root font size (real OS text scaling still to be tested); no screen-reader pass with real assistive technology yet; desktop GPU.

---

## 1. Scores (1–10)

| Criterion | Score | Reason |
|---|---|---|
| DISTINCTIVENESS | **8** | Measurement-based vocabulary (Messlinie, age scale with rising ticks, day ruler, shape-coded status marks, ink keys on a cobalt edge) is specific to "Gesund groß werden" and unlike any practice site in the Phase 02 benchmark. Held back by the locked cream + serif palette, which by itself is close to a common editorial default. |
| TRUST | **9** | Calm hierarchy, explicit "Stand/Quelle" notes, demo labels, honest placeholders, emergency visually separate, no marketing language. |
| WARMTH | **8** | Paper canvas, serif voice, coral "jetzt" marker; warmth will grow with real photography. |
| EDITORIAL QUALITY | **8** | Confident type scale and rhythm; slightly less refined display type after dropping the optical-size axis for performance. |
| PEDIATRIC FIT | **7** | Adult-respectful and calm; child warmth currently lives in the age system and ENTDECKEN mode — depends on Phase 06 object and real photos. |
| TYPOGRAPHY | **8** | Newsreader + Instrument Sans hold German well (umlauts, ß, long compounds wrap gracefully, tabular times). |
| COLOR | **8** | Clear roles, contrast-checked text tokens, no traffic light; accents disciplined (one per view). |
| COMPONENT QUALITY | **8** | Coherent primitives, all ≥ 44 px, no boxed-card sprawl; some components are documentation mocks (menu sheet). |
| MOTION LANGUAGE | **7** | Purposeful tokens and designed reduced-motion alternatives; only partly demonstrated live (press, state switch, reveal, object). |
| MOBILE QUALITY | **8** | Clean at 360/390/430 and at 200 % text after fixes; dock labels tight at 200 % on 390 px with simulated scaling. |
| ACCESSIBILITY | **8** | Contrast, focus, shape+word status, real form controls, early dock in DOM; real AT pass outstanding. |
| PERFORMANCE | **8** | HTML 28 KB, CSS 13 KB, fonts 186 KB (from 526 KB), JS 143 KB; 3D +238 KB only when in view on capable devices. |
| SCALABILITY | **8** | Semantic tokens, mode re-mapping (ENTDECKEN), primitives for every Phase 03 page type. |
| SIGNATURE-ENTRY COMPATIBILITY | **8** | Same frame as `/lab/final`; material direction proven on the current geometry; `/lab/final` not yet migrated to the new tokens (Phase 06). |

**Quality gate:** DISTINCTIVENESS 8, TRUST 9, TYPOGRAPHY 8, MOBILE QUALITY 8, SIGNATURE-ENTRY COMPATIBILITY 8 → all ≥ 8. Distinctiveness was scored 7 on the first internal pass; the refinement pass is documented in §3.

## 2. Brutal review questions

| Question | Answer |
|---|---|
| Does this look like a generic doctor website? | **No.** No stock photos, no blue-white cross, no icon collage, no hero banner. Status as editorial headline and measurement graphics are unusual for the sector. |
| Does this look like a startup? | **Mostly no.** No gradients, glass or pill CTAs; Instrument Sans is a contemporary grotesk and carries a slight "product" flavour in dense UI — balanced by the serif. |
| Does this look like a fashion magazine? | **At risk on desktop openings** (large serif, lots of air). Mitigated by utility-first content and plain German; watch on real pages. |
| Does this look too adult? | **Slightly**, on utility pages by design. The child register lives in ENTDECKEN, the age system and the Growing Mobile — Phase 06 must deliver it. |
| Does this look childish? | **No.** No mascots, rainbows or rounded toy UI. |
| Does cobalt dominate too much? | **No.** Cobalt appears as key edges, focus, links, the current-path line and selection; documentation pages show more of it than real pages will. |
| Are coral/yellow/lilac becoming decorative noise? | **Not in components** (each has one job). The documentation shows them together on purpose; production views should use one at a time. |
| Does typography feel premium or merely fashionable? | **Premium-leaning.** Newsreader is a book face, not a trend face; the pairing is restrained. Fashionable risk is small. |
| Can stressed parents still scan information instantly? | **Yes.** Status word + time + one action at the top; shapes + words for state; no reading required to find Anrufen or Notfall. |
| Does the system work on 360 px? | **Yes** — verified (no overflow, targets ≥ 44 px, long words wrap). |
| Does it still feel special with motion disabled? | **Yes, mostly.** Measurement graphics, status shapes and typography carry the identity; the object's poster remains. |
| Does it provide enough vocabulary for the full site? | **Yes for V1 pages** (Heute, Sprechzeiten, Notfall, Mein Kind, Praxis, Neu bei uns, Entdecken entry). Missing: data tables for hours (week), form controls beyond radios, breadcrumbs component. |
| Does it give Phase 06 a strong enough world for the Growing Mobile? | **Yes.** Material palette, light, camera and fallback rules are defined; the measuring-instrument idea connects the object to the 2D graphics (ticks, scales, rods). |

## 3. Refinement pass (performed in this phase)

| Issue found | Fix |
|---|---|
| Base CSS (`.ds-root a`) overrode component link colours (emergency red, cobalt links) | Base rules moved to zero specificity (`:where`) |
| 360 px: spacing chapter forced 409 px layout width → dock clipped | Shrinkable grid columns; audit compares against `clientWidth` now (old audit missed it) |
| 200 % text: auto grid tracks widened the page (up to 847 px) | All grid tracks `minmax(0, 1fr)`; chips wrap; footer links wrap; tables become blocks on phones |
| Dock at large text | `minmax(0, 1fr)` cells + 2 × 2 dock for enlarged base font |
| ENTDECKEN primary key invisible (ink on night) | Inverse tokens flip in night mode (paper key, luminous edge) |
| Portrait placeholder read as a blob | Redrawn as neutral head ring + shoulder arc |
| Opening had dead space above the title | Vertically centred, reduced height |
| Fonts 526 KB on first load | Latin subset, no unused width axis, no optical-size axis → 186 KB |
| Distinctiveness (7 → 8) | Shape-coded status marks (ring, half, bar), cobalt-edge keys, measured section starts and rising age ticks consolidated as the system's signature; generic card patterns removed in favour of rules |

## 4. Remaining issues

1. 200 % text on a 390 px phone: dock labels tight under simulated scaling; real OS text scaling test pending.
2. Display typography less refined without optical sizing; consider a display-only optical-size subset later (≈ +70 KB) if performance budget allows.
3. `/lab/final` still uses the Phase 02.5 lab tokens; migrate to `src/design-system/tokens.css` when building the signature entry (Phase 06).
4. Real assistive-technology pass (NVDA, VoiceOver, TalkBack) not done.
5. Menu sheet and some motion are documented as mocks/specs, not interactive components yet.
6. 3D materials look slightly flat under current lighting; to be tuned with the final geometry.
