# Trust Model

Phase: 01 — Product Strategy
Date: 2026-10-07

Trust is a product feature. It is built from evidence, not from adjectives. This document defines what earns trust, how it is shown, and what destroys it.

Related: [source-policy.md](../research/source-policy.md), [fact-status-register.md](../research/fact-status-register.md), [anti-patterns.md](anti-patterns.md).

---

## 1. Trust sources (what earns trust)

| Source | How it appears in the product | Precondition |
|---|---|---|
| **Real doctors** | Names and roles of Nadine Probst and Dr. med. Elke Böhme | F20, F22 sign-off (LB-00) |
| **Verified qualifications** | Titles exactly as legally held | F21, F23 (LB-05) |
| **Real team** | Consented staff names and roles | F31, F33 (LB-08, LB-09) |
| **Real practice photography** | Rooms, team, entrance — never stock | Photo shoot + consent (NH-05, NH-12) |
| **Current information** | Structured, auto-expiring operational data | Data model C12 |
| **Last-verified dates** | "Stand: …" where it helps (see §3) | Confirmation records (source-policy §6) |
| **Clear sourcing** | Medical content names its official source | source-policy §4 |
| **Transparent placeholders** | Honest gaps instead of filler | §4 below |
| **No invented claims** | Nothing beyond the register | Editorial review |
| **Respect for privacy** | No tracking, minimal third parties, minimal consent friction, no personal data entry | Privacy by design (P9); consent requirements set by privacy review |
| **Consistency** | Same fact identical everywhere (single source) | C12 |

## 2. Trust levels of displayed information

| Level | Example | Display rule |
|---|---|---|
| **Practice-confirmed operational** | Hours, closures, replacements | Shown as fact; PRAXIS PULS may derive states |
| **Practice-confirmed stable** | Name, address, doctors, team | Shown as fact; no date needed in UI (date kept internally) |
| **Third-party verified** | Emergency directory, KV on-call times | Shown with "Stand: <date>" and, where useful, a link to the institution |
| **Official medical information** | U/J schedule, curated vaccination orientation | Shown with source name and "Stand: <date>"; governed per feature-priorities S03 |
| **Unconfirmed** (`TO_BE_CONFIRMED`) | Acute end time, parking | **Not shown**; neutral fallback |
| **Outdated** (`OUTDATED_DO_NOT_PUBLISH`) | 2026 summer closure, Corona notice | **Never shown** |

## 3. Last-verified dates — where and how

Show a visible "Stand" date where currency matters to the reader:
- Notfall page / emergency directory (each entry or the whole list)
- Medical/orientation content (U/J, vaccination orientation)
- Closures/Vertretung (date range itself serves as currency signal)

Do **not** clutter stable facts (address, names) with dates. All dates are maintained internally regardless.

If a "Stand" date passes its re-verification interval (to be agreed with the practice, source-policy §6), the entry is flagged for editors; safety-critical entries fall back to the neutral display rather than showing stale data.

## 4. Transparent placeholders

When an asset or fact is missing, the product is honest about it.

| Missing | Allowed | Not allowed |
|---|---|---|
| Team photo | Neutral, designed placeholder with name, optionally "Foto folgt" | Stock photo, AI-generated face, silhouette that implies a real photo |
| Practice room photos | Leave out the section | Stock interiors |
| Confirmed fact (e.g. parking) | Omit, or "Bitte fragen Sie uns telefonisch" where a user would expect an answer | A guessed answer |
| Physician bio | Name + verified title only | Generic biography |

Placeholders are part of the design system — they should look intentional, not broken.

## 5. Trust destroyers (zero tolerance)

1. Showing an expired closure, a past notice or an ended staff period as current.
2. PRAXIS PULS stating a wrong state ("Jetzt geöffnet" while closed; "Akutsprechstunde" when there is none).
3. A wrong phone number or replacement practice.
4. Emergency information that sends a family to a service that no longer exists or is closed.
5. Fake people, testimonials, or stock "team" images.
6. Unsourced or exaggerated medical claims.
7. Collecting data the family did not expect to give.
8. Child content that lies to children about what will happen.

Each of these is a launch-stopping defect, not a cosmetic bug.

## 6. Trust operations (people and process)

| Role | Responsibility |
|---|---|
| Practice (designated editor) | Keeps closures, notices, team current; confirms facts |
| Physician of the practice | Approves medical and child-facing content and emergency wording |
| Project team | Verifies third-party facts against official sources; maintains the register until handover |
| Legal reviewer | Impressum, Datenschutz, professional advertising rules |

Who the designated editor is and how often reviews happen: **TO_BE_CONFIRMED** (FB-09).

## 7. Professional-law note

Physician websites in Germany are subject to professional rules on advertising (Berufsordnung). This reinforces: factual information only, no comparative or superlative claims, no testimonials. Final assessment belongs to the legal reviewer; this note is not legal advice.
