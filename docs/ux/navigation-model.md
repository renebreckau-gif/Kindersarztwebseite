# Navigation Model

Phase: 03
Date: 2026-10-07
Page IDs: [information-architecture.md](information-architecture.md). Entry reference: `/lab/final`.

Principle: **the Growing Mobile is a signature navigation layer, never the only route.** Every destination is always reachable by conventional, visible, text-labelled navigation that works without JavaScript, WebGL, hover or motion.

---

## 1. Persistent utility navigation

Present on every page, including ENTDECKEN.

| | Desktop / landscape tablet (≥ 900 px) | Mobile / portrait tablet (< 900 px) |
|---|---|---|
| Form | Slim sticky header line (grows and wraps with enlarged text, verified in `/lab/final`) | Fixed bottom dock, 4 equal cells, ≥ 52 px tall, safe-area aware, never hides on scroll |
| Items | Practice name (→ Start) · **PULS chip** (→ P-10) · **Anrufen + Nummer** (`tel:`) · **Notfall** (→ P-15) | **Anrufen** (`tel:`) · **Heute** (→ P-10, carries status dot) · **Notfall** (→ P-15) · **Menü** (opens navigation sheet) |
| Status | Chip shows word + time for verified states; for UNKNOWN a plain "Sprechzeiten" link without dot | Dot on "Heute" for OPEN/CLOSED family states; no dot for UNKNOWN |

Notfall is visually distinct (emergency colour + icon + word) and never changes appearance with PULS state.

## 2. Primary navigation

