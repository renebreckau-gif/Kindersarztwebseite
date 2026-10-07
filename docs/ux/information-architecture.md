# Information Architecture

Phase: 03 — UX, Information Architecture & User Journeys
Date: 2026-10-07
Inputs: [strategy-lock.md](../product/strategy-lock.md), [feature-priorities.md](../product/feature-priorities.md), [fact-status-register.md](../research/fact-status-register.md), [phase-02-5-experience-lab.md](../reviews/phase-02-5-experience-lab.md) (`/lab/final` = approved entry reference).
Related: [navigation-model.md](navigation-model.md), [content-ownership-map.md](content-ownership-map.md), [data-confidence-behavior.md](data-confidence-behavior.md).

Public UI strings below are German working labels; final copy is set in the content phase. Page IDs (P-…) are referenced by the other Phase 03 documents.

---

## 1. Mental model

| Path | Question it answers | Character |
|---|---|---|
| **HEUTE** | Was ist jetzt wichtig? | Operational, state-driven, short. Never a news feed. |
| **MEIN KIND** | Was ist in diesem Alter wichtig? | Orientation by age range; sourced, calm, no diagnosis. |
| **PRAXIS** | Wer seid ihr und wie funktioniert die Praxis? | Trust, people, services, practical organisation. |
| **ENTDECKEN** | (für Kinder) Was passiert beim Arzt? | Child-facing, playful, honest; parent-introduced. |

Validation of the model against the required classic content (§5) found no item without a natural home; no fifth top-level path is needed.

## 2. Full sitemap

URL slugs are ASCII (`ae`, `oe`, `ue`, `ss`), lowercase, stable. Visibility column: **V1** = launches when its data is confirmed; **COND** = rendered only while its data exists (e.g. an active closure); **LATER** = Phase 2 / not in V1 navigation.

```
/                                   P-00  Start (Signature Entry, /lab/final reference)
│
├── /heute                          P-10  Heute
│   ├── /heute/sprechzeiten         P-11  Sprechzeiten (incl. #akutsprechstunde, #besondere-zeiten)
│   └── /heute/aktuelles            P-12  Aktuelle Hinweise (active notices only)
│
├── /notfall                        P-15  Notfall (utility; conceptually part of HEUTE, top-level URL)
│
├── /mein-kind                      P-20  Mein Kind (age range entry)
│   ├── /mein-kind/0-2-jahre        P-21  0–2 Jahre
│   ├── /mein-kind/3-6-jahre        P-22  3–6 Jahre
│   ├── /mein-kind/7-12-jahre       P-23  7–12 Jahre
│   ├── /mein-kind/13-17-jahre      P-24  13–17 Jahre
│   ├── /mein-kind/vorsorge         P-25  Vorsorgeuntersuchungen (U/J — canonical explainer)
│   ├── /mein-kind/impfungen        P-26  Impfungen (canonical vaccination orientation)
│   └── /mein-kind/neugeboren       P-27  Neugeboren (newborn hub)
│
├── /praxis                         P-30  Praxis (overview)
│   ├── /praxis/aerztinnen          P-31  Ärztinnen
│   ├── /praxis/team                P-32  Team
│   ├── /praxis/leistungen          P-33  Wobei können wir helfen? (= Leistungen, one page)
│   ├── /praxis/neu-bei-uns         P-34  Neu bei uns?
│   ├── /praxis/kontakt             P-35  Kontakt & Anfahrt (incl. #anfahrt)
│   └── /praxis/raeume              P-36  Praxis & Räume  [LATER — needs real photography, F90/NH-05]
│
├── /entdecken                      P-40  Entdecken (chapter overview, parent intro)
│   └── /entdecken/mein-arztbesuch  P-41  Mein Arztbesuch (chapter 1)
│       (future chapters: Reise in deinen Körper · Wachstum · Ernährung — no URLs until built)
│
└── Footer / legal
    ├── /impressum                  P-90  Impressum
    ├── /datenschutz                P-91  Datenschutz
    └── /barrierefreiheit           P-92  Erklärung zur Barrierefreiheit
```

