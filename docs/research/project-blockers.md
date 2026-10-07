# Project Blockers

Phase: 00.5 — Research Acceptance Gate
Date: 2026-10-07
Fact IDs (F01 …) refer to [fact-status-register.md](fact-status-register.md). Rules: [source-policy.md](source-policy.md).

> **Clarification (Phase 01.5):** blockers gate *public release of a claim or feature*, not design or development. Work continues with safe fallbacks, marked mock data, disabled states and `TO_BE_CONFIRMED` markers. See [strategy-lock.md](../product/strategy-lock.md).

Classes:
- **LAUNCH BLOCKER** — must be resolved before the public launch.
- **FEATURE BLOCKER** — must be resolved before a specific feature goes live. The site may launch without that feature, or with its fail-safe fallback.
- **NICE TO HAVE** — useful, not critical.

`OUTDATED_DO_NOT_PUBLISH` facts are not blockers — they are resolved by **not** being published. They are listed once in §4 as an exclusion checklist.

Owner abbreviations: **P** = practice · **L** = legal reviewer · **T** = project team (verification against official third-party sources).

---

## 1. LAUNCH BLOCKERS

| ID | Blocker | Facts | Owner | Notes |
|---|---|---|---|---|
| LB-00 | **Practice sign-off of all HIGH-risk VERIFIED_CURRENT facts** (postcode/city, phone, physicians, regular hours, healthy-only window, Tuesday appointment session) | F14, F15, F20, F22, F35–F39, F41, F43 | P | Working data is likely correct, but high-risk facts go live only with a recorded confirmation (source-policy §6). |
| LB-01 | Official public practice name | F01 | P | Two variants in use. |
| LB-02 | Legal name and legal form (BAG, partners) | F02 | P, L | Required for Impressum and privacy controller. |
| LB-03 | Correct street spelling | F13 | P | "Bahnhofstraße" vs. "Bahnhofsstraße". |
| LB-04 | Responsible person(s) for Impressum | F03 | P, L | Missing. |
| LB-05 | Professional titles for Impressum and Team | F04, F23 | P, L | Dr. Böhme's titles ambiguous; Impressum lists one singular title. |
| LB-06 | Current legal references for Impressum | F08 | L | Old TMG/RStV wording must not be reused. |
| LB-07 | Privacy policy content (controller, DPO, hosting, processors) | F09, F10 | P, L | No privacy policy exists today. Also depends on technical decisions of later phases. |
| LB-08 | Current team list, display order, trainees on Team page | F31, F24 | P | Team page is in launch scope. |
| LB-09 | Consent to publish staff names and photos | F33 | P | Without consent: names/photos are not published. |
| LB-10 | Emergency information verified and approved | F57–F64 | T, P | All facility data, times and phones dated 2020. Verify against KV Sachsen-Anhalt and the institutions, then practice approval. Only 112 (F56) is usable without further verification. |
| LB-11 | Email usage policy for patient matters | F18 | P, L | Email address is shown at launch; parents need to know what not to send. |
| LB-12 | Image and logo usage rights (if existing assets are reused) | F11, F12 | P | Becomes non-blocking if no existing photos/logo are used. |

**Launch fallback rule:** if LB-10 is not fully resolved by launch, the Notfall page shows only confirmed entries plus 112 — never unverified facility data (source-policy §5). The launch itself is still blocked until at least the KV on-call service relevant for Hettstedt is verified or explicitly removed by the practice.

## 2. FEATURE BLOCKERS

### PRAXIS PULS (live status: open/closed, consultation type, acute consultation, closures)

| ID | Blocker | Facts | Owner |
|---|---|---|---|
| FB-01 | Acute consultation Monday — meaning of "ganztags" | F44 | P |
| FB-02 | Acute consultation Tue–Fri — end time per day, afternoons included? | F45 | P |
| FB-03 | Thursday afternoon consultation type | F46 | P |
| FB-04 | Meaning of "nur gesunde Patienten" window | F42 | P |
| FB-05 | Weekend closed confirmed | F40 | P |
| FB-06 | Public holidays / bridge days rule | F49 | P |
| FB-07 | Upcoming closures 2026/2027 entered | F54 | P |
| FB-08 | Telephone hours (for "telefonisch erreichbar" status) | F19 | P |
| FB-09 | Defined owner and update routine for closures and notices | — | P |

