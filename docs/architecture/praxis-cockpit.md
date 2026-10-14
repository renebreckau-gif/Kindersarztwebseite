# Praxis Cockpit: Staff Portal Architecture

Current status: Phase 09.5B done: the real operational writes of 09.5A (7.1 Heute früher schließen, 7.2 Heute geschlossen) now have an explicit record lifecycle (ACTIVE / RETIRED), explicit supersede and a safe "Änderung zurücknehmen" for the latest change, proven locally against PostgreSQL. The public website stays static: cockpit publishes do not change it yet. Details in the status table below.
Last updated: 2026-10-14
Historical baseline of the Phase 09.0 architecture decision (§0–§14): `e589478`
Builds on: [cms-requirements.md](cms-requirements.md) · [cms-comparison.md](cms-comparison.md) · [content-model.md](content-model.md) · [content-governance.md](content-governance.md) · [practice-pulse-logic.md](practice-pulse-logic.md) · [privacy-model.md](privacy-model.md) · [phase-04-decisions.md](phase-04-decisions.md)

> **GLOBAL PROJECT RULE — deployment model:** the current Vercel deployment is the project's **STAGING** environment, not the live practice website. Implemented functionality is normally visible there for review; formal publication gates are kept for the future production launch and do not hide staging content. Single switch: `SITE_STAGE` in `src/content/release.ts`. See [deployment-model.md](deployment-model.md).

## Current status (2026-10-14, after Phase 09.5B)

| | |
|---|---|
| **Prototype** | Implemented through Phase 09.1.4 and locked for staff usability testing: `/lab/praxis-cockpit`. Directly reachable on STAGING; not in the patient navigation; `noindex`; mock data only. Blocked (404) once `SITE_STAGE = "PRODUCTION"`. |
| **Backend** | Runs **locally**: Payload runtime, collections, access rules, provenance, audit and the publish guard, against an isolated PostgreSQL cluster. It is proven by integration tests from an empty database (61 tests in 6 steps). See [backend-foundation.md](backend-foundation.md) §17. Not connected to the public site, and not hosted anywhere yet. |
| **Payload** | 3.90.2 with `@payloadcms/next`/`ui`/`db-postgres` 3.90.2 (no force flags). Admin at **`/intern/admin`** (ADMIN only), REST at `/api`, GraphQL disabled. First-user registration closed; the first ADMIN is created only by `scripts/bootstrap-admin.ts`. |
| **Database / persistence** | Local only: isolated PostgreSQL 16.2 cluster on 127.0.0.1:5433 (`kinderarzt_app`, not a superuser). Migrations from zero via the Payload CLI. Production provider open. The prototype state still lives in memory; a reload resets it. |
| **Real authentication** | Payload auth on `staff`, verified: login, generic failures, disabled accounts, lockout, logout with session revocation, cookie `HttpOnly; SameSite=Lax; Secure`. Artificial `.invalid` test accounts only; no real accounts. Still required before production: transactional password reset and ADMIN MFA (backend-foundation §17.9–17.10). The prototype keeps its mock login. |
| **Public website** | Uses the same Praxis Puls engine. `resolvePuls` still consumes the **static snapshot directly** (`staticPulsData()`, synchronous). It does not load through `PracticeRepository.getPulsData()`; repository-based public loading arrives with the cutover. `DATA_SOURCE = "STATIC"` is a reserved migration-target selector, not yet an active switch. Output unchanged (tested). Release gates are unchanged. |
| **Staff entry** | Footer link **"Mitarbeiterbereich"** (after Impressum · Datenschutz · Barrierefreiheit; not in the main navigation, dock or hero) → **`/mitarbeiter`**, the stable human entry point. STAGING without backend (Vercel today): prototype only. STAGING with a configured database (local): prototype **and** real login, clearly labelled. PRODUCTION: real login only when `RELEASE.staffPortalProductionEnabled` — the **same** decision as the request gate (`staffPortalAvailable`), so the footer can never lead to a 404; never the lab. The footer placement is a UX choice, **not** security. |
| **Internal routes** | `/intern/anmelden` (real login); `/intern` (real cockpit: Praxis heute from the database, Nächste Termine, Prüfen); `/intern/heute/frueher-schliessen` and `/intern/heute/geschlossen` (**real writes** to the cockpit database, 09.5A); `/intern/verlauf/[vorgang]/zuruecknehmen` (undo preview; the undo itself is an authenticated POST to `/intern/verlauf/ruecknahme`) and `/intern/verlauf/zurueckgenommen` (09.5B); `/intern/vorschau` (Website-Vorschau + comparison with the static website); `/intern/admin` (ADMIN only). Available where the real staff portal is available: STAGING with a configured database; in PRODUCTION only with `RELEASE.staffPortalProductionEnabled` (currently `false`). On Vercel staging (no database) they answer 404. Urlaub, Hinweise, Sonderöffnungszeiten and Akutsprechstunde remain prototype-only. |
| **Review hub** | `/review` is **project review tooling** (developers and reviewers): links to the website, the cockpit prototype and Mein Arztbesuch. It is **not** the staff entry; that is `/mitarbeiter`. Available while `SITE_STAGE = "STAGING"`; 404 in PRODUCTION. No `/intern` link, because the deployed staging has no database. |
| **Mein Arztbesuch** | Visible on STAGING for review (`SITE_STAGE`). Not released for production: `meinArztbesuchPublished = false`, formal approvals open (`meinArztbesuchApproved = false`, records truthful); site stays `noindex` (`indexable = false`). |
| **Next phase** | 09.5C (not started; scope set by its own brief). Later: further workflows (Sonderöffnungszeiten, Akutsprechstunde, Urlaub, Hinweise) and, separately, the public data cutover. |
| **Launch blockers** | `LIVE_HOST_ACCESS = OPEN` (existing webhost not accessible), and domain/DNS access unknown (project-blockers LB-13/LB-14). Production backend infrastructure: LB-15. None of these blocks staging or development. |


### Phase history

| Phase | Content | Commit |
|---|---|---|
| 09.0 | Architecture: Payload backend + custom cockpit, roles, auth, hosting, privacy (this document, §0–§14; historical baseline) | `80aa5f6` |
| 09.1 | Clickable cockpit prototype with the real engine and mock data | `30e2fc3` |
| 09.1.1 | Praxis Puls alignment: weekend holidays, time-aware special hours, grouped intervals, lunch-gap wording | `93878b6` |
| 09.1.2 | Mock login, vacation and replacement end to end, website view for parents | `35dc9d2` |
| 09.1.3 | Live Website-Vorschau (edit left / preview right), automatic expiry, history retention, lab test clock | `ecdd432` |
| 09.1.4 | Editing existing changes (edit vs. supersede vs. conflict), prototype lock, documentation cleanup; staging review hub and Discovery review availability | `b5466f5` + review hub commit |
| 09.2 | Backend foundation: repository layer (static authoritative), domain operations extracted, Payload + PostgreSQL adapter, collections, access/provenance/audit, parity tests | `8edc9cf` |
| 09.3 | Isolated PostgreSQL dev cluster, migrations, Payload runtime (`/intern/admin`, `/api`), closed first-user registration + bootstrap script, `/intern` auth shell, integration tests from zero (auth, roles, provenance, audit, transactions, DB parity) | `0e53670` (preparatory work: `3d2c316`) |
| 09.4 | Staff entry (footer → `/mitarbeiter`), real read-only cockpit from the database (Praxis heute, Nächste Termine, Prüfen), Website-Vorschau with static-vs-database comparison, role-aware navigation | `5b549be` |
| 09.5A | Real operational writes for 7.1 Heute früher schließen and 7.2 Heute geschlossen (server draft → engine preview → revalidation → one transaction with provenance + audit + changeSetId), dataset fingerprint against stale previews, production staff-portal release gate | `13b62a5` |
| 09.5B | Record lifecycle (ACTIVE / RETIRED, server-controlled), explicit supersede in both directions, multi-day safety, safe undo of the latest change (CREATE → retire, EDIT → restore, SUPERSEDE → reactivate) with REVERT audit events, "Letzte Änderung" on `/intern` | this commit |

**How to read this document:** §0–§14 are the Phase 09.0 architecture decision and remain valid unless a later phase note says otherwise. The phase notes at the end record what the prototype changed or proved. Statements that became outdated are marked inline ("since 09.1.x").

---

## 0. Audit of the existing architecture (input to this decision)

| Area | Current state (verified in code) | Consequence for the cockpit |
|---|---|---|
| **PRAXIS PULS engine** | `getPracticeStatus(now, data, options)` in `src/domain/practice-status.ts` is pure, deterministic and fixed to Europe/Berlin. Day resolution (since 09.1.1): closures, then exceptions, then a confirmed regular closed weekday, then holiday policy, then weekly rules. Contradictions resolve to UNKNOWN with a `ReasonCode` (`EXCEPTION_CONFLICT`, `CLOSURE_EXCEPTION_CONFLICT`, `RULE_CONFLICT`, `ACUTE_CONFLICT`, `HOLIDAY_WITHOUT_RULE`, …). | The cockpit preview and the server-side publish check **call this function**. There is no second implementation. |
| **Public binding** | `resolvePuls()` in `src/content/puls.ts` maps the engine result to the hero view model. Its input is the static `PULS_DATA` from `src/content/schedule.ts`. | One refactor is needed: `resolvePuls` must accept `PulsData` as a parameter, so that the public site and the preview use the same mapping. This does not change behaviour and is covered by the existing `puls-live` tests. |
| **Verification** | `FactVerification` and `evaluateFreshness()` in `src/domain/verification.ts`. Exceptions, closures, replacement practices and emergency entries have grace 0 and require `lastVerified`, `verifiedBy` and `reviewDue`. | Every cockpit entry must carry complete verification metadata. The named account that publishes the entry **is** the practice confirmation (see §7.0). |
| **Closures / exceptions** | Types exist (`Closure`, `OpeningHourException`). Today `PULS_DATA` has `exceptions: []`, `closures: []` and `replacementPractices: []`. | These three lists are what staff edit day to day. The weekly schedule changes rarely. |
| **Replacement practices** | Directory type exists. No entries yet (F53: no legacy import). | A closure can reference only directory entries. Directory entries are verified separately. |
| **Holidays** | `PUBLIC_HOLIDAYS_ST` with policy `REQUIRE_EXPLICIT_ENTRY`. F49 is unconfirmed, so a weekday holiday resolves to UNKNOWN. Since 09.1.1, a holiday on an explicitly confirmed closed weekday resolves to CLOSED. | The cockpit lists upcoming unresolved weekday holidays under "Prüfen". It never infers "closed". |
| **Announcements** | `decideAnnouncement()` requires verification, `published`, and today inside `validFrom … validUntil`, or an explicit `OPEN_ENDED`. | Workflow 7 maps onto this directly. |
| **Release gates** | `RELEASE.pulsPracticeSignOff = true`, `meinArztbesuchApproved = false`, `indexable = false` (since 2026-10-13 additionally `meinArztbesuchPublished = false` — production decision, not set; plus `SITE_STAGE`). | The cockpit does **not** control release gates in V1; they stay deliberate code changes. |
| **Rendering** | Pages read `searchParams` and compute PULS per request. No CMS, no database. `next.config.ts` sends `X-Robots-Tag: noindex` everywhere. | Data loading moves behind a repository adapter (§10.4). Time is still evaluated per request. |
| **Deployment** | The repo has no `vercel.json` and no deployment notes. The brief states that the staging preview is deployed on Vercel. | Hosting is decided in §10. The staging deployment must never hold real staff accounts before 09.3. |