**V1 page count: 24 published pages** (P-36 deferred). No page exists without content: a page whose essential data is unconfirmed is not published and not linked (see [data-confidence-behavior.md](data-confidence-behavior.md) §4).

### Page responsibilities

| ID | Page | Owns (canonical) | Shows (rendered from elsewhere) | Visibility |
|---|---|---|---|---|
| P-00 | Start | — (composition only) | PRAXIS PULS, Growing Mobile with four paths, phone, Notfall access, short claim | V1 |
| P-10 | Heute | — | PULS detail (state, reason, next opening), today's slots, active notices, active closure + Vertretung (#vertretung), quick actions (Anrufen, Route, Sprechzeiten, Notfall) | V1 |
| P-11 | Sprechzeiten | Weekly schedule view, consultation-type explanations | Special hours, upcoming closures, Akutsprechstunde section (only verified parts), telephone hours (when confirmed) | V1 |
| P-12 | Aktuelle Hinweise | — | Active notices with validity; empty state when none | V1 |
| P-15 | Notfall | — | Emergency directory: 112 first, 116117 (if confirmed), Giftnotruf and facilities (only verified), "Stand" date | V1 (LB-10) |
| P-20 | Mein Kind | Age-range descriptions | Four age ranges, links to P-25/26/27 | V1 |
| P-21…24 | Age range pages | Age-range curation (which topics appear) | Relevant U/J (from P-25 data), vaccination topics (from P-26 data), related services (from P-33 data), practice links | V1 |
| P-25 | Vorsorge | U/J entries (official source, governance) | Which U/J the practice performs (F67, once confirmed) | V1 |
| P-26 | Impfungen | Vaccination topics (official source, governance) | Practice note "Fragen Sie uns beim nächsten Termin" | V1 |
| P-27 | Neugeboren | Newborn curation | U2/U3 entries (P-25 data), early vaccination topics (P-26), Neu bei uns items, contact | V1 |
| P-30 | Praxis | — | Doors to P-31…35, short practice description (only confirmed facts) | V1 |
| P-31 | Ärztinnen | Physician profiles | — | V1 (LB-05, LB-09) |
| P-32 | Team | Staff profiles | — | V1 (LB-08, LB-09) |
| P-33 | Wobei können wir helfen? | Service entries incl. parent-language entry points | — | V1 if FB-12 resolved, else reduced to confirmed entries |
| P-34 | Neu bei uns? | First-visit items | Address/phone/hours from canonical sources, team links | V1 (only confirmed items) |
| P-35 | Kontakt & Anfahrt | Practice contact data | Hours summary, map link | V1 |
| P-40 | Entdecken | Chapter list | — | V1 |
| P-41 | Mein Arztbesuch | Chapter content | — | V1 (physician approval) |
| P-90…92 | Legal | Legal texts | Practice master data (name, address) | V1 (LB-02…07) |

### Deliberate decisions in the sitemap

1. **Leistungen and "Wobei können wir helfen?" are one page (P-33).** The page opens with parent-language entry points ("Mein Kind ist krank", "Vorsorge", "Impfungen", "Entwicklung", "Bescheinigungen" — only for confirmed services) and continues with the structured service list. Two pages would duplicate content.
2. **Sprechzeiten lives under HEUTE (P-11)**, not PRAXIS. PRAXIS links to it. Opening hours are operational.
3. **Akutsprechstunde is a section of P-11** (`#akutsprechstunde`), not its own page — its rules are part of the schedule and currently unconfirmed (FB-01…03). A dedicated page may be added once rules are verified and stable.
4. **Vertretung is a section of P-10** (`#vertretung`), rendered only during an active or announced closure. No permanent "Vertretung" page that could go stale.
5. **Notfall has a top-level URL** (`/notfall`) for speed, sharing and search, but is a utility, not a fifth primary path.
6. **Kontakt and Anfahrt are one page (P-35)**; Anfahrt is a section. Address exists once.
7. **Aktuelles is not a news archive.** P-12 lists only notices that are valid now; expired notices disappear. No blog in V1.
8. **Praxis & Räume (P-36) is deferred** until real photography exists; the content is not invented and stock photos are excluded (trust-model §4).
9. **Future ENTDECKEN chapters have no URLs** until they exist; P-40 may show them as quiet, non-interactive "In Vorbereitung" items without dates.
10. **Erklärung zur Barrierefreiheit (P-92)** added to the footer: trust and accessibility transparency; legal necessity to be assessed by the legal reviewer.

