# Praxis Cockpit: Backend Foundation (Phases 09.2–09.3)

> **Status (2026-10-13, after Phase 09.3):**
> - The Payload runtime runs **locally** against an isolated PostgreSQL development cluster (127.0.0.1:5433), with migrations, real Payload authentication, the ADMIN-only admin at `/intern/admin` and the authenticated `/intern` shell. All of it is proven by integration tests from an empty database (§17).
> - The public website still reads **static data**: `resolvePuls` consumes the static snapshot directly (`staticPulsData()`), not through the repository (§4). `DATA_SOURCE = "STATIC"` is a reserved selector, and there is no cutover.
> - Public pages never depend on the database. They work with the database stopped and on deployments without any backend configuration (Vercel staging today), where `/intern` and `/api` answer 404.
> - No real accounts exist; all accounts and data are artificial. The cockpit prototype at `/lab/praxis-cockpit` keeps its mock login. `SITE_STAGE = "STAGING"` and `RELEASE.indexable = false` are unchanged.
>
> Related: [praxis-cockpit.md](praxis-cockpit.md) (product architecture, roles, workflows), [deployment-model.md](deployment-model.md) (STAGING vs. PRODUCTION).

---

## 1. Compatibility check

Checked **before** installing (npm registry metadata and the official Payload documentation, 2026-10-13):

| Item | Project | Requirement | Result |
|---|---|---|---|
| Next.js | 16.4.0 | `@payloadcms/next@3.90.2` peer: `next >=16.3.3 <17` (Payload docs: Next 16.2.6+) | ✅ |
| React | 19.3.0 | `@payloadcms/ui@3.90.2` peer: `^19.0.1 \|\| ^19.1.2 \|\| ^19.2.1` | ✅ (19.3.0 satisfies `^19.0.1`) |
| Node | 24.20.0 | `payload` engines: `>=20.9.0` | ✅ |
| TypeScript | 5.9.3 | — | ✅ |
| Module system | `"type": "module"` | Payload 3 is ESM | ✅ |
| `graphql` | — | peer of `payload`: `^16.8.1` | installed 16.14.2 |

- **No change** to Next.js or React. Nothing was upgraded or downgraded.
- `npm install` resolved **without** `--force` or `--legacy-peer-deps`. A dry run was done first.
- npm's script allow-list skipped the `esbuild` postinstall scripts. Nothing in this phase depends on them.

## 2. Payload version

- **Payload 3.90.2**, the latest stable release on 2026-10-13. Payload v4 exists only as beta/canary and was not considered.
- Versions are pinned exactly:
  - `payload@3.90.2`, `@payloadcms/db-postgres@3.90.2`, `graphql@16.14.2`
  - since 09.3: `@payloadcms/next@3.90.2`, `@payloadcms/ui@3.90.2`
  - `pg@8.20.0`, the same version the adapter already uses, now direct for the `/intern` reachability probe
  - devDependency `@types/pg@8.15.6`
- All installed without `--force` or `--legacy-peer-deps`; dry run first. Next.js and React are unchanged.

## 3. Database adapter

- **Official PostgreSQL adapter:** `@payloadcms/db-postgres`, built on Drizzle and `pg`. It is configured in [`payload.config.ts`](../../payload.config.ts):
  - `postgresAdapter({ pool: { connectionString: process.env.DATABASE_URI } })`
  - `push: false`: no automatic schema push. **Every** database, including the local one, is built from migrations in `src/backend/migrations/` (§17.2).
  - `disableCreateDatabase: true`: the adapter never creates databases on its own.
- **Vercel Postgres / Neon variant:** `@payloadcms/db-vercel-postgres` exists. It is chosen only once the provider decision is made (§16).
- **Environment:** see [`.env.example`](../../.env.example). It holds placeholders only (`DATABASE_URI=`, `PAYLOAD_SECRET=`). `.env*` stays git-ignored.
- **Local setup (developer machine):** an isolated development cluster, see §17.1. The system PostgreSQL service on port 5432 is never touched.
  - Only artificial test data is used, never practice data.
- **Production provider:** still open (§16).

## 4. Repository architecture

```
src/domain/            pure engine + shared operations (no framework, no Payload)
   ▲        ▲
   │        │
src/data/   │          repository boundary: contracts, static source, active source, mapping
   ▲        │
   │        │
src/backend/           Payload-specific: collections, hooks, access, provenance, Payload repository
   ▲
   │
payload.config.ts      only place with Payload runtime imports (not imported by the app)
```

| File | Role |
|---|---|
| `src/data/contracts.ts` | `PracticeRepository` (`getPulsData`, `getAnnouncements`), `AuditRepository`, `StaffDirectory`, `StaffAccount`, `DataSource` |
| `src/data/static-repository.ts` | `StaticPracticeRepository`: wraps `src/content/schedule.ts` and `notices.ts`. **Authoritative in 09.2.** |
| `src/data/source.ts` | `DATA_SOURCE = "STATIC"`: a **migration-target selector / reserved switch** (in code, independent of `SITE_STAGE`, never derived from Vercel). It is not yet active: `getPracticeRepository()` always returns the static repository, because Payload is not authoritative. Also `FAIL_SAFE_PULS_DATA` and `readPulsDataSafely()`. |
| `src/data/payload-mapping.ts` | Pure, lossless mapping between documents and domain types, both ways (null ↔ absent, `recordId` ↔ `id`, `openEnded` ↔ `"OPEN_ENDED"`) |
| `src/backend/payload-repository.ts` | `PayloadPracticeRepository`: reads through a minimal `PayloadReader` interface that Payload's Local API satisfies. Order is deterministic (insertion order, ascending `id`); reads are sequential, so inside hooks they share the transaction connection. **Parity-proven against PostgreSQL (§17.6). Not authoritative; not wired to the site.** |

