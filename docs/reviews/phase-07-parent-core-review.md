# Phase 07 — Parent Core Experience + Below-Fold Visual System — Review

Phase: 07
Date: 2026-10-07
Baseline: Phase 06.2 approved (`f170aca`) — hero locked and reused unchanged.
Screenshots and metrics: [`phase-07/screenshots/`](phase-07/screenshots/) · [`phase-07/metrics-site.json`](phase-07/metrics-site.json) · hero regression: [`phase-07/lab-regression/`](phase-07/lab-regression/)
Asset register: [`../design/required-production-assets.md`](../design/required-production-assets.md)

---

## 1. Scores (1–10)

| Criterion | Score | Note |
|---|---:|---|
| UTILITY | **8** | Status, call and Notfall are reachable within one tap on every page (header, dock, page). Utility is limited by data, not by design: the live status is UNKNOWN until LB-00, and the street address and further emergency numbers are withheld. |
| TRUST | **8** | Nothing unverified appears as fact. "Stand" dates on sources and emergency info, honest fallbacks, no fake people or rooms. |
| VISUAL CONTINUITY | **8** | Plaster, paper, floor light, Newsreader at scale, cobalt call, measuring rules, arch curves and night: all from the hero world, without repeating the room. |
| BELOW-FOLD DESIGN | **8** | Six chapters with distinct characters (function, growth, calm, human, guidance, night); no card grid. |
| VISUAL RHYTHM | **8** | Energy (hero) → function (big weekday + ruler) → expressive growth (lilac, rising bars) → quiet typography → warm plaster → sunlit path → night discovery → night footer. |
| PREMIUM FEEL | **8** | Restrained palette, large confident type, generous space; utility pages stay clean. |
| EMOTIONAL WARMTH | **7** | Warm surfaces and light carry it; below the hero there is no real photography yet (placeholders). |
| PEDIATRIC FIT | **7** | Growth scale, ages, "Mein Arztbesuch", the child in the hero; still adult-led until real practice imagery and child-facing content exist. |
| CONTENT CLARITY | **8** | Short German sentences, one job per element, no slogans beyond the locked north star. |
| DATA SAFETY | **9** | Every fact flows from typed content through the domain rules (`decidePerson`, `decideAnnouncement`, `selectPublicEmergency`, `getPracticeStatus`). TO_BE_CONFIRMED is never rendered as fact; OUTDATED is filtered (proved by the 2026 summer closure record). |
| NAVIGATION | **8** | The IA (P-00…P-92) is connected: primary nav, dock, footer sitemap (`#menue`), back links, hero paths with explicit "Zu …" links. |
| MOBILE QUALITY | **8** | Deliberate phone compositions (sideways growth bars, stacked chapters, 112 first); approved hero untouched. |
| ACCESSIBILITY | **8** | Landmarks, one h1 per page, keyboard focus everywhere, status with shape + word, reduced motion respected, no overflow at 200 % text; no real screen-reader pass yet. |
| PERFORMANCE | **9** | Content pages: 138 KB JS, 0 KB images, no 3D. Start page as approved (141.6 KB JS, 68–177 KB images). No long tasks. |
| MAINTAINABILITY | **8** | Facts in `src/content` (one place each), domain logic untouched, page families via shared blocks; ready for a CMS mapping. |
| **OVERALL PARENT EXPERIENCE** | **8** | A coherent, calm, useful product. The remaining gaps are confirmations and photography, not structure. |

**Quality gate:** UTILITY 8 · TRUST 8 · VISUAL CONTINUITY 8 · BELOW-FOLD DESIGN 8 · VISUAL RHYTHM 8 · DATA SAFETY 9 · MOBILE QUALITY 8 · OVERALL 8 → **passed**. No safety-critical factual issue found (see §4).

---

## 2. What was built

### Routes (22 public)