**Desktop:** the four paths are visible as text links in the header, between the practice name and the utilities: `Heute · Mein Kind · Praxis · Entdecken`. On Start they are additionally the labelled arms of the Growing Mobile. The current section is marked (`aria-current="page"` on section root, `aria-current="true"` on ancestors' items via styling only).

> Change against `/lab/final`: the lab showed "Menü" instead of path links in the desktop header. Visible path links are required by the Phase 02 finding (Q3: paths always visible as text) and by low-digital-confidence users. This is a navigation-layer refinement, not a redesign of the entry composition.

**Mobile:** paths live in the **Menü sheet** (first level) and, on Start, as the 2 × 2 path buttons below the object (as in `/lab/final`). "Heute" is additionally a dock item.

## 3. Menü sheet (mobile; optional on desktop)

- Full-height sheet opened from the dock; focus moves into it; `Esc`/close button/back gesture closes it and returns focus to "Menü".
- Content, in this order:
  1. Four paths as large items (serif, ≥ 56 px rows).
  2. Under each path, its V1 subpages as indented rows (≥ 48 px).
  3. Quick facts: Sprechzeiten, Kontakt & Anfahrt, Notfall.
  4. Legal links.
- No accordions required to reach any V1 page (the whole V1 site ≈ 20 rows fits one scroll). Accordions would hide; scrolling is cheaper for one-handed use.
- Works without JavaScript as a link to an in-page `#menue` section / footer sitemap (as in the lab).

## 4. Secondary (in-section) navigation

Shown at the top of every page inside a section (below the `<h1>` on mobile, beside it on desktop):

| Section | Items |
|---|---|
| Heute | Heute · Sprechzeiten · Aktuelle Hinweise · Notfall |
| Mein Kind | 0–2 · 3–6 · 7–12 · 13–17 · Vorsorge · Impfungen · Neugeboren |
| Praxis | Ärztinnen · Team · Wobei können wir helfen? · Neu bei uns? · Kontakt & Anfahrt |
| Entdecken | Mein Arztbesuch (future chapters not listed as links) |

Mobile: rendered as wrapping chips (no horizontal scrolling, no truncation). Desktop: a horizontal list or side list depending on page length.

## 5. Contextual navigation

Defined per page in [information-architecture.md](information-architecture.md) §4. Rules:
- Links describe the destination in plain German ("Sprechzeiten ansehen", "Was passiert bei der U7?"), never "Mehr" / "Hier".
- Links to official external sources say so and name the source ("Aktuelle Empfehlung beim RKI"), open in the same tab by default.
- Links from ENTDECKEN to external sites: none.

## 6. Footer navigation

Full sitemap + contact + legal ([information-architecture.md](information-architecture.md) §6). It is the guaranteed fallback route and the main route for screen-reader users who skip to the end.

## 7. Breadcrumbs

- Only on level-3 pages (e.g. Start › Mein Kind › 3–6 Jahre; Start › Praxis › Team).
- Plain text links, wrap on small screens, marked up as `nav aria-label="Brotkrumen"` + `BreadcrumbList` structured data.
- Not on Start, not on section roots, not inside the ENTDECKEN chapter (replaced by the chapter exit, §9).

## 8. Back behaviour

- Native browser history is never hijacked. Every view that matters has its own URL (age range, chapter step optional via hash, `?pfad=` selection on Start is not a history entry).
- Sheets and overlays (Menü) close on back gesture without leaving the page.
- Start's Growing Mobile selection (balance change, Mein Kind instrument) is a preview state: the actual navigation to a path happens through a real link ("Zu Mein Kind"), which creates a normal history entry.

## 9. Returning from ENTDECKEN

- The dock stays visible in ENTDECKEN (Anrufen, Heute, Notfall always one tap away).
- A persistent, clearly labelled exit "Zurück zur Praxis-Website" (top of the chapter) returns to the page the user came from, or to Start.
- At the end of Mein Arztbesuch: "Für Eltern: Neu bei uns?" and "Zurück zum Start".
- No modal "Are you sure you want to leave?" dialogs.

## 10. Mein Kind → Praxis

Each age page ends with a "In der Praxis" block linking to relevant confirmed services (P-33 filtered by age tag), Neu bei uns (0–2) and Kontakt. Each service on P-33 lists the age ranges it is relevant to and links back. The link pattern is data-driven (tags on service entries), not hand-maintained.

## 11. PRAXIS PULS ↔ HEUTE

| Where PULS appears | Shows | Click/tap |
|---|---|---|
| Start (inline, editorial) | State word + one time/detail + one primary action | Primary action executes (call / Notfall / Vertretung); state text links to P-10 |
| Header chip (desktop, all pages) | State word + time | → P-10 |
| Dock "Heute" (mobile, all pages) | Status dot (none for UNKNOWN) | → P-10 |
| P-10 Heute | Full detail: state, reason, next transition, today's slots, notices, closure + Vertretung | In-page disclosures (week, rules) |
| P-11 Sprechzeiten | Today's row highlighted, exceptions listed | — |

Decision: tapping the chip/dock navigates to **P-10 (a real page)** rather than opening a bottom sheet. Reason: one canonical place, works without JS, back button works, no duplicated sheet content. (Refines praxis-puls-benchmarks.md §2, which proposed a sheet.)

## 12. The Growing Mobile as navigation

- On Start, the four arms are labelled links/buttons with the same names as the primary navigation.
- Selecting an arm previews (balance change, one-line description) and offers an explicit "Zu {Bereich}" link; on mobile the 2 × 2 buttons are the same controls in thumb reach.
- Never used on other pages as the only way to move between sections.
- With reduced motion / no WebGL / low power: the designed static poster with the same DOM labels; navigation unchanged.

## 13. Keyboard and screen-reader order (all pages)

- Desktop: `Zum Inhalt springen` → header (name, paths, PULS chip, Anrufen, Notfall) → main (`h1` first) → section navigation → content → footer.
- Mobile: `Zum Inhalt springen` → practice name → **dock** (`nav "Schnellzugriff"`: Anrufen, Heute, Notfall, Menü) → main → section navigation → content → footer.
  The dock is placed early in the DOM (it is only *visually* fixed to the bottom) so screen-reader users reach Anrufen and Notfall immediately; the skip link bypasses it. (Change against `/lab/final`, where the dock is last in the DOM.)
- There is exactly one instance of each utility per layout in the accessibility tree (header utilities are hidden — `display: none` — below 900 px, the dock above).