---

## 1. Product goal

A small, German, task-based staff portal ("Praxis Cockpit"). It lets named practice staff change **what the public website says about the practice today and in the coming weeks** in under a minute, safely, from any device.

What the cockpit must achieve:

1. **One question per screen:** "What is happening at the practice?" Staff should not need to think about which data type to edit.
2. **The website never lies.** Every change is previewed with the real PRAXIS PULS engine before it is published. Changes that would create a contradiction are blocked. The public site fails safe (UNKNOWN), never falsely OPEN.
3. **Nobody has to remember things.** Entries expire automatically. Reviews come to the person; they do not depend on someone's memory.
4. **Every change is traceable and reversible:** who made it, when, what it was before, and one button to undo it.
5. **It is not a patient system** (§11). It holds no patient data of any kind.

Acceptance (unchanged from cms-requirements §8, plus two new criteria). Measured with real staff:

- Enter a vacation with two replacement periods in ≤ 3 minutes.
- Add an announcement with an end date in ≤ 1 minute.
- Preview PULS for a future date without help.
- Understand every warning without explanation.
- **New:** "Heute früher schließen" from phone in ≤ 30 seconds, preview included.
- **New:** Undo the last change in ≤ 15 seconds.

---

## 2. Recommended architecture

**Option A: Payload as the backend (data, auth, access control, versions, migrations) plus a custom, task-oriented Next.js cockpit at `/intern`, in the same codebase as the public site, on PostgreSQL in the EU.**

This confirms the Phase 04 decision (Payload, self-controlled data, PostgreSQL, EU) and sharpens it on one point:

> **Staff never use the generic Payload admin UI.** They use a purpose-built cockpit that calls the Payload Local API on the server. The Payload admin panel is reachable only for ADMIN, for rare structural tasks: accounts, the replacement directory, the holiday calendar and the weekly schedule.

```
                      ┌──────────────────────── Next.js app (one repo, one build) ─────────────────────────┐
 Eltern (öffentlich)  │  app/(site)/…           public pages, PULS per request                            │
 ───────────────────▶ │        │                                                                          │
                      │        ▼                                                                          │
                      │  src/content/repository.ts   loadPublishedData() → PulsData, notices, …           │
                      │        │        (cached by tag; on any read error → fail-safe dataset, §12)       │
                      │        ▼                                                                          │
                      │  src/domain/*   getPracticeStatus · decidePublication · decideAnnouncement  ◀──┐  │
                      │                 (the ONLY rules engine)                                         │  │
 Praxisteam (intern)  │  app/(intern)/intern/…   cockpit UI (German, task-based)                         │  │
 ───────────────────▶ │        │  server actions                                                         │  │
                      │        ▼                                                                          │  │
                      │  src/cockpit/*   workflows → draft change set → preview (engine) ─────────────────┘  │
                      │        │         publish: validate (engine) → write → audit → revalidateTag           │
                      │        ▼                                                                             │
                      │  Payload (Local API, auth, access control, versions)   /intern/admin (ADMIN only)    │
                      └────────┼─────────────────────────────────────────────────────────────────────────────┘
                               ▼
                     PostgreSQL (EU)  ·  object storage (EU, media only)  ·  transactional e-mail (EU, invites/reset)
```

Why one codebase: the domain engine, the preview and the public site must be **the same TypeScript**. Phase 04 named this as CMS risk 5, preview fidelity. A separate cockpit service would need to import or copy `src/domain`, and copying it is exactly the drift this architecture exists to prevent.

---

## 3. Alternatives considered

Scale: ++ strong · + good · ○ neutral · – weak · –– problematic, for **this** practice. Sanity facts are from the Phase 04 source check (2026-10-07). Nothing new was verified for Sanity in this phase.

| Criterion | **A: Payload + custom cockpit** | B: custom Next.js + PostgreSQL + auth library | C: Sanity Growth |
|---|---|---|---|
| Ease of use for staff | ++ (custom cockpit) | ++ (custom cockpit) | + (Studio is polished but data-type oriented; custom task UI is possible as Studio tools) |
| Authentication | + built-in auth collections: cookie sessions, lockout, password reset | ○ we assemble and own it (library + our code) | ○ Sanity accounts managed by the vendor; SSO is Enterprise |
| Roles | ++ code-defined, field-level | ++ but all hand-built | + 5 roles on Growth (Phase 04 check) |
| Audit | + versions built in; our append-only audit collection via hooks | ○ all hand-built | – document history exists; a full audit trail is Enterprise (Phase 04 check) |
| Validation (server-side, blocking) | ++ hooks call `src/domain` in-process | ++ | – Studio validation is client-centric; server-side guarantees need extra infrastructure |
| TS domain-engine compatibility | ++ same process, shared types | ++ | ○ engine runs on the site, not at edit time; preview needs a separate integration |
| Praxis Puls integration | ++ preview and publish check use the same function | ++ | ○ possible, but the publish check cannot block inside the content store |
| Vercel compatibility | + supported deployment target; needs pooled Postgres and object storage (to confirm with the current versions in 09.1) | ++ | ++ (hosted backend) |
| EU / privacy | ++ EU database of our choice; internal fields never leave it | ++ | ○ vendor cloud; data residency **not verified** (Phase 04) |
| Database ownership | ++ own PostgreSQL | ++ | – proprietary Content Lake; export only |
| Backups | ○ our responsibility (managed PITR + dumps) | ○ ours | ++ vendor |
| Maintenance | – updates and patches for Payload, Next and the DB driver are ours | –– everything is ours, including auth security | ++ vendor (Studio upgrades remain ours) |
| Cost | + no licence; hosting plus a maintenance contract | + no licence; highest development and maintenance hours | – per seat per month (Phase 04: $15/seat on Growth), scales with staff |
| Extensibility | ++ | ++ | + |
| Custom task UI | ++ | ++ | + |

**Why not B:** B gives the same cockpit, but we would hand-build and own authentication, session security, password reset, lockout, access control, versioning and migrations. For a medical practice with a small maintenance budget, owning auth security is the biggest risk. Payload provides these as maintained, open-source building blocks (MIT, own database) without forcing its admin UI on staff.

**Why not C:** Sanity remains the documented fallback for the case where nobody can own operations. Even then, publish-blocking validation with the PULS engine would only be advisory, and the audit trail and data residency would depend on the vendor plan. The Phase 04 reasoning still holds.

**Phase 04 bias check:** The decision is not overturned. The one material refinement is "custom cockpit for staff, Payload admin for ADMIN only". This replaces the Phase 04 idea of configuring the Payload admin itself into a task UI (cms-requirements §2). The reason is that the requested home screen, quick actions and same-engine preview are product UI, not form configuration.

**Conditions (carried over from Phase 04, still open):**

- A named party accepts hosting, backups, updates and security patching (maintenance agreement).
- The hosting, database and e-mail providers are chosen with a DPA after privacy review ⚖.
- Payload's direction under Figma ownership is monitored, and compatibility with the project's Next.js version is confirmed at implementation time (09.1).

---

## 4. Authentication

### 4.1 Requirements → design

| Requirement | Design |
|---|---|
| No self-registration | The `staff` auth collection has `create` access for ADMIN only. There is no public sign-up route. |
| Admin-created, named personal accounts | Fields: `name`, `email`, `role`, `active`. The account e-mail must be a personal address (help text: "Persönliche Adresse, kein Sammelpostfach"). Hard-blocking role mailboxes such as `praxis@…` is not possible, so ADMIN confirms "persönliches Konto" when creating an account. |
| No shared login | One person per account. The audit log shows a name for every change. A shared login would make the audit meaningless, so this is a written usage rule that every staff member confirms. |
| Secure sessions | HttpOnly, Secure, SameSite=Lax session cookie. Idle timeout 8 h (one working day) and absolute lifetime 7 days (proposal). Cookie path limited to `/intern` where possible. CSRF protection on server actions. |
| Disable / revoke | `active = false` blocks login immediately and invalidates sessions (session check per request, §4.4). ADMIN can also "Alle Sitzungen beenden" for one account. |
| Recovery | "Passwort vergessen" sends a single-use, short-lived reset link to the account's personal e-mail. If e-mail is unavailable, ADMIN can trigger a new invite. The second ADMIN covers the case where an ADMIN is locked out (§5). |
| Audit attribution | Every write runs as the logged-in account. The audit entry stores account id, name snapshot and role snapshot. |
| Brute force | Lockout after 5 failed attempts for 15 minutes (proposal), plus rate limiting per IP on the login route. |

### 4.2 Methods evaluated

| Method | For | Against | Verdict |
|---|---|---|---|
| **E-mail + password** | Built into Payload; works on shared practice PCs and on phones; no e-mail dependency for daily login | Weak or reused passwords; phishing | **V1**, with a password policy (min. 12 characters, breached-password check if available) and an invite link instead of admin-set passwords |
| Magic link | No password | Every login depends on e-mail delivery and on reading e-mail on the same device; shared reception PCs and a shared practice inbox would turn it into a shared login | Not for V1 |
| Passkey (WebAuthn) | Phishing-resistant; fast on phones | Shared reception PCs, device-bound keys, recovery complexity; not part of Payload core at the last check (verify in 09.3) | **Later**, as an optional second sign-in method once staff devices are known |
| 2FA (TOTP app) | Strong second factor | Setup friction; a lost phone means recovery work | **V1: required for ADMIN, optional for STAFF and DOCTOR.** It is not in Payload core at the last check; plugin or custom implementation to be decided in 09.3. If it cannot be done safely in V1, ADMIN accounts are limited to the technical maintainer until it can. |

**Recommendation for V1:** admin-created personal accounts with an invite link (set your own password), e-mail + password, lockout and rate limit, mandatory TOTP for ADMIN. Passkeys follow as phase 2.

### 4.3 Not in V1

No SSO, no social login, no API keys for staff, no "remember me for 30 days", no login from the public site header (the cockpit URL is not linked anywhere public).

### 4.4 Request guard

Every `/intern/**` request (except the login and reset pages) requires a valid session **and** `active = true`, checked on the server per request. The public routes never read the session. `/intern/**` sends `noindex`, `Cache-Control: no-store` and does not appear in the sitemap.

---

## 5. Role model

Three roles. They are deliberately coarse, and each one maps to a real person in a small practice.

| Role (UI) | Who | Can | Cannot |
|---|---|---|---|
| **Praxisteam** (`STAFF`) | Reception and nursing staff | All workflows in §7; assign replacement practices **from verified directory entries**; resolve "Prüfen" items within these workflows; undo **their own and others'** operational changes | Change the weekly schedule; verify directory entries; confirm acute consultation; emergency information; accounts |
| **Ärztin / Arzt** (`DOCTOR`) | The practice physicians | Everything STAFF can do, plus: confirm or change the weekly schedule, confirm the acute-consultation type and rules, verify replacement-directory entries ("mit Praxis X telefoniert am …"), confirm emergency information, medical/ENTDECKEN approvals (later phase) | Accounts |
| **Verwaltung** (`ADMIN`) | One practice person + the technical maintainer | Accounts and roles, holiday calendar, directory data entry, Payload admin access, audit export | Nothing is hidden from ADMIN, but ADMIN **also** goes through the publish checks; there is no bypass |

