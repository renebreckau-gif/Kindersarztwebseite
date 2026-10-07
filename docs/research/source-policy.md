# Source Policy

Phase: 00.5 — Research Acceptance Gate
Date: 2026-10-07

This policy defines which sources may establish a fact, how conflicts are handled, and what the public website does when a fact is uncertain. It applies to all later phases (strategy, content, CMS, PRAXIS PULS, editorial work).

---

## 1. Fact status model

Every material fact has exactly one of three states. Statuses are recorded in [fact-status-register.md](fact-status-register.md).

| Status | Meaning | May be published as current? |
|---|---|---|
| `VERIFIED_CURRENT` | Supported strongly enough to be used as working factual data. Does **not** replace practice sign-off where operational risk is high. | Yes, as working data. High-risk facts additionally require practice sign-off before launch (see [project-blockers.md](project-blockers.md), LB-00). |
| `TO_BE_CONFIRMED` | Missing, contradictory, unclear, old enough to need confirmation, or operationally / legally / safety sensitive. | **No specific claim.** Use the fail-safe fallback (section 5). |
| `OUTDATED_DO_NOT_PUBLISH` | Expired, superseded, obsolete, historical only, or contradicted by newer information. | **Never** as current information. May be kept internally as an example of data structure. |

Status changes:
- `TO_BE_CONFIRMED` → `VERIFIED_CURRENT` only through a source permitted in section 2 or 3, recorded per section 6.
- `VERIFIED_CURRENT` → `TO_BE_CONFIRMED` whenever a newer source contradicts it or the re-verification interval passes.
- Any time-bound fact → `OUTDATED_DO_NOT_PUBLISH` automatically after its end date.
- Nobody may change a status by inference ("it is probably still true", "it is usually like that").

## 2. Practice-specific facts

Examples: name, legal form, address, contact data, physicians, staff, qualifications, opening hours, consultation types, acute consultation, closures, replacement practices, services offered, appointment rules, new-patient policy, accessibility, parking.

| Rank | Source | Use |
|---|---|---|
| 1 — Primary | Information confirmed by the practice (named person, date, channel recorded). | Establishes `VERIFIED_CURRENT`. |
| 2 — Secondary working source | The current practice website kinderarztpraxis-probst.de. | Can establish `VERIFIED_CURRENT` only if the claim is consistent, not time-expired, not contradicted, and not in a high-risk category where it is old or ambiguous. |
| — Not a source | Assumptions, typical practice behaviour, other practices' websites, review portals, map services, directories (Jameda, Google Business, Doctolib listings, etc.). | May trigger a question to the practice, never establish a fact. |

Rules:
- If rank-2 sources contradict each other (e.g. two spellings of the street) → `TO_BE_CONFIRMED`.
- If rank 1 and rank 2 contradict → rank 1 wins; the old website value is `OUTDATED_DO_NOT_PUBLISH`.
- Agreement between two pages of the same website is **not** independent confirmation — they were maintained by the same people and may share the same error.
- A WordPress "last modified" date is page-level. It does not prove that a specific section of the page was reviewed on that date.

## 3. Third-party operational facts

Examples: emergency services, hospital emergency departments, KV on-call times, poison control, replacement practices' contact data, pharmacy emergency service.

| Rank | Source |
|---|---|
| 1 | The responsible institution itself (e.g. Kassenärztliche Vereinigung Sachsen-Anhalt for KV on-call services, the hospital's own website, the poison information centre). |
| 2 | The practice, confirming that it wants to refer patients there. |
| — | The old practice website is only a lead, not a source, for third-party facts. |

Both are required before emergency or replacement information is published: the institution's data must be current **and** the practice must approve the referral.

## 4. Medical and public-health information

Any general medical statement, recommendation, vaccination information, preventive check-up explanation, or symptom guidance.

Permitted authorities:
- Robert Koch-Institut (RKI)
- Ständige Impfkommission (STIKO)
- Gemeinsamer Bundesausschuss (G-BA) — e.g. Kinder-Richtlinie / U-Untersuchungen
- gesund.bund.de (Bundesministerium für Gesundheit)
- Bundesinstitut für Öffentliche Gesundheit (BIÖG, formerly BZgA)
- 116117 / Kassenärztliche Bundesvereinigung and Kassenärztliche Vereinigungen
- Official medical institutions and professional bodies (e.g. Ärztekammern, Berufsverband der Kinder- und Jugendärzte, Deutsche Gesellschaft für Kinder- und Jugendmedizin)
- Giftinformationszentren

Rules:
- No blogs, health magazines, forums, AI-generated summaries or commercial health portals as authority.
- Medical content is published only with the source and date recorded internally, and only after approval by a physician of the practice.
- The practice's own medical recommendations (e.g. mask rule) are practice-specific facts and follow section 2.
- The website does not give individual medical advice.

## 5. Fail-safe principle

> **WHEN IN DOUBT, DO NOT DISPLAY A SPECIFIC OPERATIONAL CLAIM.**

If a statement cannot be derived safely from `VERIFIED_CURRENT` data, the website shows a neutral, still-useful fallback instead of a guess.

| Situation | Never display | Display instead |
|---|---|---|
| Acute consultation status unknown or rules ambiguous | "Akutsprechstunde jetzt geöffnet" | "Aktuelle Sprechzeiten ansehen" or "Praxis kontaktieren" |
| Open/closed state cannot be computed (missing hours, unconfirmed holiday) | "Jetzt geöffnet" / "Jetzt geschlossen" | "Sprechzeiten ansehen" |
| Closure entered without confirmed replacement | Any replacement practice | "Bitte informieren Sie sich telefonisch." plus emergency guidance |
| Emergency facility data not verified | Facility name, times, phone | "Bei lebensbedrohlichen Notfällen: 112" and, if confirmed, 116117 |
| Phone hours unknown | "Telefonisch erreichbar bis …" | Phone number only |
| Notice without confirmed validity | The notice as current | Nothing |
| Service not confirmed | The service | Nothing (no placeholder text that reads like a fact) |

Additional rules:
- `112` for life-threatening emergencies must always be reachable and must never depend on dynamic or unverified data.
- No visible placeholder content that could be mistaken for real information (no "Lorem ipsum" doctors, sample hours, example phone numbers) on any publicly reachable URL.
- Data-driven status (PRAXIS PULS) defaults to the fallback when data is missing, stale, or conflicting — the fallback is the default, a specific claim is the exception.
- Fallback wording above is a working proposal; final German copy is defined in a later phase.

## 6. Recording a confirmation

Every change of status is recorded in the fact status register with:

- fact ID
- new value
- confirmed by (name + role at the practice, or institution + URL)
- channel (phone, email, in person, written document)
- date of confirmation
- re-verification due date (for time-sensitive and high-risk facts)

Re-verification intervals are **not yet agreed** and must be set with the practice. Working proposal for discussion only: emergency data every 3 months, opening hours and team every 6 months, services and legal data every 12 months, notices and closures by their own end date.

## 7. High-risk categories

Facts in these categories are `TO_BE_CONFIRMED` whenever they are old, ambiguous, or contradictory, and are never inferred:

- Emergency information
- Opening hours
- Acute consultation
- Vacation / closures
- Replacement practices
- Contact information
- Medical recommendations
