# Phase 08.1 Review — Orientation, Back Navigation & Age Context

Date: 2026-10-07 · Baseline: 4593adb · Screenshots: [screenshots/](screenshots/) (the six requested captures)

## Changes

- **`PageBackNav`** (`src/site/blocks.tsx`) is the single back control: a real link, visible as "‹ Mein Kind", with the accessible name "Zurück zu Mein Kind". It is wrapped in `<nav aria-label="Übergeordnete Seite">`. `PageIntro` renders it as its first row, and the Mein Arztbesuch chapter uses it directly. Destinations are explicit parent routes; the browser history is never used (test-enforced).
- **Position:** identical on every subpage at 390 and 1440 (measured): 8 px below the header, at the page gutter, 44 px tall.
- **Routes using it:**
  - `/heute/sprechzeiten` and `/heute/aktuelles` → Heute;
  - `/praxis/aerztinnen`, `/praxis/team`, `/praxis/leistungen`, `/praxis/neu-bei-uns`, `/praxis/kontakt` → Praxis;
  - the four age pages → Mein Kind;
  - `/mein-kind/vorsorge` and `/mein-kind/impfungen` → Mein Kind, or the age page when a valid `?alter=` is present;
  - `/entdecken/mein-arztbesuch` → Entdecken (separate from the story's "Schließen – zur Übersicht").
- **Without a back control:** the top-level pages and `/notfall`. The emergency-first 112 stays at the top.
- **Age context model** (`src/content/site.ts`):
  - `ageFromQuery` accepts only `AGES[].slug`. Anything else (unknown, empty, repeated) gives the generic page.
  - `ageTopics`/`ageTopicHref` add `?alter=` only to topics flagged `ageContext` (Vorsorge, Impfungen, J1); the hash comes after the query.
  - `topicBack`, `ageSectionTitle` and `ageContextLine` derive everything from the AGES object. There are no hard-coded copies.
- **Age pages:**
  - The H1 stays "3–6 Jahre".
  - The age name ("Kindergartenjahre") now sits directly under the H1 instead of in the side column.
  - The section heading reads "Orientierung für 3–6 Jahre".
  - The growth scale's current range gains an outlined "Aktuell" label, so it is no longer marked by colour alone. `aria-current` is unchanged.
- **Vorsorge / Impfungen with context:**
  - Back link "‹ 3–6 Jahre", H1 unchanged, context line "Orientierung für 3–6 Jahre · Kindergartenjahre".
  - Page title "Vorsorge – 3–6 Jahre" / "Impfungen – 3–6 Jahre"; the description stays generic.
  - The lede and all medical content are identical to the generic page.
- **U/J line:**
  - Restyled from tab-like rounded blocks (J1 was highlighted in cobalt) into plain labels over rising ticks on one baseline.
  - No links, focus, hover or cursor change, no scroll region; it wraps at 200 % text.
  - New sentence: "Sie sehen die gesamte Vorsorgereihe von U1 bis J1." With age context it adds: "Der Bereich 3–6 Jahre dient hier nur zur Orientierung – welche Untersuchung ansteht, hängt vom genauen Alter Ihres Kindes ab."
  - The chosen age never filters or highlights an examination.

## Brutal review

| Question | Answer |
|---|---|
| Can the user always tell which age range they selected? | Yes. On the age page the H1 *is* the range, the context line names the phase, the section heading repeats the range and the scale says "Aktuell". On Vorsorge/Impfungen the back link and the context line name it, both in the first viewport at 390. |
| Does that context survive entering Vorsorge? | Yes: `/mein-kind/vorsorge?alter=3-6-jahre`, and the back link returns to `/mein-kind/3-6-jahre` (clicked through in the browser). |
| Does that context survive entering Impfungen? | Yes, same flow verified. |
| Can a direct visitor still understand the generic Vorsorge page? | Yes. It is unchanged apart from the U/J sentence and the back link to Mein Kind. |
| Is the back control always in the same visual position? | Yes: x = gutter, 8 px below the header, on all 13 subpage types at 390 and 1440. |
| Does the back control lead to a deterministic parent? | Yes. Every target is an explicit route, and the contextual target is derived from a validated slug. |
| Do we ever use browser history as navigation? | No (test scans `app/(site)` and `src/site`). |
| Does "Orientierung für dieses Alter" still exist anywhere publicly? | No (test). |
| Does the U/J line falsely look interactive? | No. There are no tab shapes, no highlight, no focusable elements and no hover or cursor rules (checked in the browser and by test). |
| Do we make any unsourced age-to-U mapping? | No. The line is the same for every context. The only age-linked anchor is the existing J1 link from 13–17 (J1 = youth examination, an official source already on the page). |
| Do we accidentally imply an individual medical recommendation? | No. The context line says "Orientierung für …". The medical copy does not change with the age, and the U/J sentence says that the exact age decides. |
| Does the fix remain clear at 360 px? | Yes. There is no overflow at 360/390/430 at 100 % and 200 % text, and the back target is 44 px. |

## Tests

- `npm test`: 109 pass (9 new tests in `src/content/__tests__/orientation.test.ts`).
- Typecheck and build are clean.
- Browser:
  - click flow Mein Kind → 3–6 → Vorsorge → back → Impfungen → back;
  - invalid `?alter=banana`: generic page, no "banana" text, back to Mein Kind;
  - exactly one H1 per page; the first focusable element in main is the back link.
- Regressions:
  - dock Menü · Heute · Notfall · Anrufen; the overlay menu opens with 8 links; no `#menue`;
  - live PULS without the preview banner;
  - Mein Arztbesuch: preview has 6 scenes, gated has none;
  - /notfall still puts 112 before 116117;
  - the glass, hero and chrome files are unchanged.

## Open

1. A desktop age page now has an empty right column in the intro, because the age name moved under the H1. This is acceptable, but it could later hold the growth scale.
2. Legal pages (Impressum, Datenschutz, Barrierefreiheit) have no parent in the hierarchy and therefore no back control. Decide whether they should point back to Start.
3. Age-specific examination windows remain a separate, source- and physician-gated task.
