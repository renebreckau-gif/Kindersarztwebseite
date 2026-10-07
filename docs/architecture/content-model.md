# Content Model

Phase: 04 — Content Model, Data Architecture & CMS Requirements
Date: 2026-10-07
Code: [`src/domain/content-types.ts`](../../src/domain/content-types.ts), [`verification.ts`](../../src/domain/verification.ts), [`source.ts`](../../src/domain/source.ts)
Builds on: [content-ownership-map.md](../ux/content-ownership-map.md) (entities E1–E17), [data-confidence-behavior.md](../ux/data-confidence-behavior.md), [fact-status-register.md](../research/fact-status-register.md)

**No practice fact is hard-coded anywhere.** All values (hours, names, numbers, addresses, emergency entries) are content, entered and verified in the CMS. Test fixtures in `src/domain/__tests__/` are synthetic and labelled as such.

---

## 0. Cross-cutting building blocks

### FactVerification
| Field | Type | Req. | Notes |
|---|---|---|---|
| `status` | `VERIFIED_CURRENT` \| `TO_BE_CONFIRMED` \| `OUTDATED_DO_NOT_PUBLISH` | ✔ | The only three confidence states |
| `lastVerified` | LocalDate | high-risk ✔ | Europe/Berlin calendar date |
| `verifiedBy` | string | high-risk ✔ | Name + role or institution; internal only |
| `reviewDue` | LocalDate | high-risk ✔ | Triggers review; see freshness |
| `sourceIds` | SourceReference[] | ✔ (may be empty for TBC) | Provenance |
| `internalNotes` | string | – | Never public |

**Freshness** (derived, never stored): `CURRENT` · `REVIEW_DUE` (old but not contradicted, within grace) · `REVIEW_EXPIRED` · `UNVERIFIED` · `OUTDATED`. Grace per category — see [content-governance.md](content-governance.md) §4. *Old is not false*: age triggers review; only contradiction or explicit marking reduces confidence.

Two patterns:
- **Entity-level** `verification` (most types).
- **Field-level** `VerifiedValue<T>` where single fields have independent confidence (e.g. street spelling F13 vs. postcode F14; consent; "practice performs this U-examination" F67).

### SourceReference
Reusable provenance record (see [source-governance.md](source-governance.md)): `type` (PRACTICE_CONFIRMATION, OFFICIAL_MEDICAL, OFFICIAL_SERVICE, LEGAL_REVIEW, PRACTICE_WEBSITE_LEGACY, OTHER), `title`, `publisher`, `url?`, `publishedOn?`, `version?`, `lastChecked`, `official`, `confirmation?` (channel + confirming role), `notes?`. The legacy website is type `PRACTICE_WEBSITE_LEGACY` and has rank 0 — it can never verify a fact on its own.

### LocalDate / LocalTime
All dates are Europe/Berlin calendar dates (`YYYY-MM-DD`), all times wall-clock `HH:MM`. Conversion to instants happens only in the domain layer with an explicit zone.

---

## 1. Practice (singleton) — E1

- **PURPOSE:** Central identity and contact data.
- **FIELDS:** `displayName` VerifiedValue<string> ✔ · `officialName`, `legalName`, `legalForm` VerifiedValue<string> – · `phone` VerifiedValue<string> ✔ · `fax`, `email`, `emailUsageNote`, `telephoneHours` VerifiedValue<string> – · `website` string – · `description` VerifiedValue<RichText> – · `locationId` → Location ✔ · `internalNotes` –
- **RELATIONSHIPS:** 1 → Location.
- **PUBLICATION RULES:** Each field independently; unverified fields omitted. Public name / phone / address are launch blockers (LB-00…04): the site does not launch without them.
- **VERIFICATION RULES:** PRACTICE_CONFIRMATION required; legal fields + LEGAL_REVIEW.
- **EXPIRY RULES:** None; review interval (proposal 12 months, grace 90 days).
- **CMS EDITOR NOTES:** "Praxisdaten" — one form; each field shows its confirmation badge.
- **PUBLIC OUTPUT:** Header, dock (phone), footer, Kontakt, Neu bei uns, Impressum, structured data.

## 2. Location — E1