Rules:

- **At least two named people per role that matters.** Two DOCTOR accounts and two ADMIN accounts. This covers vacation, which is exactly when closures and replacements change (governance risk 5).
- **Mapping from Phase 04 roles:** Redaktion → STAFF. Ärztliche Freigabe → DOCTOR. Notfallpflege → DOCTOR (no separate role; emergency data changes about four times a year). Recht → outside the cockpit in V1 (legal texts stay in code with legal review). Administration → ADMIN.
- **No per-field permission matrix.** If a fourth role ever seems necessary, the question is first "which workflow?", not "which field?".

---

## 6. Cockpit information architecture

### 6.1 Routes

| Route | Content | Roles |
|---|---|---|
| `/intern/anmelden`, `/intern/passwort` | Login, reset | public (rate-limited) |
| `/intern` | **Home** (6.2) | all |
| `/intern/heute/frueher-schliessen` · `…/geschlossen` · `…/sonderzeiten` · `…/akut` | Today workflows (7.1–7.4) | all (7.4 confirmation: DOCTOR) |
| `/intern/schliesszeiten` (+ `/neu`, `/[id]`) | Urlaub & Schließzeiten (7.5) incl. Vertretung (7.6) | all |
| `/intern/hinweise` (+ `/neu`, `/[id]`) | Aktuelle Hinweise (7.7) | all |
| `/intern/vertretungen` | Replacement directory: read for all; verify for DOCTOR; edit data for ADMIN | all / DOCTOR / ADMIN |
| `/intern/vorschau` | Website-Vorschau for any date and time (renamed in 09.1.3) | all |
| `/intern/verlauf` | Audit log + Undo (9) | all (read); export ADMIN |
| `/intern/sprechzeiten` | Weekly schedule (rare) | DOCTOR, ADMIN |
| `/intern/admin` | Payload admin | ADMIN |

`/intern` was chosen over `/praxis` (already public: `app/(site)/praxis`) and over `/admin` (generic and often scanned). The cockpit is a separate route group `app/(intern)` with its own layout. It never uses the public header, dock or Discovery art.

### 6.2 Home: "Guten Morgen"

```
Phone (390)                                   Desktop (1440)
┌──────────────────────────────┐             ┌───────────────────────────────────────────────────────────────┐
│ Guten Morgen, Frau A.     ☰  │             │ Praxis Cockpit                       Frau A. · Praxisteam  ⎋ │
│ Dienstag, 13. Oktober        │             ├───────────────────────────────────────────────────────────────┤
├──────────────────────────────┤             │ Guten Morgen, Frau A.  ·  Dienstag, 13. Oktober              │
│ PRAXIS HEUTE                 │             │ ┌─ PRAXIS HEUTE ───────────────────┐ ┌─ Schnellaktionen ─────┐│
│ ● Geöffnet · bis 11:00 Uhr   │             │ │ ● Geöffnet · Heute bis 11:00 Uhr │ │ [Heute früher schließ.]││
│ Jetzt: Bitte nur gesunde K.  │             │ │ Jetzt bis 10:00: nur gesunde K.  │ │ [Heute geschlossen]   ││
│ Website zeigt das gerade ↗   │             │ │ Nachmittag: 14–16 Terminspr.     │ │ [Sonderzeiten]        ││
├──────────────────────────────┤             │ │ So sieht es die Website ↗        │ │ [Urlaub eintragen]    ││
│ Schnellaktionen              │             │ └──────────────────────────────────┘ │ [Hinweis schreiben]   ││
│ [ Heute früher schließen   ] │             │ ┌─ Nächste Termine ────────────────┐ └───────────────────────┘│
│ [ Heute geschlossen        ] │             │ │ Fr 25.12. Feiertag – keine Angabe│ ┌─ Prüfen (2) ──────────┐│
│ [ Sonderzeiten             ] │             │ │ …                                │ │ ! 25.12. Feiertag …   ││
│ [ Urlaub / Schließzeit     ] │             │ └──────────────────────────────────┘ │ ! Vertretung X prüfen ││
│ [ Hinweis schreiben        ] │             │                                      └───────────────────────┘│
├──────────────────────────────┤             └───────────────────────────────────────────────────────────────┘
│ Prüfen (2)                   │
│ Nächste Termine              │             Tablet (768): two columns — PRAXIS HEUTE + Schnellaktionen on top,
└──────────────────────────────┘             Nächste Termine + Prüfen below.
```

- **PRAXIS HEUTE:** the live engine result for now (same `resolvePuls` view model as the hero), plus the rest of today's plan as plain lines. It always carries the link "So sieht es die Website".
- **Schnellaktionen:** five large buttons (≥ 48 px high, full width on phone). They are the only entry points for daily work.
- **Nächste Termine:** the next 21 days. It shows active and upcoming closures, exceptions, announcements with their end dates, and unresolved holidays on weekdays that are not confirmed closed. Holidays on Saturday or Sunday are not listed because the weekday is already confirmed closed. Example: 2026-10-31 is a Saturday and resolves to CLOSED; 2026-12-25 is a Friday and does not.
- **Prüfen:** all items that need a person, in due-date order. For each item it says what the website currently shows ("Website zeigt dort: Aktuelle Sprechzeiten").
  - Unresolved holidays.
  - Directory entries due for review.
  - Announcements without an end date older than 30 days.
  - Opening hours in the review grace period.
  - Emergency information due (DOCTOR).
  - Edits that failed to reach the website (§12).
- No dashboards, statistics, charts or "activity feed" on the home screen.

### 6.3 Responsive and touch

- Breakpoints as on the public site: 390 / 768 / 1440 are the verification sizes.
- Targets: all actions ≥ 48 px; minimum 44 px for dense table rows on desktop.
- Phone-first for the "today" workflows (staff often decide in the morning, away from the desk). Desktop-first for vacation with several replacement periods, with the phone version as a vertical step sequence.
- Forms use native `<input type="date">` and `<input type="time">`, large steppers for times, and no custom date picker.
- Full keyboard operation, visible focus, `aria-live` for the preview update, and error messages tied to fields. WCAG 2.2 AA, including 2.5.8 target size and 3.3.7 redundant entry: today's date and times are pre-filled.

### 6.4 Visual direction

- **Paper** (warm off-white surface) and **ink** (near-black text), using the public site's tokens where they exist. The cockpit is a quiet tool, not a second brand expression.
- **Cobalt** is the only action colour: buttons, links, focus.
- **Coral** sparingly, for "Prüfen" counts and draft markers only.
- **Green** only for valid/open: the PULS OPEN indicator and "Auf der Website ✓".
- **Red** only for emergency: the 112/Notfall reference and blocking errors that concern emergency data. Ordinary validation errors use ink with a coral marker, not red.
- No Discovery art, no illustrations, no hero imagery, no motion beyond state feedback (preview updates, the confirmation after publishing). Reduced motion is respected.

---

## 7. V1 workflows

### 7.0 Shared pattern: Entwurf → Vorschau → Veröffentlichen

1. The staff member chooses a quick action and answers 1–3 questions, with pre-filled defaults.
2. The cockpit builds a **change set**: a draft that is not yet visible. It runs the **real engine** on the published data plus the change set (§8) and shows the Website-Vorschau. Since 09.1.3 this happens live while editing ("Aktuell auf der Website" / "Mit dieser Änderung"), with no separate preview step.
3. A **publish button with the exact effect** as its label: "Heute um 11:00 Uhr schließen". There is no generic "Speichern".
4. The server re-validates (UI checks are never trusted), writes the change in one transaction, writes the audit entry and revalidates the public cache. It then confirms with the version the website reports (§12): "Auf der Website ✓ seit 09:41".

**Verification metadata is set by the system:** `status: VERIFIED_CURRENT`, `lastVerified: <today>`, `verifiedBy: "<Name>, <Rolle> (Praxis Cockpit)"`, `reviewDue: <endDate>`, `sourceIds: ["PRACTICE_COCKPIT"]`. The source is a `SourceReference` of type `PRACTICE_CONFIRMATION`, channel "Praxis Cockpit". This is real provenance (a named, logged-in account of the practice), not invented. Staff never type a name into a "verified by" field.

### 7.1 Heute früher schließen

- **Question:** "Bis wann ist heute geöffnet?" (time; default: next full half hour). Optional: "Kurzer Hinweis für die Website" (≤ 140 characters).
- **Data:** an `OpeningHourException` of kind `SPECIAL_HOURS` for today. Its intervals are today's resolved intervals cut at the chosen time, keeping consultation types, with `priority: 1`.
- **Preview:** PULS now, and PULS at the new closing time + 1 minute ("Heute geschlossen · Öffnet morgen um 08:00 Uhr").
- **Guards:**
  - Time must be later than now. If it is earlier, the action offers "Heute geschlossen".
  - If today is already UNKNOWN, the reason is shown and publishing is blocked until it is resolved.
  - If a closure covers today, publishing is blocked (`CLOSURE_EXCEPTION_CONFLICT`).

### 7.2 Heute geschlossen

- **Question:** "Ab wann?" (now / from a time today) and "Grund für die Website" (choice: Krankheit, Fortbildung, Technische Störung, Sonstiges, or no reason; free text ≤ 140 characters). "Vertretung?" offers verified directory entries only.
- **Data:**
  - "ab sofort": a `Closure` of kind `SHORT_NOTICE` for today. The engine shows TEMPORARILY_CLOSED with emergency/replacement actions.
  - "ab einer Uhrzeit": a 7.1 exception instead, because a closure is whole-day in the engine.
- **Guards:** the same conflict checks. If no verified replacement is selected, the preview shows the fallback actions (phone, Notfall), so staff see exactly what parents see.

### 7.3 Sonderöffnungszeiten

- **Question:** date(s) (default today), then 1–3 time slots, each with "Sprechstundenart" (only verified types are offered), then an optional message.
- **Data:** an `OpeningHourException` of kind `SPECIAL_HOURS`. For several dates it covers a date range.
- **Guards:**
  - No overlapping slots; start must be before end.
  - Slot type ACUTE is offered only if the ACUTE type is verified (7.4).
  - An overlap with an existing exception for the same date (same priority, different content) blocks publishing and shows both entries. The offered actions are "Bestehende ersetzen" (supersedes the old entry with an audit trail) or "Abbrechen".
  - Weekend openings are allowed. A verified exception wins over `confirmedClosedWeekdays`, and the preview shows it.

### 7.4 Akutsprechstunde ändern

Current fact state: the acute consultation (F44–F46) is **unconfirmed**. The engine suppresses it (`acuteSuppressed`).