| Route | Family |
|---|---|
| `/` | Start (approved hero + six chapters) |
| `/heute`, `/heute/sprechzeiten`, `/heute/aktuelles`, `/notfall` | Utility |
| `/mein-kind`, `/mein-kind/0-2-jahre`, `/mein-kind/3-6-jahre`, `/mein-kind/7-12-jahre`, `/mein-kind/13-17-jahre`, `/mein-kind/vorsorge`, `/mein-kind/impfungen` | Age / growth |
| `/praxis`, `/praxis/aerztinnen`, `/praxis/team`, `/praxis/leistungen`, `/praxis/kontakt` | Editorial |
| `/praxis/neu-bei-uns` | Guidance |
| `/entdecken` | Discovery (night) |
| `/impressum`, `/datenschutz`, `/barrierefreiheit` | Controlled legal placeholders |

`/lab/*` and `/design-system` remain internal and unchanged. P-27 (Neugeboren) and P-36 (Praxis & Räume) are not built: P-27 is outside the brief's minimum, and P-36 needs real photography.

### Content architecture (no CMS yet)

`src/content/` holds all facts and orientation copy, typed with the domain model:
- `practice.ts` — master data with register status;
- `schedule.ts` — hours, consultation types, holidays → `PulsData`;
- `people.ts`, `notices.ts`, `sources.ts`;
- `site.ts` — IA, ages, needs;
- `release.ts` — launch gates;
- `puls.ts` — engine adapter.

Components never hard-code facts.

---

## 3. Homepage structure and the below-fold language

| # | Chapter | Character | Composition |
|---|---|---|---|
| — | Hero | **Locked** Phase 06.2 | Now connected to real routes; PRAXIS PULS from the engine; "Demo" tag removed (preview shows "Vorschau") |
| 01 | Heute | Function, floor light continuing from the hero | Huge weekday in Newsreader (typographic moment) + day ruler (07–18 axis, slot types as solid / hatched yellow / outline) with a "now" line, week strip, call |
| 02 | Mein Kind | Most expressive: lilac air, curved arch boundary | Four rising growth bars with numerals growing in size; on phones the scale turns sideways |
| 03 | Wobei können wir helfen? | Calm paper, typographic | Sticky heading + large serif links on ruled lines, arrow motion on hover only |
| 04 | Praxis | Human, warm plaster with sunlight | Big editorial statement + arch-shaped placeholder for real photography |
| 05 | Neu bei uns? | Guidance, coral thread | Three numbered steps (a real sequence) joined by a dashed coral line |
| 06 | Entdecken | Night, curious, curved boundary | Floating cobalt / coral / yellow / ring forms (slow drift, off with reduced motion), "Mein Arztbesuch – In Vorbereitung" |
| — | Footer | Night continues | Sitemap (`#menue` = dock "Menü"), verified contact, 112 |

**Rhythm devices:**
- scale changes (8.5rem weekday vs. small metadata);
- asymmetric grids (5/7, 7/5, 7/4);
- surface shifts (floor → lilac → paper → plaster → sun → night);
- two curved architectural boundaries;
- measuring ticks;
- full-width moments vs. reading-width text.

Cards appear nowhere.

**Page families:**
- **Utility** (Heute, Sprechzeiten, Notfall, Aktuelles): daylight intro, status statement, rulers, plain lists.
- **Growth** (Mein Kind, ages, Vorsorge, Impfungen): lilac, growth scale, U1→J1 rising line, sources with "Stand".
- **Editorial** (Praxis, Ärztinnen, Team, Leistungen, Kontakt): large type, light-drawn arch, ruled lists.
- **Guidance** (Neu bei uns): steps on a coral thread.
- **Discovery** (Entdecken): night.

---

## 4. Data used, omitted and gated

**VERIFIED_CURRENT used:**
- phone F15, fax F16, e-mail F17, postcode/city F14;
- hours F35–F39, the "bitte nur gesunde Kinder" window F41 (fallback wording, since its meaning F42 is unconfirmed) and Tuesday's "nur Terminsprechstunde" F43;
- 112 F56.

Also physician names F20 and F22 plus Nadine Probst's qualification F21, and team names F26–F30 — but only in review preview; see the consent gate below.

**TO_BE_CONFIRMED — omitted or fallback:**