**Coverage of the contract:**
- `getPulsData()` returns the weekly schedule, consultation types, opening-hour exceptions, closures, replacement practices, holiday calendar and holiday policy in one `PulsData`.
- `getAnnouncements()` returns the announcements.
- Audit entries and staff accounts have their own contracts (`AuditRepository`, `StaffDirectory`). Today they are covered by the Payload collections and their access rules; dedicated repository implementations follow when the cockpit workflows are connected.

**Public site (current reality):**
- Repository contracts exist, and `StaticPracticeRepository` exists and is parity-tested.
- The public Praxis Puls does **not** load through `PracticeRepository.getPulsData()`. `resolvePuls(params, now, source = staticPulsData())` consumes the static snapshot directly and synchronously, through 09.2 and 09.3.
- Repository-based (async) public loading arrives with the cutover (§14).
- Behaviour is unchanged; a test covers 21 days at 90-minute steps.

## 5. Dependency direction

Enforced by tests in `src/backend/__tests__/backend-foundation.test.ts`:

- `src/domain/` imports nothing from Payload, React, Next, `src/lab`, `src/backend`, `src/data` or `src/content`.
- No file outside the backend imports `payload`, `@payloadcms/*` or `src/backend`. That covers `app/(frontend)` (public site, review hub, lab), content, data and lab. The public site cannot accidentally read from the database.
- Backend users are only `app/(payload)` (Payload admin/REST), `app/(intern)` (staff cockpit) and `src/cockpit/` (cockpit read layer, since 09.4).
- Inside `src/backend/`, Payload is imported **as types only** (generated migrations excepted). Runtime coupling lives in `payload.config.ts`, the two backend route groups, the scripts and — since 09.5A — `src/cockpit/workflows/publish.ts` (transactions for cockpit writes; the only Payload-runtime module in `src/cockpit`).
- Production code (`src/domain`, `src/data`, `src/backend`, `src/content`, and `app/` outside `app/lab`) does not import the lab cockpit (`src/lab/cockpit`: mock accounts, test clock, scenarios).
- The lab now **uses** the domain operations (`src/lab/cockpit/model.ts` delegates to `src/domain/operations.ts`), so the prototype and the future publish flow share one implementation.

**Shared domain operations** (`src/domain/operations.ts`):
- schedule derivation: `rulesSegments`, `blocks`, `cutAt`, `lastEnd`, `earlyCloseEffect`
- change sets: `applyChangeSet`, `introducedUnknown` (the "no new UNKNOWN" guard), `classifyChange` (EDIT / SUPERSEDE / NEW / CONFLICT)
- record lookup: `findDaySpecialHours`, `findShortNoticeClosure`, `findOverlappingVacation`
- expiry: `notExpired`, `expired`, `announcementExpired`
- replacements: `uncoveredDays`, `validateReplacementPeriods`

These functions return kinds, dates and ids, never German text. Wording, the test clock and mock accounts stay in the lab and UI layers.

## 6. Collections

Defined in `src/backend/collections.ts`. **Website operations only.**

| Slug | Purpose | Notes |
|---|---|---|
| `staff` | Staff accounts (auth) | `name`, `role` (STAFF / DOCTOR / ADMIN), `active`. Only ADMIN can change `role` and `active` (field-level access). |
| `weeklySchedules` | Weekly opening hours | Rules array (`ruleId`, weekday, from/to, consultation type, validity window, public note, verification) and confirmed closed weekdays. The most recently updated document is authoritative. |
| `consultationTypes` | Consultation types | `code` is unique |
| `openingHourExceptions` | Changed hours / closed days | `recordId` (stable domain id), kind, Berlin dates, intervals, priority |
| `closures` | Vacation, training, short notice | Replacement assignments (`replacementPracticeId`, from/until) |
| `replacementPractices` | Replacement directory | Contact data of practices, never of patients |
| `announcements` | Announcements | `validUntil` or `openEnded`, `published` |
| `auditEvents` | Append-only audit trail | Written only by server hooks |
| `holidayCalendar` (global) | Public holidays and holiday policy | The policy always stays `TO_BE_CONFIRMED` in 09.2 (§10) |

**Lifecycle (since 09.5B, `openingHourExceptions` and `closures`):** `recordState` (`ACTIVE` default / `RETIRED`, indexed), `retiredReason` (`SUPERSEDED` / `REVERTED`), `retiredAt`, `retiredByChangeSetId`, `supersededByRecordId`.
- Field access: create/update only when the trusted request context carries `SERVER_CONTEXT.LIFECYCLE` (`isLifecycleWrite`, strictly `true`). Values from REST or the admin UI are dropped (tested).
- `retiredRecordGuard` (first `beforeChange` hook): a normal write to a `RETIRED` record fails with 409 "Archivierte Einträge können nicht geändert werden.".
- In a lifecycle write the provenance hook keeps the record's existing verification, and the publish guard skips a record that is being retired.
- Payload `versions` are **not** enabled; the history is `auditEvents`. Nothing is deleted (no delete access, unchanged).
- The repository (`payload-repository.ts`) loads exceptions and closures with `recordState != RETIRED` (`active()`), so the engine only ever sees active records.