- **PURPOSE:** Where the practice is and how to get in.
- **FIELDS:** `street`, `postalCode`, `city` VerifiedValue ✔ · `coordinates` – · `entrance`, `floor`, `lift`, `stepFreeAccess`, `strollerAccess`, `parking`, `publicTransport`, `routeNotes` VerifiedValue – (absent until verified)
- **RELATIONSHIPS:** Practice → Location.
- **PUBLICATION RULES:** Convenience fields shown only when verified; absent fields render nothing (no "nicht bekannt"). Accessibility is **never** defaulted to true.
- **VERIFICATION RULES:** Practice confirmation; ideally on-site check for access facts.
- **EXPIRY:** Review 12 months.
- **CMS NOTES:** "Anfahrt & Zugang" — optional fields clearly marked "nur ausfüllen, wenn bestätigt".
- **PUBLIC OUTPUT:** Kontakt & Anfahrt, Neu bei uns (blocks 1 and 6), route link, structured data.

## 3. OpeningHours = WeeklySchedule + OpeningHoursRule — E2

- **PURPOSE:** The regular week as structured rules (never a text blob).
- **FIELDS (WeeklySchedule):** `rules` OpeningHoursRule[] ✔ · `confirmedClosedWeekdays` IsoWeekday[] ✔ · `verification` ✔
- **FIELDS (OpeningHoursRule):** `id` ✔ · `weekday` 1–7 ✔ · `start`, `end` LocalTime ✔ (end > start; cross-midnight not supported) · `consultationType` code ✔ · `validFrom`, `validUntil` LocalDate – · `publicNote` – · `verification` ✔
- **RELATIONSHIPS:** Rule → ConsultationType (by code).
- **PUBLICATION RULES:** A weekday without rules is **not** closed unless listed in `confirmedClosedWeekdays` (F40). Overlapping non-acute rules → conflict → PULS UNKNOWN. Future-dated rules (`validFrom`) take effect automatically.
- **VERIFICATION RULES:** Practice confirmation; both schedule and each rule must be verified with dates.
- **EXPIRY:** `validUntil` per rule; review 6 months (proposal), grace 60 days, after that PULS → UNKNOWN.
- **CMS NOTES:** "Sprechzeiten" — week grid editor: per weekday add time slots, choose type from a dropdown; "Ruhetag" toggle per weekday; preview of PULS for a chosen date.
- **PUBLIC OUTPUT:** PULS everywhere, Heute, Sprechzeiten, Kontakt summary, structured data (`openingHoursSpecification` only from verified rules).

## 4. ConsultationType — E3

- **PURPOSE:** Defines which kinds of consultation exist and how they are explained to parents.
- **FIELDS:** `code` (GENERAL, ACUTE, APPOINTMENT, HEALTHY_ONLY, OTHER) ✔ · `label` ✔ · `explanation` – · `verification` ✔
- **RELATIONSHIPS:** Referenced by rules and exceptions.
- **PUBLICATION RULES:** A rule of type ACUTE produces the ACUTE_CONSULTATION state only if the ACUTE type **and** the rule are verified (FB-01…03). Codes do not imply the practice uses them.
- **VERIFICATION:** Practice + physician for explanations.
- **EXPIRY:** Review with schedule.
- **CMS NOTES:** "Sprechstundenarten" — rarely edited.
- **PUBLIC OUTPUT:** Labels in Sprechzeiten, PULS detail (sub-state), explanations on P-11.

## 5. OpeningHourException — E4

- **PURPOSE:** Date-bound changes to hours (changed hours, holiday hours, closed day).
- **FIELDS:** `id` ✔ · `kind` SPECIAL_HOURS \| CLOSED ✔ · `startDate`, `endDate` LocalDate ✔ (inclusive) · `intervals` [{start,end,consultationType}] (✔ for SPECIAL_HOURS) · `reason` – · `publicMessage` – · `priority` number ✔ (default 1) · `verification` ✔
- **RELATIONSHIPS:** Overrides WeeklySchedule for its dates.
- **PUBLICATION RULES:** Unverified exception covering today → PULS UNKNOWN (never ignored silently). Overlap: higher priority wins; equal priority with different content → UNKNOWN + editor conflict. SPECIAL_HOURS overlapping an active Closure → UNKNOWN (contradiction).
- **VERIFICATION:** Practice confirmation with dates.
- **EXPIRY:** Automatic after `endDate` — no manual removal.
- **CMS NOTES:** "Sonderöffnungszeiten" — date picker, "geschlossen" or time slots, short public message; publish blocked on conflict.
- **PUBLIC OUTPUT:** PULS SPECIAL_HOURS / CLOSED, Heute, Sprechzeiten "#besondere-zeiten".

## 6. Vacation = Closure — E5

