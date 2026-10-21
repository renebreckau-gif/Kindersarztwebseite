# Fact Status Register

Phase: 00.5 — Research Acceptance Gate
Register date: 2026-10-07
Status model and rules: [source-policy.md](source-policy.md)
Source IDs (S01 …): [source-inventory.md](source-inventory.md)
Blocker classification: [project-blockers.md](project-blockers.md)

This register is the **single authoritative status list** for practice facts. Where it differs from the "confidence" labels in `source-inventory.md` or wording in `factual-practice-data.md`, this register wins.

Risk levels: **HIGH** = wrong value can delay care, send a family to the wrong place, or create legal exposure · **MEDIUM** = wrong value misleads or embarrasses · **LOW** = cosmetic or convenience.

---

## 0. Review of Phase 00 findings

Critical review of the five Phase 00 documents before assigning statuses:

1. **Page-level edit dates are weaker evidence than they look.** The WordPress `modified` date applies to the whole page. Home (S01) edited 2026-05-18 does not prove that its emergency list, mask rule or hours table were reviewed then. Statuses below do not treat a recent page date as confirmation of every section.
2. **Same-site consistency is not independent verification.** Emergency facilities and contact data agree between Home, Notfälle, Kontakt and Impressum, but all were maintained by the same people. Agreement supports `VERIFIED_CURRENT` only for low-volatility practice data (phone, fax, email), not for third-party or safety-critical data.
3. **Phase 00 contains derived interpretations, not facts.** `factual-practice-data.md` §5 derives acute windows (e.g. "Tue–Fri from 10:00 until end of morning session"). These derivations are **not** facts and are recorded below as `TO_BE_CONFIRMED`.
4. **Confidence labels in `source-inventory.md` are superseded.** E.g. S01 "HIGH for hours/contact" — hours are `VERIFIED_CURRENT` as working data but remain HIGH risk and need practice sign-off before launch.
5. **Legal remarks in the audit are context, not legal advice.** Statements about TMG/DDG and privacy obligations must be reviewed by a qualified person.
6. **German editor labels in `dynamic-content-candidates.md` are proposals**, not practice terminology.
7. **No Phase 00 fact was found to be invented.** All values trace to a source URL. Phase 00 documents are therefore accepted as research input, subject to this register.

---

## 1. Status overview

| ID | Fact | Status | Risk |
|---|---|---|---|
| F01 | Public practice name | TO_BE_CONFIRMED | HIGH |
| F02 | Legal name / legal form (BAG) | TO_BE_CONFIRMED | HIGH |
| F03 | Responsible person(s) for Impressum | TO_BE_CONFIRMED | HIGH |
| F04 | Professional titles in Impressum | TO_BE_CONFIRMED | HIGH |
| F05 | Competent Ärztekammer | VERIFIED_CURRENT | MEDIUM |
| F06 | Competent Kassenärztliche Vereinigung | VERIFIED_CURRENT | MEDIUM |
| F07 | Professional code reference | VERIFIED_CURRENT | LOW |
| F08 | Legal basis cited (TMG / RStV) | OUTDATED_DO_NOT_PUBLISH | HIGH |
| F09 | Existing privacy paragraph | OUTDATED_DO_NOT_PUBLISH | HIGH |
| F10 | Privacy policy data (controller, DPO, processors) | TO_BE_CONFIRMED | HIGH |
| F11 | Photo credit / image rights | TO_BE_CONFIRMED | MEDIUM |
| F12 | Logo / illustration rights | TO_BE_CONFIRMED | MEDIUM |
| F13 | Street and house number | TO_BE_CONFIRMED | HIGH |
| F14 | Postcode and city | VERIFIED_CURRENT | HIGH |
| F15 | Phone number | VERIFIED_CURRENT | HIGH |
| F16 | Fax number | VERIFIED_CURRENT | MEDIUM |
| F17 | Email address | VERIFIED_CURRENT | MEDIUM |
| F18 | Email use for patient matters | TO_BE_CONFIRMED | HIGH |
| F19 | Telephone hours | TO_BE_CONFIRMED | HIGH |
| F20 | Physician: Nadine Probst | VERIFIED_CURRENT | HIGH |
| F21 | Qualification: Nadine Probst | VERIFIED_CURRENT | MEDIUM |
| F22 | Physician: Dr. med. Elke Böhme | VERIFIED_CURRENT | HIGH |
| F23 | Qualifications: Dr. med. Elke Böhme | TO_BE_CONFIRMED | MEDIUM |
| F24 | Physician in training: Firuza Rafiyeva | TO_BE_CONFIRMED | MEDIUM |
| F25 | Physician in training: Anne Horn | OUTDATED_DO_NOT_PUBLISH | MEDIUM |
| F26 | Staff: Andrea Zahn | VERIFIED_CURRENT | MEDIUM |
| F27 | Staff: Steffi Christmann | VERIFIED_CURRENT | MEDIUM |
| F28 | Staff: Katharina Weis | VERIFIED_CURRENT | MEDIUM |
| F29 | Staff: Anke Bettche | VERIFIED_CURRENT | MEDIUM |
| F30 | Staff: Peggy Kejs | VERIFIED_CURRENT | MEDIUM |
| F31 | Team completeness | TO_BE_CONFIRMED | MEDIUM |
| F32 | Staff role labels / heading "Schwestern" | TO_BE_CONFIRMED | LOW |
| F33 | Consent to publish names and photos | TO_BE_CONFIRMED | HIGH |
| F34 | Team photos and mapping | TO_BE_CONFIRMED | LOW |
| F35 | Hours Monday | VERIFIED_CURRENT | HIGH |
| F36 | Hours Tuesday | VERIFIED_CURRENT | HIGH |
| F37 | Hours Wednesday | VERIFIED_CURRENT | HIGH |
| F38 | Hours Thursday | VERIFIED_CURRENT | HIGH |
| F39 | Hours Friday | VERIFIED_CURRENT | HIGH |
| F40 | Weekend closed (Sat + Sun, regular) | VERIFIED_CURRENT (practice, 2026-10-11) | HIGH |
| F41 | Tue–Fri 08–10 "nur gesunde Patienten" window | VERIFIED_CURRENT | HIGH |
| F42 | Meaning of "gesunde Patienten" | TO_BE_CONFIRMED | HIGH |
| F43 | Tue 14–16 "nur Terminsprechstunde" | VERIFIED_CURRENT | HIGH |
| F44 | Acute consultation Monday | TO_BE_CONFIRMED | HIGH |
| F45 | Acute consultation Tue–Fri "ab 10:00" (end time) | TO_BE_CONFIRMED | HIGH |
| F46 | Acute consultation Thursday afternoon | TO_BE_CONFIRMED | HIGH |
| F47 | Mask rule for children over 6 with infection | TO_BE_CONFIRMED | HIGH |
| F48 | Appointment booking channel | TO_BE_CONFIRMED | HIGH |
| F49 | Public holidays / bridge days | TO_BE_CONFIRMED | HIGH |
| F50 | Summer closure 20.07.–07.08.2026 | OUTDATED_DO_NOT_PUBLISH | HIGH |
| F51 | Home teaser "Urlaub" | OUTDATED_DO_NOT_PUBLISH | HIGH |
| F52 | Replacement assignments July/August 2026 | OUTDATED_DO_NOT_PUBLISH | HIGH |
| F53 | Replacement practice directory (contact data) | TO_BE_CONFIRMED | HIGH |
| F54 | Upcoming closures 2026/2027 | TO_BE_CONFIRMED | HIGH |
| F55 | 2020 Corona notice | OUTDATED_DO_NOT_PUBLISH | HIGH |
| F56 | Emergency number 112 | VERIFIED_CURRENT | HIGH |
| F57 | 116117 — nationwide on-call service (official) | VERIFIED_CURRENT (external, 2026-10-07) | HIGH |
| F58 | Giftnotruf Erfurt | TO_BE_CONFIRMED | HIGH |
| F59 | KV on-call service Hettstedt | TO_BE_CONFIRMED | HIGH |
| F60 | KV on-call service Halle | TO_BE_CONFIRMED | HIGH |
| F61 | AMEOS Klinikum Aschersleben | TO_BE_CONFIRMED | HIGH |
| F62 | Helios Klinik Sangerhausen | TO_BE_CONFIRMED | HIGH |
| F63 | St. Elisabeth Krankenhaus Halle | TO_BE_CONFIRMED | HIGH |
| F64 | Universitätsklinikum Halle (Saale) | TO_BE_CONFIRMED | HIGH |
| F65 | Pharmacy emergency service link | TO_BE_CONFIRMED | MEDIUM |
| F66 | Services: general paediatric care | TO_BE_CONFIRMED | MEDIUM |
| F67 | Services: preventive check-ups (U/J) | TO_BE_CONFIRMED | MEDIUM |
| F68 | Services: vaccinations | TO_BE_CONFIRMED | MEDIUM |
| F69 | Services: certificates, accidents, travel advice, youth exams | TO_BE_CONFIRMED | MEDIUM |
| F70 | Services: lab, naturopathy, wound care | TO_BE_CONFIRMED | MEDIUM |
| F71 | Services: pulmonology / allergology | TO_BE_CONFIRMED | MEDIUM |
| F72 | Services: ultrasound | TO_BE_CONFIRMED | MEDIUM |
| F73 | Services: enuresis | TO_BE_CONFIRMED | MEDIUM |
| F74 | Services: psychosomatic basic care | TO_BE_CONFIRMED | MEDIUM |
| F75 | "Hello world!" post | OUTDATED_DO_NOT_PUBLISH | LOW |
| F76 | Empty "Praxis" page | OUTDATED_DO_NOT_PUBLISH | LOW |
| F77–F90 | Facts missing from the existing site | TO_BE_CONFIRMED | see §9 |
| F91 | Health insurance card: bring to visits (proposal, 10.1A) | TO_BE_CONFIRMED | MEDIUM |
| F92 | Vaccination booklet: bring to vaccination appointments (proposal, 10.1A) | TO_BE_CONFIRMED | MEDIUM |
| F93 | No vaccination without the vaccination booklet (proposal, 10.1A) | TO_BE_CONFIRMED | HIGH |
| F94 | Mask / infection guidance for visits (proposal, 10.1A) | TO_BE_CONFIRMED | HIGH |
| F95 | Practice app exists / currently used (10.2A) | TO_BE_CONFIRMED | MEDIUM |
| F96 | App name / provider (10.2A) | TO_BE_CONFIRMED | MEDIUM |
| F97 | Supported platforms / download links (10.2A) | TO_BE_CONFIRMED | MEDIUM |
| F98 | App functions used by the practice (10.2A) | TO_BE_CONFIRMED | HIGH |
| F99 | App registration / access process (10.2A) | TO_BE_CONFIRMED | HIGH |
| F100 | App privacy / health-data handling (10.2A) | TO_BE_CONFIRMED | HIGH |
| F101 | Prescription requests offered remotely (10.3A) | TO_BE_CONFIRMED | MEDIUM |
| F102 | Prescription types eligible for remote request (10.3A) | TO_BE_CONFIRMED | HIGH |
| F103 | Prescription request channels: phone / e-mail / app / in person (10.3A) | TO_BE_CONFIRMED | HIGH |
| F104 | E-mail use for prescription requests (10.3A) | TO_BE_CONFIRMED | HIGH |
| F105 | Health-card prerequisite for prescription processing (10.3A) | TO_BE_CONFIRMED | HIGH |
| F106 | Prescription processing / turnaround expectation (10.3A) | TO_BE_CONFIRMED | HIGH |
| F107 | E-Rezept vs. paper / pickup process (10.3A) | TO_BE_CONFIRMED | HIGH |
| F108 | Information required in a prescription request (10.3A) | TO_BE_CONFIRMED | HIGH |
| F109 | Patient / guardian eligibility to request (10.3A) | TO_BE_CONFIRMED | HIGH |
| F110 | Public price list exists / should be shown (10.4A) | TO_BE_CONFIRMED | MEDIUM |
| F111 | Which fee-based / self-pay services are offered (10.4A) | TO_BE_CONFIRMED | HIGH |
| F112 | Exact current prices and price form (10.4A) | TO_BE_CONFIRMED | HIGH |
| F113 | Kita-Tauglichkeit / certificate pricing example (10.4A) | TO_BE_CONFIRMED | HIGH |
| F114 | Accepted payment methods (10.4A) | TO_BE_CONFIRMED | MEDIUM |
| F115 | Cash payment not accepted (10.4A) | TO_BE_CONFIRMED | MEDIUM |
| F116 | Payment timing / process (10.4A) | TO_BE_CONFIRMED | MEDIUM |
| F117 | Price-list validity / maintenance owner (10.4A) | TO_BE_CONFIRMED | MEDIUM |

