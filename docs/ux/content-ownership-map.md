# Content Ownership Map

Phase: 03
Date: 2026-10-07
Purpose: every piece of content has **one canonical source** and is rendered wherever needed. Nothing operational is maintained twice. This map is the input for the content model / CMS phase (not built here).

Owner roles (trust-model §6): **E** = designated practice editor · **Ä** = physician of the practice (medical/child content, emergency wording) · **PT** = project team (third-party verification until handover) · **L** = legal reviewer.

---

## 1. Canonical entities

| # | Entity | Canonical fields (summary) | Rendered in (pages) | Facts / blockers | Owner | Change frequency |
|---|---|---|---|---|---|---|
| E1 | **Practice profile** | Public name, legal name/form, address, phone, fax, email + usage note, telephone hours | Header, dock, footer, P-10, P-34, P-35, P-90, P-91, structured data | F01–F04, F13–F19; LB-00–04, LB-11 | E (+L) | Rare |
| E2 | **Opening schedule** | Weekly slots with consultation type per slot | PULS (all pages), P-10, P-11, P-35 summary, structured data | F35–F46; FB-01–06 | E | Rare |
| E3 | **Consultation types** | Name, plain explanation (e.g. Akutsprechstunde, Terminsprechstunde, nur gesunde Kinder) | P-11, P-10, PULS sub-state | F41–F46 | E + Ä | Rare |
| E4 | **Schedule exceptions** | Date, replaced slots or closed, reason, public note | PULS, P-10, P-11 #besondere-zeiten | FB-09 | E | Occasional |
| E5 | **Closures** | Period, type (Urlaub, Fortbildung, kurzfristig), announcement lead time, auto-expiry | PULS, P-10, P-11 (upcoming) | F54; FB-07, FB-09 | E | Several per year |
| E6 | **Replacement practices (directory)** | Physician name(s), practice, address, phone, email, verified date | Referenced by E7 | F53; FB-10 | PT → E | Rare |
| E7 | **Replacement assignments** | Closure → period → directory entries, note | P-10 #vertretung, PULS VACATION action | FB-10 | E | Per closure |
| E8 | **Notices** | Title, text, severity, valid from/until or "unbefristet", placement | P-10, P-12, PULS reason | F47; FB-11 | E | Occasional |
| E9 | **Emergency directory** | Entry type (112, 116117, Giftnotruf, KV-Dienst, Klinik), name, address, phone, hours, verified date, source | P-15, P-10 (out of hours), PULS CLOSED action | F56–F65; LB-10 | PT + Ä | Quarterly review (proposal) |
| E10 | **Person** (physician / staff) | Name, role, verified titles, photo + consent, bio (optional), order, visible | P-31, P-32, P-34, P-90 (titles) | F20–F34; LB-05, LB-08, LB-09 | E (+L for titles) | Occasional |
| E11 | **Service** | Name, plain-language description, parent-language entry tags, age-range tags, confirmed flag | P-33, age pages, P-27 | F66–F74; FB-12 | E + Ä | Rare |
| E12 | **Preventive examination (U/J)** | Name, age window (from official source), purpose, source + version, verified date, practice performs (F67) | P-25, age pages, P-27 | F67; source-policy §4 | Ä + PT | On official change |
| E13 | **Vaccination topic** | Name, protects against, typical age range, why at this age, official source + version, verified date, approving physician | P-26, age pages, P-27 | F68; strategy-lock 2.3 | Ä + PT | On STIKO change |
| E14 | **Age range** | 0–2 / 3–6 / 7–12 / 13–17, short description | P-20…24, Growing Mobile instrument | — | Ä | Rare |
| E15 | **First-visit items** | Item, text, confirmed flag | P-34 | F77–F88 | E | Rare |
| E16 | **ENTDECKEN chapter** | Title, status (verfügbar / in Vorbereitung), steps, parent intro, approval | P-40, P-41 | — | Ä | Rare |
| E17 | **Legal texts** | Impressum, Datenschutz, Barrierefreiheit | P-90, P-91, P-92 | LB-02–07 | L | On change |

## 2. Duplication hotspots and how they are prevented

| Content | Old site problem | Rule |
|---|---|---|
| Opening hours | One copy on Home, rules in prose (S01) | E2 only; every display is a rendering; prose rules forbidden |
| Contact data | Three copies, two street spellings (F13) | E1 only; footer, Kontakt, Impressum all render E1 |
| Emergency information | Two shapes on two pages (S01, S06) | E9 only; P-15 and P-10 render filtered views |
| Physician data | Team + Kontakt copies (S04, S07) | E10 only; Impressum titles render from E10 after legal review |
| Replacement practices | Retyped per week with copy errors (F52) | E6 directory + E7 assignments referencing it |
| Vaccination information | — | E13 only; age pages and P-27 filter by age tag |
| U/J examinations | Services page list (S05) | E12 only; P-33 references E12 instead of restating |
| Services | 2020 list | E11 only; P-33 entry points are tags, not separate content |
| Notices | Expired notices stayed (F50, F55) | E8 with mandatory validity |

## 3. Derived (never edited) content

- PRAXIS PULS state (from E2, E4, E5, E8, time) — never typed by an editor
- "Nächste Sprechzeit" (from E2, E4, E5)
- Structured data (from E1, E2, E10)
- Footer sitemap (from published pages)
- Age-page "In der Praxis" lists (from E11 tags)

## 4. Editor-facing requirements (for the CMS phase)

1. German labels only.
2. Each entity shows its fact status and verification date; safety-critical entities show a "Prüfung fällig" warning when overdue.
3. Preview "So sieht PRAXIS PULS am {Datum} aus" (O4).
4. Publish is blocked for notices without validity, closures without end date, and conflicting exceptions.
5. Expired items move to an archive view automatically and cannot be republished without new dates.