**Since 09.5C (validation only, no schema change — `payload migrate:create --skip-empty` found nothing to migrate):**
- `closures.publicMessage` allows up to 280 characters (the "Hinweis für die Website" of a planned closure); `openingHourExceptions.publicMessage` stays at 200.
- `localDate` fields accept only real calendar days (`isLocalDate` round-trip check; e.g. `2026-02-30` is rejected).

**Since 09.5D (announcements):**
- `announcements` has the same lifecycle fields (`recordState`, `retiredReason`, `retiredAt`, `retiredByChangeSetId`, `supersededByRecordId`), server-controlled exactly like closures / exceptions; migration `20261014_123515_announcement_lifecycle` (CLI-generated, existing rows ACTIVE, applied from zero and on the dev database). `retiredRecordGuard` freezes RETIRED notices.
- `announcementShapeHook` (beforeChange, before provenance) validates every write with the pure helper `src/domain/announcements.ts` (shared with the cockpit) and stores title / text normalized. Storage mapping unchanged: open-ended = `openEnded: true` + `validUntil: null`; finite = `openEnded: false` + a LocalDate.
- `PayloadPracticeRepository.getAnnouncements()` returns only ACTIVE records.
- Undo: `announcements` is a lifecycle collection of the 09.5B change-set undo (audit operations CREATE / UPDATE / REVERT, `revertOf`, new `changeSetId` per revert); provenance of a restored notice is regenerated (`reviewDueFor`: end date, open-ended today + 30).

`Sources` was **not** added. Provenance uses the fixed source id `PRACTICE_COCKPIT`. A source registry follows only if editorial sources move into the backend.

**Storage format:**
- Dates are text `YYYY-MM-DD` (Europe/Berlin calendar dates) and times are text `HH:MM`. These are exactly the domain's `LocalDate` and `LocalTime`, so no timezone conversion happens in storage.
- Validators enforce the format.

**No patient data:**
- `src/backend/privacy.ts` rejects field names that look like patient data: patient, birth/Geburt, diagnosis/Befund, treatment/Behandlung, appointment/Termin, insurance/Versicherung, medical record/Krankenakte, message/Nachricht, Anliegen, symptom.
- The check runs when the config is built (`payload.config.ts` throws) and in the tests.
- The only allowed exception is `publicMessage`, which holds public website wording.

## 7. Authentication

| Requirement | Status after 09.3 |
|---|---|
| Payload built-in auth on `staff` (hashed passwords, no custom crypto, no home-grown auth) | **Configured** |
| HttpOnly session cookie, `Secure`, `SameSite=Lax` | **Configured and verified over HTTP** (§17.4) |
| Lockout: 5 failed attempts → 15 min | **Verified** (correct password refused while locked) |
| Session lifetime 8 h | **Configured** (`tokenExpiration`) |
| No API keys | **Configured** (`useAPIKey: false`) |
| Disabled accounts cannot sign in | **Verified** (`beforeLogin` hook, generic message); every access rule treats `active: false` as signed out |
| Revocation | **Verified:** Payload's server-side sessions (`useSessions` default). Logout deletes the session; a replayed cookie is refused afterwards. Disabling blocks the next request. |
| Password reset | **Closed** until an email adapter exists (`staffOperationGuard`); ADMIN sets a new password in `/intern/admin` (§17.10). |
| MFA (TOTP / passkeys) | **Not implemented.** ADMIN MFA is required before production. Provider/plugin selection remains open and must be re-verified against the then-current Payload version. Market notes in §17.9. Nothing built from scratch. |
| Login UI | **Built:** `/intern/anmelden` (real Payload auth, generic error, no self-registration). The mock login at `/lab/praxis-cockpit/anmelden` is unchanged. |
| Real accounts | **None created.** The first ADMIN is created only by `scripts/bootstrap-admin.ts` (§17.3); all current accounts are artificial (`.invalid`). |

## 8. Role enforcement

Server-side rules live in `src/backend/access.ts` (pure functions, tested). Hiding UI is never the only protection.

| Collection | read | create / update | delete |
|---|---|---|---|
| staff | ADMIN; others only their own record (`/api/staff/me`, by id; listing → 403) | create: ADMIN (or the bootstrap script once) · update: ADMIN or self (role/active: ADMIN only) | never |
| weeklySchedules, consultationTypes | signed in | **DOCTOR** | never |
| openingHourExceptions, closures, announcements | signed in | any active role | never |
| replacementPractices | signed in | DOCTOR, ADMIN (ADMIN entries stay unconfirmed) | never |
| auditEvents | DOCTOR, ADMIN | never (server hooks only) | never |
| holidayCalendar | signed in | ADMIN | — |

- Signed-out, disabled and unknown-role users get **no** access anywhere.
- Records are ended or replaced, never deleted through the API (history is kept, §11).

**Confirmation boundary** (`canConfirm` in `src/domain/governance.ts`):
- **STAFF** confirms operational records only: exceptions, closures, announcements and replacement assignments.
- Weekly schedule, acute rules, consultation types, replacement-practice verification, emergency wording, medical content and medical Discovery content are **DOCTOR only**.
- **ADMIN** has no medical bypass.
- Legal texts are outside the cockpit for every role.