Totals (117 facts): VERIFIED_CURRENT 23 · TO_BE_CONFIRMED 85 (incl. 14 missing, F77–F90, 4 staff proposals, F91–F94, 6 app candidates, F95–F100, 9 prescription-process candidates, F101–F109, and 8 pricing / payment candidates, F110–F117) · OUTDATED_DO_NOT_PUBLISH 9

Of the 23 VERIFIED_CURRENT facts, 12 are HIGH risk; 11 of these (all except 112) still require practice sign-off before launch (LB-00).

---

## 2. Identity and legal

### F01 — Public practice name
- **CURRENT VALUE / CLAIM:** "Kinderarztpraxis Probst & Böhme"
- **SOURCE:** S01, S08, site title; variant on S07
- **SOURCE DATE:** S01 2026-05-18; S08 2025-09-18; S07 2022-03-07
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH — legal identity, Impressum, search/maps listings
- **REQUIRED CONFIRMATION:** Practice: official name to be used publicly
- **FEATURES AFFECTED:** Header, footer, Impressum, metadata, structured data
- **NOTES:** Two variants exist (see F02). Working label for drafts only.

### F02 — Legal name / legal form
- **CURRENT VALUE / CLAIM:** "Kinderarztpraxis BAG Probst/Böhme" (BAG = Berufsausübungsgemeinschaft)
- **SOURCE:** S07
- **SOURCE DATE:** 2022-03-07
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH — Impressum obligation
- **REQUIRED CONFIRMATION:** Practice: legal form, partners, exact legal name
- **FEATURES AFFECTED:** Impressum, privacy policy (controller)
- **NOTES:** Not mentioned in Impressum (S08).

### F03 — Responsible person(s) for Impressum
- **CURRENT VALUE / CLAIM:** none named
- **SOURCE:** S08
- **SOURCE DATE:** 2025-09-18
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH — legal
- **REQUIRED CONFIRMATION:** Practice (+ legal review)
- **FEATURES AFFECTED:** Impressum
- **NOTES:** Missing, not contradictory.

### F04 — Professional titles in Impressum
- **CURRENT VALUE / CLAIM:** "Ärztin, Fachärztin für Kinder und Jugendmedizin (verliehen in der Bundesrepublik Deutschland)"
- **SOURCE:** S08
- **SOURCE DATE:** 2025-09-18
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH — legal
- **REQUIRED CONFIRMATION:** Practice: titles of each physician as legally held
- **FEATURES AFFECTED:** Impressum
- **NOTES:** Singular form for two physicians; does not reflect Dr. Böhme's additional titles (F23).