- **V1, until confirmation:** the screen explains in one sentence: "Die Akutsprechstunde ist noch nicht bestätigt und wird auf der Website nicht angezeigt." A DOCTOR can confirm the ACUTE consultation type once, with name and date set by the system. STAFF see the explanation but no confirm button.
- **After confirmation:** day-specific acute slots are changed as a 7.3 exception with type ACUTE. The guard requires the acute slot to lie inside opening hours (`ACUTE_CONFLICT` otherwise). A permanent change to the weekly acute rule is a DOCTOR-only change in `/intern/sprechzeiten`.
- The cockpit never shows "Akutsprechstunde" publicly unless the engine says so.

### 7.5 Urlaub / Schließzeit

Step sequence (one screen with sections on desktop, steps on phone):

1. **Zeitraum:** from and to (end date required). Art: Urlaub, Fortbildung, Sonstiges.
2. **Ankündigen ab:** default 14 days before the start (proposal; the practice decides). The preview shows the "upcoming closure" message for that date.
3. **Vertretung:** split the period into sub-periods (default: one sub-period for the whole range, plus "Zeitraum teilen") and pick a practice for each from the **verified** directory.
4. **Hinweis für die Website:** optional, ≤ 280 characters.
5. **Vorschau:** PULS on the first day, on a day in each replacement sub-period, and on the day after the end, plus the "upcoming" message on the announcement day.

Guards:

- End ≥ start.
- Sub-periods inside the closure, with no gaps or overlaps between them. A gap is allowed but shown as "Ohne Vertretung: 03.–04.08. – Website zeigt dort Notfall-Hinweise".
- A conflict with SPECIAL_HOURS exceptions in the range blocks publishing.
- A replacement whose `reviewDue` falls before its sub-period ends gets a warning: "Die Prüfung der Vertretungspraxis X läuft am … ab. Danach zeigt die Website dort Notfall-Hinweise." DOCTOR can re-verify inline.

### 7.6 Vertretung (from the verified directory)

- STAFF **choose** from entries where `evaluateFreshness(…, "replacementPractice")` is CURRENT for the whole sub-period. Unverified or stale entries appear in the list greyed out with the reason, and cannot be selected.
- DOCTOR **verifies** an entry: "Mit Praxis X telefonisch bestätigt am <heute>" (system-set name and date). `reviewDue` defaults to today + 6 months, or the end of the planned use if that is earlier.
- ADMIN maintains the entry data: name, address, phone, contact persons. This is third-party data, so only what the practice publishes or agrees to is stored ⚖.
- There is no free-text replacement entry anywhere. This is the lesson from F52/F53.

### 7.7 Aktueller Hinweis (announcement) with expiry

- **Fields:** Titel (≤ 60 characters), Kurztext (≤ 280 characters), Wichtigkeit (Info / Wichtig; **"Dringend" is ADMIN/DOCTOR only**), gültig ab (default today), gültig bis (default today + 14 days), "Auf der Startseite hervorheben" (default off).
- **No end date** is possible only by explicitly choosing **"Unbefristet veröffentlichen"**, which is a separate, secondary button with a confirmation sentence: "Dieser Hinweis bleibt sichtbar, bis ihn jemand beendet. Er erscheint alle 30 Tage unter ‚Prüfen‘." There is no default path to OPEN_ENDED.
- **Preview:** the Heute section with the notice, and the homepage highlight if selected. It also states which other highlight it replaces: "at most one highlight" is decided by priority.
- **Lifecycle:** "endet automatisch am …" is shown after publishing. "Jetzt beenden" sets `validUntil = gestern`. This is an audited change, never a hard delete.

### 7.8 Explicitly not in V1

Recurring rules for exceptions; bulk import; holiday policy switch (stays a deliberate DOCTOR decision with its own verification, later phase); medical content and ENTDECKEN approvals in the cockpit (Phase 10+); team and person management; media uploads by STAFF; notifications by e-mail or push (later: weekly digest, no third-party tracking).

---

## 8. Validation and guardrails

All checks run **on the server at publish time** in a Payload `beforeChange` hook or server action, using `src/domain`. The cockpit UI runs the same checks earlier for feedback only.

| Rule | Implementation | Message (German UI) |
|---|---|---|
| **No new UNKNOWN days** | For every date in the change set's range (and the day before/after), resolve the day with and without the change. A date that becomes UNKNOWN **because of this change** blocks publishing. | "Diese Änderung widerspricht einem bestehenden Eintrag am {Datum}: {Eintrag}. Die Website würde dort ‚Aktuelle Sprechzeiten‘ zeigen." |
| Conflicts block | `EXCEPTION_CONFLICT`, `CLOSURE_EXCEPTION_CONFLICT`, `RULE_CONFLICT`, `ACUTE_CONFLICT`, `INVALID_DATA` caused by the change | as above, with both entries linked |
| Holidays not inferred | Holiday policy stays `REQUIRE_EXPLICIT_ENTRY`. An unresolved weekday holiday is a "Prüfen" item. There is no "closed" default. | "Am {Datum} ist ein Feiertag. Bitte Sonderöffnungszeit oder Schließung eintragen." |
| Unverified replacement | Not selectable. If it expires during the use: warning, and the inline re-verify button is DOCTOR-only. | "Diese Vertretungspraxis muss erneut bestätigt werden." |
| Announcements | `validUntil` required unless "Unbefristet veröffentlichen" was chosen explicitly (the server checks an explicit flag, not a missing date) | "Diese Meldung endet automatisch am {Datum}." / "Diese Meldung hat kein Enddatum. Bitte regelmäßig prüfen." |
| Dates | End ≥ start; nothing ends in the past; Berlin calendar dates only | "Das Enddatum liegt vor dem Beginn." |
| Times | start < end; no midnight crossing; no overlapping slots | "Die Zeiten überschneiden sich." |
| Weekly schedule | Only DOCTOR/ADMIN; the full engine check over the next 28 days must not create new UNKNOWN days | |
| Concurrency | Every change set carries the dataset version it was previewed against. Publishing a stale version is rejected. | "Inzwischen wurde etwas geändert (von {Name}, {Uhrzeit}). Bitte Vorschau neu laden." |
| Privacy | Length limits on all free text; help text "Keine Namen von Patientinnen und Patienten, keine Diagnosen." No free text in internal notes beyond 200 characters. | |

UNKNOWN that already exists (for example an unconfirmed holiday) does **not** block unrelated changes. Only UNKNOWN **introduced by** the change blocks.

---

## 9. Audit trail and undo

### 9.1 Audit log

An append-only collection `audit_events`. There is no update or delete access for any role, including ADMIN in the Payload admin.

| Field | Meaning |
|---|---|
| `id`, `at` | Instant (UTC) + Berlin local time for display |
| `actorId`, `actorName`, `actorRole` | Snapshot at the time of the change; survives account deactivation |
| `action` | `CREATE` · `UPDATE` · `END` (e.g. "Jetzt beenden") · `REVERT` · `VERIFY` · `LOGIN_FAILED_LOCKOUT` · `ACCOUNT_*` |
| `entityType`, `entityId` | e.g. `OpeningHourException` / `ex-2026-10-13-1` |
| `summary` | German one-liner generated by the workflow: "Heute (13.10.) um 11:00 Uhr geschlossen" |
| `before`, `after` | JSON snapshots of the entity (no account secrets, no session data) |
| `changeSetId` | Groups the writes of one publish |
| `publicationState` | `PUBLISHED` · `REVERTED` · `SUPERSEDED` · `EXPIRED` (derived for display) |
| `websiteConfirmedAt` | When the public site reported the new dataset version (§12), or empty |

`/intern/verlauf` lists events newest first, filterable by date and person, in plain German. ADMIN can export a date range as CSV. Retention period: to define in privacy review ⚖. The proposal is 24 months for content events and 12 months for login events.

### 9.2 "Änderung zurücknehmen"

> Since 09.5B the real implementation differs in detail; see the Phase 09.5B note (no Payload versions, `auditEvents` is the history, retired records stay in the database).

> Since 09.1.4 (prototype-proven): editing an existing record publishes a **new version of the same record**. Version 1 stays in the audit history and version 2 becomes active. "Änderung zurücknehmen" on an edit restores the previous version; it does not delete the record. Only the latest change can be undone.

- Every published change set has **"Änderung zurücknehmen"** in the confirmation screen, on the home screen ("Letzte Änderung: … · Zurücknehmen", for 24 h) and in the audit log.
- Undo **never deletes**. It creates a new change set that restores the `before` snapshots. That change set runs through the same preview and validation, gets its own audit entry (`REVERT`, linked to the original) and marks the original `REVERTED`.
- If later changes touched the same entities, undo is blocked and the conflicting changes are shown. There is no silent merge.
- Undo is offered only while the change still affects the present or future. Expired entries are history, not something to undo.

---

## 10. Hosting

### 10.1 Recommendation

| Component | Recommendation | Notes |
|---|---|---|
| App hosting | The existing Next.js app (public site + `/intern` + Payload) on **Vercel with serverless functions pinned to Frankfurt (fra1)**. Production and staging are separate projects or environments. | Keeps the current deployment path. Vercel is a US provider: DPA plus a transfer mechanism are needed ⚖. **Fallback if the privacy review rejects Vercel as processor:** the same app as a container at a German hosting provider. The architecture does not change; only the deployment target does. |
| Database | **Managed PostgreSQL in Germany/EU**, from a provider with point-in-time recovery and connection pooling (serverless functions need pooled connections) | The provider is chosen in 09.1 with a DPA. The database holds staff accounts, operational content, verification metadata and the audit log. There is no patient data, by design. |
| Media storage | S3-compatible object storage in the EU, private bucket, versioning on | V1 barely needs it: no STAFF uploads. ADMIN uses it for directory logos only if ever needed. |
| Transactional e-mail | EU provider for invites and password resets only | No newsletters, no notifications in V1 ⚖ |
| Secrets | `PAYLOAD_SECRET`, `DATABASE_URL`, storage keys, SMTP credentials: only as encrypted environment variables of the production environment, never in the repo, never in staging with production values. Rotation on staff changes with ADMIN access and at least yearly. | 09.1 adds a `.env.example` with names only. |
| Region | Functions in Frankfurt; database and storage in the EU (ideally Germany) | |
| Backups | Provider PITR (≥ 7 days) **plus** a daily encrypted logical dump to separate EU storage. Retention 30 days (proposal). **Quarterly restore test** into staging, documented. | Synthetic data only in staging after a restore test: restored production data is wiped from staging after verification ⚖. |
| Monitoring | Uptime check on the public site and on `/api/puls-version` (§12); error monitoring without personal data (privacy-model §6) | |
| Maintenance | A **named maintainer with a written agreement**: security updates for Next.js, Payload and the database driver within 7 days for critical issues; monthly dependency review; backup and restore tests; account offboarding on request within 1 working day | This is the open Phase 04 condition. Without it, the recommendation falls back to Sanity Growth for operations, or the cockpit does not go live. |

### 10.2 Environments

- **Local:** synthetic data, a local Postgres container, seeded test accounts from a seed file (never real staff).
- **Staging (Vercel preview):** synthetic data, its own database, its own secrets, test accounts only, protected by Vercel deployment protection. The banner "TESTUMGEBUNG – keine echten Daten" is shown on every cockpit page.
- **Production:** the real database, real named accounts created by ADMIN after 09.3 sign-off.

### 10.3 Public data flow

