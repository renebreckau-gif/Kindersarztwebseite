# Praxis Cockpit: Backend Foundation (Phase 09.2)

> **Status (2026-10-13):** this is the technical foundation only. The public website still reads **static data** (`DATA_SOURCE = "STATIC"`, `src/data/source.ts`). No database is connected, and no Payload route (admin, REST, GraphQL) is mounted. No real accounts exist, and the cockpit at `/lab/praxis-cockpit` still uses its mock login. `SITE_STAGE = "STAGING"` and `RELEASE.indexable = false` are unchanged.
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
- Versions are pinned exactly: `payload@3.90.2`, `@payloadcms/db-postgres@3.90.2`, `graphql@16.14.2`.
- **Not yet installed:** `@payloadcms/next` and `@payloadcms/ui` (admin UI and route handlers). They arrive with the routes in 09.3 (see §8 and §16).

## 3. Database adapter

- **Official PostgreSQL adapter:** `@payloadcms/db-postgres`, built on Drizzle and `pg`. It is configured in [`payload.config.ts`](../../payload.config.ts):
  - `postgresAdapter({ pool: { connectionString: process.env.DATABASE_URI } })`
  - `push: false`: no automatic schema push against shared databases. Schema changes go through migrations in `src/backend/migrations/` (created in 09.3 against a local database).
- **Vercel Postgres / Neon variant:** `@payloadcms/db-vercel-postgres` exists. It is chosen only once the provider decision is made (§16).
- **Environment:** see [`.env.example`](../../.env.example). It holds placeholders only (`DATABASE_URI=`, `PAYLOAD_SECRET=`). `.env*` stays git-ignored.
- **Local setup (developer machine):**
  - Docker is not installed on the current machine, so no compose file was added.
  - A local PostgreSQL 16 service exists, but no credentials are available to this project. No database was created and none was connected.
  - Planned local procedure (09.3):
    1. Create the database `praxis_cockpit_dev` with its own role.
    2. Copy `.env.example` to `.env`.
    3. Generate the first migration with `payload migrate:create`.
    4. Run `payload migrate`.
  - Only synthetic test data is used, never practice data.
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
| `src/data/source.ts` | `DATA_SOURCE = "STATIC"` (in code, independent of `SITE_STAGE`, never derived from Vercel), `getPracticeRepository()`, `FAIL_SAFE_PULS_DATA`, `readPulsDataSafely()` |
| `src/data/payload-mapping.ts` | Pure, lossless mapping between documents and domain types, both ways (null ↔ absent, `recordId` ↔ `id`, `openEnded` ↔ `"OPEN_ENDED"`) |
| `src/backend/payload-repository.ts` | `PayloadPracticeRepository`: reads through a minimal `PayloadReader` interface that Payload's Local API satisfies. **Not authoritative; not wired to the site.** |

**Coverage of the contract:**
- `getPulsData()` returns the weekly schedule, consultation types, opening-hour exceptions, closures, replacement practices, holiday calendar and holiday policy in one `PulsData`.
- `getAnnouncements()` returns the announcements.
- Audit entries and staff accounts have their own contracts (`AuditRepository`, `StaffDirectory`). Their Payload implementations follow in 09.3, together with the routes.

**Public site:** `resolvePuls(params, now, source = staticPulsData())` reads the repository snapshot. Behaviour is unchanged; this is covered by a test over 21 days at 90-minute steps.

## 5. Dependency direction

Enforced by tests in `src/backend/__tests__/backend-foundation.test.ts`:

- `src/domain/` imports nothing from Payload, React, Next, `src/lab`, `src/backend`, `src/data` or `src/content`.
- No file outside `src/backend/` (public app, content, data, lab) imports `payload`, `@payloadcms/*` or `src/backend`. The public site cannot accidentally read from the database.
- Inside `src/backend/`, Payload is imported **as types only**. Runtime coupling exists only in `payload.config.ts`.
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

`Sources` was **not** added. Provenance uses the fixed source id `PRACTICE_COCKPIT`. A source registry follows only if editorial sources move into the backend.

**Storage format:**
- Dates are text `YYYY-MM-DD` (Europe/Berlin calendar dates) and times are text `HH:MM`. These are exactly the domain's `LocalDate` and `LocalTime`, so no timezone conversion happens in storage.
- Validators enforce the format.

