# Feature Priorities

Phase: 01 — Product Strategy (clarified in 01.5, see [strategy-lock.md](strategy-lock.md))
Date: 2026-10-07

Classes:
- **CORE** — V1 cannot launch without it. Utility, truth, legal.
- **SIGNATURE** — V1 differentiators and essential to the project's ambition (*utility first, not utility only*). Built in full during V1 development. A signature feature is publicly released only at the full quality bar and only with its specific claims verified; unverified parts run in fallback/disabled state rather than ship as guesses. They never block CORE.
- **PHASE 2** — valuable, deliberately deferred.
- **DO NOT BUILD YET** — rejected for now on safety, privacy, legal or scope grounds. Revisit only with a documented decision.

Fact/blocker IDs refer to [fact-status-register.md](../research/fact-status-register.md) and [project-blockers.md](../research/project-blockers.md).

---

## Scope rule

> V1 = everything a parent needs to act correctly today + a trustworthy practice presence + one or two signature experiences done exceptionally well.

Counted features: CORE 17 · SIGNATURE 4 · PHASE 2 15 · DO NOT BUILD YET 17.

## Blockers do not stop development

"Depends on" columns name what must be resolved before a **claim or feature is publicly launched** — not before it is designed or built. All CORE and SIGNATURE features are designed and developed now, using:

- safe fallbacks (e.g. PRAXIS PULS built completely, acute-specific state disabled until FB-01…FB-03 resolve),
- clearly marked mock data and placeholders (never on public production URLs),
- disabled states driven by fact status,
- visible `TO_BE_CONFIRMED` markers in previews and the editor.

Unknown facts are left out, never invented (e.g. the Anfahrt page is built without parking information).

---

## 1. CORE

### JETZT

| ID | Feature | Notes | Depends on |
|---|---|---|---|
| C01 | **Persistent call action** (tappable phone on every page) | Static HTML, thumb zone on mobile | F15, LB-00 |
| C02 | **Persistent Notfall access** + Notfall page | 112 first; verified directory only; static | F56, LB-10, FB-17 |
| C03 | **Sprechzeiten** — today first, then week | Consultation types per slot (healthy-only, appointment, acute) shown as data, not prose | F35–F43; acute details FB-01…FB-03 |
| C04 | **PRAXIS PULS — fail-safe base** | Ships in V1 at least in fallback mode ("Aktuelle Sprechzeiten ansehen" / "Praxis kontaktieren"). Specific states (open/closed/acute) are unlocked state by state as blockers resolve. Server-rendered, no-JS correct. | FB-01…FB-09 |
| C05 | **Closures + Vertretung** | Date-bound, auto-expiring; replacements with tappable numbers; fallback without replacement | F53, F54, FB-10 |
| C06 | **Aktuelle Hinweise** (notices) | Validity window mandatory or explicit "unbefristet"; auto-expiry | FB-11 |
| C07 | **Kontakt & Anfahrt** | Address, phone, fax (if kept), email with usage note, route link to external map app (no embed by default) | F13–F18, LB-03, LB-11 |

### PRAXIS

| ID | Feature | Notes | Depends on |
|---|---|---|---|
| C08 | **Ärztinnen** | Real names, verified titles | F20–F23, LB-05 |
| C09 | **Team** | Only consented entries; transparent photo placeholders | F24–F34, LB-08, LB-09 |
| C10 | **Erster Besuch** (minimal) | Only confirmed facts; if FB-14/FB-15 unresolved → "Bitte rufen Sie uns an" | F77–F79 |

### MEIN KIND

| ID | Feature | Notes | Depends on |
|---|---|---|---|
| C11 | **Vorsorge U/J overview** | Official U/J schedule with source (G-BA) and "Stand"; which U/J the practice performs = F67 | F67 / FB-12, source-policy §4 |

### Platform, truth, legal