The public site reads only **published** records through `src/content/repository.ts`. The Local API is called with an anonymous, read-only context that never selects internal fields (`verifiedBy`, `internalNotes`): they are omitted at query level, not filtered in components. The results are cached with a tag (`puls-data`, `notices`) and revalidated on publish. Time is evaluated per request, so automatic expiry continues to work from the cached dataset.

### 10.4 Migration of existing content

The current `src/content/*.ts` values (schedule, consultation types, emergency 112/116117, holidays) become the **seed** of the production database. Their verification is kept as it is today, including F40 (practice confirmation 2026-10-11). Nothing is upgraded to verified by the migration. Until the data source switch is signed off, the repository adapter reads the static files, so the public site is unaffected by any cockpit work.

---

## 11. Privacy boundary

**The Praxis Cockpit is not a patient system.** This is a design constraint, not a configuration.

Never present in schema, UI, logs or audit:

- patient names
- diagnoses or symptoms
- appointments or appointment requests
- medical records
- insurance data
- patient messaging, chat or contact-form inbox
- uploads from parents

Enforcement:

1. **No collection or field exists** for any of these. Adding one requires a new architecture and privacy decision (privacy-model §5.6), not a config change.
2. Free text is limited to short public messages and short internal notes, with help text "Keine Patientendaten eintragen".
3. Staff personal data is minimal: name, personal work e-mail, role, active status, login timestamps.
4. Request bodies are not logged. Error monitoring scrubs form values.
5. The public API and pages never expose internal verification fields (privacy-model §6).
6. No third-party scripts in `/intern`: no analytics, no chat, no fonts from CDNs.

Open ⚖ items: processors and DPAs (hosting, DB, e-mail), retention of audit and login data, staff information about the processing of their account data.

---

## 12. Failure states (the public site fails safe)

| Failure | Public site | Cockpit |
|---|---|---|
| Database unreachable, cache warm | Serves the **last published dataset** from cache. PULS is computed live from it, so expiry still works. This dataset is still the latest truth, because nothing can be published while the database is down. | Read-only banner: "Änderungen sind gerade nicht möglich. Bitte wichtige Änderungen telefonisch weitergeben." |
| Database unreachable, cache cold | The repository returns the **fail-safe dataset**: schedule unverified, so PULS shows **UNKNOWN** ("Aktuelle Sprechzeiten" + phone). 112 and Notfall remain (static fallback, R7). Never OPEN. | Same banner |
| Payload/cockpit error during publish | Nothing changes (transaction) | "Nicht veröffentlicht. Bitte erneut versuchen." The draft is kept. |
| Publish written, cache revalidation failed | Old dataset still shown | The cockpit polls `/api/puls-version` (returns only the published dataset version, no content) for up to 60 s. If it does not match: a warning (coral, not red) "Die Website zeigt noch den alten Stand" + "Erneut senden", and a "Prüfen" item until it is resolved. |
| Data invalid in the database (manual edit, migration bug) | The engine resolves affected days to UNKNOWN by its own rules | The "Prüfen" item names the reason code in German |
| Login provider / e-mail down | No effect on the public site | Existing sessions keep working; reset/invite is delayed |
| Clock / timezone | The engine uses Europe/Berlin explicitly (tested) | Same |

Rule: **any doubt in loading data produces the UNKNOWN dataset, never a guessed or partial one.** This is checked by a test: the repository throws, and `resolvePuls` returns UNKNOWN.

---

## 13. V1 vs. later

| V1 (cockpit go-live) | Later |
|---|---|
| Login (e-mail + password, invite, lockout), TOTP for ADMIN | Passkeys; optional TOTP for all; session overview per person |
| Roles STAFF / DOCTOR / ADMIN | — (no more roles unless a workflow requires it) |
| Home with PRAXIS HEUTE, Schnellaktionen, Nächste Termine, Prüfen | Weekly e-mail digest of "Prüfen" (no tracking) |
| Workflows 7.1–7.7 | Recurring exceptions; holiday-policy switch; telephone hours state (FB-08) |
| Replacement directory (verify: DOCTOR, data: ADMIN) | — |
| Preview at chosen date/time with the real engine | Side-by-side "vorher / nachher" for multi-day ranges |
| Audit log, undo, CSV export | Signed or hashed audit chain if a legal review asks for it |
| Weekly schedule editing (DOCTOR/ADMIN) | — |
| — | Emergency information editing (DOCTOR) once F58–F65 are verified |
| — | Medical / ENTDECKEN approvals inside the cockpit (records real reviewer + date; would replace the code edits in `discovery.ts`) |
| — | Team / doctors with consent records; media rights |
| — | Release gates remain code decisions; moving them into the cockpit is a separate decision |

---

## 14. Implementation phases

Improved from the brief's 09.1–09.9. The changes: a click prototype with staff comes **before** any backend, and switching the public data source is its own gated step.

| Phase | Content | Exit criteria |
|---|---|---|
| **09.1 Prototype + infrastructure decisions** | Lab click-prototype `/lab/praxis-cockpit` (mock data, "PROTOTYP — keine echten Daten", not linked) for home + 7.1, 7.5, 7.7; walkthrough with 2 staff members. In parallel: choose DB/e-mail/hosting providers, DPAs ⚖, maintenance agreement, confirm Payload ↔ Next.js version compatibility. | Staff feedback recorded; providers and maintainer named; no real data |
| **09.2 Data layer** *(done; see [backend-foundation.md](backend-foundation.md) — repository in `src/data/`, not `src/content/repository.ts`; no DB connected yet)* | `resolvePuls(data)` refactor (no behaviour change); `src/content/repository.ts` with static-file source + fail-safe dataset; Payload installed with collections mirroring `src/domain` types; seed from the current content files; local + staging DB with synthetic data | All existing tests pass; repository failure → UNKNOWN test; public site unchanged |
| **09.3 Accounts, roles, audit** *(done, `0e53670`: Payload auth, roles, bootstrap, migrations, audit, `/intern` auth shell, integration proof. **Not** delivered, still required before production: transactional password reset, invites and ADMIN MFA)* | Staff auth collection, invite/reset, lockout, TOTP for ADMIN, `/intern` guard, `audit_events` (append-only), access control per role | Security review of auth; tests for access per role; no production accounts yet |
| **09.4 Cockpit shell + preview** | `app/(intern)` layout, home (PRAXIS HEUTE, Nächste Termine, Prüfen), `/intern/vorschau` with the engine | 390/768/1440 checks; WCAG 2.2 AA review |
| **09.5 Today workflows** | 7.1, 7.2, 7.3, 7.4 incl. "no new UNKNOWN" publish check and undo | Engine-based validation tests per conflict reason code |
| **09.6 Closures + replacements** | 7.5, 7.6, directory verification | ≤ 3 min vacation test with staff |
| **09.7 Announcements + audit view** | 7.7, `/intern/verlauf`, CSV export | ≤ 1 min announcement test |
| **09.8 Operations** | Production environment, secrets, backups + **restore test**, monitoring, `/api/puls-version`, failure drills (DB down, revalidation failure) | Documented drills; restore test passed |
| **09.9 Go-live of the data source** | Staff training, real accounts created by ADMIN, switch `repository.ts` from static files to the database (one reviewed change, reversible), monitoring for one week | Sign-off by the practice; the rollback path is tested |

Each phase ends as usual: tests, commit, report, stop.

---

## Phase 09.1 note: interactive UX prototype (2026-10-13)

**Path:** `/lab/praxis-cockpit` (lab only, `noindex`, not linked from any navigation, labelled "PROTOTYP · keine echten Daten"). Code: `src/lab/cockpit/` and `app/lab/praxis-cockpit/`. Review sheet: [docs/reviews/praxis-cockpit-prototype-review.md](../reviews/praxis-cockpit-prototype-review.md).

**Implemented:**

- Home: Guten Morgen, Praxis heute, Schnellaktionen, Nächste Termine, Prüfen.
- Workflows:
  - Heute früher schließen
  - Heute geschlossen
  - Urlaub eintragen (4 steps, one or several replacement periods)
  - Akutsprechstunde (overview, "Heute ändern", "Heute entfällt")
  - Hinweis veröffentlichen (explicit "Unbefristet veröffentlichen")
- Was sieht die Website? (any date and time; renamed "Website-Vorschau" in 09.1.3)
- Verlauf with detail and "Änderung zurücknehmen"
- Feiertag prüfen and Vertretung prüfen (DOCTOR)
- Lab-only test mode: role switch STAFF / DOCTOR / ADMIN, reset, conflict scenario.

**Engine use:** All statuses and all blocking states come from the real `getPracticeStatus()` with **mock** `PulsData` (`src/lab/cockpit/model.ts`). The "no new UNKNOWN" check (§8) runs as specified. The prototype has no own status logic and reads nothing from `src/content/`. The website preview reuses the public `StatusStatement` component.

**Governance boundary (to implement in 09.3/09.5):** Publication by an authenticated STAFF account creates `VERIFIED_CURRENT` provenance **only for operational records that role may confirm**:

- Allowed for STAFF:
  - today's exception
  - a closure entered by the practice
  - an operational announcement
  - assigning an already verified replacement practice
- Never automatically by STAFF:
  - medical content approval
  - emergency medical wording
  - initial confirmation of acute-consultation rules
  - initial or changed weekly schedule
  - re-confirming a replacement practice
  - ENTDECKEN medical approval
  - legal content

  These need DOCTOR (or legal review). The prototype shows this boundary in the UI: who confirms, a disabled stale replacement for STAFF, and the acute-rule and schedule notes.

**Prototype limitations:**

- Fixed test clock (Tue 13 Oct 2026, 09:20).
- State in memory only (a reload resets it).
- No authentication, persistence, real audit log, or concurrency handling.
- Undo is limited to the newest session change.
- Sonderöffnungszeiten on holidays, permanent rule changes and the admin areas are stubs.

**Engine findings from the prototype** (not changed in 09.1; the public Praxis Puls is untouched):

1. **Weekend holidays resolve to UNKNOWN** (resolved in 09.1.1). The engine checks the holiday policy before `confirmedClosedWeekdays`. With `REQUIRE_EXPLICIT_ENTRY`, Saturday 31.10.2026 and 26.12.2026 show "Aktuelle Sprechzeiten" on the **live** site as well (verified with `PULS_DATA`). This contradicts [practice-pulse-logic.md](practice-pulse-logic.md) §3. It is safe (never falsely open) but needs a deliberate decision: either confirmed closed weekdays win over unresolved holidays, or staff resolve weekend holidays explicitly.
2. **Special hours read as "Geänderte Sprechzeit heute" all day** (resolved in 09.1.1). This holds even after the last interval ended, and adjacent intervals are listed separately ("08:00–10:00 Uhr, 10:00–11:00 Uhr, 11:00–12:00 Uhr"). The brief expected "geöffnet bis 13:00", then "geschlossen". Wording and merging should be decided before 09.5.
3. **Early close inside the lunch break** (resolved in 09.1.1 with exact wording) (13:00 between 12:00 and 14:00) has the same effect as closing at 12:00. The prototype explains this; usability testing should show whether staff understand it.

---

## Phase 09.1.1 note: Praxis Puls / cockpit alignment (2026-10-13)

The three findings from 09.1 are resolved in the engine (spec: [practice-pulse-logic.md](practice-pulse-logic.md) §2a, §2b):