### F05 — Competent Ärztekammer
- **CURRENT VALUE / CLAIM:** Ärztekammer Sachsen-Anhalt, Doctor-Eisenbart-Ring 2, 39120 Magdeburg, www.aeksa.de
- **SOURCE:** S08
- **SOURCE DATE:** 2025-09-18
- **STATUS:** VERIFIED_CURRENT
- **RISK IF INCORRECT:** MEDIUM — legal
- **REQUIRED CONFIRMATION:** Address check against aeksa.de when the Impressum is drafted
- **FEATURES AFFECTED:** Impressum
- **NOTES:** Consistent with practice location; not contradicted.

### F06 — Competent Kassenärztliche Vereinigung
- **CURRENT VALUE / CLAIM:** KV Sachsen-Anhalt (KVSA), Doctor-Eisenbart-Ring 2, 39120 Magdeburg, www.kvsa.de
- **SOURCE:** S08
- **SOURCE DATE:** 2025-09-18
- **STATUS:** VERIFIED_CURRENT
- **RISK IF INCORRECT:** MEDIUM — legal
- **REQUIRED CONFIRMATION:** Address check against kvsa.de when the Impressum is drafted
- **FEATURES AFFECTED:** Impressum
- **NOTES:** —

### F07 — Professional code reference
- **CURRENT VALUE / CLAIM:** "Berufsordnung der Landesärztekammer Sachsen-Anhalt", www.aeksa.de
- **SOURCE:** S08
- **SOURCE DATE:** 2025-09-18
- **STATUS:** VERIFIED_CURRENT
- **RISK IF INCORRECT:** LOW
- **REQUIRED CONFIRMATION:** Link target check when drafting
- **FEATURES AFFECTED:** Impressum
- **NOTES:** —

### F08 — Legal basis cited
- **CURRENT VALUE / CLAIM:** "Pflichtangaben nach § 5 Telemediengesetz § 55 Rundfunkstaatsvertrag (RStV)"
- **SOURCE:** S08
- **SOURCE DATE:** 2025-09-18
- **STATUS:** OUTDATED_DO_NOT_PUBLISH
- **RISK IF INCORRECT:** HIGH — legal
- **REQUIRED CONFIRMATION:** Legal review defines the correct current references
- **FEATURES AFFECTED:** Impressum
- **NOTES:** Superseded legislation (TMG → DDG; RStV → MStV). Do not reuse wording.

### F09 — Existing privacy paragraph
- **CURRENT VALUE / CLAIM:** "Die Nutzung unserer Webseite ist ohne Angabe personenbezogener Daten möglich …"
- **SOURCE:** S08
- **SOURCE DATE:** 2025-09-18
- **STATUS:** OUTDATED_DO_NOT_PUBLISH
- **RISK IF INCORRECT:** HIGH — legal
- **REQUIRED CONFIRMATION:** Replaced by a full privacy policy (F10)
- **FEATURES AFFECTED:** Datenschutz
- **NOTES:** Contradicted by the site's own behaviour (Google Fonts, Google Maps iframe, S11); not applicable to a new system.

### F10 — Privacy policy data
- **CURRENT VALUE / CLAIM:** none (no privacy policy; `/datenschutz/` → 404)
- **SOURCE:** S10, S11
- **SOURCE DATE:** checked 2026-10-07
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH — legal
- **REQUIRED CONFIRMATION:** Practice + legal review: controller, DPO (if any), hosting, processors, contact for data requests
- **FEATURES AFFECTED:** Datenschutz, any form, maps, fonts, analytics, CMS hosting
- **NOTES:** Also depends on technical choices made in later phases.

### F11 — Photo credit / image rights
- **CURRENT VALUE / CLAIM:** "Fotos: Thomas Reinhardt" (text www.thomasreinhardt.de, link to pexels.com)
- **SOURCE:** S08
- **SOURCE DATE:** 2025-09-18
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** MEDIUM — copyright
- **REQUIRED CONFIRMATION:** Practice: usage rights for existing photos in a new website
- **FEATURES AFFECTED:** Team, imagery
- **NOTES:** Link text and target contradict each other.

### F12 — Logo / illustration rights
- **CURRENT VALUE / CLAIM:** Favicon/logo file "cropped-Liams-Tiere-1" (2020)
- **SOURCE:** S11
- **SOURCE DATE:** upload 2020-04
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** MEDIUM — copyright, brand
- **REQUIRED CONFIRMATION:** Practice: origin and rights of the logo
- **FEATURES AFFECTED:** Branding, favicon
- **NOTES:** —

## 3. Contact information

### F13 — Street and house number
- **CURRENT VALUE / CLAIM:** "Untere Bahnhofstraße 9" (S01, S07) vs. "Untere Bahnhofsstraße 9" (S08, Google Maps embed on S07)
- **SOURCE:** S01, S07, S08
- **SOURCE DATE:** 2026-05-18 / 2022-03-07 / 2025-09-18
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH — navigation, Impressum, structured data
- **REQUIRED CONFIRMATION:** Practice: exact official spelling
- **FEATURES AFFECTED:** Kontakt, Impressum, footer, map/route link, structured data
- **NOTES:** House number 9 is consistent; only spelling differs.

### F14 — Postcode and city
- **CURRENT VALUE / CLAIM:** 06333 Hettstedt
- **SOURCE:** S01, S07, S08
- **SOURCE DATE:** 2026-05-18
- **STATUS:** VERIFIED_CURRENT
- **RISK IF INCORRECT:** HIGH
- **REQUIRED CONFIRMATION:** Practice sign-off (LB-00)
- **FEATURES AFFECTED:** Kontakt, Impressum, footer, structured data
- **NOTES:** Consistent on all pages.

### F15 — Phone number
- **CURRENT VALUE / CLAIM:** 03476 851157
- **SOURCE:** S01, S07, S08
- **SOURCE DATE:** 2026-05-18
- **STATUS:** VERIFIED_CURRENT
- **RISK IF INCORRECT:** HIGH — primary contact channel, also fail-safe fallback
- **REQUIRED CONFIRMATION:** Practice sign-off (LB-00)
- **FEATURES AFFECTED:** Header, Kontakt, PRAXIS PULS fallback, Impressum, structured data
- **NOTES:** Identical on all pages, no contradiction.

### F16 — Fax number
- **CURRENT VALUE / CLAIM:** 03476 854206
- **SOURCE:** S01, S07, S08
- **SOURCE DATE:** 2026-05-18
- **STATUS:** VERIFIED_CURRENT
- **RISK IF INCORRECT:** MEDIUM
- **REQUIRED CONFIRMATION:** Practice sign-off; whether fax should still be shown
- **FEATURES AFFECTED:** Kontakt, Impressum
- **NOTES:** —

### F17 — Email address
- **CURRENT VALUE / CLAIM:** kinderarztpraxis-hettstedt@gmx.de
- **SOURCE:** S01, S07, S08
- **SOURCE DATE:** 2026-05-18
- **STATUS:** VERIFIED_CURRENT
- **RISK IF INCORRECT:** MEDIUM
- **REQUIRED CONFIRMATION:** Practice sign-off; see F18 for usage
- **FEATURES AFFECTED:** Kontakt, Impressum
- **NOTES:** Address is verified; how it should be used is not.