| ID | Feature | Notes |
|---|---|---|
| C12 | **Structured practice data model** | Single source for contact, hours, slots, closures, replacements, notices, emergency directory, team — with status, validity and verification dates (cf. dynamic-content-candidates.md) |
| C13 | **German editor interface for operational data** | Closures, replacements, notices, team; warnings for missing end dates/overdue verification; date preview of PRAXIS PULS |
| C14 | **Impressum** | Legally reviewed, LB-02…LB-06 |
| C15 | **Datenschutz** | Legally reviewed, LB-07; minimal data processing by design |
| C16 | **Accessible conventional navigation** | Always present, independent of the Growing Mobile |
| C17 | **Redirects from old URLs** | /aktuell/, /praxis/, /team/, /leistungen/, /notfaelle/, /kontakt/, /impressum/ → new equivalents; /hello-world/ → 410/removed |

## 2. SIGNATURE

| ID | Feature | Scope in V1 | Guardrails | Depends on |
|---|---|---|---|---|
| S01 | **PRAXIS PULS — full states** | "Geöffnet · heute bis 12:00", "Akutsprechstunde ab 10:00", "Heute geschlossen · morgen ab 08:00", "Praxisurlaub · Vertretung anzeigen", "Geänderte Sprechzeit" | Each state enabled only when its facts are `VERIFIED_CURRENT`; test matrix T3 (success-criteria) | FB-01…FB-09 |
| S02 | **The Growing Mobile** (entry + navigation enhancement) | Entry object; three transformations: Praxis → time/status instrument, Mein Kind → age instrument, Entdecken → explorer | Never in front of utility; static/illustrated fallback; reduced-motion path; never the only navigation; lazy-loaded; budget-capped | Design phase |
| S03 | **Altersnavigator (Mein Kind by age)** | Default UX: parent selects an age range **0–2 · 3–6 · 7–12 · 13–17** → relevant U/J examinations and curated vaccination orientation (see below), practice-approved notes | No birthdate collected or persisted in V1; no personal data stored; architecture extensible for a future *local-only* precise age selector (P15); medical content sourced + approved | F67, F68, source-policy §4 |
| S04 | **Mein Arztbesuch** (ENTDECKEN, chapter 1) | Child-facing walkthrough of a visit at this practice: arrival, waiting, measuring/weighing, listening, looking in ears/throat, ("Warum macht die Ärztin das?" integrated), goodbye | Physician-approved, honest wording; works as plain illustrated story without JS; read-aloud only on request; real rooms only if photographed; built on the shared ENTDECKEN chapter architecture (see below) | Practice approval; content phase |

### S03 — Vaccination orientation model

Not a bare link to STIKO. The model is **curated explanation + official source + update governance**.

| Provide (German, per age range) | Never |
|---|---|
| Which vaccinations are typically relevant at this age | Infer or display an individual child's vaccination status |
| What each vaccination protects against | Act as an independent recommendation engine |
| Why it is discussed at this age | Copy a static schedule without update governance |
| Where the current official recommendation can be verified (STIKO/RKI) | Publish recommendation-related content without an official source |
| "Stand" / last-verified date | Replace the individual conversation with the physician |

Update governance: each vaccination entry stores its official source, source version/date, last verification date and approving physician. A STIKO update or an overdue verification flags the entry for review; overdue entries fall back to the general explanation + official link without age-specific detail.

### S04 — ENTDECKEN chapter architecture

ENTDECKEN is designed as a world of chapters from V1 on. V1 ships one chapter (Mein Arztbesuch) — it must feel like the first chapter of a larger world, not an isolated feature. Content model, navigation, visual language and the Growing Mobile entry already provide for:

- Reise in deinen Körper (Phase 2)
- Wachstum (Phase 2)
- Ernährung (Phase 2)

Future chapters may be foreshadowed (e.g. "Bald entdecken") without promising dates or content that does not exist yet.

## 3. PHASE 2

