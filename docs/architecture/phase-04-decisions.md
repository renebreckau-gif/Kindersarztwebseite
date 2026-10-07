# Phase 04 Decisions

Phase: 04 — Content Model, Data Architecture & CMS Requirements
Date: 2026-10-07
Documents: [content-model.md](content-model.md) · [practice-pulse-logic.md](practice-pulse-logic.md) · [content-governance.md](content-governance.md) · [source-governance.md](source-governance.md) · [cms-requirements.md](cms-requirements.md) · [cms-comparison.md](cms-comparison.md) · [privacy-model.md](privacy-model.md) · [media-policy.md](media-policy.md)
Code: `src/domain/` (types, verification, time, PULS engine, publication rules) · tests: `npm test` → **75/75 pass** (59 PULS engine, 16 publication/time)

---

## 1. Review before commit

| Check | Finding | Resolution |
|---|---|---|
| Duplicate content ownership | Replacement contact data could be copied into closures | Closures only reference ReplacementPractice; Leistungen/Help topics share Service |
| Hard-coded practice facts | None in domain code; test data is synthetic and labelled | Legacy values may only be migrated as TO_BE_CONFIRMED |
| Medical overreach | Vaccination/U-exam types could imply personal advice | No child-specific fields; `officialAgeWindow` verbatim from source; physician approval required |
| Unverified facts as current | High-risk "verified" without dates | Engine treats verified-without-dates as unverified (tested) |
| Unsafe PULS inference | Weekend/holiday "closed" by absence | Absence ≠ closed; explicit closed weekdays and holiday policy (tested) |
| Timezone errors | Host-zone dependency | Explicit Europe/Berlin everywhere; DST, midnight and weekday tests |
| Manual-expiry dependencies | Notices/closures | Date-evaluated expiry; announcements require end date or explicit "unbefristet" |
| CMS complexity | Data model larger than editors' tasks | Task-oriented German navigation; technical model hidden |
| Staff usability | Verification jargon | Badges "bestätigt / zu bestätigen / veraltet"; plain messages |
| Privacy creep | Age selector, email | Ranges only; local-only future selector; email policy flagged |
| Patient-data collection | — | Not modelled anywhere |
| Media-rights ambiguity | Old photos, logo, AI imagery | REAL/PLACEHOLDER/AI_CONCEPTUAL classes with enforcement rules |
| Inconsistency with Phase 03 | R5 treated stale hours as unverified immediately | R5 refined (see §9) |

## 2. FINAL CORE CONTENT TYPES

Practice · Location · WeeklySchedule + OpeningHoursRule · ConsultationType · OpeningHourException · Closure (= Vacation; kinds VACATION, TRAINING, SHORT_NOTICE, OTHER) · ReplacementPractice · Announcement · EmergencyInformation · Doctor · TeamMember · Service · HelpTopic · AgeGroup · PreventiveExamination · VaccinationInformation · HealthEducationArticle · LearningExperience · MediaAsset · SourceReference · FactVerification (+ VerifiedValue) · HolidayCalendar (+ holiday policy) · FirstVisitItem · LegalText.

## 3. RECOMMENDED CMS

**Payload** (self-hosted in the EU, inside the existing Next.js app, PostgreSQL + object storage, under a maintenance agreement). Fallback: Sanity Growth.

## 4. WHY

- Keeps internal verification metadata, consent records and drafts on infrastructure we control (Sanity Free exposes published documents through public datasets; Growth costs per seat and keeps data in the vendor cloud).
- Server-side validation hooks can reuse `src/domain/` directly — publication safety is enforced, not just suggested.
- German admin translation in core; code-defined, field-level roles (restricted emergency role).
- No per-editor licence cost; MIT licence and own database limit vendor risk.
- Trade-off accepted explicitly: hosting, backups, updates and security become a contracted responsibility. Payload is under Figma ownership (verified: official announcements of 17 June 2025; open source and self-hosting remain supported). Future product direction under Figma ownership should be monitored.