### F18 — Email use for patient matters
- **CURRENT VALUE / CLAIM:** Parents asked to register children with replacement practices "per E-Mail oder Telefon" (S02); no stated policy for emailing the practice
- **SOURCE:** S02
- **SOURCE DATE:** 2026-07-19
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH — health data over unencrypted email
- **REQUIRED CONFIRMATION:** Practice: what may/may not be sent by email; response times
- **FEATURES AFFECTED:** Kontakt, any email CTA, privacy policy
- **NOTES:** —

### F19 — Telephone hours
- **CURRENT VALUE / CLAIM:** not stated
- **SOURCE:** —
- **SOURCE DATE:** —
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH
- **REQUIRED CONFIRMATION:** Practice
- **FEATURES AFFECTED:** PRAXIS PULS ("telefonisch erreichbar"), Kontakt
- **NOTES:** Must not be assumed equal to consultation hours.

## 4. Physicians

### F20 — Physician: Nadine Probst
- **CURRENT VALUE / CLAIM:** Physician of the practice
- **SOURCE:** S04, S07, practice name
- **SOURCE DATE:** S04 2026-05-18
- **STATUS:** VERIFIED_CURRENT
- **RISK IF INCORRECT:** HIGH
- **REQUIRED CONFIRMATION:** Practice sign-off (LB-00)
- **FEATURES AFFECTED:** Team, Kontakt, Impressum, structured data
- **NOTES:** —

### F21 — Qualification: Nadine Probst
- **CURRENT VALUE / CLAIM:** "Fachärztin für Kinder- und Jugendmedizin"
- **SOURCE:** S04, S07
- **SOURCE DATE:** 2026-05-18
- **STATUS:** VERIFIED_CURRENT
- **RISK IF INCORRECT:** MEDIUM — professional law
- **REQUIRED CONFIRMATION:** Practice sign-off of exact wording
- **FEATURES AFFECTED:** Team, Impressum
- **NOTES:** Typo on S04 ("Kinder -und") — wording, not fact.

### F22 — Physician: Dr. med. Elke Böhme
- **CURRENT VALUE / CLAIM:** Physician of the practice
- **SOURCE:** S04, S07, practice name
- **SOURCE DATE:** 2026-05-18
- **STATUS:** VERIFIED_CURRENT
- **RISK IF INCORRECT:** HIGH
- **REQUIRED CONFIRMATION:** Practice sign-off (LB-00)
- **FEATURES AFFECTED:** Team, Kontakt, Impressum, structured data
- **NOTES:** —

### F23 — Qualifications: Dr. med. Elke Böhme
- **CURRENT VALUE / CLAIM:** "Fachärztin für Kinder- und Jugendmedizin/Kinderchirurgie", "Naturheilverfahren"
- **SOURCE:** S04, S07
- **SOURCE DATE:** 2026-05-18
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** MEDIUM — professional law
- **REQUIRED CONFIRMATION:** Practice: whether "Kinderchirurgie" is a separate Facharzt title; whether "Naturheilverfahren" is a Zusatzbezeichnung; exact wording
- **FEATURES AFFECTED:** Team, Impressum
- **NOTES:** Wording ambiguous; do not reformulate.

### F24 — Physician in training: Firuza Rafiyeva
- **CURRENT VALUE / CLAIM:** "Vom 01.03.2026 bis dato"
- **SOURCE:** S02
- **SOURCE DATE:** 2026-07-19
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** MEDIUM
- **REQUIRED CONFIRMATION:** Practice: still in training here? end date? consent to publish?
- **FEATURES AFFECTED:** Team, notices
- **NOTES:** Not on Team page.

### F25 — Physician in training: Anne Horn
- **CURRENT VALUE / CLAIM:** "Vom 01.01.2025 bis 30.06.2026"
- **SOURCE:** S02
- **SOURCE DATE:** 2026-07-19
- **STATUS:** OUTDATED_DO_NOT_PUBLISH
- **RISK IF INCORRECT:** MEDIUM
- **REQUIRED CONFIRMATION:** None (period ended by its own stated date)
- **FEATURES AFFECTED:** Team
- **NOTES:** Historical only.

## 5. Staff

### F26–F30 — Staff members
| ID | CURRENT VALUE / CLAIM |
|---|---|
| F26 | Andrea Zahn — "Arzthelferin" |
| F27 | Steffi Christmann — "Erzieherin /Arzthelferin" |
| F28 | Katharina Weis — "Arzthelferin" |
| F29 | Anke Bettche — "Arzthelferin" |
| F30 | Peggy Kejs — "Praxisassistentin" |

Shared fields for F26–F30:
- **SOURCE:** S04
- **SOURCE DATE:** 2026-05-18
- **STATUS:** VERIFIED_CURRENT (as working data)
- **RISK IF INCORRECT:** MEDIUM — naming a person who has left; privacy
- **REQUIRED CONFIRMATION:** Practice sign-off of the list (F31) and consent (F33) before publication
- **FEATURES AFFECTED:** Team
- **NOTES:** Page actively maintained in 2026, no contradicting source. Publication still depends on F33.

### F31 — Team completeness
- **CURRENT VALUE / CLAIM:** 2 physicians + 5 staff
- **SOURCE:** S04 (+ S02 for trainees)
- **SOURCE DATE:** 2026-05-18
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** MEDIUM
- **REQUIRED CONFIRMATION:** Practice: complete current list, display order, trainees on Team page?
- **FEATURES AFFECTED:** Team
- **NOTES:** Trainee F24 is listed elsewhere; completeness unknown.

### F32 — Staff role labels
- **CURRENT VALUE / CLAIM:** Section heading "Schwestern"; titles "Arzthelferin", "Praxisassistentin"
- **SOURCE:** S04
- **SOURCE DATE:** 2026-05-18
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** LOW
- **REQUIRED CONFIRMATION:** Practice: preferred heading and titles
- **FEATURES AFFECTED:** Team
- **NOTES:** Heading does not match listed roles. Do not modernise without approval.

### F33 — Consent to publish names and photos
- **CURRENT VALUE / CLAIM:** unknown
- **SOURCE:** —
- **SOURCE DATE:** —
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH — privacy / personality rights
- **REQUIRED CONFIRMATION:** Practice: documented consent per person
- **FEATURES AFFECTED:** Team
- **NOTES:** —

### F34 — Team photos and mapping
- **CURRENT VALUE / CLAIM:** 4 photos (2020) for 7 people, unlabelled, no alt text
- **SOURCE:** S04
- **SOURCE DATE:** uploads 2020-04
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** LOW
- **REQUIRED CONFIRMATION:** Practice: who is shown; new photos planned?
- **FEATURES AFFECTED:** Team
- **NOTES:** —

## 6. Opening hours and consultation types

Shared fields for F35–F39:
- **SOURCE:** S01
- **SOURCE DATE:** page 2026-05-18 (page-level; see §0.1)
- **STATUS:** VERIFIED_CURRENT (as working data)
- **RISK IF INCORRECT:** HIGH — families arrive at a closed practice
- **REQUIRED CONFIRMATION:** Practice sign-off before launch (LB-00) and before PRAXIS PULS uses them
- **FEATURES AFFECTED:** Sprechzeiten, PRAXIS PULS, structured data
- **NOTES:** Single source, internally consistent, actively maintained page, no contradiction.

| ID | Day | CURRENT VALUE / CLAIM |
|---|---|---|
| F35 | Montag | 08:00–11:00 und 14:00–17:00 |
| F36 | Dienstag | 08:00–11:00 und 14:00–16:00 |
| F37 | Mittwoch | 08:00–12:00 |
| F38 | Donnerstag | 08:00–11:00 und 14:00–17:00 |
| F39 | Freitag | 08:00–12:00 |

