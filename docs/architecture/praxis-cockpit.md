# Praxis Cockpit: Staff Portal Architecture

Phase: 09.0 (architecture and product design only; nothing is implemented)
Date: 2026-10-13
Baseline: `e589478`
Builds on: [cms-requirements.md](cms-requirements.md) · [cms-comparison.md](cms-comparison.md) · [content-model.md](content-model.md) · [content-governance.md](content-governance.md) · [practice-pulse-logic.md](practice-pulse-logic.md) · [privacy-model.md](privacy-model.md) · [phase-04-decisions.md](phase-04-decisions.md)

> **Status:** This is a proposal for review. Nothing in this document is installed, configured or connected. Payload, the database, accounts, secrets and the public website are unchanged. The release gates (`src/content/release.ts`) are unchanged. Implementation starts only after this architecture is reviewed.

---

## 0. Audit of the existing architecture (input to this decision)

| Area | Current state (verified in code) | Consequence for the cockpit |
|---|---|---|
| **PRAXIS PULS engine** | `getPracticeStatus(now, data, options)` in `src/domain/practice-status.ts` is pure, deterministic and fixed to Europe/Berlin. Day resolution: closures, then exceptions, then holiday policy, then weekly rules. Contradictions resolve to UNKNOWN with a `ReasonCode` (`EXCEPTION_CONFLICT`, `CLOSURE_EXCEPTION_CONFLICT`, `RULE_CONFLICT`, `ACUTE_CONFLICT`, `HOLIDAY_WITHOUT_RULE`, …). | The cockpit preview and the server-side publish check **call this function**. There is no second implementation. |
| **Public binding** | `resolvePuls()` in `src/content/puls.ts` maps the engine result to the hero view model. Its input is the static `PULS_DATA` from `src/content/schedule.ts`. | One refactor is needed: `resolvePuls` must accept `PulsData` as a parameter, so that the public site and the preview use the same mapping. This does not change behaviour and is covered by the existing `puls-live` tests. |
| **Verification** | `FactVerification` and `evaluateFreshness()` in `src/domain/verification.ts`. Exceptions, closures, replacement practices and emergency entries have grace 0 and require `lastVerified`, `verifiedBy` and `reviewDue`. | Every cockpit entry must carry complete verification metadata. The named account that publishes the entry **is** the practice confirmation (see §7.0). |
| **Closures / exceptions** | Types exist (`Closure`, `OpeningHourException`). Today `PULS_DATA` has `exceptions: []`, `closures: []` and `replacementPractices: []`. | These three lists are what staff edit day to day. The weekly schedule changes rarely. |
| **Replacement practices** | Directory type exists. No entries yet (F53: no legacy import). | A closure can reference only directory entries. Directory entries are verified separately. |
| **Holidays** | `PUBLIC_HOLIDAYS_ST` with policy `REQUIRE_EXPLICIT_ENTRY`. F49 is unconfirmed, so a weekday holiday resolves to UNKNOWN. | The cockpit lists upcoming unresolved weekday holidays under "Prüfen". It never infers "closed". |
| **Announcements** | `decideAnnouncement()` requires verification, `published`, and today inside `validFrom … validUntil`, or an explicit `OPEN_ENDED`. | Workflow 7 maps onto this directly. |
| **Release gates** | `RELEASE.pulsPracticeSignOff = true`, `meinArztbesuchApproved = false`, `indexable = false`. | The cockpit does **not** control release gates in V1; they stay deliberate code changes. |
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
| `/intern/vorschau` | "Was sieht die Website?" for any date and time | all |
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
2. The cockpit builds a **change set**: a draft that is not yet visible. It runs the **real engine** on the published data plus the change set (§8) and shows "Was sieht die Website?".
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
| **09.2 Data layer** | `resolvePuls(data)` refactor (no behaviour change); `src/content/repository.ts` with static-file source + fail-safe dataset; Payload installed with collections mirroring `src/domain` types; seed from the current content files; local + staging DB with synthetic data | All existing tests pass; repository failure → UNKNOWN test; public site unchanged |
| **09.3 Accounts, roles, audit** | Staff auth collection, invite/reset, lockout, TOTP for ADMIN, `/intern` guard, `audit_events` (append-only), access control per role | Security review of auth; tests for access per role; no production accounts yet |
| **09.4 Cockpit shell + preview** | `app/(intern)` layout, home (PRAXIS HEUTE, Nächste Termine, Prüfen), `/intern/vorschau` with the engine | 390/768/1440 checks; WCAG 2.2 AA review |
| **09.5 Today workflows** | 7.1, 7.2, 7.3, 7.4 incl. "no new UNKNOWN" publish check and undo | Engine-based validation tests per conflict reason code |
| **09.6 Closures + replacements** | 7.5, 7.6, directory verification | ≤ 3 min vacation test with staff |
| **09.7 Announcements + audit view** | 7.7, `/intern/verlauf`, CSV export | ≤ 1 min announcement test |
| **09.8 Operations** | Production environment, secrets, backups + **restore test**, monitoring, `/api/puls-version`, failure drills (DB down, revalidation failure) | Documented drills; restore test passed |
| **09.9 Go-live of the data source** | Staff training, real accounts created by ADMIN, switch `repository.ts` from static files to the database (one reviewed change, reversible), monitoring for one week | Sign-off by the practice; the rollback path is tested |

Each phase ends as usual: tests, commit, report, stop.