**No patient data:**
- `src/backend/privacy.ts` rejects field names that look like patient data: patient, birth/Geburt, diagnosis/Befund, treatment/Behandlung, appointment/Termin, insurance/Versicherung, medical record/Krankenakte, message/Nachricht, Anliegen, symptom.
- The check runs when the config is built (`payload.config.ts` throws) and in the tests.
- The only allowed exception is `publicMessage`, which holds public website wording.

## 7. Authentication

| Requirement | Status in 09.2 |
|---|---|
| Payload built-in auth on `staff` (hashed passwords, no custom crypto, no home-grown auth) | **Configured** |
| HttpOnly session cookie, `Secure`, `SameSite=Lax` | **Configured** (`auth.cookies`) |
| Lockout: 5 failed attempts → 15 min | **Configured** (`maxLoginAttempts`, `lockTime`) |
| Session lifetime 8 h | **Configured** (`tokenExpiration`) |
| No API keys | **Configured** (`useAPIKey: false`) |
| Disabled accounts cannot sign in | **Configured** (`beforeLogin` hook) and every access rule treats `active: false` as signed out |
| Revocation | Disabling the account blocks login and access on the next request. Payload's session handling is reviewed in 09.3. |
| Password reset | Payload flow exists, but **no email adapter** is configured, so no emails can be sent. Provider decision in §16. |
| MFA (TOTP / passkeys) | **Documented only.** Required for ADMIN before go-live (praxis-cockpit.md §4). Uses an established library or plugin; nothing built from scratch without approval. |
| Login UI / production cockpit | **Not built.** The mock login at `/lab/praxis-cockpit/anmelden` is unchanged. |
| Real accounts | **None created.** The first ADMIN is created in 09.3 via a one-off CLI/Local API script, not via an open registration page. |

## 8. Role enforcement

Server-side rules live in `src/backend/access.ts` (pure functions, tested). Hiding UI is never the only protection.

| Collection | read | create / update | delete |
|---|---|---|---|
| staff | ADMIN, or own record | create: ADMIN · update: ADMIN or self (role/active: ADMIN only) | never |
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

**Admin UI:**
- Not mounted in 09.2.
- In 09.3 it goes into its own route group `app/(payload)/` under a path that does not collide with `/praxis`, `/entdecken`, `/heute`, `/review` or `/lab`. Proposal: `/verwaltung-intern`.
- Access is **ADMIN only** (`admin` access on `staff`). It is not the tool for daily work; that is the cockpit.
- Mounting it requires moving the current root layout into a route group, which is a structural change of its own. That is why it is deferred.

## 9. Audit

`auditHook` (afterChange) in `src/backend/hooks.ts` appends one `auditEvents` document per write. It runs in the same transaction (`req`) with `overrideAccess`.

- **Contents:**
  - actor id, plus name and role as a snapshot at the time of the action
  - timestamp (ISO UTC; displayed in Europe/Berlin)
  - entity type and id
  - operation (CREATE / UPDATE / REVERT)
  - previous and new version
  - publish state
  - change-set id and `revertOf`
- **Never stored:** password, hash, salt, tokens, reset tokens, API keys, sessions or lockout counters. `stripSecrets` is applied recursively (tested).
- **Append-only:** create, update and delete are `never` through the API.
- **Undo:** `buildRevertEvent` creates a **new** REVERT event that restores `previous`. The original event is never changed.
- Lab-prototype audit entries are not migrated; they are mock data.

## 10. Provenance

`provenanceHook` (beforeChange) generates `verification` from the **logged-in account + operation + Berlin date** (`buildProvenance` / `verificationForWrite`):

- `verifiedBy = "<Name>, <Rollenbezeichnung> (Praxis Cockpit)"`, `sourceIds = ["PRACTICE_COCKPIT"]`, `lastVerified` = today in Berlin, and `reviewDue` set per kind:
  - exceptions and closures: their end date
  - announcements: `validUntil`, or today + 30 days when open-ended
  - standing data: today + 182 days
- Client-supplied `verifiedBy`, `lastVerified` and `status` are **overwritten**, including nested rule verifications in the weekly schedule. The fields are read-only in every UI.
- Writes outside the role's confirmation boundary are **rejected** ("Diese Angabe kann nur eine Ärztin oder ein Arzt bestätigen."). The one exception: an ADMIN entering replacement-practice data stores it as `TO_BE_CONFIRMED`, and it never becomes public until a doctor confirms it.
- The **holiday policy** saved by ADMIN always stays `TO_BE_CONFIRMED`. The mapping then treats it as `REQUIRE_EXPLICIT_ENTRY` (fail-safe). A physician confirmation flow follows in 09.3.
- No fake provenance for test data. Existing static content keeps its documented provenance. Mein Arztbesuch approval records and Discovery provenance are untouched (`TO_BE_CONFIRMED`).