| Fact | Public behaviour |
|---|---|
| Practice name F01 | Shown as the working name in hero/header (locked hero); LB-01 |
| Street F13 | Not shown; city line only; no route link (LB-03) |
| E-mail usage F18, telephone hours F19 | Not stated |
| Weekend F40, holidays F49 | Not shown as closed; PULS → UNKNOWN on those days (verified: Saturday preview = UNKNOWN) |
| Acute consultation F44–F46 | Brief's safe sentence + Anrufen |
| Booking channel F48, first-visit items F77–F88 | Omitted; "Weitere Fragen beantworten wir gern telefonisch." |
| Emergency numbers F57–F65 (incl. 116117) | Omitted by `selectPublicEmergency`; appear automatically once verified |
| Services F66–F74 | Not listed; need-based navigation + "erfahren Sie telefonisch" |
| Qualifications Dr. Böhme F23, trainee F24 | Not shown |
| Publication consent F33 (LB-09) | **No person is shown publicly** (`decidePerson`). Names render only in `?vorschau=freigabe`, labelled. |

**OUTDATED never shown:**
- 2026 summer closure F50–F52 (kept as a record; filtered);
- old legal text F08/F09;
- Anne Horn F25.

**PRAXIS PULS gate (LB-00):** the register allows showing the hours but forbids PULS from using them before practice sign-off. Live mode therefore passes the schedule to the engine as unconfirmed, and the engine itself resolves to UNKNOWN (neutral: no dot, no colour). `?vorschau=freigabe&zeit=…` simulates sign-off for review and is labelled "Vorschau" on screen.

**Medical content:** physician approval is pending (source-policy §4).
- **Vorsorge:** general explanation, U1→J1 names only (no age windows), five official sources checked 2026-10-07.
- **Impfungen:** general explanation (STIKO role, age logic in principle), four official sources, no individual advice.

Note: the G-BA page reports a 2026 decision introducing a U10. Physician review should decide how to present it.

---

## 5. Placeholders and missing production assets

| Placeholder | Where |
|---|---|
| Arch frame "Foto der Praxis – folgt mit echter Fotografie" | Start chapter 04, Praxis intro |
| Portrait frame "Porträt folgt" | Ärztinnen (preview only) |
| CSS orbs | Entdecken (graphic language, not imagery) |

No AI imagery was added in Phase 07. The register lists 14 assets. P1 items:
- the hero child production decision;
- the two physician portraits;
- the entrance photo.

---

## 6. Mobile, accessibility, performance, tests

- **Mobile:** 360 / 390 / 430.
  - First viewport on utility pages: identity, status chip, page status/112/call.
  - Dock (Anrufen · Heute · Notfall · Menü) on every page.
  - The approved hero is unchanged (regression capture `lab-regression/`).
  - Phone compositions are designed: sideways growth bars, a U-line that fits the width, 112 first on Notfall, stacked chapters with their own surfaces.
- **Overflow / large text:**
  - 22 routes × 360/390/430 × 100 %/200 % checked in the browser.
  - No overflow on any public route; 58 captures, 0 audit issues.
  - Fixes made: shrinkable grid tracks everywhere, wrapping buttons, German hyphenation.
  - The only remaining 200 % overflow is on the internal `/design-system` (pre-existing, out of scope).
- **Targets:** all interactive elements ≥ 44 × 44 px (footer links widened).
- **Semantics:**
  - one h1 per page; landmarks (header, nav ×2–3, main, footer);
  - headings in order;
  - `aria-current` in nav;
  - status mark + word; UNKNOWN without mark;
  - scene, orbs and growth bars are decorative (`aria-hidden`).
- **Reduced motion:** the mobile sway, orb drift and growth/arrow transitions are off.
- **No-JS:** all utility is plain links (`tel:`, routes); pages are server-rendered. The hero paths without JavaScript go straight to the routes.
- **Performance:**
  - Content pages: 138 KB JS, no images, no WebGL.
  - Start page: 141.6 KB JS, images 68 KB (phone) / 135 KB (1440).
  - Median frame 16.7 ms, no long tasks (4× CPU throttle on `/heute`).