- **PURPOSE:** Planned or short-notice absence of the practice (vacation, training, other, short notice) with replacement references.
- **FIELDS:** `id` ✔ · `kind` VACATION \| TRAINING \| SHORT_NOTICE \| OTHER ✔ · `startDate`, `endDate` ✔ · `announceFrom` – · `publicMessage` – · `replacements` [{replacementPracticeId, from, until, note?}] – · `emergencyInformationIds` – · `verification` ✔
- **RELATIONSHIPS:** → ReplacementPractice (n), → EmergencyInformation (n). **No contact data stored inside the closure.**
- **PUBLICATION RULES:** Active + verified → VACATION / TEMPORARILY_CLOSED. Unverified covering today → UNKNOWN. Announced as upcoming between `announceFrom` and `startDate` only if verified. Replacements shown only for the matching sub-period and only if the ReplacementPractice is verified and fresh; otherwise phone fallback.
- **VERIFICATION:** Practice confirmation.
- **EXPIRY:** Automatic after `endDate`; disappears from all current views the next day (no archive needed in V1; history kept internally).
- **CMS NOTES:** "Urlaub & Schließzeiten" — wizard: Zeitraum → Art → Vertretung je Woche auswählen (from directory) → Vorschau. Editor sees "Endet automatisch am …".
- **PUBLIC OUTPUT:** PULS, Heute `#vertretung`, Sprechzeiten (upcoming closures).

## 7. ReplacementPractice — E6

- **PURPOSE:** Reusable directory of replacement practices (high-risk third-party data).
- **FIELDS:** `id` ✔ · `practiceName` ✔ · `contactPersons` string[] ✔ · `street`, `postalCode`, `city` ✔ · `phone` ✔ · `email`, `website`, `publicNote` – · `verification` ✔ (dates required)
- **RELATIONSHIPS:** Referenced by Closure assignments.
- **PUBLICATION RULES:** Never public unless verified and within review interval (grace 0). The old site's errors (F52/F53) are the reason: no data is imported from it.
- **VERIFICATION:** The replacement practice itself (phone/website) + practice confirmation of the arrangement.
- **EXPIRY:** Review before each use; proposal: reviewDue ≤ 6 months.
- **CMS NOTES:** "Vertretungspraxen" — list with badge "Prüfung fällig"; message "Diese Vertretungspraxis muss erneut bestätigt werden."
- **PUBLIC OUTPUT:** Heute `#vertretung`, PULS VACATION action.

## 8. Announcement — E8

- **PURPOSE:** Short, time-bound practice notices — not a news archive.
- **FIELDS:** `id` ✔ · `category` INFO \| IMPORTANT \| URGENT ✔ · `title` ✔ · `shortText` ✔ · `fullText` – · `validFrom` ✔ · `validUntil` LocalDate \| OPEN_ENDED ✔ · `priority` ✔ · `homepageHighlight` boolean ✔ · `published` ✔ · `verification` ✔
- **PUBLICATION RULES:** Visible only if verified, published, and `validFrom ≤ today ≤ validUntil`. OPEN_ENDED must be chosen explicitly and shows a recurring review reminder. At most one homepage highlight at a time (highest priority).
- **EXPIRY:** Automatic after `validUntil`. No public archive in V1.
- **CMS NOTES:** "Aktuelle Meldung" — 4 fields + dates; message "Diese Meldung endet automatisch am {Datum}."
- **PUBLIC OUTPUT:** Heute, Aktuelle Hinweise (P-12), PULS reason line (when linked).

## 9. EmergencyInformation — E9

- **PURPOSE:** Safety-critical emergency directory.
- **FIELDS:** `id` ✔ · `type` IMMEDIATE_EMERGENCY \| MEDICAL_ON_CALL \| PAEDIATRIC_EMERGENCY_DEPARTMENT \| POISON_CONTROL \| PHARMACY_EMERGENCY \| PRACTICE_CONTACT ✔ · `name` ✔ · `description` – · `whenToUse` ✔ · `phone` – · `address` – · `availability` {always, text?} – · `sourceUrl` – · `priority` ✔ · `publicVisible` ✔ · `verification` ✔ (dates + official source required)
- **PUBLICATION RULES:** Visible only if verified and before `reviewDue` (grace 0). **Old emergency data from the existing website is not imported** (all dated 2020). 112 is stored as an entry like any other, backed by an official source (EU emergency number), not hard-coded — but the UI guarantees the 112 sentence is always rendered (R7) with a static fallback if the entry is missing.
- **EXPIRY:** Review interval proposal 3 months; editor warning after 90 days without check; hidden after reviewDue.
- **CMS NOTES:** "Notfallinformationen" — restricted role; message "Diese Notfallinformation wurde seit {n} Tagen nicht geprüft."
- **PUBLIC OUTPUT:** Notfall (P-15), Heute when closed, PULS CLOSED action, closure highlights.