## 5. PRAXIS PULS ARCHITECTURE

- Pure function `getPracticeStatus(now, data, options)` in `src/domain/practice-status.ts`; no I/O, explicit `Europe/Berlin`.
- Two stages: **day resolution** (closures → exceptions → holiday policy → weekly schedule; contradictions → UNKNOWN) and **status for now** (acute → closing soon → open → opening soon → closed with next opening).
- Fail-safe: any unverified, stale-beyond-grace, missing, conflicting or invalid input → UNKNOWN (indicator NONE, no next opening, actions "Sprechzeiten ansehen" + "Anrufen").
- Acute consultation only if both the ACUTE type and the rule are verified and inside opening hours; otherwise suppressed (never inferred).
- Public holidays: `REQUIRE_EXPLICIT_ENTRY` by default — a holiday without an entry yields UNKNOWN; switch to "closed on public holidays" only after the practice confirms that rule.
- Soon-states off until a threshold is agreed.
- Replacements: only verified, fresh, period-matching entries; otherwise `replacementFallback`.
- Not yet connected to UI or CMS.

## 6. TOP 5 DATA RISKS

1. **Acute rules remain unconfirmed** (FB-01…03) → ACUTE state unavailable; parents rely on the fallback.
2. **Holiday and weekend rules unconfirmed** (F40, F49) → frequent UNKNOWN on weekends/holidays until confirmed.
3. **Replacement directory quality** (F53) — third-party data with a history of errors.
4. **Emergency directory freshness** — 3-month reviews must actually happen, or entries disappear (safe, but thin).
5. **Legacy pre-fill mistaken for truth** — mitigated by TO_BE_CONFIRMED-only migration and source rank 0.

## 7. TOP 5 CMS RISKS

1. **Operational ownership** of a self-hosted Payload instance (backups, updates, security) not contracted.
2. **Vendor direction** — future product direction under Figma ownership should be monitored (roadmap/licensing).
3. **Editor UX drift** — default admin screens instead of the task-oriented German configuration.
4. **Validation gaps** — rules enforced only in the UI rather than server-side.
5. **Preview fidelity** — PULS preview must use the same engine as production, not a re-implementation.

## 8. TOP 5 CONTENT GOVERNANCE RISKS

1. **No named role holders** (FB-09) — reviews do not happen.
2. **Medical approval bottleneck** — one physician approving all medical/child content.
3. **Source monitoring lapses** (STIKO, G-BA updates) → medical content stale.
4. **"Unbefristet" overuse** for announcements → Heute drifts into a news feed.
5. **Holiday cover** — critical roles without a deputy during vacations (exactly when closures/replacements matter most).

## 9. TOP 5 PRIVACY / LEGAL REVIEW ITEMS

1. CMS/hosting provider, data location, DPA and sub-processors.
2. Email communication with parents (health data via email; F18, LB-11).
3. Staff consent records, withdrawal process, photo rights (F11, F33, LB-09, LB-12).
4. Log retention and whether any consent mechanism is needed after the final implementation.
5. Labelling of AI_CONCEPTUAL imagery and child-facing content in ENTDECKEN.

No claim of GDPR or legal compliance is made in any Phase 04 document.

## 10. ANY CHANGES REQUIRED TO PHASE 03

One refinement, applied:
- **[data-confidence-behavior.md](../ux/data-confidence-behavior.md) R5** — previously "stale = unverified" for all safety-critical categories; now: emergency and replacement data have no grace, opening hours stay public with an editor warning during a short grace period before falling back (stale but not contradicted ≠ false). Intervals in content-governance.md §4.

Clarifications (no change needed): Phase 03's "Vacation" is modelled as `Closure` with kinds; Phase 03's E-numbered entities map 1:1 to the content model; the PULS state list and visual families are unchanged.

No changes to the locked strategy.