1. A holiday on a confirmed closed weekday stays CLOSED. Weekday holidays stay UNKNOWN.
2. Special hours are time-aware: open/closed headline, SPECIAL_HOURS + `activeException` kept as subordinate metadata.
3. Contiguous special intervals are grouped.

**Closed-gap UX rule for "Heute früher schließen"** (cockpit responsibility, `earlyCloseEffect` / `earlyCloseLabel` in `src/lab/cockpit/model.ts`):

- **Time inside an opening block** (e.g. 10:30 or 15:00): the block is cut at that time; later blocks are removed. Button: "Heute um 10:30 Uhr schließen".
- **Time in an already closed gap** (e.g. 13:00 between 08–12 and 14–16): this is a valid decision, not an error. The cockpit says "Um 13:00 Uhr ist die Praxis regulär bereits geschlossen." and explains the real effect: "Mit dieser Änderung entfällt die Nachmittagssprechzeit von 14:00–16:00 Uhr. Die letzte Sprechzeit endet heute um 12:00 Uhr."
  - Button: "Nachmittagssprechzeit heute entfallen lassen", never "Heute um 13:00 Uhr schließen".
  - The chosen time is not snapped silently. The audit entry keeps both the chosen time and the resulting hours.
- **Time after the last block or before the first:** a field error, with a pointer to "Heute geschlossen".
- Open/closed status in the preview still comes only from `getPracticeStatus()`; the React components hold no status logic.

---

## Phase 09.1.2 note: complete staff test flow (2026-10-13)

The prototype now covers the whole journey: **login → cockpit → Urlaub eintragen → Vertretung → website preview → simulated publish → parent view → logout.** It is still a prototype: **no real authentication, no persistence, no accounts, no e-mail.**

- **Mock login** at `/lab/praxis-cockpit/anmelden`, labelled "PROTOTYP · keine echten Konten".
  - Test accounts: `team@beispiel.test`, `aerztin@beispiel.test` and `verwaltung@beispiel.test`, all with password `test1234`. They map to Anna Beispiel (Praxisteam), Dr. Lena Beispiel (Ärztin) and Max Beispiel (Verwaltung).
  - A "Testzugang einsetzen" button fills in the first account.
  - A wrong login shows one neutral message: "E-Mail-Adresse oder Passwort stimmen nicht."
  - `sessionStorage` keeps only the mock role (no password, no token, no cookie). "Abmelden" clears it.
  - All other cockpit routes redirect to the login when there is no prototype session.
  - The role switcher stays under "Testmodus" only.
- **Vacation journey** (`/urlaub`, edit via `?bearbeiten=<id>`, detail at `/urlaub/<id>`). Four steps: Zeitraum, Text für Eltern (fixed default sentence plus an optional note of up to 140 characters), Vertretung, Vorschau. Three replacement cases:
  - one practice for the whole period
  - split into sub-periods; overlaps and periods outside the vacation are blocked, and gaps need explicit confirmation
  - no replacement, with a warning
  - The stale "Praxis Beispiel C" is visible but never selectable. Clicking it explains what is needed; DOCTOR can re-confirm it.
  - After publishing, home shows the vacation under "Nächste Termine" with Vertretung, "veröffentlicht", "Ansehen" and "Ändern". The detail view offers Vorschau, Urlaub ändern and Urlaub zurücknehmen.
- **Parent view** at `/lab/praxis-cockpit/elternansicht` reuses the public `PageIntro`, `StatusStatement`, `Section` and public action styles.
  - Status, dates, next opening and replacements come from the real engine with mock data.
  - The replacement schedule asks the engine once per sub-period (`replacementSchedule`), so only verified, fresh practices appear, and each card leads with its dates. With exactly two periods the cards sit in two columns on desktop and stack on phones.
  - Practice subtitle and public note are display-only fields of the mock directory.
  - Telephone buttons never dial in the prototype.
- **Dates:** the brief's example "Montag 20. – Freitag 24. Oktober" does not exist in 2026: 20 Oct 2026 is a Tuesday and 24 Oct a Saturday. The prototype and tests use the real Monday–Friday week **19.–23. Oktober 2026**, with the next opening Monday 26 October.

---

## Phase 09.1.3 decision: live website preview and automatic expiry (2026-10-13)

**Core cockpit pattern:** EDIT → LIVE WEBSITE PREVIEW → PUBLISH → AUTO-EXPIRE → NORMAL RULES RESUME.

### Terminology

| Term | Use |
|---|---|
| **Website-Vorschau** | The standard name of the preview, with the line "So sieht es auf der Website aus." |
| **Aktuell auf der Website** | Published state |
| **Mit dieser Änderung** | Published state plus the current change set |
| **Ansicht auf der Website öffnen** | Opens the full page view |
| **Auf der Website veröffentlicht** | Success message |

"Was sieht die Website?", "Was sehen Eltern?" and "Website würde …" are no longer used in the cockpit; a test enforces this. The lab route `/elternansicht` stays as an internal name.

### Layout

- **Desktop (≥ 64em):** the change on the left, the Website-Vorschau on the right, and the exact publish action under the change.
- **Tablet and mobile:** stacked in the order change → Website-Vorschau → publish action. The effect is always visible before publishing.
- Shared components: `EditLayout`, `LivePreview`, `Validity`, `ReplacementPreview` in `src/lab/cockpit/screens/live.tsx`.

### Live preview

- The preview updates on every valid form change. There is no separate "Vorschau ansehen" step.
- Both sides come from `previewPair(base, draft, date, time)`, which makes two calls to the real `getPracticeStatus()`: published mock data, and published data plus the change set. The React components contain no open/closed logic.
- Where useful, a moment shows "Aktuell auf der Website" in compact form above "Mit dieser Änderung". Later moments are added where they matter, e.g. "Ab 12:00 Uhr" or the day after a notice ends.
- Conflicts appear inside the preview. The publish button stays disabled until they are resolved.
- The preview reuses the public `StatusStatement` and public action styles. Inside the preview the buttons are static (not focusable); on the website they work.
- Accessibility:
  - Only a settled one-line summary is announced (`aria-live="polite"`, about 0.9 s after the last change).
  - Focus never jumps while editing.
  - The preview has its own heading ("Website-Vorschau").

### Workflows converted

Heute früher schließen, Heute geschlossen, Akutsprechstunde (change for today / today cancelled), Hinweis, and Urlaub (one form: dates, text, one or split or no replacement; the preview shows the replacement cards with the dates leading).

### Automatic expiry

- Temporary records end by themselves after their inclusive Berlin end date: vacation and closures (`endDate`), today's closures and special hours (end of the local day), announcements (`validUntil`).
  - No manual "end vacation" or "wieder öffnen" exists or is needed.
  - The expiry is part of the original publishing decision: the button names the period, and the "Automatisches Ende" box shows "Gültig … / Danach …".
- **History is retained:** expiry never deletes. Expired records stay in the data and in the audit log; they are simply ignored by the engine and listed under Verlauf → "Vergangene Einträge" (`pastRecords`). The home screen only shows active and future items, with "Endet automatisch: …" and a link to the expired entries.
  - Deleting a record is only an explicit, audited "Urlaub zurücknehmen".
- **Fail-safe after expiry:** expiry removes the record from the active decision set and evaluates all remaining rules: other closures and exceptions, confirmed closed weekdays, holiday policy, schedule verification, conflicts. It never means "back to open".
  - `afterEnd()` says in plain German what follows, with an absolute date ("Nächste Sprechzeit am Montag, 26. Oktober um 08:00 Uhr.").
  - If the state is not clear, it says so and why, e.g. "Der Zustand nach diesem Zeitraum ist noch nicht eindeutig. Am Freitag, 25. Dezember ist ein Feiertag (1. Weihnachtstag) noch nicht geklärt."
- **Time zone:** all validity uses Europe/Berlin calendar dates through the engine. There is no client or server time zone logic.

### Lab test clock

"Testmodus → Testuhr" (lab only, not a staff feature) moves the prototype date: 13.10. start, 18.10. before the vacation, 20.10. during it, 23.10. last day, 24.10. first day after, 26.10. Monday.

Verified with vacation 19.–23.10.2026:
- 20. and 23.10.: Praxisurlaub.
- 24.10. (Saturday): normal weekend rule, CLOSED, opens Monday 26.10. at 08:00.
- 26.10. at 09:00: normal Monday, OPEN.
- After the end the vacation no longer appears on the home screen and is listed under "Vergangene Einträge".

---

## Phase 09.1.4 decision: editing existing changes and prototype lock (2026-10-13)

### Edit vs. supersede vs. conflict

A conflict is not the same thing as editing an existing record. The cockpit distinguishes three cases:

| Situation | Cockpit behaviour | Example |
|---|---|---|
| **Existing record → EDIT** | "Bereits geändert / Bereits veröffentlicht" notice above the form with the current value. Then "Bestehende Änderung anpassen", "Bestehende Schließung bearbeiten", "Bestehenden Urlaub bearbeiten" or "Hinweis bearbeiten". The form is pre-filled. Publishing replaces the record **with the same id** (new version), so there is never a second active record. | "Heute bis 15:00 Uhr" → 13:00 → button "Nachmittagssprechzeit heute entfallen lassen" |
| **New intent that replaces an old decision → SUPERSEDE** | Allowed only after a clear preview and an explicit confirmation checkbox. The old record is replaced in the same change and remains in the history. | Changed hours today → "Heute geschlossen": "Geänderte Sprechzeit durch diese Schließung ersetzen" |
| **Independent contradictory records → CONFLICT** | Blocked by the engine-based `checkChange` ("no new UNKNOWN day"), shown in the Website-Vorschau as "Widersprüchliche Angaben – Für … gibt es zwei unterschiedliche Änderungen, die gleichzeitig gelten würden." with "Bestehende Änderungen prüfen". Publishing stays disabled. | A vacation over an independent special opening on 21.10. |

### Detection rules

- **Special hours today:** single-day SPECIAL_HOURS record for today (`existingTodayChange`). The new closing time is applied to the **regular** plan and replaces the record.
- **Closed today:** SHORT_NOTICE closure covering today (`existingTodayClosure`).
- **Vacation:** a current or upcoming vacation overlapping the entered dates (`overlappingVacation`). The cockpit asks: "Bestehenden Urlaub bearbeiten" or "Neuen Zeitraum anlegen". A new period must not overlap.
- **Announcements:** current or upcoming published announcements (`editableAnnouncements`).
- **Expired records are never offered for editing.** They belong to the history.

### Vacation editing

- Start, end, text and replacements are editable.
- In edit mode replacement periods are always **explicit dates**, never stretched silently.
- `checkReplacementPeriods` revalidates on every change:
  - A replacement fully inside the new vacation is kept.
  - A replacement beyond the new vacation ("reicht über das Urlaubsende hinaus") must be corrected. The cockpit offers a one-click fix ("Auf … anpassen").
  - New vacation days without a replacement show the warning "Für den verlängerten Zeitraum ist noch keine Vertretung hinterlegt." with an explicit "… bis … verlängern" action. Otherwise the gap must be confirmed.
  - Overlapping replacement periods are blocked.