**Admin UI (since 09.3):**
- Payload admin at **`/intern/admin`** (route group `app/(payload)/`); REST at `/api`. No GraphQL route, no `/admin`.
- **ADMIN only:** `access.admin` on `staff`. STAFF and DOCTOR are redirected to Payload's "Unauthorized" view and see no data.
- Structural administration only, not the daily tool. The future cockpit lives at `/intern`.

## 9. Audit

`auditHook` (afterChange) in `src/backend/hooks.ts` appends one `auditEvents` document per write. It runs in the same transaction (`req`) with `overrideAccess`.

- **Contents:**
  - actor id, plus name and role as a snapshot at the time of the action
  - timestamp (ISO UTC; displayed in Europe/Berlin)
  - entity type and id
  - operation (CREATE / UPDATE / SUPERSEDE / REVERT). Since 09.5B `SUPERSEDE` and `REVERT` are set only via the trusted context (`SERVER_CONTEXT.AUDIT_OPERATION`, `auditOperationOf`); otherwise the hook derives CREATE / UPDATE
  - previous and new version
  - publish state
  - change-set id (since 09.5A: generated on the server per cockpit publish, passed only via the trusted request context `SERVER_CONTEXT.CHANGE_SET`, UUID-validated; never from the browser) and `revertOf` (since 09.5B: the original audit event id, passed only via `SERVER_CONTEXT.REVERT_OF`, UUID-validated; a revert always has its own new `changeSetId`)
- **Never stored:** password, hash, salt, tokens, reset tokens, API keys, sessions or lockout counters. `stripSecrets` is applied recursively (tested).
- **Append-only:** create, update and delete are `never` through the API.
- **Undo (since 09.5B):** the cockpit undo writes through the normal hooks with operation `REVERT`; each write gets its own new event linked by `revertOf`. The original event is never changed. Details: [praxis-cockpit.md](praxis-cockpit.md), Phase 09.5B note.
- Lab-prototype audit entries are not migrated; they are mock data.

## 10. Provenance

`provenanceHook` (beforeChange) generates `verification` from the **logged-in account + operation + Berlin date** (`buildProvenance` / `verificationForWrite`):

- `verifiedBy = "<Name>, <Rollenbezeichnung> (Praxis Cockpit)"`, `sourceIds = ["PRACTICE_COCKPIT"]`, `lastVerified` = today in Berlin, and `reviewDue` set per kind:
  - exceptions and closures: their end date
  - announcements: `validUntil`, or today + 30 days when open-ended
  - standing data: today + 182 days
- Client-supplied `verifiedBy`, `lastVerified` and `status` are **overwritten**, including nested rule verifications in the weekly schedule. The fields are read-only in every UI.
- Writes outside the role's confirmation boundary are **rejected** ("Diese Angabe kann nur eine Ärztin oder ein Arzt bestätigen."). The one exception: an ADMIN entering replacement-practice data stores it as `TO_BE_CONFIRMED`, and it never becomes public until a doctor confirms it.
- The **holiday policy** saved by ADMIN always stays `TO_BE_CONFIRMED`. The mapping then treats it as `REQUIRE_EXPLICIT_ENTRY` (fail-safe). A physician confirmation flow follows when the cockpit workflows are connected.
- No fake provenance for test data. Existing static content keeps its documented provenance. Mein Arztbesuch approval records and Discovery provenance are untouched (`TO_BE_CONFIRMED`).

## 11. Expiry

- No cron job deletes anything. A record's **inclusive end date** (Europe/Berlin calendar day) decides relevance at read time:
  - `notExpired` / `expired` for exceptions and closures
  - `announcementExpired` for announcements (open-ended announcements never expire)
- Expired records stay in the database and the audit trail as history. The engine simply no longer matches them on later days.
- Because dates are stored as Berlin `LocalDate` text, DST changes cannot shift an end date.

## 12. Cache and revalidation (design for the cutover phase)

- Public pages render Praxis Puls per request (`ƒ` routes) from a repository snapshot. With the database source:
  1. Read once per request through a cached loader (Next `unstable_cache` / `"use cache"` with tag `practice-data`, short TTL of ≤ 60 s as a safety net).
  2. After a successful publish, an `afterChange` hook calls `revalidateTag("practice-data")`.
  3. If revalidation fails, the TTL bounds staleness. The cockpit shows "Website wird aktualisiert …" until a version endpoint (`/api/puls-version`, 09.8) confirms the new version.
- Status is **always** computed by the engine at request time from the snapshot. Status results are never cached, so "open/closed" cannot go stale.

## 13. Fail-safe

- `readPulsDataSafely(repo)`: any read error returns `FAIL_SAFE_PULS_DATA` (no schedule). The engine then resolves to **UNKNOWN** ("Aktuelle Sprechzeiten" plus phone), **never a guessed OPEN**. Tested.
- No silent fallback to stale static data after cutover. Static data could contradict a published closure, so a contradiction is worse than UNKNOWN. After cutover, the static source stays available only as an **explicit, reviewed rollback** (§14).
- More mapping fail-safes:
  - missing weekly schedule → UNKNOWN
  - unverified holiday policy → `REQUIRE_EXPLICIT_ENTRY`
  - unverified records → the engine's existing verification rules apply

## 14. Migration plan

1. **09.2 (this phase):** foundation, mapping and parity tests. `DATA_SOURCE = "STATIC"`. **No cutover.**
2. **09.3 (done):**
   - isolated local database and initial migration
   - Payload runtime with the admin at `/intern/admin` (ADMIN only) and REST at `/api`
   - bootstrap script for the first ADMIN; `/intern` auth shell
   - integration tests from an empty database, incl. DB parity (§17)
