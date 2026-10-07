# Phase 03 Decisions

Phase: 03 — UX, Information Architecture & User Journeys
Date: 2026-10-07
Documents: [information-architecture.md](information-architecture.md) · [user-journeys.md](user-journeys.md) · [navigation-model.md](navigation-model.md) · [mobile-priorities.md](mobile-priorities.md) · [accessibility-principles.md](accessibility-principles.md) · [first-visit-flow.md](first-visit-flow.md) · [data-confidence-behavior.md](data-confidence-behavior.md) · [content-ownership-map.md](content-ownership-map.md)

---

## 1. Review before commit

The documentation was reviewed against the brief's checklist. Findings and corrections:

| Check | Finding | Correction |
|---|---|---|
| Duplicate pages | "Leistungen" and "Wobei können wir helfen?" as two pages would duplicate content; "Kontakt" and "Anfahrt" likewise | Merged into P-33 and P-35 |
| Unnecessary navigation | A permanent "Vertretung" page and a news archive would go stale | Vertretung = conditional section of P-10; Aktuelles = active notices only |
| Hidden critical actions | `/lab/final` places the mobile dock last in the DOM; screen-reader users reach Anrufen/Notfall late | Dock moved early in DOM order (navigation-model §13) |
| Desktop-first assumptions | Desktop header in the lab hides paths behind "Menü" | Paths visible as text on desktop; mobile keeps the dock model |
| Medical overreach | A journey example contained an age statement for a U-examination | Replaced by a generic example; age statements only from official sources |
| Unverified facts | First-visit and service content | Every item mapped to fact IDs with status; unconfirmed items omitted |
| Navigation depending on 3D | — | Growing Mobile is never the only route; footer + header + Menü cover all pages |
| Mobile friction | Bottom-sheet PULS detail would duplicate P-10 | Chip/dock navigate to P-10 |
| German-language issues | Long compounds | Wrapping, hyphenation, soft-hyphen guideline, no truncation (mobile-priorities §5) |
| Content maintained twice | Hours, contact, emergency, people, replacements, vaccination | Single canonical entities E1–E17 |

## 2. FINAL PRIMARY NAVIGATION

**Heute · Mein Kind · Praxis · Entdecken** — four paths, no fifth top-level item.

- Persistent utilities: **Anrufen**, **Heute** (status), **Notfall**.
- Notfall has its own URL (`/notfall`) but is a utility, not a primary path.
- Desktop header: practice name · four paths (text) · PULS chip · Anrufen + number · Notfall.
- Footer: full sitemap + contact + Impressum · Datenschutz · Barrierefreiheit.

## 3. FINAL MOBILE NAVIGATION MODEL

- **Dock (every page):** Anrufen · Heute (status dot) · Notfall · Menü — fixed bottom, ≥ 52 px, early in DOM order, never hides.
- **Menü sheet:** four paths with all V1 subpages in one scrollable list (no accordions needed); quick facts; legal links.
- **Start:** status → action → object → 2 × 2 path buttons (the object's arms as thumb-sized controls).
- **Section navigation:** wrapping chips at the top of section pages.
- **Heute in the dock** navigates to the real page P-10 (no sheet).

## 4. TOP 5 CRITICAL USER JOURNEYS

1. **J1** Ist die Praxis heute geöffnet?
2. **J2** Mein Kind ist krank — können wir heute kommen?
3. **J3** Wen rufe ich im Notfall an?
4. **J11** Die Praxis hat Urlaub — wer vertritt?
5. **J7** Wir kommen zum ersten Mal

## 5. TOP 5 INFORMATION ARCHITECTURE RISKS

1. **Thin pages at launch** — Neu bei uns, Leistungen and Notfall depend on unconfirmed data; rule R6 may leave pages unpublished. Mitigation: phone fallback block, early practice interview.
2. **HEUTE drifting into a news feed** — notices accumulate. Mitigation: mandatory validity, no archive.
3. **Mein Kind ↔ Praxis link rot** — age tags on services not maintained. Mitigation: data-driven tags; editor checklist.
4. **Akutsprechstunde without a page** — search intent exists but rules are unconfirmed. Mitigation: section in P-11 with honest fallback; dedicated page only after FB-01…03.
5. **ENTDECKEN future chapters looking available** — Mitigation: no URLs, non-interactive "In Vorbereitung" only.

## 6. TOP 5 DATA-CONFIDENCE RISKS

1. **Acute consultation rules** (FB-01…03) — highest misuse potential; state disabled until resolved.
2. **Emergency directory** (LB-10) — all third-party data dated 2020; staleness rule R5 required.
3. **Replacement practices** (FB-10) — recurring copy errors; directory + verification date.
4. **Holiday / weekend rules** (F40, F49) — without them CLOSED/OPEN cannot be computed on those days → UNKNOWN.
5. **Conflicting exceptions** — editor error creates contradictory states → conflict = UNKNOWN + publish block.

## 7. TOP 5 MOBILE RISKS

1. **Large system text** pushing the primary action below the fold on small phones — verified OK at 200 % root text in the lab; real OS text scaling still untested.
2. **Dock density** with enlarged text (labels tight, number wrapping).
3. **Landscape phones** — object must not take the space of status/action.
4. **Low-end GPU** — WebGL cost unknown on real devices; poster fallback must stay first-class.
5. **Menü sheet length** grows as Phase 2 pages arrive — accordions may become necessary later; keep V1 flat.

## 8. ANY REQUIRED CHANGES TO PREVIOUS STRATEGY

**No changes to the locked strategy ([strategy-lock.md](../product/strategy-lock.md)) are required.**

Refinements to earlier phase recommendations (not strategic):

| Refinement | Previous | Now | Reason |
|---|---|---|---|
| PULS detail | Chip expands to a sheet (praxis-puls-benchmarks §2) | Chip/dock navigate to P-10 | One canonical place, no-JS, back button |
| Desktop header | "Menü" in `/lab/final` | Four paths visible as text | Phase 02 Q3, low digital confidence |
| Mobile dock DOM position | Last in DOM (`/lab/final`) | Early in DOM, visually fixed bottom | Screen-reader access to Anrufen/Notfall |
| Leistungen | Separate from "Wobei können wir helfen?" (brief list) | One page P-33 | Avoid duplication |
| Footer | Impressum, Datenschutz | + Erklärung zur Barrierefreiheit | Trust and accessibility transparency (legal necessity to be assessed) |
| Praxis & Räume | Listed as PRAXIS content | Deferred (P-36) until real photography | Trust model: no stock imagery |

These refinements affect later implementation of `/lab/final`'s chrome; the entry composition itself is unchanged and `/lab/final` was not modified in this phase.