- The Website-Vorschau offers the days that leave or join the vacation ("Nicht mehr im Urlaub", "Neu im Urlaub"). It shows the real engine result for those days, not a description.

### Lab scenarios (Testmodus, lab only)

| Scenario | Seeded record | Task |
|---|---|---|
| A | "Heute bis 15:00 Uhr" (Dr. Lena Beispiel, 08:05) | Change it so the afternoon session is cancelled |
| B | Vacation 19.–23.10. with Praxis Beispiel A | Extend it to 26.10.; replacement warning |
| C | Announcement until Friday | Extend it to Monday |
| D | Special opening on 21.10. | Enter vacation 19.–23.10.; this is blocked as a true conflict |

### Domain extraction candidates for 09.2 / 09.4

The prototype logic lives in `src/lab/cockpit/`. Nothing is moved now. Mock login, the test clock, mock practices and scenarios stay lab-only.

| Candidate (prototype location) | Class | Target |
|---|---|---|
| Shorten opening intervals / closing at a time incl. lunch gap (`earlyCloseEffect`, `cutAt`, `rulesSegments`) | **DOMAIN** | `src/domain` (schedule derivation next to the engine) |
| Merge contiguous blocks (`blocks`) | **DOMAIN** | Already in the engine internally; export once |
| Apply a change set / replace a record by id (`withException`, `withClosure`, `withAnnouncement`) | **DOMAIN** | Repository-independent pure helpers, used by the publish hook |
| "No new UNKNOWN day" check (`checkChange`) | **DOMAIN** | Server-side publish validation (Payload hook) |
| Replacement-period validation (`checkReplacementPeriods`, `uncoveredDays`) | **DOMAIN** | Server-side validation of closures |
| What applies after an end date (`afterEnd`) | **DOMAIN** | Preview + publish summary |
| Expiry filtering / history (`upcoming`, `pastRecords`, `editableAnnouncements`) | **DOMAIN** (filtering) / **WORKFLOW** (presentation) | Queries in the repository layer |
| Edit vs. new vs. conflict decision (`existingTodayChange`, `overlappingVacation`, `earlyCloseDraft` with `existing`) | **WORKFLOW / DOMAIN boundary** | Detection = domain queries; the choice (edit / supersede / new) = cockpit workflow |
| Versioning and undo of the latest version (`state.ts` reducer, `versionOf`, `canUndo`) | **WORKFLOW** | Payload versions + own audit collection (§9) |
| Preview pair (`previewPair`) | **WORKFLOW** | Cockpit server action calling the engine twice |
| Plain-German messages (`problemFor`, `unknownExplanation`, coverage texts) | **UI ONLY** (wording) on top of domain reason codes | Cockpit |
| Button wording (`earlyCloseLabel`, "Bestehende Änderung aktualisieren", …) | **UI ONLY** | Cockpit |
| Mock login, `sessionStorage` role, test clock, scenarios, mock directory | **LAB ONLY** | Never moved to production |

### Prototype lock

The prototype is complete for the staff usability test (tasks A–L in [praxis-cockpit-prototype-review.md](../reviews/praxis-cockpit-prototype-review.md)). No further prototype features are planned. Findings from the test feed into 09.2–09.5.

### Review hub (`/review`)

*(Revised 2026-10-13 by the deployment-model rule, [deployment-model.md](deployment-model.md).)*

- **Purpose:** one convenience URL for reviewers. It has three cards:
  - Praxis Cockpit: mock login, with the test account shown as "nur Testdaten"
  - Mein Arztbesuch: the normal route
  - the website
- **It unlocks nothing.** Every linked area is reachable without it.
- **Availability:** automatic while `SITE_STAGE = "STAGING"`. In PRODUCTION `/review` answers 404. The former `REVIEW_HUB_ENABLED` environment variable was removed, so no Vercel configuration is needed.
- **Exposure:** not in the patient navigation, no sitemap entry, `noindex, nofollow` as both meta tag and header.
- **Cockpit prototype:** directly reachable on STAGING. Its layout answers 404 once `SITE_STAGE = "PRODUCTION"`. The other `/lab` routes still need a decision before launch.

---

## Phase 09.2 note: backend foundation (2026-10-13)

Full record: [backend-foundation.md](backend-foundation.md).

- **Domain extraction done.** The candidates marked DOMAIN in the 09.1.4 table now live in `src/domain/operations.ts`:
  - schedule derivation
  - change sets and the "no new UNKNOWN" guard
  - edit / supersede / new / conflict classification
  - record lookup, expiry, replacement-period validation
- The lab model delegates to these functions. German wording, the test clock, mock accounts and scenarios stay in `src/lab/cockpit/`.
- **Governance in code.** `src/domain/governance.ts` holds:
  - `canConfirm`: STAFF confirms operational records only; medical scope is DOCTOR only; ADMIN gets no bypass
  - generated provenance
  - append-only audit events without secrets, and REVERT as a new event
- **Payload** is the backend framework as decided in §2. It is used only through the Local API until 09.3. Public site, mock login, `SITE_STAGE`, `indexable`, Mein Arztbesuch approvals and Discovery provenance are unchanged.

---

## Phase 09.3 note: Payload runtime and authenticated `/intern` (2026-10-13)

Full record: [backend-foundation.md](backend-foundation.md) §17.

- **§4 Authentication, decided in practice:**
  - Payload's own auth with server-side sessions.
  - Cookie `HttpOnly; SameSite=Lax; Secure` (also on localhost, which browsers treat as a secure context).
  - Lockout 5 / 15 min; disabled accounts refused; generic error messages.
  - First ADMIN only by bootstrap script; Payload's first-user registration is closed at three layers.
- **§6.1 Routes:**
  - `/intern` is the future cockpit; `/intern/anmelden` is its login.
  - `/intern/admin` is Payload's structural administration, ADMIN only.
  - The earlier proposal `/verwaltung-intern` is dropped.
- **Still open before production:**
  - ADMIN MFA: required before production; provider/plugin selection remains open and must be re-verified against the then-current Payload version
  - transactional email for password reset (closed until then)
  - hosted database (EU, DPA/AVV, backups, PITR), monitoring, maintenance owner
  - live host / domain / DNS access

---

## Phase 09.4 note: staff entry and the real cockpit read experience (2026-10-13)

### Staff entry (permanent routing concept)

```
PUBLIC WEBSITE → Footer "Mitarbeiterbereich" → /mitarbeiter
   current STAGING (Vercel, no database)   → Praxis Cockpit Prototyp (/lab/praxis-cockpit/anmelden)
   local backend testing (database set)    → Prototyp  AND  real login (/intern/anmelden)
   future PRODUCTION                       → real login (/intern/anmelden) only, never the lab
```

- `/mitarbeiter` is the **stable** staff-facing URL. The footer never links `/lab/…` or `/intern/…` directly, so those implementation routes may change.
- The decision lives in one pure function, `staffEntryActions(SITE_STAGE, backendConfigured(env))` in `src/content/staff-entry.ts` (tested).
- **`/review` ≠ `/mitarbeiter`.**
  - `/review` is project review tooling for developers and reviewers.
  - `/mitarbeiter` is the human staff entry from the normal website.
- **The footer link is UX, not security.** Security remains authentication, roles and server-side access control.
- **Presentation flow on Vercel** (verified with a build without any backend configuration): website → footer → "Mitarbeiterbereich" → "Praxis Cockpit öffnen" → prototype login → test access → all prototype workflows. No typed URL, no query parameter, no environment setup.

### Real cockpit (READ + PREVIEW, no writes)

- **Read layer** `src/cockpit/`:
  - `read-model.ts`: Praxis heute, Nächste Termine, Prüfen (pure)
  - `preview.ts`: date/time input and the static-vs-database comparison
  - `navigation.ts`: role-aware navigation
  - `queries.ts`: Payload Local API → `PayloadPracticeRepository`
- **Dependency direction:** `app/(intern)` → `src/cockpit` → repository → domain. React never sees Payload documents; the public frontend never imports the cockpit layer (tested).
- **Praxis heute:** PostgreSQL → Payload → `PayloadPracticeRepository` → `PulsData` → `getPracticeStatus()`, rendered with the public `StatusStatement` component through `resolvePuls({}, now, databaseData)`. There is no status logic in React, and `staticPulsData()` is not used for the cockpit status.
- **Nächste Termine:** current and upcoming closures, changed hours and published notices within 90 days, chronological. Expired records are history and not shown; the end date is inclusive, in Berlin.
- **Prüfen:** only actionable items:
  - weekday public holidays the engine cannot resolve (next 60 days)
  - replacement practices that cannot be shown during a coming closure
  - unconfirmed current/upcoming operational records
  - a missing or soon-due weekly-schedule confirmation

  Unused TO_BE_CONFIRMED fields raise no alarm.
- **Schnellaktionen:** clearly marked "im Prototyp ansehen" with a sentence that publishing comes in a later stage. There are no buttons that pretend to work.
- **Website-Vorschau** (`/intern/vorschau`):
  - Datum + Uhrzeit (Europe/Berlin), default now, future allowed.
  - Database result through the same engine and the public presentation component.
  - Staging comparison with the static website: "Stimmt mit der aktuellen Website überein." or "Abweichung zur aktuellen Website" with the named differences (status, notice text, current interval, next opening, closure, changed hours, replacement, data confidence).
  - Authenticated only.
- **Navigation:** Übersicht and Website-Vorschau for everyone; **Verwaltung** (`/intern/admin`) only for ADMIN. The server-side ADMIN rule stays authoritative.
- **Failures:** unauthenticated → `/intern/anmelden`; database unavailable → the calm "nicht erreichbar" page. The public website is unaffected (verified with the database stopped).

### Still required before production

- Transactional password reset.
- ADMIN MFA: required before production. Provider/plugin selection remains open and must be re-verified against the then-current Payload version.
- Hosted database (EU, DPA/AVV, backups, PITR), monitoring, maintenance owner.
- `LIVE_HOST_ACCESS = OPEN`; domain/DNS access unknown (LB-13/LB-14).

---

## Phase 09.5A note: real operational writes for today (2026-10-14)

### Production staff-portal release gate

- `RELEASE.staffPortalProductionEnabled = false` in `src/content/release.ts`. This is a release decision, not an environment concept.
- **One decision, used twice:** `staffPortalAvailable(stage, backendConfigured, release)` drives both the request gate (`src/backend/gate.ts` → `proxy.ts`) and the footer entry (`/mitarbeiter`). The footer can therefore never point to a route the gate blocks; this is tested for every stage × backend × flag combination.

  | Situation | Real staff portal (`/intern`) |
  |---|---|
  | STAGING + backend | available |
  | PRODUCTION + backend + flag `false` (current) | blocked, and `/mitarbeiter` shows the calm "nicht verfügbar" state |
  | PRODUCTION + backend + flag `true` (future, after the production security review) | available, real login only |

- The lab prototype and `/review` stay governed by `stageAllowsReview` and never appear in PRODUCTION.

### Scope

- **Real writes** to the isolated cockpit database for exactly two workflows:
  - **7.1 Heute früher schließen** (`/intern/heute/frueher-schliessen`)
  - **7.2 Heute geschlossen** (`/intern/heute/geschlossen`)