3. **Seed:** `docsFromPulsData(PULS_DATA)` creates the documents from the current static content, one-off, reviewed, with provenance carried over **as documented** (not regenerated).
4. **Parity gate:** for the seeded database, `PayloadPracticeRepository.getPulsData()` must deep-equal `staticPulsData()`, and `getPracticeStatus` must be identical over a long sampled window (§15).
5. **Cutover (later phase, separate reviewed change):** `getPracticeRepository()` starts honouring `DATA_SOURCE` and returns the Payload repository for `"PAYLOAD"`. Pages switch to the async read through `readPulsDataSafely`.
6. **Rollback:** only once step 5 has wired the selector does setting `DATA_SOURCE` back to `"STATIC"` become a real rollback. That path is tested before go-live. **Today `DATA_SOURCE` switches nothing**; it is a reserved selector.

`SITE_STAGE` and `DATA_SOURCE` stay independent: staging can run on either source, and production does not imply the database.

## 15. Parity tests

`src/data/__tests__/repository.test.ts` (in memory, no database):

- **Static repository** returns exactly `PULS_DATA` and `ANNOUNCEMENTS`. `resolvePuls` with the repository equals the previous output over 21 days at 90-minute steps.
- **Mapping round-trip** (domain → documents → JSON → domain) is lossless:
  - for the current site data
  - for rich **mock** data (exceptions, closures, replacements from the lab scenarios; invented, never practice data)
- **Engine parity:** `getPracticeStatus` is deep-equal for static and round-tripped data at every sampled instant (8 weeks for site data, 3 weeks for mock data).
- **Payload repository** with a fake Local API returns the same `PulsData` and announcements as the static source.
- **Fail-safe:** a failing repository and a missing schedule resolve to UNKNOWN; an unverified holiday policy never closes holidays.

**With a database (09.3, done):** `src/backend/__integration__/03-parity.test.ts` persists the data in an **isolated** test database and reads it back through `PayloadPracticeRepository` (§17.6). The tests refuse any URI that is not a loopback `*_test` database.

## 16. Open infrastructure decisions

These need an owner and a decision before any real data or account exists. This document makes **no** data-protection or GDPR compliance claim.

| Topic | Open question |
|---|---|
| Database provider | Managed PostgreSQL (e.g. Neon / Vercel Postgres, Supabase, a German hoster) |
| Region | EU region required; exact location to be named |
| DPA / AVV | Data processing agreement with the DB, hosting and email providers, signed by the practice |
| Object storage | Not needed in V1 (no uploads); decide if images ever move into the backend |
| Email | Transactional provider for password reset and invites (EU, DPA); until then reset is closed (§17.10) |
| Backups | Frequency and retention; **restore test** before go-live (09.8) |
| PITR | Point-in-time recovery available or not, and the window |
| Maintenance owner | Named person or agency responsible for updates and incidents |
| Patching | Update cadence for Payload, Next.js and Node; security advisories |
| Monitoring | Uptime, error tracking, revalidation failures, `/api/puls-version` |
| MFA | ADMIN MFA is required before production. Provider/plugin selection remains open and must be re-verified against the then-current Payload version. |
| Admin route path | **Decided:** `/intern/admin` |
| Live host / domain / DNS | Access to the existing webhost is unavailable (`LIVE_HOST_ACCESS = OPEN`); registrar and DNS access unknown. See project-blockers LB-13/LB-14. Blocks only the production cutover. |

## 17. Phase 09.3: Payload runtime, isolated database, real auth (results)

The readiness gate first stopped 09.3: the system PostgreSQL service requires unknown SCRAM credentials (`3d2c316`). On the user's instruction, an isolated development cluster was then built from the installed PostgreSQL 16 binaries, without touching the system service.

### 17.1 Isolated PostgreSQL development cluster

| | |
|---|---|
| Binaries | PostgreSQL **16.2** (`C:\Program Files\PostgreSQL\16\bin`: `initdb`, `pg_ctl`, `psql`) |
| Data directory | `%LOCALAPPDATA%\kinderarzt-postgres-dev` (outside the repository and outside OneDrive) |
| Port / binding | **5433**, `listen_addresses = '127.0.0.1'` (not reachable from the network) |
| Authentication | `scram-sha-256` only; `pg_hba.conf` allows exactly `host all all 127.0.0.1/32 scram-sha-256` |
| Roles | Cluster superuser `kinderarzt_dev_super`, maintenance only. Application role **`kinderarzt_app`**: `LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE` |
| Databases | `kinderarzt_staging_dev` (manual development) and `kinderarzt_staging_test` (recreated empty on every test run), both owned by `kinderarzt_app` |
| Secrets | Generated by the init script and written **only** to the git-ignored `.env.local` (`DATABASE_URI`, `TEST_DATABASE_URI`, `PAYLOAD_SECRET`, `DEV_DB_SUPERUSER_URI`). Never printed, never committed. |
| Isolation proof | Port 5433 is a separate server; the app role is not a superuser and owns both project databases. The system service on 5432 keeps running; its `pg_hba.conf` is unchanged (last modified 2024). |

Helper: `npm run db:dev -- <init|start|stop|status>` (`scripts/db-dev.ps1`).
- The script operates only on this data directory and this port.
- It contains no passwords and never kills processes.
- It starts the server detached, so the calling shell is not blocked.

`scripts/db-dev-verify.mjs` prints the non-secret isolation facts.

### 17.2 Migrations