### F40 — Weekend closed
- **CURRENT VALUE / CLAIM:** „Die Kinderarztpraxis Probst & Böhme ist regulär samstags und sonntags geschlossen. Abweichende Öffnungen oder Sondersprechstunden am Wochenende werden nur angezeigt, wenn sie ausdrücklich angekündigt und bestätigt wurden.“
- **SOURCE:** Practice confirmation (internal evidence) — confirmed by **Nadine Probst** on **2026-10-11**. Earlier: S01 only by absence (2026-05-18), which was never used as proof.
- **SOURCE DATE:** 2026-10-11
- **STATUS:** VERIFIED_CURRENT (re-check with the regular hours review, together with `schedule.verification`)
- **RISK IF INCORRECT:** HIGH
- **REQUIRED CONFIRMATION:** Done (FB-05 closed). Weekend openings / special sessions must be entered as verified exceptions; they override the regular closure.
- **FEATURES AFFECTED:** PRAXIS PULS (Saturday/Sunday → CLOSED with next opening), Sprechzeiten
- **NOTES:** Encoded as `confirmedClosedWeekdays: [6, 7]` in `src/content/schedule.ts`. Does **not** imply holiday closure — F49 remains a separate, unconfirmed trust path.

### F41 — "Nur gesunde Patienten" window
- **CURRENT VALUE / CLAIM:** Tue, Wed, Thu, Fri 08:00–10:00 "bitte nur gesunde Patienten"
- **SOURCE:** S01
- **SOURCE DATE:** 2026-05-18
- **STATUS:** VERIFIED_CURRENT
- **RISK IF INCORRECT:** HIGH
- **REQUIRED CONFIRMATION:** Practice sign-off (LB-00)
- **FEATURES AFFECTED:** Sprechzeiten, PRAXIS PULS
- **NOTES:** The window is stated clearly; its meaning is not (F42). Monday has no such window.

### F42 — Meaning of "gesunde Patienten"
- **CURRENT VALUE / CLAIM:** Not defined on current pages; 2020 notice (S02) mentions "Vorsorge, Impfungen, Gewichtskontrollen etc."
- **SOURCE:** S01, S02
- **SOURCE DATE:** S02 notice from 2020
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH — sick child brought into healthy-only slot
- **REQUIRED CONFIRMATION:** Practice: what visits belong in this window; appointment required?
- **FEATURES AFFECTED:** Sprechzeiten, PRAXIS PULS
- **NOTES:** The 2020 definition must not be reused without confirmation.

### F43 — Tuesday afternoon appointment-only
- **CURRENT VALUE / CLAIM:** Di 14:00–16:00 "nur Terminsprechstunde"
- **SOURCE:** S01
- **SOURCE DATE:** 2026-05-18
- **STATUS:** VERIFIED_CURRENT
- **RISK IF INCORRECT:** HIGH
- **REQUIRED CONFIRMATION:** Practice sign-off (LB-00)
- **FEATURES AFFECTED:** Sprechzeiten, PRAXIS PULS
- **NOTES:** Whether other slots are also appointment-based is unknown.

### F44 — Acute consultation Monday
- **CURRENT VALUE / CLAIM:** "Montag – ganztags"
- **SOURCE:** S01
- **SOURCE DATE:** 2026-05-18
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH — sick child turned away or sent at wrong time
- **REQUIRED CONFIRMATION:** Practice: does "ganztags" mean both Monday sessions (08–11 and 14–17) without restriction?
- **FEATURES AFFECTED:** PRAXIS PULS, Sprechzeiten
- **NOTES:** Wording suggests all opening hours, but this is not inferred.

### F45 — Acute consultation Tue–Fri
- **CURRENT VALUE / CLAIM:** "Dienstag – Freitag ab 10:00 Uhr!" (no end time)
- **SOURCE:** S01
- **SOURCE DATE:** 2026-05-18
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH
- **REQUIRED CONFIRMATION:** Practice: end time per day; afternoons included?
- **FEATURES AFFECTED:** PRAXIS PULS, Sprechzeiten
- **NOTES:** Phase 00 derivation "until end of morning session" is not a fact.

### F46 — Acute consultation Thursday afternoon
- **CURRENT VALUE / CLAIM:** not stated (Thu 14:00–17:00 has no restriction note)
- **SOURCE:** S01
- **SOURCE DATE:** 2026-05-18
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH
- **REQUIRED CONFIRMATION:** Practice: type of the Thursday afternoon session
- **FEATURES AFFECTED:** PRAXIS PULS
- **NOTES:** —

### F47 — Mask rule
- **CURRENT VALUE / CLAIM:** "Kinder über 6 Jahre im Falle eines Infektes [benötigen] einen Mundschutz"
- **SOURCE:** S01
- **SOURCE DATE:** page 2026-05-18
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH — practice-specific medical/infection rule
- **REQUIRED CONFIRMATION:** Practice: still current? applies to accompanying adults?
- **FEATURES AFFECTED:** Notices, PRAXIS PULS
- **NOTES:** Contradicts the 2020 notice (F55), which is outdated. Page-level date does not confirm this section.

### F48 — Appointment booking channel
- **CURRENT VALUE / CLAIM:** not stated
- **SOURCE:** —
- **SOURCE DATE:** —
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH
- **REQUIRED CONFIRMATION:** Practice: phone / email / online / in person
- **FEATURES AFFECTED:** "Termin" CTA, Kontakt, PRAXIS PULS
- **NOTES:** —

### F49 — Public holidays / bridge days
- **CURRENT VALUE / CLAIM:** not stated
- **SOURCE:** —
- **SOURCE DATE:** —
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH
- **REQUIRED CONFIRMATION:** Practice: closed on Sachsen-Anhalt public holidays? bridge days?
- **FEATURES AFFECTED:** PRAXIS PULS
- **NOTES:** PRAXIS PULS must not show "open" on a public holiday without confirmed data. Since Phase 09.5H a technical physician-confirmation workflow exists in the staff cockpit (`/intern/feiertage`); it does **not** change this status — the practice's actual rule has not been confirmed.

## 7. Closures, replacements, notices

### F50 — Summer closure 2026
- **CURRENT VALUE / CLAIM:** "vom 20.07.2026 bis 07.08.2026 geschlossen"
- **SOURCE:** S02
- **SOURCE DATE:** 2026-07-19
- **STATUS:** OUTDATED_DO_NOT_PUBLISH
- **RISK IF INCORRECT:** HIGH — families believe the practice is closed
- **REQUIRED CONFIRMATION:** None (expired by own date)
- **FEATURES AFFECTED:** Aktuelles, PRAXIS PULS
- **NOTES:** Useful only as an example of closure data structure.

### F51 — Home teaser "Urlaub"
- **CURRENT VALUE / CLAIM:** "Urlaub — Näheres erfahren Sie unter „Aktuell""
- **SOURCE:** S01
- **SOURCE DATE:** 2026-05-18
- **STATUS:** OUTDATED_DO_NOT_PUBLISH
- **RISK IF INCORRECT:** HIGH
- **REQUIRED CONFIRMATION:** None
- **FEATURES AFFECTED:** Startseite
- **NOTES:** Refers to expired F50.