| ID | Feature | Why deferred |
|---|---|---|
| P01 | Leistungen as a rich page (beyond a confirmed list) | Needs FB-12 confirmation + editorial work; a plain confirmed list can be CORE-adjacent if confirmed in time |
| P02 | Räume / Praxis rooms with real photography | Needs a photo shoot (NH-05) |
| P03 | Haltung (practice philosophy) | Needs practice input (F90); must not be invented |
| P04 | Physician bios | Needs practice input (F90) |
| P05 | ENTDECKEN: Reise in deinen Körper | Large content + medical review effort; architecture prepared in V1 |
| P06 | ENTDECKEN: Wachstum (playful, non-personal) | Content + review; must avoid becoming a measurement tool; architecture prepared in V1 |
| P07 | ENTDECKEN: Ernährung | Content + review; sourced from official bodies only; architecture prepared in V1 |
| P08 | MEIN KIND topics beyond U/J: Entwicklung, Ernährung, Schlaf, Bewegung | Sourced editorial content per age range, physician approval, maintenance |
| P09 | Deeper vaccination content (per-vaccine pages, FAQ) beyond the V1 orientation in S03 | Same governance model; more editorial and review effort |
| P10 | Calendar export (.ics) for closures | Nice convenience once closure data is reliable |
| P11 | Click-to-load map | Route link suffices in V1 |
| P12 | Read-aloud (TTS / recorded voice) for child content | Production effort; must stay opt-in |
| P13 | Privacy-friendly usage statistics (self-hosted, aggregated, ideally cookieless) | Decide with practice + privacy review; V1 may launch with no analytics |
| P14 | Anfahrt details: parking, stroller, accessibility, public transport | Depends on F85–F88 (NICE TO HAVE) |
| P15 | Local-only precise age selector for MEIN KIND | Only if it adds meaningful value over age ranges; nothing persisted or transmitted |

## 4. DO NOT BUILD YET

| ID | Feature | Reason |
|---|---|---|
| X01 | Symptom checker | Medical-device/liability risk, false reassurance |
| X02 | AI diagnosis / AI medical chatbot | Unsafe, unverifiable |
| X03 | Prescription / referral upload or request form | Health data transfer; process unconfirmed (F80) |
| X04 | Patient accounts / login / portal | No V1 need; data liability |
| X05 | Any form collecting health data (symptoms, diagnoses, insurance numbers) | GDPR Art. 9 |
| X06 | Collecting or persisting birthdates (server, cookies, local storage) | Personal data; age ranges cover V1 (see P15 for a possible local-only extension) |
| X07 | Growth / percentile calculator with the child's real measurements | Medical interpretation of personal data |
| X08 | Online appointment booking | Channel undecided (F48); third-party privacy review needed |
| X09 | Contact form | Invites health data via web form; phone/email suffice (revisit with F18 policy) |
| X10 | Testimonials / reviews / star ratings | Trust and professional-law risk |
| X11 | Newsletter / push notifications | Maintenance + consent overhead; no confirmed need |
| X12 | Chat / messenger widget | Health data, availability expectations |
| X13 | Video consultation integration | Not confirmed as offered (F84) |
| X14 | Social media feeds / embeds | Tracking, no confirmed channels |
| X15 | Additional public UI languages | Project rule: public site German only (revisit only on practice request) |
| X16 | Gamification (points, streaks, rewards) in ENTDECKEN | Child protection principle |
| X17 | Native app / installable PWA with offline status | Offline status could show stale operational data; revisit after V1 |

## 5. V1 release slicing (proposal)

1. **Release gate A — "Safe & true"**: C01–C17 with PRAXIS PULS in fallback mode. Public launch once LB-00…LB-12 are resolved; design and development proceed in parallel.
2. **Gate B — "Alive"**: S01 states unlocked as FB-01…FB-09 resolve.
3. **Gate C — "Memorable"**: S02, S03, S04 at full quality bar.

Gates B and C may ship with or after A; A never waits for B or C.