- **Workflow** (official Payload CLI, [docs](https://payloadcms.com/docs/database/migrations)):
  - `payload migrate:create initial` generated `src/backend/migrations/20261013_122224_initial.ts`.
  - It covers all eight collections plus the `holidayCalendar` global, including array and `select hasMany` tables, `staff_sessions` and the Payload system tables.
  - Since 09.5B: `payload migrate:create operational_lifecycle` generated `20261014_080446_operational_lifecycle.ts` (lifecycle enums, columns and indexes on `opening_hour_exceptions` and `closures`; `record_state` is `NOT NULL DEFAULT 'ACTIVE'`, so existing rows become ACTIVE). Same type-import adjustment, SQL unchanged. Applied from zero (tests) and on the dev database.
- **Commands:** `npm run db:migrate` (`payload migrate`) and `npx payload migrate:status`. `push: false` stays on; there is no automatic schema push anywhere.
- **One documented adjustment** after generation: the generated file imported the TypeScript types `MigrateUpArgs` / `MigrateDownArgs` as values. They are now `type` imports, so the file also runs under Node's type stripping (integration tests); `index.ts` uses the `.ts` extension. **The generated SQL is unchanged.** No hand-written SQL.
- **Clean rebuild:** every `npm run test:db:clean` run drops and recreates `kinderarzt_staging_test` and applies the migrations from zero with the CLI (§17.11).

### 17.3 Payload runtime and routes

| Route | Purpose | Notes |
|---|---|---|
| `/intern/admin` | Payload admin (official `@payloadcms/next` integration, `app/(payload)/intern/admin/[[...segments]]`) | ADMIN only (`access.admin`) |
| `/api/*` | Payload REST (`app/(payload)/api/[...slug]`) | Every operation passes access rules and hooks; no unauthenticated write |
| `/intern`, `/intern/anmelden` | Custom staff shell and login (`app/(intern)`) | §17.5 |
| GraphQL | **Disabled** (`graphQL.disable`) and **no route** | — |

- **Route groups:**
  - The public site's root layout moved into `app/(frontend)/`. URLs are unchanged, and the tests follow the new paths.
  - `app/(payload)` and `app/(intern)` each have their own root layout, as required by the [installation docs](https://payloadcms.com/docs/getting-started/installation).
- **Gate (`proxy.ts`, runs before any route module):** `/intern*` and `/api*` exist only where the real staff portal is available — `staffPortalAvailable`: `DATABASE_URI` + `PAYLOAD_SECRET` configured **and** (STAGING, or PRODUCTION with `RELEASE.staffPortalProductionEnabled`, currently `false`; since 09.5A, the same decision as the footer entry `/mitarbeiter`). Otherwise they answer **404**.
  - **PRODUCTION stage:** the internal tools stay blocked until a production security review enables them.
  - **Deployment without a database** (Vercel staging today): there are no broken backend pages. Verified with a build and start without any backend environment: public routes 200, all backend routes 404.
- **Build without a database:** `next build` evaluates route modules without initialising Payload. Only during the build phase (`NEXT_PHASE`) does `payload.config.ts` accept inert placeholders (an unresolvable `.invalid` host). Everywhere else, a missing `PAYLOAD_SECRET` or `DATABASE_URI` fails loudly.
- **CSRF:** when `PAYLOAD_SERVER_URL` is set, Payload accepts cookie-authenticated requests only from that origin. Server actions additionally use Next's own origin check. Set it per environment once a hosted backend exists.

**First-user registration is closed (tested over HTTP and the Local API):**
- **Why a guard is needed:** Payload's `registerFirstUser` operation writes with `overrideAccess`, so collection access rules alone do not stop it.
- **Three layers:**
  1. `proxy.ts` answers 404 for `/intern/admin/create-first-user` and `/api/staff/first-register`.
  2. `staffCreateGuard` rejects every `staff` create unless the actor is an active ADMIN or the request carries the server-only bootstrap context. `req.context` cannot be set over HTTP.
  3. On an empty database, the admin entry point leads only to the closed view; no form is reachable.
- **Bootstrap:** `npm run db:bootstrap-admin` (`scripts/bootstrap-admin.ts`) is the only way to create the first ADMIN.
  - It is server-side only and reads `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME` and `BOOTSTRAP_ADMIN_PASSWORD` from the environment, or asks interactively; the password prompt is hidden, which keeps it out of shell history.
  - There are no defaults. It refuses weak passwords (< 16 characters, < 3 character classes unless ≥ 24, a single repeated character, or containing the email name).
  - It refuses as soon as **any** account exists and never prints the password.
  - The audit records it as actor `system:bootstrap`.
  - Remove `BOOTSTRAP_ADMIN_*` from the environment right after use.

### 17.4 Authentication and cookies (verified)

Integration tests against PostgreSQL and the running server (`02-runtime.test.ts`), plus a manual browser check of `/intern/anmelden` with artificial accounts:

| Check | Result |
|---|---|
| Correct credentials (ADMIN, DOCTOR, STAFF) | Login succeeds; the role is read server-side from the database |
| Wrong password vs. unknown email | Identical generic failure (HTTP 401, same body); `/intern/anmelden` shows "Anmeldung nicht möglich. Bitte prüfen Sie Ihre Angaben." |
| Disabled account | Refused with the correct password; no cookie |
| Lockout | After 5 failures, the correct password is refused; `lockUntil` ≈ 15 min |
| Session | Survives normal navigation; logout deletes the server-side session; a replayed old cookie is refused (`/api/staff/me` → `null`, `/intern` → login) |
| Unauthenticated | `/intern` → `/intern/anmelden`; `/intern/admin` shows only Payload's login, no admin content; `/api/staff` and `/api/auditEvents` → 403 |
| `/intern/admin` | ADMIN: dashboard. DOCTOR / STAFF: redirected to "Unauthorized", no data (only their own email in the page payload) |

**Cookie** `payload-token`, set by Payload's own generator (REST login and the `@payloadcms/next/auth` server function use the same code):
- Flags: `HttpOnly; SameSite=Lax; Secure; Path=/`. It is not readable from JavaScript (checked in the browser).
- **Localhost vs. HTTPS:**
  - `Secure` stays on in every environment.
  - Chromium and Firefox treat `http://localhost` as a secure context and accept `Secure` cookies there, so local HTTP development works without weakening anything.
  - Every hosted environment must be HTTPS.
  - Exception: browsers that do not treat `localhost` as secure (older Safari) cannot sign in locally. That is accepted; security is not lowered for it.

### 17.5 `/intern` shell (real)

- **`/intern/anmelden`:**
  - Calm login (E-Mail, Passwort, "Anmelden") built on Payload's official `login` server function.
  - No self-registration, no test credentials, one generic error message.
- **`/intern`:** requires authentication and shows:
  - "Praxis Cockpit", the name, the role label and "Backend verbunden · Testumgebung"
  - actions "Praxis-Cockpit-Prototyp öffnen" (`/lab/praxis-cockpit`) and "Abmelden" (Payload `logout`, revokes the session)
  - for ADMIN only, "Verwaltung öffnen" (`/intern/admin`)
- **Not connected yet:** operational editing workflows. The prototype remains the UX reference and does not depend on PostgreSQL.
- **Database outage:**
  - `/intern` shows "Der interne Bereich ist gerade nicht erreichbar" and never crashes.
  - Until Payload has started in a process, a 2-second connection probe runs first, so a failed first initialisation can never stay cached in the adapter.
  - Verified: a cold start with the database stopped, a warm stop/start, and recovery without restarting the server.
  - `/intern/admin` and `/api` call Payload directly. If one of them is the first backend request after a cold start without a database, that request fails with 500.
  - **Re-tested in 09.4:** once the database is back, Payload initialises again on the next request. Reads and writes (a transaction with an audit event) work **without a process restart** (`getPayload` clears a failed initialisation; every init creates a fresh adapter). The 09.3 suspicion of a permanent failure is not reproducible, so no workaround was added (no fork, no patch).
  - Public pages are unaffected in every case.

### 17.6 Static → PostgreSQL → repository parity

`03-parity.test.ts`:
1. The current static `PULS_DATA` is persisted through `docsFromPulsData` via the trusted seed path, which keeps the documented provenance.
2. It is read back through `PayloadPracticeRepository`.
3. The result is compared with the static domain data (**deep-equal**).
4. Both datasets go through `getPracticeStatus()`.
5. The same steps run for an artificial dataset with special hours, a vacation with replacement, and expiry.

- **Status results are identical** for these cases:
  - weekday before opening; morning, lunch gap and afternoon
  - after closing; Saturday; Sunday
  - unresolved weekday holiday, which stays UNKNOWN
  - special hours, including a dropped afternoon
  - explicit closure / vacation; replacement case
  - expiry boundary (last day 23:59 / first day after)
  - Europe/Berlin DST end (2026-10-25 02:30) and the Mondays after both DST changes
- **Additionally:** every full hour over four weeks.
- **Findings fixed on the way:**
  - The repository had no defined list order (Payload's default sort is newest first); it now uses insertion order.
  - Optional groups and lists are written as "absent" / `[]` instead of `null`.

### 17.7 Provenance, access and audit (verified against PostgreSQL)

- **Provenance over HTTP:**
  - STAFF posted a closure with a fake `verifiedBy`, `lastVerified` and `status`, then patched it with fake values again.
  - The database contains `VERIFIED_CURRENT`, `"Test STAFF (künstlich), Praxisteam (Praxis Cockpit)"`, `lastVerified` = Berlin today, `reviewDue` = end date and `sourceIds = ["PRACTICE_COCKPIT"]`.
- **Access over HTTP:**
  - STAFF is refused weekly schedules, consultation types and accounts.
  - ADMIN is refused weekly schedules and consultation types, so it has no physician bypass.
  - ADMIN-entered replacement practices stay `TO_BE_CONFIRMED`, and ADMIN cannot confirm the holiday policy.
  - DOCTOR confirms the schedule, including nested rules.
  - Nothing is deletable, not even by ADMIN.
  - Unauthenticated Local API writes are refused in every collection.
- **Audit:**
  - Each write creates one event with `actorId`, name and role snapshot, timestamp, `entityType`, `entityId`, operation, `previous`, `next` and `publishState`.
  - A recursive key scan of **all** persisted events (including an account password change) finds no key matching password, hash, salt, token, secret, session, refresh, apiKey, `_sid`, loginAttempts or lockUntil, and no secret value appears in the payload.
  - Found and fixed: `resetPasswordRequestedAt` (auth metadata) is now stripped as well.
  - Audit events cannot be updated or deleted through the API.

### 17.8 Transactions (verified against PostgreSQL)

- **Success:** a normal operational write commits the business record **and** its audit event.
- **Rejected write after the transaction began:**
  1. A transaction is opened on one `req`.
  2. A first closure is written; inside the transaction, its audit event is visible through the same `req`.
  3. A second, contradicting closure on the same `req` is rejected by the publish guard.
  4. Result: **neither** record nor **any** audit event persists, so no orphans remain.
- **Rejected write without an explicit transaction:** record and audit counts are unchanged.
- **Explicit commit:** keeps record and audit event together.
- The audit hook writes with the same `req`, and it is proven, not assumed, that this runs in the same transaction.

### 17.9 MFA: current options (2026-10-13)

- **Native Payload:** no built-in TOTP or passkeys in Payload 3.90.2.
- **Maintained community plugins** (not built by Payload):
  - [`payload-totp`](https://gittrend.io/repo/GeorgeHulpoi/payload-totp) 3.0.6: TOTP via authenticator app, wrapping existing access control. Peer `payload ^3.88.0`, compatible with 3.90.2. Last release 2026-10-04.
  - [`payload-passkey`](https://github.com/Robot-Inventor/payload-passkey) 2.1.2: passkeys/WebAuthn via Better Auth. Peer `payload >=3.69 <4` and Next 16. Last release 2026-10-03. It can be combined with TOTP.
  - Comparison: [buildwithmatija.com](https://www.buildwithmatija.com/blog/md/which-payload-cms-auth-plugin-to-use).
- **Decision status:** ADMIN MFA is required before production. Provider/plugin selection remains open and must be re-verified against the then-current Payload version. Password-only authentication does not meet the final security model.
  - The plugins above are a market snapshot from 2026-10-13, **not a selection**. No plugin or version is pinned or approved.
  - Adopting any option needs an explicit decision, a code review, a fresh compatibility check and an owner for updates.
- **Not implemented** (09.3 and 09.4).

### 17.10 Password reset

- Payload supports `forgotPassword` / `resetPassword` with a token: `auth.forgotPassword.expiration`, `generateEmailHTML`, `generateEmailSubject`, `minRequestInterval` ([docs](https://payloadcms.com/docs/authentication/email)).
- Without an email adapter, Payload **writes emails to the server console**, which was observed: "No email adapter provided. Email will be written to console". That would put reset tokens into logs.
- **Therefore:**
  - `staffOperationGuard` closes `forgotPassword` and `resetPassword` until a transactional email provider is configured (EU region, DPA, decision in §16).
  - Until then, ADMIN sets a new password in `/intern/admin`.
  - Test reset emails must only ever go to a local catcher, never to real people.

### 17.11 Test architecture and clean-database proof

| Suite | Content | Count |
|---|---|---|
| `npm test` (unit, no database) | Domain, content, data, backend incl. the gate, bootstrap rules and staff guards | **257** |
| `npm run test:db:clean` | The from-zero proof below | **24** (3 + 19 + 2) |

`npm run test:db:clean` (`scripts/test-db-clean.ps1`), local only:
1. Drop and create an **empty** `kinderarzt_staging_test`.
2. `payload migrate` from zero, plus `migrate:status`.
3. `next start` on port 3200 against that database.
4. `01-empty-database`: no first-user registration through any route.
5. The **real** bootstrap script with a generated password (never printed).
6. `02-runtime`: accounts, HTTP auth, roles, provenance, audit, transactions.
7. `03-parity`.

Safety and seeding:
- All tests refuse any database that is not a loopback `*_test` database.
- Accounts use `@integration-test.invalid`, and passwords are generated per run.
- `npm run db:seed-dev` fills the **dev** database with artificial accounts (`@praxis-test.invalid`; generated passwords only in `.env.local`) and invented operational data, written *through* those accounts so that provenance and audit are real.

### 17.12 npm audit (2026-10-13): 16 findings, none fixed by force

| Package (path) | Severity | Reachable here? | Fix |
|---|---|---|---|
| `undici` 7.29.0 (exact pin in `payload`) | high/moderate (DoS, cookie disclosure in shared caches, TLS bypass in `BalancedPool`) | Server-side HTTP client inside Payload; this app makes no outbound requests through it (no uploads, no URL fetching, no email) — low | Patched **7.29.1** exists. A safe option is an npm `overrides` pin to 7.29.1 (patch level); proposed, not applied. Otherwise wait for a Payload release |
| `braces` 3.0.3 ← `chokidar` 3.6 ← `sass` 1.77.4 (exact pin in `@payloadcms/next`) | high (DoS via nested patterns) | Build/dev file watching only, no user input — not reachable at runtime | No patched `braces` version exists; it depends on a Payload update |
| `esbuild` 0.18 ← `@esbuild-kit/*` ← `drizzle-kit` | moderate (esbuild dev server) | Migration tooling only, the esbuild dev server is never started — not reachable | Depends on a Payload/drizzle update |
| `dompurify` 3.4.15 ← `monaco-editor` (admin code editor) | low (IN_PLACE sanitising edge cases) | Admin UI only (ADMIN), no code/JSON editor fields in use — very low | Patched 3.4.17 exists; `overrides` possible; proposed |
| `payload`, `@payloadcms/*`, `drizzle-kit`, `@esbuild-kit/*`, `chokidar`, `sass`, `monaco-editor` | (inherited) | — | npm suggests `3.85.1`, a **downgrade** of the framework. Rejected |

`npm audit fix --force` was **not** run. Before production: re-check on every Payload update and decide on the two patch-level overrides (`undici`, `dompurify`) together with a full test run.