## 10. Doctor — E10

- **PURPOSE:** Physicians of the practice.
- **FIELDS:** `id` ✔ · `name` ✔ · `professionalTitles` string[] ✔ (exactly as legally held) · `specialties`, `additionalQualifications` string[] ✔ (may be empty) · `role` – · `shortBio` – · `photo` {mediaAssetId, alt} – · `displayOrder` ✔ · `active` ✔ · `publicationConsent` VerifiedValue<boolean> ✔ · `verification` ✔
- **PUBLICATION RULES:** Shown only if active, consent verified = true, and person verified. Photo only if the MediaAsset is REAL with consent. No fictional or AI-generated doctors.
- **EXPIRY:** Review 12 months; `active=false` removes immediately.
- **CMS NOTES:** "Ärztinnen" — titles field hint: "genau wie im Impressum".
- **PUBLIC OUTPUT:** Ärztinnen (P-31), Neu bei uns, Impressum titles (after legal review).

## 11. TeamMember — E10

- **PURPOSE:** Practice staff.
- **FIELDS:** `id` ✔ · `name` ✔ · `role` ✔ · `jobTitle` – · `shortText` – · `photo` – · `displayOrder` ✔ · `active` ✔ · `publicationConsent` ✔ · `verification` ✔
- **PUBLICATION / EXPIRY / NOTES:** As Doctor. The old team list is not assumed current (F31).
- **PUBLIC OUTPUT:** Team (P-32), Neu bei uns.

## 12. Service — E11

- **PURPOSE:** What the practice provides (single source for "Leistungen" and "Wobei können wir helfen?").
- **FIELDS:** `id` ✔ · `name` ✔ · `plainDescription` ✔ · `ageGroups` ✔ · `relatedPreventiveExaminationIds`, `relatedVaccinationIds` – · `displayOrder` ✔ · `verification` ✔
- **PUBLICATION RULES:** Only verified services (F66–F74). No invented services, no "auf Anfrage".
- **EXPIRY:** Review 12 months.
- **CMS NOTES:** "Leistungen".
- **PUBLIC OUTPUT:** P-33, age pages ("In der Praxis"), Neugeboren.

## 13. HelpTopic

- **PURPOSE:** Parent-language entry point that groups services or points to guidance — **no diagnostic logic**.
- **FIELDS:** `id` ✔ · `label` ✔ (e.g. "Mein Kind ist krank") · `intro` – · `serviceIds` ✔ · `guidance` HOURS \| CALL \| EMERGENCY – · `displayOrder` ✔
- **PUBLICATION RULES:** Shown only if at least one referenced service is public, or if it carries operational guidance (e.g. "Mein Kind ist krank" → Sprechzeiten + Anrufen). No verification of its own: it contains no facts, only routing.
- **CMS NOTES:** "Wobei können wir helfen?" — choose services from a list.
- **PUBLIC OUTPUT:** P-33 entry chips.

## 14. AgeGroup — E14

- **PURPOSE:** The four locked ranges 0–2, 3–6, 7–12, 13–17.
- **FIELDS:** `id` ✔ · `label` ✔ · `minYears`, `maxYears` ✔ · `intro` ✔
- **RELATIONSHIPS:** Referenced by Service, PreventiveExamination, VaccinationInformation, HealthEducationArticle. The age page is **assembled** from these references — no duplicated content.
- **PUBLICATION RULES:** Always public (no facts beyond the range itself); content blocks follow their own rules.
- **Privacy:** No birthdate, no child profile — selecting a range is navigation, not data.
- **PUBLIC OUTPUT:** Mein Kind pages, Growing Mobile age instrument.

## 15. PreventiveExamination — E12

- **PURPOSE:** U/J examinations, curated from official sources.
- **FIELDS:** `id` ✔ · `name` ✔ · `officialAgeWindow` ✔ (verbatim from source) · `ageGroups` ✔ · `shortExplanation` ✔ · `about` – · `offeredByPractice` VerifiedValue<boolean> – (F67) · `approvedBy` (physician) ✔ for publication · `sourceIds` ✔ (official) · `verification` ✔
- **PUBLICATION RULES:** Medical category: verified, physician-approved, official source, before reviewDue — else entry reduced to name + official link. Never personalised ("Ihr Kind braucht …").
- **EXPIRY:** On source change or reviewDue (proposal 12 months).
- **PUBLIC OUTPUT:** Vorsorge (P-25), age pages, Neugeboren.

