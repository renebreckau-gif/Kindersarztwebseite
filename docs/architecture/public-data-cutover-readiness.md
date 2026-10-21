# Public data cutover — readiness gate (Phase 09.6A)

Date: 2026-10-21 · Baseline `4becaa6` (09.5I) · **Audit only — no cutover.**

> **Decision**
> - **Next technical phase: `READY_FOR_09_6B_SHADOW_READ`.** The repository, mapping and parity proof are complete for every field the engine and the notice / homepage selection use. The shadow-read harness can be built and proven with artificial fixtures and a migrated copy of the static data.
> - **Public cutover: `NO-GO`.** There is no production backend, no real accounts, no ADMIN MFA, no reset e-mail and no real or confirmed dynamic dataset. Two pre-cutover workflow gaps exist (§9), and several practice / legal / host blockers are open (§11).

Release state (unchanged, guarded by tests): `SITE_STAGE = "STAGING"`, `DATA_SOURCE = "STATIC"`, `RELEASE.indexable = false`, `RELEASE.staffPortalProductionEnabled = false`, `RELEASE.meinArztbesuchPublished = false`.

---

## 1. Current data authority

| | State (verified 2026-10-21) |
|---|---|
| Public website | **STATIC-authoritative.** `getPracticeRepository()` always returns `StaticPracticeRepository`; `resolvePuls()` defaults to `staticPulsData()` (= `PULS_DATA`); announcements come from `src/content/notices.ts`. No public route imports `src/backend`, `src/cockpit`, Payload or `getPayload` (tests: `backend-foundation.test.ts` "dependency direction", `src/data/__tests__/cutover-readiness.test.ts`). |
| Payload / PostgreSQL | Cockpit / backend / test data only. Local isolated cluster (127.0.0.1:5433). No production database exists. |
| Normal dev database (`*_dev`, aggregate-only audit) | **Artificial only.** 4 staff accounts, all `.invalid` addresses and test names; 1 weekly schedule (provenance "Test Ärztin (künstlich)"); 2 consultation types; 1 exception; 0 closures; 3 replacement practices (all artificial "Praxis Beispiel …"; they show VERIFIED_CURRENT only because the test doctor wrote them before the 09.5G hardening); 1 announcement; 14 audit events, no VERIFY; no holiday-calendar row. |
| Real practice data | **NO REAL PRODUCTION DATASET EXISTS.** No real staff account, no real replacement practice, no real physician confirmation. |

## 2. Public data map — consumers

Every public page (`app/(frontend)/(site)/**`) calls `resolvePuls(searchParams)` (status chip / dock / hero). Operational data reaches the public site only through these paths:

| Consumer | Routes | Static input today |
|---|---|---|
| `resolvePuls()` → `getPracticeStatus()` | **all** public pages (/, /heute, /heute/sprechzeiten, /heute/aktuelles, /notfall, /praxis/**, /mein-kind/**, /entdecken/**, /impressum, /datenschutz, /barrierefreiheit, /mitarbeiter) | `PULS_DATA` (schedule, consultation types, exceptions, closures, replacements, holidays, policy) |
| `selectHomepageHighlight()` (closure via `result.upcomingClosure`, else announcement) | `/` (Variant B, `src/site/start-page.tsx`), `/review/startseite` (staging review) | Puls result + `ANNOUNCEMENTS` |
| `activeAnnouncements()` / `homeChapterAnnouncements()` → `selectPublicAnnouncements()` | `/heute`, `/heute/aktuelles`, `/` ("Heute" chapter via `src/site/home.tsx`) | `ANNOUNCEMENTS` |
| `WeekHours`, `DayRuler` (`src/site/blocks.tsx` → `slotsFor` / `blocksFor` in `src/content/schedule.ts`) | `/` ("Heute" chapter, `src/site/home.tsx`), `/heute`, `/heute/sprechzeiten` | **`RULES` directly — not through `PulsData`.** A second static path: the cutover must route the weekly table through the same snapshot (§5). |
| `publicEmergency()` → `selectPublicEmergency()` | `/notfall`, emergency actions | `EMERGENCY` (static, `notices.ts`) — **not in Payload at all** |
| `PRACTICE`, `publicAddress()` | header / footer / contact / every `CallAction` | `src/content/practice.ts` |
| `decidePerson()` / `publicPeople()` | `/praxis/team`, `/praxis/aerztinnen`, start page | `src/content/people.ts` |

Caching: no `revalidate`, `dynamic` export or `use cache` exists in the public tree; every public page reads `searchParams` and is rendered **per request** (ƒ in the build output). Nothing is cached that a cockpit write would have to invalidate today.

## 3. Data-ownership matrix

Classes: **OP** dynamic operational (candidate for Payload public read) · **ED** stable editorial (may stay static / code-backed initially) · **LG** legal / governance (explicitly reviewed, stays out of the cockpit) · **MD** media.

| PUBLIC DATA AREA | CURRENT SOURCE | FUTURE SOURCE | COCKPIT-MANAGED? | VERIFICATION GATE | FAIL-SAFE | CUTOVER PHASE | BLOCKERS |
|---|---|---|---|---|---|---|---|
| Weekly schedule (OP) | `schedule.ts` `RULES`, `confirmedClosedWeekdays` | Payload `weeklySchedules` | Yes — `/intern/sprechzeiten` (09.5I, DOCTOR) | `openingHours` freshness, DOCTOR provenance, invariant guard | engine UNKNOWN | first slice | real week entered + confirmed (F35–F43, LB-00 record) |
| Consultation types (OP) | `schedule.ts` `CONSULTATION_TYPES` | Payload `consultationTypes` | **ACUTE only** (09.5E). GENERAL / HEALTHY_ONLY / APPOINTMENT: **no task workflow** | `consultationType` freshness, DOCTOR | label omitted; weekly editor blocks unusable types | first slice | **GAP-1** (§9), F42 |
| Exceptions / special hours (OP) | `PULS_DATA.exceptions` (empty) | Payload `openingHourExceptions` | Yes — today (09.5A), Sonderzeiten (09.5F), acute today (09.5E) | grace 0, provenance, publish guard | UNKNOWN | first slice | — (data as needed) |
| Closures / vacation + replacement assignments (OP) | `PULS_DATA.closures` (empty) | Payload `closures` | Yes — Urlaub (09.5C), Heute geschlossen (09.5A) | grace 0, directory entries must be usable | no replacement shown → phone / Notfall | first slice | F54 (real closures), FB-09 (owner) |
| Replacement practices (OP) | `PULS_DATA.replacementPractices` (empty) | Payload `replacementPractices` | Yes — `/intern/vertretungen` (09.5G: ADMIN data, DOCTOR verify) | `replacementPractice` freshness, grace 0 | closure shows phone / Notfall | first slice | F53 / FB-10 |
| Holiday calendar (OP) | `PUBLIC_HOLIDAYS_ST` | Payload global `holidayCalendar.holidays` | Dates: generic ADMIN admin (structural; audited since 09.5H) | ADMIN structural | unresolved holiday → UNKNOWN | first slice | official dates for the cutover year |
| Holiday policy (OP) | `REQUIRE_EXPLICIT_ENTRY`, unconfirmed | Payload global `holidayCalendar.policy` | Yes — `/intern/feiertage` (09.5H, DOCTOR) | `openingHours` freshness | UNKNOWN on weekday holidays | first slice | F49 / FB-06 |
| Announcements (OP) | `notices.ts` `ANNOUNCEMENTS` | Payload `announcements` | Yes — `/intern/hinweis` (09.5D) | `decideAnnouncement` (verified, published, date window) | show none | first slice | F47 / FB-11 (content) |
| Practice contact details (ED) | `practice.ts` | static (initially) | No | register status, LB-00 / LB-03 | phone always shown | not in first slice | LB-01, LB-03, F18 / LB-11, F19 |
| Team / doctors (ED + consent) | `people.ts` + `decidePerson()` | static (initially) | No | `publicationConsent`, `decidePerson`, media consent | person hidden | **excluded** from the operational slice | LB-08, LB-09, F23, F24, F31–F34, 10.5B |
| Services (ED) | `/praxis/leistungen` (gated content) | static | No | register (F66–F74) | not shown | later | FB-12 |
| First-visit information (ED) | `first-visit.ts` (TO_BE_CONFIRMED, review only) | static | No | approvals F91–F94 | not public | 10.1B | practice answers |
| Prescription process (ED) | `prescription-process.ts` (review only) | static | No | F101–F109 | not public | 10.3B | practice answers |
| Pricing / payment (ED) | `pricing-review.ts` (review only) | static | No | F110–F117 | not public | 10.4B | practice answers |
| Emergency information (OP, high risk) | `notices.ts` `EMERGENCY` | static (initially); a Payload collection does **not exist** | **No** | grace 0, independent verification, `selectPublicEmergency` | 112 (F56) + 116117 (F57) only | **not in the first slice** | LB-10, F58–F65, **GAP-2** (§9) |
| Discovery / Mein Arztbesuch (ED, medical) | `discovery.ts` | static | No | `meinArztbesuchPublished`, approvals, AI-child decision | STAGING only | independent of the operational cutover | approvals; AI-child decision open (not fully modelled in code) |
| Legal / privacy text (LG) | Impressum / Datenschutz pages | static, legal review | No | legal review | — | never via cockpit | LB-02, LB-04–LB-07 |
| Media (MD) | artworks, no photos | static | No | rights + consent (`decidePersonPhoto`) | placeholders / initials | later | LB-12, F11, F12, F33, F34 |

Conclusion: only the **operational** family moves to Payload. Editorial content can stay code-backed. Legal content stays outside the cockpit. "Payload exists" is no reason to move everything.

## 4. First cutover slice (smallest coherent set)

**Entities:** `weeklySchedules`, `consultationTypes`, `openingHourExceptions`, `closures` (incl. replacement assignments), `replacementPractices`, global `holidayCalendar` (dates + policy), `announcements`. This is exactly `PracticeRepository.getPulsData()` plus `getAnnouncements()`. Cutting a subset would mix sources: for example, a Payload closure with static announcements, or a Payload Puls with a static homepage notice.

**Routes / consumers that must switch together:** every `resolvePuls()` caller (all public pages); `/` hero + homepage highlight + "Heute" chapter; `/heute` (status, `DayRuler`, notices); `/heute/sprechzeiten` (`WeekHours`); `/heute/aktuelles`. `/review/startseite` stays a fixture-driven staging review.

**Excluded from the slice:** emergency information, people / consent, practice master data, services, Phase 10 content, Discovery, legal, media. `decidePerson()`, `publicationConsent` and media consent stay authoritative. A Payload cutover must never bypass them.

## 5. Future architecture: one public operational loader

```ts
// Interface sketch only — NOT implemented in 09.6A.
interface PublicOperationalSnapshot {
  puls: PulsData;
  announcements: Announcement[];
  meta: { source: "STATIC" | "PAYLOAD"; readAt: string; state: "OK" | "FAILED"; datasetVersion?: string };
}
declare function loadPublicOperationalData(): Promise<PublicOperationalSnapshot>;
```

- **One** server-side loader per request. Pages receive the snapshot and pass it on: `resolvePuls(params, now, snapshot.puls)` and `selectHomepageHighlight({ result, announcements: snapshot.announcements })`. `WeekHours` / `DayRuler` must render from `snapshot.puls.schedule` instead of `RULES`. No page calls Payload itself.
- **Consistency — current behaviour.** `PayloadPracticeRepository.getPulsData()` makes six sequential Local API reads, and `getAnnouncements()` a seventh. Without a `req`, each read is a separate autocommit statement on a pooled connection. PostgreSQL READ COMMITTED gives every statement its own snapshot. A cockpit transaction that commits between two reads can therefore produce a **mixed** snapshot (for example, the new closure next to the old exception set). Each single cockpit write set is atomic, but the sequence of reads is not.
- Passing a `req` from `initTransaction()` does **not** fix this: the default transaction is READ COMMITTED, so the snapshot is still taken per statement.
- **Strategy for 09.6B/C (to be proven, not assumed).** Choose one, and prove it with a concurrency test:
  - (a) Run all reads in one **REPEATABLE READ, READ ONLY** transaction. `@payloadcms/drizzle`'s `beginTransaction(options)` accepts a `PgTransactionConfig` (isolation level / access mode); the adapter's `transactionOptions` is the global default and must **not** be changed for writes.
  - (b) An optimistic dataset version (a counter bumped inside every cockpit write transaction): read version → read all → re-read version, retry once, else fail safe.
  - Option (a) needs the reads to run on the transaction's connection (`req`).

## 6. Failure policy (static before cutover ≠ fail-safe after cutover)

| Phase | DB state | PULS | Announcements / highlight |
|---|---|---|---|
| **Before cutover (now)** | irrelevant | STATIC is the truth | STATIC |
| **After cutover** | available | Payload snapshot | Payload snapshot |
| **After cutover** | read fails / partial | `FAIL_SAFE_PULS_DATA` → engine **UNKNOWN** → "Aktuelle Sprechzeiten" + phone / hours action | **none** (fail closed); no highlight |
| **After cutover** | recovers | the next request reads Payload again (no process restart; the loader keeps no failure state) | same |

**Hard rule:** once Payload is authoritative, a database outage must **never** fall back to the old static schedule, closures or notices as if they were current. Static operational content is the pre-cutover source. It is not an emergency truth. `readPulsDataSafely()` already returns the empty `FAIL_SAFE_PULS_DATA` (no schedule, never `PULS_DATA`); this is guarded by `cutover-readiness.test.ts`. Pages must still return a useful 200 with phone, Notfall and the static, non-operational content.

## 7. Source selection

- `DATA_SOURCE` is used only in `src/data/source.ts` and in comments / tests. `getPracticeRepository()` ignores it deliberately.
- Source selection stays a **code / release decision**: no environment variable and no derivation from `VERCEL_ENV` or `SITE_STAGE` (guarded).
- **Deployment stage** (`SITE_STAGE`), **data authority** (`DATA_SOURCE`), **indexing** (`RELEASE.indexable`) and the **production staff portal** (`staffPortalProductionEnabled`) are four orthogonal controls. Each needs its own deliberate decision; none switches another. Indexing is one of the **last** launch decisions.

## 8. Cutover gate — conditions before `DATA_SOURCE = "PAYLOAD"` is legitimate

| | Condition | Status 2026-10-21 |
|---|---|---|
| A | Production backend infrastructure ready (§10) | OPEN |
| B | Real, named practice accounts (§12) | OPEN — none exist |
| C | Required dynamic data entered (complete first slice) | OPEN — artificial data only |
| D | Required dynamic data verified by the right role (week, types, policy, directory) | OPEN |
| E | Payload ↔ static parity proven on the intended baseline | **technically proven** (step 3: PulsData, engine results, announcements, homepage highlight); must be repeated on the real dataset |
| F | Outage fail-safe proven end to end (§6, §14) | OPEN — designed, not implemented |
| G | Staging shadow comparison proven (09.6B) | OPEN |
| H | Security blockers closed (MFA, reset e-mail, `npm audit` re-decision, review) | OPEN |
| I | Practice accepts the resulting public behaviour | OPEN |
| J | Rollback procedure documented and rehearsed (§13) | OPEN — principles only |

## 9. Cockpit write coverage (what the practice can really manage)

| Data needed by the first slice | Task-oriented write + verification | Notes |
|---|---|---|
| Weekly schedule | yes — 09.5I (DOCTOR) | generic writes blocked |
| ACUTE baseline (type + recurring rules) | yes — 09.5E (DOCTOR) | |
| Today changes / acute today | yes — 09.5A / 09.5E | |
| Special day / holiday resolution | yes — 09.5F | |
| Holiday policy | yes — 09.5H (DOCTOR) | |
| Holiday **dates** | ADMIN via generic `/intern/admin` (structural) | acceptable for annual maintenance; audited |
| Closures + replacement assignments | yes — 09.5C / 09.5A | |
| Replacement directory | yes — 09.5G | |
| Announcements | yes — 09.5D | |
| **Non-ACUTE consultation types** (label, explanation, verification) | **NO — GAP-1** | Only REST by a DOCTOR (`/intern/admin` is ADMIN-only, and ADMIN cannot confirm them). The weekly editor offers only verified, fresh types; `consultationType` freshness expires after reviewDue + 60 days. Without a renewal path, the regular week would eventually become uneditable. **Pre-cutover blocker:** a physician consultation-type workflow (label / explanation / confirm), or an explicit decision. Not built in 09.6A. |
| **Emergency information** | **NO — GAP-2** | No Payload collection. Closures carry `emergencyInformationIds`, but PULS actions link to the static `/notfall`. Emergency data stays **static** and outside the first slice, with its own verification (LB-10). A future dynamic version needs its own physician-governed workflow. |

**Schema coverage:** every field read by `getPracticeStatus()`, `selectPublicAnnouncements()` and `selectHomepageHighlight()` round-trips without loss:
- `repository.test.ts` (mapping round trip, rich mock data, announcements via fake reader).
- Integration step 3 (PostgreSQL, extended in 09.6A with announcements, public selection and homepage highlight).

Known representational differences:
- Holiday **names** are not part of `PulsData`; the public site does not show them.
- An unconfirmed explicit-entry policy maps to "no verification" (by design, 09.5H).

## 10. Production backend infrastructure (LB-15)

| Item | Status |
|---|---|
| EU PostgreSQL provider + region | UNKNOWN / OPEN (no provider chosen) |
| DPA / AVV (DB, hosting, e-mail) | OPEN |
| Backups + restore test | OPEN |
| PITR | OPEN |
| Monitoring / alerting | OPEN |
| Maintenance owner / patch cadence | OPEN |
| Transactional e-mail (reset / invites) | OPEN. Reset stays closed: `staffOperationGuard` refuses `forgotPassword` / `resetPassword` (verified in `src/backend/hooks.ts`), because without an adapter Payload logs mails (and tokens) to the console. Production needs a provider + DPA + no tokens in logs. |
| ADMIN MFA | OPEN — mandatory before `staffPortalProductionEnabled` (§12) |

**Live host / DNS:**
- `LIVE_HOST_ACCESS = OPEN`; registrar / DNS access is UNKNOWN (LB-13, LB-14). Untouched.
- The new system can be fully developed and staged without old-host access.
- The actual launch needs control of the final domain / DNS and a safe cutover / rollback plan.

## 11. Readiness by category

| Category | Items |
|---|---|
| **RESOLVED** | F40 weekend (practice 2026-10-11) · SEC-01 preview gate (df5a05c) · technical cockpit workflows 09.5A–I · static ↔ Payload parity (incl. announcements) · generic weekly-schedule REST bypass (closed 09.5I) |
| **OPEN — PRACTICE** | LB-00 recorded practice confirmation (see project-blockers) · LB-01, LB-03, LB-08, LB-09, LB-11 · FB-01–04, FB-06–16 · F53, F54 · Phase 10.1B–10.5B answers · real dynamic data entry + confirmation |
| **OPEN — LEGAL** | LB-02, LB-04–LB-07 (Impressum, privacy, controller, processors), F18 e-mail policy |
| **OPEN — TECHNICAL** | GAP-1 consultation-type workflow · GAP-2 emergency stays static (document / later workflow) · single public loader + consistent snapshot (§5) · `WeekHours` / `DayRuler` read `RULES` directly · outage fail-safe implementation (§6) · LB-10 third-party emergency verification (T) · `npm audit` re-decision (§15) |
| **OPEN — INFRASTRUCTURE** | LB-15 (all of §10), LB-13 host, LB-14 registrar / DNS |
| **NOT REQUIRED FOR INITIAL CUTOVER** | NH-01–NH-13 · Discovery publication · Phase 10 content (required for the full site launch, not for the operational-data architecture) · team photos |

Two readiness notions are kept separate:
- **Technical cutover readiness:** can operational data safely come from Payload?
- **Site launch readiness:** may the new site replace the live site at all? This also needs legal text, LB-00…LB-12, the host and the domain.

**Timeline risk (static, today):** the `WORKING` verification of the static hours carries `reviewDue: 2027-01-07`. With the 60-day `openingHours` grace, the **current static** PULS resolves to UNKNOWN from about **2027-03-09** unless the hours are re-confirmed and the record updated. This is fail-safe, but visible to parents.

### Fact readiness (fact-status-register, no status changed)

Totals (117 facts): **VERIFIED_CURRENT 25 · TO_BE_CONFIRMED 83 · OUTDATED_DO_NOT_PUBLISH 9** (register totals line recounted in 09.6A).

| Operational range | Status |
|---|---|
| F35–F39, F41, F43 hours | VERIFIED_CURRENT *as working data* (LB-00 practice record open) |
| F40 weekend closed | VERIFIED_CURRENT (practice, 2026-10-11) |
| F42 "gesunde Patienten" meaning; F44–F46 acute; F47 mask; F48 booking; F49 holidays | TO_BE_CONFIRMED |
| F53 replacement directory; F54 upcoming closures | TO_BE_CONFIRMED |
| F56 112; F57 116117 | VERIFIED_CURRENT |
| F58–F65 emergency services / clinics / pharmacy link | TO_BE_CONFIRMED (LB-10) |
| F66–F74 services; F77–F81 missing facts | TO_BE_CONFIRMED |
| F75, F76 | OUTDATED_DO_NOT_PUBLISH |
| F91–F117 (Phase 10.1A–10.4A) | TO_BE_CONFIRMED — 10.1B–10.5B wait for practice answers; they block the full site launch, not the operational-data architecture |
| F31–F34 team / consent | TO_BE_CONFIRMED — people stay outside the operational cutover (`decidePerson`, `publicationConsent`, media consent stay authoritative) |

Discovery / Mein Arztbesuch stays STAGING-visible and production-unpublished. The operational cutover does not depend on it, and production launch must keep its gate. The AI-child publication decision is still open and not fully modelled in code.

## 12. Accounts and staff-portal gate

`RELEASE.staffPortalProductionEnabled` stays **false** until **all** of these pass:
- production backend (§10)
- ADMIN MFA
- transactional e-mail + reset
- backup / restore test
- monitoring
- named accounts
- a security review

Real accounts must be named, personal, never shared, use a personal e-mail, have the right role and active state, and give sufficient coverage of the critical roles (at least one DOCTOR who can confirm). None exist; none were created.

**MFA status (re-checked 2026-10-21, no selection, nothing installed):**
- Payload 3.90.2 has no native MFA. 3.91.0 (released 2026-10-15) adds none either: its changelog lists activity-aware sessions, which is not MFA.
- Community options, both still compatible with the stack:
  - `payload-totp` 3.0.6 (peer `payload ^3.88.0`, last publish 2026-10-04)
  - `payload-passkey` 2.1.3 (peer `payload >=3.69 <4`, `next ^16`, `react >=19`; published 2026-10-20 — newer than the 10-13 snapshot's 2.1.2)
- The decision stays open and needs review, an owner and a fresh check at adoption.

## 13. Rollback principles (not implemented)

- **Pre-cutover rollback** (Payload has not accepted public-relevant writes yet): revert the deliberate `DATA_SOURCE` code change. The static snapshot is still the last confirmed truth.
- **Post-write rollback** (staff have published newer operational data in Payload): reverting to the old static snapshot may show **stale** hours or closures, which is unsafe. Prefer:
  - the fail-safe UNKNOWN dataset (phone / Notfall), or
  - a **newly exported, verified** snapshot of the Payload state. A future export must preserve provenance; it is not built yet.

  Never revert silently to old static operational facts.

## 14. Future acceptance tests (hard criteria)

- **Source consistency:** after the switch, ONE snapshot drives the homepage hero, homepage highlight, "Heute" chapter, `/heute`, `/heute/sprechzeiten` (incl. `WeekHours` / `DayRuler`) and `/heute/aktuelles`. No route may still use static operational facts. This is proven by one fixture that differs from static in every operational area.
- **Outage:**
  - DB available → correct dynamic state.
  - DB unavailable → PULS UNKNOWN, no announcement / highlight, pages 200 with phone / Notfall.
  - DB recovers → the next request is correct again, without a restart.
- **Consistency under concurrent writes:** a read during a cockpit transaction never returns a mixed snapshot (§5).
- **Caching:** public PULS stays per-request (a time-dependent status must not be cached across minutes). If caching is ever introduced, it is tag-based and revalidated in the cockpit commit path. Announcements and the highlight are part of the same snapshot.

## 15. Dependencies and compatibility (re-checked 2026-10-21)

Installed (unchanged): `payload` / `@payloadcms/*` 3.90.2 · `next` 16.4.0 · `react` 19.3.0 · Node 24.20.0 · `@payloadcms/db-postgres` 3.90.2 (`pg` 8.20.0).

- Payload installation requirements: Node ≥ 20.18.1; Next 15.2.9–15.2.x, 15.3.9–15.3.x, 15.4.11–15.4.x or ≥ 16.2.6; databases MongoDB / Postgres / SQLite. `@payloadcms/next@3.90.2` peers `next >=16.3.3 <17`, so 16.4.0 is compatible.
- Deployment: Payload runs wherever Next.js runs (Vercel included). It needs `PAYLOAD_SECRET` and the DB URL set on the platform, and persistent / cloud storage for uploads (none in V1).
- `npm audit`: still **16** findings (2 low, 9 moderate, 5 high, 0 critical), the same set as in backend-foundation §17.12.
  - **Changed:** npm now offers a non-downgrade fix via **Payload 3.91.0** (`latest`, 2026-10-15; it bumps `undici` to 7.29.1 and raises the minimum Node to 20.18.1).
  - Not applied (audit-only phase). `npm audit fix --force` not run. No actively exploitable production blocker: no production deployment exists, and the high findings are build-time watchers or the server HTTP client, which this app does not use for outbound requests.
  - **Follow-up (before 09.6D):** evaluate the upgrade to Payload 3.91.x with a full test run, then re-run the audit.

Sources (accessed 2026-10-21):
- https://payloadcms.com/docs/getting-started/installation
- https://payloadcms.com/docs/production/deployment
- https://github.com/payloadcms/payload/releases/tag/v3.91.0
- npm registry metadata (`npm view payload`, `@payloadcms/next@3.90.2`, `@payloadcms/db-postgres@3.90.2`, `payload-totp`, `payload-passkey`, `next@16.4.0`)

## 16. Future import classes (no import in 09.6A)

| Class | Example | Rule |
|---|---|---|
| A — verified fact with valid provenance | F35–F39 hours *after* a recorded practice confirmation | migrate preserving `status`, `sourceIds`, `lastVerified`, `reviewDue` |
| B — working / unconfirmed fact | `WORKING` data without recorded practice sign-off; F42, F44–F46, F49 | migrate only as `TO_BE_CONFIRMED`, or do not migrate; re-confirm in the cockpit |
| C — `OUTDATED_DO_NOT_PUBLISH` | F50–F52 summer 2026, F55 | never seeded as active content |
| D — cockpit-only artificial data | dev / test fixtures ("künstlich", "Praxis Beispiel", `.invalid`) | never production-imported |

Never convert `TO_BE_CONFIRMED` to `VERIFIED_CURRENT` during an import because a static file contained the value.

## 17. Staged plan

| Phase | Scope | Authority |
|---|---|---|
| **09.6A** | Readiness gate (this document) — **done** | STATIC |
| 09.6B | **Payload shadow read** — tests / internal diagnostics read STATIC **and** PAYLOAD, compare domain snapshots, PULS results, announcement selection and homepage highlight. Introduce `loadPublicOperationalData()` with the static path only; consistent-read strategy (§5); route `WeekHours` / `DayRuler` through the snapshot. No parent-visible effect. Proven with artificial fixtures + a migrated copy of the static data (technical parity ≠ content approval). | STATIC |
| 09.6C | Staging public operational read from Payload — only with real staging data and explicit approval; outage + consistency acceptance (§14) | PAYLOAD on staging only |
| 09.6D | Production infrastructure + auth-security gate (§10, §12), GAP-1 resolved, dependency update decision | — |
| 09.6E | Final production cutover — only after the launch blockers, domain / DNS and a rehearsed rollback (§13) | PAYLOAD |
