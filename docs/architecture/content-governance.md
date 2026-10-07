# Content Governance

Phase: 04
Date: 2026-10-07
Code: [`src/domain/verification.ts`](../../src/domain/verification.ts), [`src/domain/publication.ts`](../../src/domain/publication.ts)

Principle: **do not rely on one person remembering things.** The system expires, warns, blocks and falls back; people confirm.

---

## 1. Roles

| Role | Who (to be named by the practice) | Responsibilities |
|---|---|---|
| **Redaktion (E)** | Designated practice staff member(s) | Closures, exceptions, announcements, team, services, first-visit items |
| **Ärztliche Freigabe (Ä)** | A physician of the practice | Medical content (U/J, vaccination, articles), ENTDECKEN, emergency wording, consultation-type explanations |
| **Projektteam (PT)** | Agency / developer until handover | Third-party verification (emergency, replacement practices), source monitoring, holiday calendar, technical review |
| **Rechtliche Prüfung (L)** | Legal reviewer | Impressum, Datenschutz, Barrierefreiheit, professional titles |
| **Admin** | Project team / one practice person | Roles, media rights, schedule structure |

Who holds each role and the review intervals are open decisions (FB-09).

## 2. Responsibility matrix

| Activity | E | Ä | PT | L |
|---|---|---|---|---|
| Create operational content (hours, exceptions, closures, notices) | **R** | – | support | – |
| Verify practice facts | **R** (practice confirmation) | for medical facts | records sources | – |
| Medical review | – | **R** | sources | – |
| Operational review (schedule, contact) | **R** | – | reminders | – |
| Expiry | system | system | – | – |
| Emergency information review | confirms referral | **R** wording | **R** data vs. institutions | – |
| Replacement practices | **R** arrangement | – | **R** data check | – |
| Media rights & consent | **R** consent | – | **R** metadata | advice |
| Source updates (STIKO, G-BA …) | – | **R** approval | **R** monitoring | – |
| Legal texts | – | – | – | **R** |

R = responsible. "system" = automated by the content model/engine.

## 3. Publication rules (deterministic)

| Situation | Public result | Implemented in |
|---|---|---|
| `OUTDATED_DO_NOT_PUBLISH` | Never public | `decidePublication` → BLOCKED |
| `TO_BE_CONFIRMED` | Not public as fact; slot fallback | → FALLBACK |
| `VERIFIED_CURRENT`, before reviewDue | Public | → PUBLIC |
| Verified, reviewDue passed, within grace | Public + editor warning | → PUBLIC_WITH_WARNING |
| Verified, beyond grace | Fallback (high-risk) | → FALLBACK |
| Announcement past `validUntil` / before `validFrom` | Not current | `decideAnnouncement` |
| Closure past `endDate` | Not current | engine (date comparison) |
| Inactive Doctor/TeamMember | Not shown as current staff | `decidePerson` |
| Missing publication consent | Not shown | `decidePerson` |
| Conflicting opening rules | PULS UNKNOWN | engine |
| Stale replacement practice | Hidden + fallback | engine |
| Stale emergency entry | Hidden (112 sentence remains) | `decideEmergency` |

## 4. Freshness policy (proposal — intervals to be agreed)

| Category | Review interval (proposal) | Grace after reviewDue | After grace |
|---|---|---|---|
| Opening hours / consultation types | 6 months | 60 days (public + warning) | PULS UNKNOWN |
| Exceptions / closures | time-bound (end date) | 0 | n/a — must be verified when entered |
| Replacement practices | before each use, max. 6 months | 0 | hidden + fallback |
| Emergency information | 3 months | 0 | hidden (112 remains) |
| Practice contact | 12 months | 90 days | fallback / launch-blocker logic |
| Persons | 12 months | 90 days | hidden |
| Medical content | 12 months **or** on source change | 0 | reduced to official link |
| Editorial | 24 months | 365 days | warning only |

**Stale but not contradicted** (REVIEW_DUE) stays public with an internal warning for low/medium-risk and for opening hours within grace. **Unsafe/unverified** (REVIEW_EXPIRED for high-risk, TO_BE_CONFIRMED) falls back publicly. **Explicitly outdated** is blocked.

Contradiction (e.g. practice reports new hours by phone, CMS still old) → editor sets the affected record to TO_BE_CONFIRMED immediately → public fallback until re-entered.

## 5. System safeguards against human error

1. Required end dates for announcements (or explicit "unbefristet" with recurring reminder).
2. Automatic expiry of closures, exceptions, announcements, training periods.
3. Publish blocked on: conflicting exceptions, closures without end date, SPECIAL_HOURS overlapping a closure, people without consent.
4. Review queue ("Prüfliste") sorted by due date; weekly email digest to role holders (later; no third-party tracking).
5. Holiday warnings 30 days ahead.
6. Preview of PULS for any date before publishing.
7. Audit trail: who changed/verified what, when (CMS history).
8. Engine fails safe regardless of editor mistakes (UNKNOWN on doubt).

## 6. Editor messages (German, plain language)

| Situation | Message |
|---|---|
| Announcement with end date | "Diese Meldung endet automatisch am 18.10.2026." |
| Announcement without end date | "Diese Meldung hat kein Enddatum. Bitte regelmäßig prüfen." |
| Emergency entry ≥ 90 days unchecked | "Diese Notfallinformation wurde seit 180 Tagen nicht geprüft." |
| Replacement practice stale | "Diese Vertretungspraxis muss erneut bestätigt werden." |
| Acute rules unconfirmed | "Akutsprechstunden können nicht veröffentlicht werden, weil die Zeiten noch nicht bestätigt sind." |
| Review due | "Prüfung fällig seit {Datum}. Bitte Angaben bestätigen." |
| Review overdue | "Nicht mehr öffentlich: Die Prüfung ist seit {Datum} überfällig." |
| Unconfirmed | "Noch nicht bestätigt – wird öffentlich nicht als Tatsache angezeigt." |
| Outdated | "Als veraltet markiert – wird nie veröffentlicht." |
| Missing consent | "Einwilligung zur Veröffentlichung fehlt oder ist nicht bestätigt." |
| Holiday ahead | "Am {Datum} ist ein Feiertag. Bitte Sonderöffnungszeit oder Schließung eintragen." |
| Exception conflict | "Zwei Sonderöffnungszeiten überschneiden sich. Bitte eine Angabe korrigieren – bis dahin zeigt die Website 'Aktuelle Sprechzeiten'." |

Messages for implemented rules are produced by `src/domain/publication.ts` and covered by tests.

## 7. Initial data migration

No content is imported from the old website as verified. Values from [factual-practice-data.md](../research/factual-practice-data.md) may be pre-filled **only as `TO_BE_CONFIRMED`** with source `PRACTICE_WEBSITE_LEGACY`; each becomes public only after practice confirmation. `OUTDATED_DO_NOT_PUBLISH` items (F08, F09, F25, F50–F52, F55, F75, F76) are not migrated at all.