### F52 — Replacement assignments July/August 2026
- **CURRENT VALUE / CLAIM:** Weekly replacement pairs for 20.07.–07.08.2026 (see factual-practice-data.md §9)
- **SOURCE:** S02
- **SOURCE DATE:** 2026-07-19
- **STATUS:** OUTDATED_DO_NOT_PUBLISH
- **RISK IF INCORRECT:** HIGH
- **REQUIRED CONFIRMATION:** None
- **FEATURES AFFECTED:** Vertretung
- **NOTES:** Contains internal errors (Dr. Kreuter with Dr. Fuchs's contact data; Dr. Reich without postcode/city; undated extra Fuchs entry).

### F53 — Replacement practice directory
- **CURRENT VALUE / CLAIM:** Dr. Dorothea Kreuter / Dr. Chr. Fuchs (Leninplatz 1, 06420 Könnern, 034691 20320); Dr. Heike Teichler (Hallorenring 8, 06108 Halle/Saale, 0345 2906510); Gunther Jach (Unterstraße 17, 06493 Harzgerode, 039484 2313); Dr. Steffi Reich ("Hinter den Planken 1", 03476 812088); emails as on S02
- **SOURCE:** S02
- **SOURCE DATE:** 2026-07-19
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH — families sent to wrong practice/phone
- **REQUIRED CONFIRMATION:** Practice + each replacement practice's own data; resolve Kreuter/Fuchs relationship and Reich address
- **FEATURES AFFECTED:** Vertretung, PRAXIS PULS
- **NOTES:** Third-party data (source-policy §3). Only reusable as a directory after verification. 2026-10-21 (09.5G): the technical directory + physician-verification workflow now exists in the cockpit (`/intern/vertretungen`). Nothing was imported; this fact stays TO_BE_CONFIRMED until the practice enters and a physician confirms real entries.

### F54 — Upcoming closures 2026/2027
- **CURRENT VALUE / CLAIM:** none published
- **SOURCE:** —
- **SOURCE DATE:** —
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH
- **REQUIRED CONFIRMATION:** Practice
- **FEATURES AFFECTED:** PRAXIS PULS, Aktuelles
- **NOTES:** "No closure published" ≠ "no closure planned".

### F55 — 2020 Corona notice
- **CURRENT VALUE / CLAIM:** Morning session for healthy children only, no sick siblings, masks for everyone, 1.5–2 m distance
- **SOURCE:** S02
- **SOURCE DATE:** content from 2020; page 2026-07-19
- **STATUS:** OUTDATED_DO_NOT_PUBLISH
- **RISK IF INCORRECT:** HIGH — contradicts current rules
- **REQUIRED CONFIRMATION:** None
- **FEATURES AFFECTED:** Aktuelles
- **NOTES:** Superseded by F41/F47 (which themselves await confirmation).

## 8. Emergency information

### F56 — Emergency number 112
- **CURRENT VALUE / CLAIM:** "Bei lebensbedrohlichen Notfällen wählen Sie bitte die 112!"
- **SOURCE:** S06; EU-wide emergency number
- **SOURCE DATE:** 2020-05-05
- **STATUS:** VERIFIED_CURRENT
- **RISK IF INCORRECT:** HIGH
- **REQUIRED CONFIRMATION:** None for the number; wording approved by practice
- **FEATURES AFFECTED:** Notfall, global emergency access, fail-safe fallback
- **NOTES:** Only emergency fact independent of the practice and of time.

### F57 — 116117
- **CURRENT VALUE / CLAIM:** 116117, ärztlicher Bereitschaftsdienst; without area code; nationwide; 24/7; for urgent help when practices are closed; not for life-threatening emergencies (→ 112)
- **SOURCE:** KBV_116117 — https://www.116117.de/de/aerztlicher-bereitschaftsdienst.php (official, Patientenservice der Kassenärztlichen Vereinigungen)
- **SOURCE DATE:** checked 2026-10-07 (verbatim quotes in `src/content/sources.ts`)
- **STATUS:** VERIFIED_CURRENT — external official fact (Phase 08); review due 2027-01-07
- **RISK IF INCORRECT:** HIGH
- **REQUIRED CONFIRMATION:** None for the national facts. Anything local (Bereitschaftspraxis address, practice substitution, regional hours) stays separate and unconfirmed (F59, F60).
- **FEATURES AFFECTED:** Notfall (tier 2, below 112, above practice contact)
- **NOTES:** Published without any practice-specific claim. Never shown as the answer to a life-threatening situation.

### F57a — U10 (new G-BA examination) — governance note
- **CURRENT VALUE / CLAIM:** G-BA decision 2026-08-20 (verified, g-ba.de/beschluesse/7982); page states "noch nicht in Kraft" (2026-10-07). BMG non-objection 2026-09-30 per brief — TO_BE_CONFIRMED. Bundesanzeiger: pending. Physician wording approval: none. Practice offer: unknown.
- **STATUS:** model in `src/content/examinations.ts`; public output = none until IN_KRAFT verified + editorial approval
- **RISK IF INCORRECT:** HIGH (parents could expect an examination that does not exist yet)

### F58 — Giftnotruf Erfurt
- **CURRENT VALUE / CLAIM:** 0361 730730, "ganztägig erreichbar"
- **SOURCE:** S01, S06
- **SOURCE DATE:** S06 2020-05-05; S01 page 2026-05-18
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH
- **REQUIRED CONFIRMATION:** Official poison information centre website; practice approval
- **FEATURES AFFECTED:** Notfall
- **NOTES:** Consistent across pages but last substantively dated 2020.

### F59 — KV on-call service Hettstedt
- **CURRENT VALUE / CLAIM:** Helios Klinik, Robert-Koch-Straße 8, 06333 Hettstedt; Mi 17–20, Fr 17–20, Sa/So 09–12 und 17–20
- **SOURCE:** S06
- **SOURCE DATE:** 2020-05-05
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH — family travels to a closed or non-existent service
- **REQUIRED CONFIRMATION:** KV Sachsen-Anhalt; practice approval
- **FEATURES AFFECTED:** Notfall, PRAXIS PULS (outside hours)
- **NOTES:** 6+ years old.

### F60 — KV on-call service Halle
- **CURRENT VALUE / CLAIM:** St. Elisabeth Krankenhaus, Mauerstr. 5, 06110 Halle, 0345 213 4310; Mo/Di/Do 19–23, Mi/Fr 16–23, Sa/So 08–23
- **SOURCE:** S06
- **SOURCE DATE:** 2020-05-05
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH
- **REQUIRED CONFIRMATION:** KV Sachsen-Anhalt / hospital; practice approval
- **FEATURES AFFECTED:** Notfall
- **NOTES:** 6+ years old.

### F61 — AMEOS Klinikum Aschersleben
- **CURRENT VALUE / CLAIM:** Eislebener Str. 7A, 06449 Aschersleben, +49 3473 970; 24/7 "kinderärztlicher Bereitschaftsdienst"
- **SOURCE:** S01, S06
- **SOURCE DATE:** S06 2020-05-05
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH
- **REQUIRED CONFIRMATION:** Hospital website; practice approval
- **FEATURES AFFECTED:** Notfall
- **NOTES:** —

### F62 — Helios Klinik Sangerhausen
- **CURRENT VALUE / CLAIM:** Am Beinschuh 2a, 06526 Sangerhausen, +49 3464 660; 24/7 "kinderärztlicher Bereitschaftsdienst"
- **SOURCE:** S01, S06
- **SOURCE DATE:** S06 2020-05-05
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH
- **REQUIRED CONFIRMATION:** Hospital website; practice approval
- **FEATURES AFFECTED:** Notfall
- **NOTES:** —

### F63 — St. Elisabeth Krankenhaus Halle (24/7 Kinderambulanz)
- **CURRENT VALUE / CLAIM:** Mauerstraße 5, 06110 Halle, +49 345 2134310; 24/7 paediatric and paediatric-surgical service
- **SOURCE:** S01, S06
- **SOURCE DATE:** S06 2020-05-05
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH
- **REQUIRED CONFIRMATION:** Hospital website; practice approval
- **FEATURES AFFECTED:** Notfall
- **NOTES:** Same phone as F60 — whether it reaches the 24/7 ambulance or the KV service is unclear.

### F64 — Universitätsklinikum Halle (Saale), Kröllwitz
- **CURRENT VALUE / CLAIM:** Ernst-Grube-Str. 40, 06120 Halle, +49 345 5572053; 24/7 paediatric and paediatric-surgical service
- **SOURCE:** S01 (phone), S06 (service)
- **SOURCE DATE:** S06 2020-05-05
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** HIGH
- **REQUIRED CONFIRMATION:** Hospital website; practice approval
- **FEATURES AFFECTED:** Notfall
- **NOTES:** Phone appears on only one page.

### F65 — Pharmacy emergency service
- **CURRENT VALUE / CLAIM:** Link to aponet.de emergency pharmacy search for 06333 Hettstedt
- **SOURCE:** S06
- **SOURCE DATE:** 2020-05-05
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** MEDIUM
- **REQUIRED CONFIRMATION:** Link target check; practice approval
- **FEATURES AFFECTED:** Notfall
- **NOTES:** —

## 9. Services

Shared fields for F66–F74:
- **SOURCE:** S05
- **SOURCE DATE:** 2020-05-09
- **STATUS:** TO_BE_CONFIRMED
- **RISK IF INCORRECT:** MEDIUM — advertising a service that is no longer offered; professional-law exposure
- **REQUIRED CONFIRMATION:** Practice: still offered? wording? insurer conditions?
- **FEATURES AFFECTED:** Leistungen, search/SEO, structured data
- **NOTES:** Page untouched for 6+ years. No services are added or removed by the project.

| ID | CURRENT VALUE / CLAIM (verbatim on S05) | Specific note |
|---|---|---|
| F66 | Behandlung akuter und chronischer Erkrankungen im Kindes- und Jugendalter | — |
| F67 | Vorsorgeuntersuchungen U2–U9, J1; zusätzlich U10, U11, J2 (krankenkassenabhängig) | Insurer conditions unknown |
| F68 | Indikationsimpfungen, Reiseimpfungen, empfohlene Impfungen laut STIKO | Medical wording follows source-policy §4 |
| F69 | Kindergarten-/Schulunfälle; reisemedizinische Beratung; Jugendarbeitsschutzuntersuchungen; Kindergartentauglichkeit; Sporttauglichkeit (außer Tauchen) | — |
| F70 | Labordiagnostik; Naturheilverfahren; "Wunderversorgung" | Typo — confirm "Wundversorgung" |
| F71 | Pricktest; Lungenfunktionsdiagnostik; Hyposensibilisierung (SLIT/SCIT); DMP Asthma bronchiale; Neurodermitisberatung und -therapie | DMP participation is a contractual status |
| F72 | Hüftscreening bis zur 8. Lebenswoche; Sonographie der Bauchorgane und Nieren | — |
| F73 | Diagnostik und Therapie bei Harninkontinenz / Bettnässen | — |
| F74 | Psychosomatische Grundversorgung (incl. listed examples) | — |

## 10. Obsolete content

### F75 — "Hello world!" post
- **CURRENT VALUE / CLAIM:** WordPress default post, public
- **SOURCE:** S09
- **SOURCE DATE:** 2016-05-10
- **STATUS:** OUTDATED_DO_NOT_PUBLISH
- **RISK IF INCORRECT:** LOW
- **REQUIRED CONFIRMATION:** None
- **FEATURES AFFECTED:** None (exclude from migration, redirects)
- **NOTES:** —

### F76 — Empty "Praxis" page
- **CURRENT VALUE / CLAIM:** Empty page in main navigation
- **SOURCE:** S03
- **SOURCE DATE:** 2020-04-06
- **STATUS:** OUTDATED_DO_NOT_PUBLISH
- **RISK IF INCORRECT:** LOW
- **REQUIRED CONFIRMATION:** Practice: content intended? (see F90)
- **FEATURES AFFECTED:** Navigation
- **NOTES:** Not to be recreated as an empty page.

## 11. Facts missing from the existing site

All `TO_BE_CONFIRMED`. Source: none (absence confirmed on all pages, S01–S10). Source date: checked 2026-10-07.

| ID | FACT | RISK IF INCORRECT | REQUIRED CONFIRMATION | FEATURES AFFECTED |
|---|---|---|---|---|
| F77 | New-patient acceptance and conditions | HIGH | Practice | Neue Patienten, Kontakt |
| F78 | What to bring (Versichertenkarte, U-Heft, Impfpass …) | MEDIUM | Practice | Erster Besuch |
| F79 | Newborn registration process (U2/U3) | MEDIUM | Practice | Neue Patienten |
| F80 | Repeat prescriptions / referrals / certificates process | MEDIUM | Practice | Service, Kontakt |
| F81 | Sick notes for parents (Kind-krank-Bescheinigung) | MEDIUM | Practice | Service |
| F82 | Insurance (GKV / private / IGeL) | MEDIUM | Practice | Leistungen, Kontakt |
| F83 | Appointment cancellation rules | LOW | Practice | Termine |
| F84 | Video / phone consultation offered | LOW | Practice | Termine |
| F85 | Wheelchair accessibility | MEDIUM | Practice (on-site check) | Anfahrt, accessibility statement |
| F86 | Stroller access and parking | LOW | Practice | Anfahrt |
| F87 | Parking | LOW | Practice | Anfahrt |
| F88 | Public transport | LOW | Practice / transport operator | Anfahrt |
| F89 | Languages spoken | LOW | Practice | Team, Kontakt |
| F90 | Content for "Praxis" (philosophy, rooms, bios) | LOW | Practice | Praxis |

## 12. Practice-staff proposals (Phase 10.1A, "Gut vorbereitet")

Shared fields for F91–F94:
- **SOURCE:** practice-staff feedback (voice message to the project), October 2026 — an input, **not** a formal physician approval
- **STATUS:** TO_BE_CONFIRMED (no rule is inferred from the suggestion alone)
- **FEATURES AFFECTED:** "Gut vorbereitet" (future `/praxis/gut-vorbereitet`, linked from "Neu bei uns?"); staging approval draft `/review/gut-vorbereitet`
- **RECORDS:** `src/content/first-visit.ts` (`FirstVisitItem`), approvers and open questions alongside

| ID | PROPOSED CLAIM | RISK IF INCORRECT | REQUIRED CONFIRMATION | NOTES |
|---|---|---|---|---|
| F91 | Bring the child's health insurance card to visits | MEDIUM | Practice (organisational) | Refines F78. Open: every visit? without card? preferred term ("Gesundheitskarte" / "Versichertenkarte")? |
| F92 | Bring the vaccination booklet to vaccination appointments | MEDIUM | Practice (organisational) | Refines F78. Kept separate from F93. |
| F93 | No vaccination without the vaccination booklet | HIGH | Physician | Stronger claim; never merged with F92; not published on staff feedback alone. |
| F94 | Mask / infection guidance for visits | HIGH | Physician | Same question as F47 (existing website: "Kinder über 6 Jahre … Mundschutz", unconfirmed). Open: required or recommended, for whom, when, wording. |

## 13. Practice app / digital services candidates (Phase 10.2A)

Shared fields for F95–F100:
- **SOURCE:** practice-staff feedback, October 2026 (the website should mention the practice's app) — an input, not a confirmation of any app fact
- **STATUS:** TO_BE_CONFIRMED; nothing is inferred from "an app exists" (no name, vendor, platform, link or function is assumed; other practices and common apps are not sources — source-policy)
- **FEATURES AFFECTED:** future "Praxis-App" page in the Praxis area and a small card on "Praxis" (10.2B); never the start page, PRAXIS PULS or the mobile dock; staging approval draft `/review/praxis-app`
- **BOUNDARIES:** prescriptions / E-Rezept are a separate work package (10.3), even if the app turns out to support requests; the e-mail usage question (F18) stays separate

| ID | FACT CANDIDATE | RISK IF INCORRECT | REQUIRED CONFIRMATION | NOTES |
|---|---|---|---|---|
| F95 | The practice currently uses an app for families | MEDIUM | Practice | Still actively used? |
| F96 | Exact public app name and provider | MEDIUM | Practice | No name is published or inferred before confirmation |
| F97 | Platforms (iOS / Android / web) and exact store links | MEDIUM | Practice (+ link check) | No store badge or dummy link before verified URLs |
| F98 | Functions the practice actually uses (appointments, messages, prescriptions, documents, reminders, video consultation, other) | HIGH | Practice | Affects families' contact expectations; none pre-selected |
| F99 | Registration / access (account, practice code, invitation, QR code) | HIGH | Practice | A wrong setup instruction blocks families |
| F100 | Processing of personal / health data, operator, provider privacy notice, existing agreements | HIGH | Practice (+ legal review before launch) | Factual questions only; no compliance claim |

## 14. Prescription / E-Rezept process candidates (Phase 10.3A)

Shared fields for F101–F109:
- **SOURCE:** practice-staff feedback, October 2026 (prescription / E-Rezept requests occur regularly, possibly by e-mail; the practice already mentions something in e-mail replies / signature; the health card may matter) — an input, not a confirmation
- **STATUS:** TO_BE_CONFIRMED. The project does not know the practice's prescription process and infers nothing from general German E-Rezept practice (remote repeat prescriptions, quarterly card reading, immediate availability, app channel, controlled or private prescriptions, e-mail with medical details — none assumed)
- **FEATURES AFFECTED:** future "Rezepte" page in the Praxis area (10.3B); never the start page; staging approval draft `/review/rezepte`
- **WORDING PRINCIPLE:** a request ("Rezept anfragen") is not an issuance; the physician / practice decides whether a prescription is issued
- **NO FORM:** the website never collects prescription requests or patient data

| ID | FACT CANDIDATE | RISK | RATIONALE | RELATIONSHIP |
|---|---|---|---|---|
| F101 | Prescription requests are offered without a personal doctor contact | MEDIUM | A wrong yes/no sends families down a wrong path, but the care-relevant detail sits in F102–F108 | refines F80 |
| F102 | Which prescription types may be requested that way (repeat, first prescription, E-Rezept, paper, other) | HIGH | Implies which medication can be obtained without a consultation | refines F80; no list made by the project |
| F103 | Channels for requests: phone / e-mail / app / in person | HIGH | A wrong channel leaves a request unseen and a child without medication | app channel depends on F98 but the process is confirmed here |
| F104 | E-mail as an accepted use for prescription requests (incl. what to send / not send, response) | HIGH | Health data by e-mail; same concern as F18 | refines F18 for prescriptions only; F18 stays open otherwise |
| F105 | Health card must be read before a prescription is issued (rule, frequency, what if not) | HIGH | A wrong prerequisite blocks or delays medication | prescription-specific; does not confirm F91 (bring the card to every visit), nor vice versa |
| F106 | Processing time / when a prescription can be used | HIGH | A promised time that is not met can leave a child without medication | no time is published before confirmation |
| F107 | Result: E-Rezept, paper, pickup, notification | HIGH | Families must know where and how to redeem it | — |
| F108 | Information a request must / must not contain | HIGH | Directly about patient / health data | the project sets no required fields |
| F109 | Who may request (existing patients, guardians, adolescents, authorisation) | HIGH | Concerns identity and authorisation | no identity data is collected by the website |

## 15. Pricing / payment candidates (Phase 10.4A)

Shared fields for F110–F117:
- **SOURCE:** practice-staff feedback, October 2026 (a price list for selected services, e.g. Kita-Tauglichkeit / Bescheinigungen; information on payment methods; possibly no cash payment) — an input, not a confirmation
- **STATUS:** TO_BE_CONFIRMED. The project has no verified price list and infers nothing from other practices, fee schedules, web searches, old competitor sites or generic certificate fees
- **FEATURES AFFECTED:** future "Kosten & Selbstzahlerleistungen" page in the Praxis area (10.4B), linked from "Wobei können wir helfen?"; never the start page; staging approval draft `/review/kosten`
- **DEPENDENCY:** a public price item needs a confirmed SERVICE (F66–F74 / F111) AND a confirmed current PRICE (F112). A confirmed price never makes an unconfirmed service public; a confirmed service without a confirmed price may appear later without a price. Verification stays separate per fact
- **NO CLAIMS:** no VAT, fee-schedule, reimbursement, insurance-coverage or tax statement; a price does not make a service "Selbstzahlerleistung"
- **NO PAYMENT FUNCTION:** the website never takes payments or card data

| ID | FACT CANDIDATE | RISK | RATIONALE | RELATIONSHIP |
|---|---|---|---|---|
| F110 | A current price list exists and should be shown on the website | MEDIUM | Wrong only about whether a list is shown; amounts are covered by F112 | prerequisite for any price display |
| F111 | Which fee-based / self-pay services the practice offers | HIGH | Implies a service is offered and who pays for it | refines F66–F74 (esp. F69); F69 confirms no specific fee-based service |
| F112 | Exact current prices and their form (fixed, "ab", by effort, on request) | HIGH | A wrong amount is a concrete, money-relevant promise to families | needs F111 for the same service; stale prices governed by F117 |
| F113 | Kita-Tauglichkeit / Bescheinigung as a priced service (staff example), incl. exact service name | HIGH | Specific service + price; the old site listed "Kindergartentauglichkeit" (F69, 2020, unconfirmed) | instance of F111 + F112; no amount recorded |
| F114 | Accepted payment methods (card, credit card, cash, invoice, transfer, other) | MEDIUM | A wrong method is inconvenient at the counter but not care-relevant | cash handled separately in F115 |
| F115 | Cash payment is not accepted (scope, exceptions, alternative) | MEDIUM | A wrong "no cash" statement turns families away or misleads them | special case of F114; never published before confirmation |
| F116 | When and where payment happens (before / after / invoice, receipt, front desk) | MEDIUM | Process information; wrong steps confuse but do not endanger care | — |
| F117 | Price-list validity and who maintains it | MEDIUM | Without an owner prices go stale silently | proposal only: verification + lastVerified + reviewDue per price, review at least annually or on change |

## 16. Team & photos approval preparation (Phase 10.5A) — no new facts

The staging draft `/review/team` (content `src/content/team-review.ts`) asks the practice to confirm the existing entries; it creates **no new fact IDs**:
- **Used:** F11 (photo rights), F20–F23 (physicians, qualifications), F24 (trainee, status open), F26–F30 (staff names), F31 (completeness), F32 (role labels / heading), F33 (consent), F34 (photos / mapping)
- **Not proposed:** F25 stays OUTDATED_DO_NOT_PUBLISH (historical; not shown as a candidate)
- **Consent model:** name consent and photo consent are separate (F33). A person may be public without a photo; a photo needs person consent + image consent + confirmed rights (F11) — rule `decidePersonPhoto` in `src/domain/publication.ts`
- **Not consent:** appearing on the old website, an existing photo, staff feedback, employment, social-media presence
- **Statuses unchanged:** F23, F24, F31, F32, F33, F34, F11 TO_BE_CONFIRMED; staging visibility of working data is not publication

