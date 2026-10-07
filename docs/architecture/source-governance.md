# Source Governance

Phase: 04
Date: 2026-10-07
Extends: [source-policy.md](../research/source-policy.md). Code: [`src/domain/source.ts`](../../src/domain/source.ts)

---

## 1. Source hierarchy

| Rank | Source type | Use |
|---|---|---|
| 5 | `PRACTICE_CONFIRMATION` | Strongest source for practice-specific facts (hours, people, services, closures, contact) |
| 5 | `LEGAL_REVIEW` | Impressum, Datenschutz, titles |
| 4 | `OFFICIAL_MEDICAL` | RKI / STIKO, G-BA, gesund.bund.de, BIÖG (kindergesundheit-info.de, infektionsschutz.de) |
| 4 | `OFFICIAL_SERVICE` | 116117 / KBV, KV Sachsen-Anhalt, hospitals' own sites, poison information centres, official 112 information |
| 1 | `OTHER` | Hint only |
| 0 | `PRACTICE_WEBSITE_LEGACY` | Working source; can pre-fill as TO_BE_CONFIRMED, never verify |

Practice-specific facts need rank 5. Medical/public-health content needs rank 4 **and** physician approval. Third-party operational facts (emergency, replacement practices) need rank 4 (or the replacement practice's own confirmation) **and** the practice's agreement to refer there.

## 2. How official sources are stored

Each SourceReference stores: publisher, title, URL, `publishedOn`/`version` as stated by the source (e.g. "Epidemiologisches Bulletin 4/2026", "Impfkalender 2026"), `lastChecked`, `official: true`. Content entities reference sources by ID — a source update is made once and all dependent entities become visible in the review queue.

Note: official URLs change (Phase 02: impfen-info.de now redirects to infektionsschutz.de). Link checks are part of monitoring.

## 3. Detecting and reviewing source changes

| Source | Change signal | Check (proposal) | Action |
|---|---|---|---|
| STIKO recommendations | New Epidemiologisches Bulletin / Impfkalender version | Monthly check by PT; immediately on publication | All VaccinationInformation referencing the source → `reviewDue = today`; reduced to official link until Ä approves |
| G-BA Kinder-Richtlinie (U/J) | Richtlinie amendment | Quarterly | PreventiveExamination entries → review |
| BIÖG / gesund.bund | Page changes | Quarterly link check | Update URLs, review text |
| KV / 116117 on-call services | Service changes | Every 3 months (emergency interval) | EmergencyInformation review |
| Hospitals (paediatric emergency) | Service / phone changes | Every 3 months | EmergencyInformation review |
| Replacement practices | Before each closure | Per use | Re-confirm |
| Public holidays | Yearly | Each autumn for next year | HolidayCalendar entry |

Automatic detection can be limited to link checks (HTTP status, redirects) — content changes need a human. No third-party scraping of patient-facing services is required.

## 4. How medical content becomes stale

- Time: `reviewDue` (proposal 12 months) with grace 0.
- Event: the referenced source publishes a new version → all dependent entities are flagged immediately.
- Public behaviour while stale: curated detail hidden, general explanation + official link + "Stand" remain (strategy-lock 2.3).

## 5. How practice-specific facts are confirmed

1. Editor (or PT) records the confirmation: channel (phone, email, in person, document), confirming role, date.
2. Creates/updates a `PRACTICE_CONFIRMATION` SourceReference and sets `VERIFIED_CURRENT` with `lastVerified`, `verifiedBy`, `reviewDue`.
3. The first launch confirmation round follows [missing-information.md](../research/missing-information.md) and the blockers in [project-blockers.md](../research/project-blockers.md).

## 6. Contradictory sources

| Case | Rule |
|---|---|
| Two sources of different rank disagree | Higher rank wins; lower-rank value marked OUTDATED or TO_BE_CONFIRMED with note |
| Same rank disagrees (e.g. two practice statements) | Fact → TO_BE_CONFIRMED; public fallback; editor resolves |
| Legacy website vs. anything else | Legacy loses; never used to override |
| Official source vs. practice (medical) | Official recommendation is shown as such; practice may add its own note ("Sprechen Sie uns an"); no contradiction is published |
| Third party vs. practice (e.g. KV hours vs. practice's emergency page) | Institution's data wins for the facts; practice decides whether to refer |

Contradiction always reduces confidence; age alone only triggers review.

## 7. 112

112 is the EU-wide emergency number. Before launch, its EmergencyInformation entry gets an `OFFICIAL_SERVICE` source reference (official EU/German authority information on 112). Because the number is legally fixed and safety-critical, the public UI always renders the 112 sentence (UX rule R7) even if the CMS entry were missing — this is the only content with a code-level fallback, and it is justified by the official status of the number, not by the legacy website.