- **Not in 09.5A:** Sonderöffnungszeiten (7.3), Akutsprechstunde (7.4), Urlaub, Hinweise, general supersede, undo, public data cutover.

### Write architecture (`src/cockpit/workflows/`)

```
app/(intern) page (GET: input + preview)      POST /intern/heute/veroeffentlichen (only write entry)
        │                                                │  same-origin check, session from cookie
        ▼                                                ▼
today.ts  (pure drafts: earlyCloseDraft, closedTodayDraft — existing domain rules only)
snapshot.ts (datasetFingerprint: SHA-256 of canonical operational PulsData)
publish.ts  (previewWorkflow · publishWorkflow · commitDraft)  → Payload Local API → PostgreSQL
```

**Publish pattern** (no generic "Speichern"): input → server draft → Website-Vorschau → server revalidation → one database transaction → audit → confirmation. Steps of a publish:

1. **Session:** the account is re-read server-side (`payload.auth`). Active STAFF, DOCTOR and ADMIN accounts may publish operational records. Signed-out or disabled accounts cannot write.
2. **Changeset id:** a `changeSetId` is generated on the server (`crypto.randomUUID`) and travels only in the trusted request context. It is never read from the form.
3. **Re-read and compare:** inside the transaction, the database snapshot is re-read through `PayloadPracticeRepository` and its fingerprint is compared with the one shown in the preview. If they differ: "Inzwischen wurde etwas geändert. Bitte prüfen Sie die Vorschau erneut." and nothing is written. The fingerprint detects concurrent changes; it is not authorization.
4. **Rebuild the draft:** with the server clock (Europe/Berlin) and the same pure functions, so date, time, text length, replacement usability, conflicts and the no-new-UNKNOWN check (`introducedUnknown` via `classifyChange`) run again. The submitted draft is not trusted, and the client cannot claim another date.
5. **Write:** the record is written with the same `req`. The existing hooks generate provenance (`verifiedBy`, `lastVerified`, `reviewDue`, `sourceIds`; client values never count), run the publish guard and append the audit event with `changeSetId`, `previous` and `next`.
6. **Commit or roll back:** commit; on any failure the whole transaction is rolled back. Tested: no record change and no orphan audit event.

### 7.1 Heute früher schließen

- The default time is the next half hour, offered only if it really shortens today.
- **Cases:**
  - inside a block → close at that time
  - lunch gap → never "close at 13:00"; the action reads "Nachmittagssprechzeit heute entfallen lassen"
  - a time at or before now → refused, with a link to "Heute geschlossen"
  - at or after the regular end → no change, nothing published
  - a closure covering today → blocked
  - today already UNKNOWN → blocked, with the engine's reason in plain German
- **Existing same-day SPECIAL_HOURS** is edited (same record id, new version, UPDATE audit with previous/next). It is never duplicated. The page shows "Bereits geändert" / "Aktuell geändert".
- **Priority:** the engine ranks exceptions by **higher** priority first, so same-day cockpit changes use priority **100** and win over planned multi-day changes (default 10). An edited record keeps its existing priority.

### 7.2 Heute geschlossen

- **"Ab sofort":** a `Closure` of kind `SHORT_NOTICE` for today only.
- **"Ab einer Uhrzeit":** delegates to the 7.1 workflow. It is the same representation, not a second record type.
- **Optional public reason:** Krankheit, Fortbildung, Technische Störung, Kein Grund anzeigen, or Sonstiges (own text, max. 140 characters).
- **Privacy hint** under every free-text field: "Keine Namen von Patientinnen und Patienten und keine Diagnosen eintragen."
- **Replacement:** only practices usable today (the engine's own `isUsable` freshness rule) are selectable; others are shown disabled with a reason. No free text. "No replacement" is valid, and the preview then shows the engine fallback (phone / Notfall).
- **Conflicts:** an existing same-day SHORT_NOTICE closure is edited. Another closure, or any change already covering today (SPECIAL_HOURS or CLOSED), blocks with an explanation. Never silently overwritten. Since 09.5B: an explicit "Bestehende Änderung ersetzen" (see the 09.5B note).

### Truthful staging wording

- The public website still reads `staticPulsData()` (`DATA_SOURCE = "STATIC"`, public `resolvePuls` default unchanged, no revalidation of public pages), so a cockpit publish does **not** change the website.
- **Before publishing:** "Die Änderung wird in der Cockpit-Datenbank gespeichert. Die öffentliche Website verwendet weiterhin die bisherigen Daten."
- **After publishing:** "In der Testumgebung veröffentlicht" · "Die Cockpit-Datenbank wurde aktualisiert." · "Die öffentliche Website verwendet derzeit noch die bisherigen Daten." With the actions "Website-Vorschau öffnen" and "Zur Übersicht".
- "Auf der Website veröffentlicht" is never used in 09.5A (tested).
- `/intern` and `/intern/vorschau` show the new database state immediately. The preview's "Abweichung zur aktuellen Website" is expected in this phase and is a staging diagnostic, not an error.

### Quick actions

- **Real:** "Heute früher schließen", "Heute geschlossen" (Testumgebung · Cockpit-Datenbank).
- **"Später verfügbar … nur im Prototyp ansehen":** Urlaub eintragen, Hinweis veröffentlichen.

### Undo: deliberately deferred to 09.5B (done, see below)

- No "Änderung zurücknehmen" in 09.5A, and no fake undo by deleting records; delete protection is unchanged.
- **09.5B** will define one lifecycle for supersede, CREATE/EDIT revert semantics and latest-change undo on top of the proven write path.

## Phase 09.5B note: supersede lifecycle and safe undo (2026-10-14)

Baseline `13b62a5`. Only the two real today-workflows (7.1, 7.2) are affected; 7.3–7.7, the full `/intern/verlauf` audit browser, CSV export, MFA, email reset, the public Payload cutover and production hosting are **not** part of this phase.

### History model: no Payload versions

- Payload `versions` are **not enabled** on any collection. Statements in §0–§9.2 that mention Payload versions describe the original plan, not the implementation. Undo does **not** rely on a version history.
- **`auditEvents` is the authoritative history:** append-only, with the full `previous` / `next` snapshot of every write, `changeSetId` and `revertOf`.
- Nothing is ever deleted: no delete access on any operational collection (unchanged), and undo never deletes.

### Record lifecycle (`openingHourExceptions`, `closures`)

| Field | Values / meaning |
|---|---|
| `recordState` | `ACTIVE` (default) · `RETIRED` |
| `retiredReason` | `SUPERSEDED` (replaced by another record) · `REVERTED` (its creation was undone) |
| `retiredAt` | Instant of retirement |
| `retiredByChangeSetId` | Change set that retired it |
| `supersededByRecordId` | The replacing record (supersede only) |

- **Server-controlled:** field access allows writes only in a trusted server context (`SERVER_CONTEXT.LIFECYCLE`); values sent by a browser or REST client are ignored (tested). `OUTDATED_DO_NOT_PUBLISH` is not used for this; it stays a verification status.
- **Retired records are frozen:** any normal write to a `RETIRED` record is refused (409, "Archivierte Einträge können nicht geändert werden.").
- **Repository:** returns only `ACTIVE` records, so the engine, `/intern` and `/intern/vorschau` reflect the active database state. The domain model is unchanged.
- **Record ids:** a retired record keeps its `recordId`; a new record on the same day gets a suffix (`…-2`, `…-3`).
- Migration `20261014_080446_operational_lifecycle`: existing rows become `ACTIVE` (column default). Proven from zero and on the dev database.

### Supersede ("Bestehende Änderung ersetzen")

- Never silent: a conflicting single-day change first shows an explanation with the explicit action **"Bestehende Änderung ersetzen"** (`ersetzen=1`). Without it the server still refuses (revalidated on POST).
- Both directions: geänderte Sprechzeit (SPECIAL_HOURS) → Heute geschlossen, and Heute geschlossen (SHORT_NOTICE) → Heute früher schließen.
- The preview shows "Bestehend" (archived, not deleted) and "Neu". On publish: the old record becomes `RETIRED / SUPERSEDED` with `supersededByRecordId`, the new record is created `ACTIVE`. One transaction, one `changeSetId`; audit operations `SUPERSEDE` + `CREATE`.
- **Multi-day safety:** the today workflows never shorten, modify or retire a multi-day record (vacation, multi-day special hours, …). They block with a message pointing to that record's own workflow.
- Unchanged: `SAME_DAY_PRIORITY = 100`, and editing the same day's own record stays an edit of that record.

### "Änderung zurücknehmen"

- **Where:** "Letzte Änderung" card on `/intern`, the publish confirmation, and the undo preview `/intern/verlauf/[vorgang]/zuruecknehmen` ("Aktuell in der Cockpit-Datenbank" → "Nach dem Zurücknehmen"). The undo itself is an authenticated, same-origin **POST** (never a GET mutation). The browser sends only the change-set id and the preview fingerprint.
- **Server-planned** (`src/cockpit/workflows/undo.ts`, pure): the plan is computed from the stored audit group and the current records. No client snapshot, `revertOf`, `changeSetId`, role or supersede metadata is accepted from the browser.
- **Semantics per audit operation:**
  - CREATE → the record becomes `RETIRED / REVERTED` (kept in the database; factual provenance unchanged).
  - UPDATE (edit) → the `previous` content is restored on the **same** record (new update; provenance re-issued for the person undoing).
  - SUPERSEDE → the replaced record becomes `ACTIVE` again (and the new record is retired as a CREATE).
  - Order: retire first, then restore / reactivate, so the publish guard sees the final state.
- **Who / when:** STAFF, DOCTOR, ADMIN (the role may confirm the record type); disabled or signed-out accounts cannot. Only within **24 hours** and only while the effect is still present or in the future.
- **Latest change only:** if any record of the change set was changed again later, undo is blocked: "Dieser Stand wurde inzwischen erneut geändert. Bitte prüfen Sie den aktuellen Eintrag." A revert itself is not offered for undo. Changes written outside the cockpit (no change set) cannot be undone here.
- **Safety:** the result is checked with the engine; an undo that would introduce an unknown state is refused. Stale previews are detected with the dataset fingerprint (09.5A). Everything runs in one transaction; audit failures roll back the lifecycle mutation (tested).
- **Audit:** each undo is a **new** change set; every write gets operation `REVERT` with `revertOf` = the original audit event id. Original events are never changed.
- **Wording:** "Die Änderung wurde in der Testumgebung zurückgenommen." · "Die öffentliche Website verwendet weiterhin die bisherigen Daten." History labels are plain German ("Heute um 11:00 Uhr schließen", "Praxis heute geschlossen", "Bestehende Änderung ersetzt: …", "Änderung zurückgenommen"); UPDATE / REVERT / SUPERSEDE are never the primary label.

### Public site

Unchanged: `DATA_SOURCE = "STATIC"`, `staticPulsData()`, no revalidation of public pages. Public routes answer 200 with PostgreSQL stopped (checked).

### Ops note before production

`sameOrigin()` (`app/(intern)/same-origin.ts`, shared by publish and undo) refuses posts without `Origin` and compares the `Origin` host with the request `Host` header. Before production, verify how `Host`, `X-Forwarded-Host` and `Origin` arrive in the real hosting topology (custom domain, reverse proxy) and only then adjust the check; never weaken it speculatively.