## 3. Navigation layers (summary — detail in navigation-model.md)

| Layer | Desktop | Mobile |
|---|---|---|
| **Primary** | Heute · Mein Kind · Praxis · Entdecken as visible text links in the header; additionally as arms of the Growing Mobile on Start | In the "Menü" sheet (first level, large); on Start as path buttons under the object; Heute also in the dock |
| **Utility (persistent)** | PULS status chip → P-10 · Anrufen + number · Notfall | Bottom dock: Anrufen · Heute (with status dot) · Notfall · Menü |
| **Secondary (in-section)** | Section navigation on each section's pages (e.g. Praxis: Ärztinnen · Team · Wobei können wir helfen? · Neu bei uns? · Kontakt & Anfahrt) | Same list at the top of section pages as horizontally wrapping chips (no horizontal scroll), and inside the Menü sheet |
| **Contextual** | Cross-links in content (§4) | Same |
| **Footer** | Full structure (§6) | Same, single column |
| **Breadcrumbs** | Level 3 pages only | Same (single line, wraps) |

## 4. Cross-links (contextual navigation)

| From | To | Why |
|---|---|---|
| Start (PULS) | P-10 Heute | Status detail |
| P-10 Heute | P-11, P-15, P-35#anfahrt, P-12 | Hours, emergency, route, notices |
| P-10 (closed / out of hours) | P-15 Notfall | Out-of-hours guidance |
| P-11 Sprechzeiten | P-10, P-35, P-15 | Today, contact, emergency |
| P-21…24 age pages | P-25 (filtered U/J), P-26 (filtered topics), P-33 (relevant services), P-41 (3–6, 7–12) | Age → content → practice |
| P-21 (0–2) | P-27 Neugeboren, P-34 Neu bei uns | Young families are often new |
| P-25 Vorsorge / P-26 Impfungen | Age pages, P-35 (contact), official sources | Back to age, to practice, to authority |
| P-27 Neugeboren | P-25 (U2/U3…), P-26, P-34, P-35 | Newborn journey |
| P-33 Leistungen | Age pages where relevant, P-25, P-26, P-10 (for "Mein Kind ist krank") | Service ↔ age |
| P-34 Neu bei uns | P-35, P-11, P-31/32, P-41 | Practical + people + child preparation |
| P-31 Ärztinnen / P-32 Team | P-34, P-33 | Who → what |
| P-40/P-41 Entdecken | P-34 (parents), Start | Return to grown-up content |
| Every page | P-15 (via utility), P-10 (via utility) | Persistent safety net |

## 5. Where the classic information lives

| Required item | Home | Also reachable via |
|---|---|---|
| Ärztinnen | P-31 | P-30, P-34, footer |
| Team | P-32 | P-30, P-34 |
| Leistungen | P-33 | P-30, age pages, footer |
| Wobei können wir helfen? | P-33 (entry section) | Start (secondary link), P-30 |
| Praxis / Räume | P-36 (LATER) | P-30 once live |
| Sprechzeiten | P-11 | PULS, P-10, P-35, footer |
| Akutsprechstunde | P-11 `#akutsprechstunde` | P-10 (state), Journey 2 |
| Kontakt | P-35 | Utility (Anrufen), footer |
| Anfahrt | P-35 `#anfahrt` | P-10 (Route), P-34 |
| Notfälle | P-15 | Utility (every page), P-10, footer |
| Aktuelles | P-12 | P-10, PULS reason line, footer |
| Neu bei uns? | P-34 | P-30, P-21, P-27, footer |
| Impressum | P-90 | Footer |
| Datenschutz | P-91 | Footer |

## 6. Footer structure