- **Tests:**
  - `npm test` 75/75.
  - `npm run build` ✓ (30 routes).
  - Typecheck ✓.
  - Routes 200, including `/lab/final` and `/design-system`.
  - PRAXIS PULS states verified: Tuesday 09:30 open with healthy-only line, 19:30 closed with next opening, Saturday UNKNOWN, live UNKNOWN.
- **Not yet done:** manual screen-reader pass (NVDA, VoiceOver, TalkBack), real-device testing, forced-colours in depth.

---

## 7. Brutal review

**Can a parent understand the practice status within seconds?** Yes — first content of the start page and of Heute. Today it truthfully reads "Aktuelle Sprechzeiten · Bitte aktuelle Informationen prüfen" until LB-00; with sign-off it shows open/closed, time, next opening and the healthy-only window.

**Can they call immediately?** Yes: hero, header (desktop), dock (mobile) and every utility page.

**Can they find emergency information immediately?** Yes: Notfall in header, dock and hero; 112 is the first and largest element on `/notfall`. Further numbers are missing until verified — the biggest functional gap (§8).

**Can they understand what the practice offers?** Only partly — by design. No service is confirmed, so the site offers need-based navigation and "erfahren Sie telefonisch".

**Can a new family prepare?** Partly: phone, hours (incl. healthy-only window and Tuesday appointments), city. No street, booking channel or "what to bring" until confirmed.

**Are any unverified facts displayed as current?** No. The practice name (F01) is shown as the working name in the locked hero and header; it is flagged as LB-01.

**Does the homepage remain visually strong after the hero?** Yes — the weekday chapter and the growth chapter carry the energy; the night chapter closes it.

**Does the page become repetitive?** No two consecutive chapters share surface or layout.

**Generic clinic website anywhere?** The utility subpages (Sprechzeiten, Aktuelles, legal) are deliberately plain; they avoid clinic clichés (no stock, no blue, no icons-in-boxes) but are the least distinctive pages.

**SaaS anywhere?** No dashboards, no metrics, no card grids. The status chip and pill buttons are the closest to UI convention.

**Too many cards?** None.

**Too many beige sections?** The paper/plaster family is broken by lilac, sunlit coral, cobalt accents and night. Utility subpages lean beige — acceptable for calm, but the first candidate for refinement.

**Does each homepage chapter have its own character?** Yes (§3).

**Do all chapters belong to the hero world?** Yes — light, plaster, brass-toned arch lines, cobalt, coral, yellow and the measuring language.

**Were high-fidelity assets invented without a reference?** No. Only CSS/SVG graphic language and intentional placeholders; no new imagery.

**Is mobile intentionally designed?** Yes.

**Which production assets are missing?** See §5 and the register.

---

## 8. Top 5 remaining issues

1. **Practice confirmations block real utility:** LB-00 (PULS live), F13 (street), F33/LB-09 (people), F57–F65 (116117 and emergency facilities), F66–F74 (services).
2. **Emergency page shows only 112 and the practice:** 116117 omission is correct by governance but should be resolved first.
3. **No real photography below the hero** (practice, doctors, entrance): warmth and trust are capped.
4. **Medical content awaits physician approval:** Vorsorge/Impfungen stay general; the U10 decision is pending review.
5. **No manual screen-reader or real-device testing yet;** the legal texts are placeholders.

## 9. What should be human-reviewed before Phase 08

- The **below-fold direction** (`home-full-1440x900.jpg`, `home-full-390x844.jpg`): approve or redirect the chapter characters.
- The **gating decisions:** PULS UNKNOWN until LB-00, people hidden until consent, 116117 omitted until F57.
- The **review preview mechanism** (`?vorschau=freigabe`, `&zeit=`) and the visible internal notes (`RELEASE.showInternalNotes`).
- The **orientation copy** (age intros, needs list, Vorsorge/Impfungen texts) — editorial and physician sign-off.
- The **asset register priorities** (P1: hero child decision, physician portraits, entrance).
- The working practice name in hero/header (F01).
