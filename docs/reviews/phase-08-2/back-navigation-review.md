# Phase 08.2 Review — Global Back Navigation System

Date: 2026-10-07 · Baseline: abbb82b · Screenshots: [screenshots/](screenshots/) (11 requested captures)

## Rule

**Top left = one level up.** Every public page except Start has the same control, in the same place, pointing to a fixed parent route. It never uses the browser history.

## Component

`PageBackNav` (`src/site/blocks.tsx`) is still the only back primitive:

- **Structure:** a real Next `<Link>` with a 48 × 48 circle holding a left **arrow** (shaft plus head, stroked, `aria-hidden`), followed by the destination name ("Start", "Mein Kind", "3–6 Jahre"). The accessible name is "Zurück zu …".
- **Why an arrow, not a triangle:** it reads as "back", not "play", "previous slide" or a carousel.
- **Light tone:** warm paper surface `rgb(255 252 246 / .78)`, fine border, dark arrow.
- **Night tone (Entdecken):** translucent glass `rgb(255 255 255 / .07)`, light arrow, light border. Same geometry in both tones.
- **States:**
  - Hover: border and fill strengthen, the arrow moves 2 px left.
  - Press: the arrow moves 3 px left.
  - Focus: the existing focus token on the whole control.
  - Reduced motion: no movement, no transitions.
  - Forced colours: the circle is drawn in `LinkText`.
- **Placement:** the first row of the page's first block (PageIntro, Notfall hero, chapter frame). The container drops its top padding, so the circle sits **12 px under the header at the gutter on every page** (measured on all 25 routes at 390 and 1440).
- **Spacing to the H1:** 16 px on mobile, 32 px on desktop. Exception: on desktop pages whose intro has a tall right column (Heute, Praxis, Entdecken, Notfall), the H1 sits lower because those intros are bottom-aligned (unchanged layout). The control itself does not move.

## Coverage

| Route | Back to |
|---|---|
| /heute, /mein-kind, /praxis, /entdecken, /notfall, /impressum, /datenschutz, /barrierefreiheit | Start |
| /heute/sprechzeiten, /heute/aktuelles | Heute |
| /mein-kind/{0-2,3-6,7-12,13-17}-jahre, /mein-kind/vorsorge, /mein-kind/impfungen (generic or invalid `?alter=`) | Mein Kind |
| /mein-kind/vorsorge?alter=…, /mein-kind/impfungen?alter=… (valid) | the age page |
| /praxis/aerztinnen, /praxis/team, /praxis/leistungen, /praxis/neu-bei-uns, /praxis/kontakt | Praxis |
| /entdecken/mein-arztbesuch | Entdecken (the story keeps its own "Schließen – zur Übersicht") |
| / | — (root) |

- **Notfall:** the shared component sits above the "Notfall" title and outside the 112 block. It is neutral (paper, not red) and its target area is about a quarter of the 112 button's (4,992 vs 21,421 px²).
- **Legal pages:** handled once in `LegalPlaceholder`, so the three legal pages need no props of their own.
- **Entdecken in preview** (`?vorschau=freigabe`): the back link keeps the review parameter.

## Visual review

| Question | Answer |
|---|---|
| Can the user immediately see how to go back on every page? | Yes. A 48 px circle with an arrow is the first element under the header on every page except Start. |
| Does the circular arrow clearly read as navigation? | Yes. It is a horizontal arrow with a shaft, next to a place name: it reads as "back to Mein Kind", not as media control. |
| Does it appear in exactly the same location? | Yes: x = gutter (18 px mobile, 50 px desktop), 12 px under the header, on all routes. |
| Does Mein Kind / Heute / Praxis / Entdecken now have a clear route back to Start? | Yes, all four, with "Start" visible and "Zurück zu Start" announced. |
| Does Notfall have a back control without weakening 112? | Yes. The control is small, neutral and above the title; 112 stays the dominant red action, and 116117 and the rest of the hierarchy are untouched. |
| Do legal pages have a consistent route to Start? | Yes, through the shared placeholder. |
| Does contextual age navigation still work? | Yes. `?alter=3-6-jahre` shows "3–6 Jahre" and links to `/mein-kind/3-6-jahre`; `?alter=banana` shows Mein Kind. |
| Is the control visually obvious without being dominant? | Yes. It has a quiet surface and fine border, and the arrow is the strongest mark. It never competes with the H1, the call action or 112. |

## Tests and checks

- `npm test`: 111 pass. The updated route-hierarchy test covers top-level, Notfall, legal and Start. New tests: route coverage (every `page.tsx` except Start uses the pattern) and the shape check (arrow, no filled triangle).
- Typecheck and build are clean.
- Browser:
  - position and target measured on 25 routes at 390 and 1440;
  - no overflow at 360/390/430 with 100 % and 200 % text, nor at real 200 % zoom (720 px viewport);
  - the first focusable element in main is the back link; one H1 per page.
- Regressions:
  - dock order unchanged; the overlay menu opens with 8 links; no `#menue`;
  - live PULS without the banner; no back control on Start;
  - Mein Arztbesuch preview has 6 scenes;
  - the hero, dock, glass, story and age-context logic are unchanged (no diffs in those files).

## Open

1. A synthetic test (root font at 200 % inside a 1440 px viewport) overflows by 408 px on every page, caused by the **global header utilities** (status, call and Notfall pills). This existed before this phase and is in the locked header. Real 200 % browser zoom (720 px) does not overflow.
2. On desktop, intros with tall right columns (Heute, Praxis, Entdecken, Notfall) place the H1 well below the back control (bottom-aligned intros). This is consistent but airy; it could be top-aligned later if wanted.