```
Kinderarztpraxis Probst & Böhme            ← practice name (F01 — confirmed form)
Straße + Hausnummer, 06333 Hettstedt       ← F13 (confirmed spelling only)
Telefon 03476 851157 · Fax · E-Mail        ← canonical contact data (F15–F17)
Sprechzeiten ansehen

Heute            Mein Kind          Praxis                    Entdecken
Sprechzeiten     0–2 Jahre          Ärztinnen                 Mein Arztbesuch
Aktuelles        3–6 Jahre          Team
Notfall          7–12 Jahre         Wobei können wir helfen?
                 13–17 Jahre        Neu bei uns?
                 Vorsorge           Kontakt & Anfahrt
                 Impfungen
                 Neugeboren

Impressum · Datenschutz · Barrierefreiheit
```

The footer is a full, conventional sitemap — the guaranteed route for users who ignore the Growing Mobile and the header. Unpublished pages are omitted automatically.

## 7. Canonical content ownership (summary)

Every fact has exactly one owner; all other appearances are renderings. Full map: [content-ownership-map.md](content-ownership-map.md).

| Content | Single source | Rendered in |
|---|---|---|
| Opening schedule & consultation types | Schedule data | PULS (all pages), P-10, P-11, P-35, structured data |
| Contact data | Practice profile | Header, dock, P-35, P-34, footer, legal pages, structured data |
| Emergency directory | Emergency entries | P-15, P-10 (out of hours), PULS CLOSED action |
| Closures & Vertretung | Closure + replacement directory | PULS, P-10 #vertretung, P-11 (upcoming) |
| Notices | Notice entries | P-10, P-12, PULS reason line |
| Physicians / staff | Person profiles | P-31, P-32, P-34, legal pages (titles) |
| Services | Service entries | P-33, age pages, P-27 |
| U/J examinations | Preventive exam entries | P-25, age pages, P-27 |
| Vaccination topics | Vaccination entries | P-26, age pages, P-27 |

## 8. Mobile implications of the IA

1. Two-level depth maximum for everything a stressed parent needs: Start → P-10/P-11/P-15/P-35 are one tap away (dock) or two taps (Menü → item).
2. No page requires horizontal navigation; section navigation wraps.
3. The Menü sheet shows the four paths and, under each, its V1 subpages — the whole V1 site fits in one scrollable sheet (≈ 20 entries).
4. Long titles (e.g. "Vorsorgeuntersuchungen", "Wobei können wir helfen?") are designed to wrap; nav labels avoid truncation (see [mobile-priorities.md](mobile-priorities.md) §5).
5. HEUTE content is ordered by urgency on mobile: state → action → notices/closure → hours → route.

## 9. Indexability and local search

- All factual pages are server-rendered HTML; the Growing Mobile and any 3D are enhancements on top of indexable content.
- One `<h1>` per page with plain German; descriptive titles, e.g. "Sprechzeiten – Kinderarztpraxis Probst & Böhme, Hettstedt".
- Likely intents and their landing pages (no keyword stuffing, no invented services):

| Search intent | Landing page | Condition |
|---|---|---|
| Kinderarzt Hettstedt | P-00 / P-30 | Name and location confirmed (LB-01, LB-03) |
| Kinderarzt Öffnungszeiten Hettstedt | P-11 | Hours signed off (LB-00) |
| Kinderarzt Akutsprechstunde Hettstedt | P-11 #akutsprechstunde | Only target once FB-01…03 are resolved; until then the section states the safe fallback and is not optimised |
| Kinderarzt Notfall Hettstedt | P-15 | LB-10 resolved |
| Kinderarzt Vorsorgeuntersuchung | P-25 | Official sources + F67 |
| Kinderarzt Impfungen | P-26 | Governance in place |

- Structured data (schema.org `MedicalClinic`/`Physician`, `openingHoursSpecification`, `BreadcrumbList`) is generated only from `VERIFIED_CURRENT` data; uncertain data is omitted, never approximated.
- Redirects from old URLs (C17): `/aktuell/` → P-12, `/praxis/` → P-30, `/team/` → P-32 (Ärztinnen link on page), `/leistungen/` → P-33, `/notfaelle/` → P-15, `/kontakt/` → P-35, `/impressum/` → P-90; `/hello-world/` → 410.