## 16. VaccinationInformation — E13

- **PURPOSE:** Curated explanation + official source + update governance (strategy-lock 2.3).
- **FIELDS:** `id` ✔ · `title` ✔ · `ageGroups` ✔ · `protectsAgainst` ✔ · `whyAtThisAge` ✔ · `sourceVersionLabel` ✔ (e.g. "STIKO-Empfehlungen 2026") · `approvedBy` ✔ · `sourceIds` ✔ · `verification` ✔
- **Explicitly not modelled:** vaccination history, individual status, recommendation per child, patient records.
- **PUBLICATION RULES:** As medical; overdue → general explanation + official link only.
- **EXPIRY:** On new STIKO recommendations (source monitoring) or reviewDue.
- **PUBLIC OUTPUT:** Impfungen (P-26), age pages, Neugeboren.

## 17. HealthEducationArticle

- **PURPOSE:** General educational content (Phase 2 topics: Entwicklung, Ernährung, Schlaf, Bewegung).
- **FIELDS:** `id`, `slug`, `title`, `summary`, `body` ✔ · `ageGroups`, `topic` ✔ · `approvedBy` (medical reviewer) ✔ · `sourceIds` ✔ · `published` ✔ · `verification` ✔
- **PUBLICATION RULES:** Every medical claim traceable to a source; physician approval; reviewDue.
- **PUBLIC OUTPUT:** Age pages (Phase 2).

## 18. LearningExperience — E16

- **PURPOSE:** ENTDECKEN chapters (Mein Arztbesuch V1; future chapters).
- **FIELDS:** `id`, `slug`, `title` ✔ · `status` AVAILABLE \| IN_PREPARATION ✔ · `audienceAge` ✔ · `parentIntro` ✔ · `learningObjective` ✔ · `steps` [{id,title,text,mediaAssetIds,audioAssetId?}] ✔ · `approvedBy` ✔ · `sourceIds` · `verification` ✔
- **PUBLICATION RULES:** AVAILABLE + approved → chapter page; IN_PREPARATION → listed as non-interactive, no URL.
- **PUBLIC OUTPUT:** Entdecken (P-40, P-41).

## 19. MediaAsset

- **PURPOSE:** Every image/audio/video/3D asset with provenance and rights.
- **FIELDS:** `id` ✔ · `class` REAL \| PLACEHOLDER \| AI_CONCEPTUAL ✔ · `kind` ✔ · `purpose` ✔ · `file` ✔ · `alt` (✔ for informative images) · `caption`, `credit` – · `rightsOwner` ✔ · `rightsUntil` – · `aiGenerated` ✔ · `depictsRealPractice` ✔ · `peopleDepicted` [{name?, consent}] ✔ · `internalNotes` –
- **PUBLICATION RULES:** See [media-policy.md](media-policy.md). PLACEHOLDER never on production pages; AI_CONCEPTUAL never attached to Doctor/TeamMember/Location; expired rights → unpublished.
- **PUBLIC OUTPUT:** Any page.

## 20. Additional types (genuinely required)

| Type | Why | Key fields |
|---|---|---|
| **WeeklySchedule** | Container that makes "closed weekday" an explicit, verified fact (absence ≠ closed) | rules, confirmedClosedWeekdays, verification |
| **HolidayCalendar** + `holidayPolicy` | Public holidays as data; policy decides behaviour (see practice-pulse-logic §6) | year, region DE-ST, dates; policy REQUIRE_EXPLICIT_ENTRY \| CLOSED_ON_PUBLIC_HOLIDAYS (verified) |
| **FirstVisitItem** | "Neu bei uns?" items (what to bring, booking, arrival) are facts with their own confirmation (F77–F88) | block, title, text, verification |
| **LegalText** | Impressum / Datenschutz / Barrierefreiheit, legally reviewed | id, body, reviewedBy, verification |

## 21. Deliberately not modelled

Patient, child profile, birthdate, appointment, symptom, vaccination record, prescription, upload, contact-form submission, analytics profile. See [privacy-model.md](privacy-model.md).

## 22. Duplication check

| Shown in several places | Single source |
|---|---|
| Hours / status | WeeklySchedule + exceptions + closures → `getPracticeStatus` |
| Contact data | Practice + Location |
| Replacement contact data | ReplacementPractice (closures only reference it) |
| Emergency entries | EmergencyInformation |
| Leistungen & "Wobei können wir helfen?" | Service (+ HelpTopic as routing only) |
| Age pages | Assembled from tagged entities |
| Physician titles in Impressum | Doctor.professionalTitles |