## 11. Expiry

- No cron job deletes anything. A record's **inclusive end date** (Europe/Berlin calendar day) decides relevance at read time:
  - `notExpired` / `expired` for exceptions and closures
  - `announcementExpired` for announcements (open-ended announcements never expire)
- Expired records stay in the database and the audit trail as history. The engine simply no longer matches them on later days.
- Because dates are stored as Berlin `LocalDate` text, DST changes cannot shift an end date.

## 12. Cache and revalidation (design for 09.4)

- Public pages render Praxis Puls per request (`ƒ` routes) from a repository snapshot. With the database source:
  1. Read once per request through a cached loader (Next `unstable_cache` / `"use cache"` with tag `practice-data`, short TTL of ≤ 60 s as a safety net).
  2. After a successful publish, an `afterChange` hook calls `revalidateTag("practice-data")`.
  3. If revalidation fails, the TTL bounds staleness. The cockpit shows "Website wird aktualisiert …" until a version endpoint (`/api/puls-version`, 09.8) confirms the new version.
- Status is **always** computed by the engine at request time from the snapshot. Status results are never cached, so "open/closed" cannot go stale.

## 13. Fail-safe

- `readPulsDataSafely(repo)`: any read error returns `FAIL_SAFE_PULS_DATA` (no schedule). The engine then resolves to **UNKNOWN** ("Aktuelle Sprechzeiten" plus phone), **never a guessed OPEN**. Tested.
- No silent fallback to stale static data after cutover. Static data could contradict a published closure, so a contradiction is worse than UNKNOWN. The static source stays available only as the **explicit rollback** of `DATA_SOURCE` (§14).
- More mapping fail-safes:
  - missing weekly schedule → UNKNOWN
  - unverified holiday policy → `REQUIRE_EXPLICIT_ENTRY`
  - unverified records → the engine's existing verification rules apply

## 14. Migration plan

1. **09.2 (this phase):** foundation, mapping and parity tests. `DATA_SOURCE = "STATIC"`. **No cutover.**
2. **09.3:**
   - local database, first migration, mount Payload routes (admin route group, ADMIN only)
   - production-grade auth (first ADMIN by script, MFA decision)
   - Payload implementations of `AuditRepository` and `StaffDirectory`
   - DB integration tests against an isolated database
3. **Seed:** `docsFromPulsData(PULS_DATA)` creates the documents from the current static content, one-off, reviewed, with provenance carried over **as documented** (not regenerated).
4. **Parity gate:** for the seeded database, `PayloadPracticeRepository.getPulsData()` must deep-equal `staticPulsData()`, and `getPracticeStatus` must be identical over a long sampled window (§15).
5. **Cutover (09.4 or later, separate reviewed change):** `getPracticeRepository()` returns the Payload repository when `DATA_SOURCE = "PAYLOAD"`. Pages switch to the async read through `readPulsDataSafely`.
6. **Rollback:** set `DATA_SOURCE` back to `"STATIC"`. This is one line and is tested before go-live.

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

**With a database (09.3):** the same parity assertions run against a seeded, **isolated** test database. They are skipped unless an explicit test-database variable is set, and they refuse URIs that do not name a test database. They never connect to production.

## 16. Open infrastructure decisions

These need an owner and a decision before any real data or account exists. This document makes **no** data-protection or GDPR compliance claim.

| Topic | Open question |
|---|---|
| Database provider | Managed PostgreSQL (e.g. Neon / Vercel Postgres, Supabase, a German hoster) |
| Region | EU region required; exact location to be named |
| DPA / AVV | Data processing agreement with the DB, hosting and email providers, signed by the practice |
| Object storage | Not needed in V1 (no uploads); decide if images ever move into the backend |
| Email | Provider for password reset and invites; until then no email features |
| Backups | Frequency and retention; **restore test** before go-live (09.8) |
| PITR | Point-in-time recovery available or not, and the window |
| Maintenance owner | Named person or agency responsible for updates and incidents |
| Patching | Update cadence for Payload, Next.js and Node; security advisories |
| Monitoring | Uptime, error tracking, revalidation failures, `/api/puls-version` |
| MFA | TOTP or passkeys for ADMIN (library or plugin choice) |
| Admin route path | Final path for the ADMIN-only Payload admin (proposal `/verwaltung-intern`) |