Until FB-01…FB-07 are resolved, PRAXIS PULS must not display any live status. Fallback: "Aktuelle Sprechzeiten ansehen" / "Praxis kontaktieren". FB-08 blocks only the phone-availability state.

### Vertretung (replacement practices during closures)

| ID | Blocker | Facts | Owner |
|---|---|---|---|
| FB-10 | Verified replacement practice directory (Kreuter/Fuchs relationship, Reich address, all phones/emails) | F53 | P, T |

Fallback: closure shown without replacement + "Bitte informieren Sie sich telefonisch." + emergency guidance.

### Aktuelle Hinweise (notices)

| ID | Blocker | Facts | Owner |
|---|---|---|---|
| FB-11 | Mask rule still current? Scope? | F47 | P |

Fallback: notice not shown.

### Leistungen (services)

| ID | Blocker | Facts | Owner |
|---|---|---|---|
| FB-12 | Confirmation of services list (2020) incl. insurer conditions for U10/U11/J2 and DMP participation | F66–F74 | P |

If the Leistungen page is part of launch scope (decision in Phase 01), FB-12 becomes a launch blocker. Unconfirmed services are not published.

### Termine / Kontakt CTAs

| ID | Blocker | Facts | Owner |
|---|---|---|---|
| FB-13 | Appointment booking channel(s) | F48 | P |
| FB-14 | New-patient acceptance and conditions | F77 | P |
| FB-15 | First-visit / newborn process | F78, F79 | P |
| FB-16 | Prescriptions, referrals, sick notes process | F80, F81 | P |

Fallback: phone number only, no process description.

### Notfall extension

| ID | Blocker | Facts | Owner |
|---|---|---|---|
| FB-17 | Inclusion and wording of 116117 | F57 | P, T |
| FB-18 | Pharmacy emergency link target | F65 | T |

(F57 is also covered by LB-10; listed here because it also drives PRAXIS PULS out-of-hours guidance.)

## 3. NICE TO HAVE

| ID | Item | Facts | Owner |
|---|---|---|---|
| NH-01 | Parking | F87 | P |
| NH-02 | Stroller access | F86 | P |
| NH-03 | Wheelchair accessibility details | F85 | P |
| NH-04 | Public transport tips | F88 | P |
| NH-05 | Building / entrance photography | — | P |
| NH-06 | Languages spoken | F89 | P |
| NH-07 | Video / phone consultation | F84 | P |
| NH-08 | Cancellation rules | F83 | P |
| NH-09 | Insurance / IGeL information | F82 | P |
| NH-10 | "Praxis" content (philosophy, rooms, physician bios) | F90, F76 | P |
| NH-11 | Staff role labels and section heading | F32 | P |
| NH-12 | New team photos / photo mapping | F34 | P |
| NH-13 | Fax still to be shown? | F16 | P |

Note: NH-03 is nice-to-have as *information*; the website itself must still be built accessibly.

## 4. Exclusion checklist — OUTDATED_DO_NOT_PUBLISH

These must not appear as current information anywhere on the new site (content, metadata, structured data, CMS seed data, redirects that land on them).

| Fact | Item |
|---|---|
| F08 | TMG / RStV legal references |
| F09 | Old privacy paragraph |
| F25 | Anne Horn as current physician in training |
| F50 | Summer closure 20.07.–07.08.2026 |
| F51 | Home teaser "Urlaub" |
| F52 | Replacement assignments July/August 2026 |
| F55 | 2020 Corona notice |
| F75 | "Hello world!" post |
| F76 | Empty "Praxis" page |

## 5. Gate summary

| Class | Count |
|---|---|
| Launch blockers | 13 (LB-00 … LB-12) |
| Feature blockers | 18 (FB-01 … FB-18) |
| Nice to have | 13 |
| Excluded outdated items | 9 |

Most blockers are answered by **one structured interview with the practice** (P). Third-party emergency verification (T) and legal review (L) run in parallel. A question list for that interview exists in [missing-information.md](missing-information.md).
