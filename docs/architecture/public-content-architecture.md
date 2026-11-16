# Public Content Architecture — Phase 10 lock

Phase: **10.0D** · Date: **2026-11-16** · Baseline `ff09696`
Status: **LOCKED** — the authoritative placement decision for the Phase 10B rollout. It decides **where** each remaining topic lives and **what it may contain**. It publishes nothing: every fact named here keeps its status (fact register), and no route below is created before its content is approved.

Builds on (does not replace): [information-architecture.md](../ux/information-architecture.md) (Phase 03 sitemap, P-IDs), [content-ownership-map.md](../ux/content-ownership-map.md) (canonical entities E1–E17), [navigation-model.md](../ux/navigation-model.md). Where this document is more specific for a Phase 10 topic, it wins. Approval workspaces: `/review/gut-vorbereitet`, `/review/praxis-app`, `/review/rezepte`, `/review/kosten`, `/review/team` (staging only, never in public navigation). Open questions grouped by this IA: [practice-confirmation-backlog.md](../reviews/practice-confirmation-backlog.md).

---

## 1. Fixed frame (unchanged)

- **Top level:** Start · Heute · Mein Kind · Praxis · Entdecken (`PRIMARY` in `src/content/site.ts`). No new top-level item.
- **Mobile dock:** Menü · Heute · Notfall · Anrufen. Never E-Mail, App, Rezepte, Preise or Team.
- **Start = Homepage Variant B** (10.0A): 1. current practice status (PRAXIS PULS), 2. contact (Anrufen, quiet „E-Mail schreiben“), 3. at most **one** current highlight, 4. everything else in structured sections. No service-icon wall, no banner collection, no Phase 10 topic on the homepage.
- **Heute is operational:** status, current hours, closures, current notices, upcoming operational changes. Nothing evergreen (app download, prices, what to bring, team, prescription guide) lives there permanently.
- **Legal pages** stay in the footer: `/impressum` (10.0C), `/datenschutz` (placeholder until F10 / LB-07), `/barrierefreiheit` (placeholder). Legal readiness is `false` (`legalLaunchReady`, 10.0C).

## 2. Existing structure reconciled (audit 2026-11-16)

| Existing | Decision |
|---|---|
| `/praxis/leistungen` = „Wobei können wir helfen?“ (P-33: parent-language entry points; services unconfirmed) | **Kept as ONE page** (Phase 03 decision 1): it opens with the entry points (`NEEDS`) and gains the confirmed **Leistungen** section below them (10.6B). No separate Leistungen or „Zusatzleistungen“ route. H1 stays „Wobei können wir helfen?“ (parent language); the section heading is „Leistungen“. |
| `/praxis/neu-bei-uns` (P-34: first contact — call, hours, way) | **Kept.** Owns *becoming a patient* (first contact, new families F77, newborn registration F79, booking channel F48). It **links** to Gut vorbereitet and never repeats its items. |
| `/praxis/aerztinnen` (P-31) + `/praxis/team` (P-32) | **Kept both** (10.5A decision): physicians and their professional details on Ärztinnen, the whole practice team on Team. No duplicated long texts. |
| `/mein-kind/impfungen` (P-26: general vaccination orientation with official sources) | **Kept** as the canonical *medical orientation* on vaccinations. Not a practice-rule page (see §5). |
| `/praxis` (P-30: five numbered doors) | Becomes the **Praxis hub** (§6) — regrouped in 10.1B, only with routes that exist. |
| `/praxis/gut-vorbereitet` | **Created in 10.1B** (STAGING, working input F91–F94; named confirmation before PRODUCTION, LB-00). |
| Future: `/praxis/rezepte`, `/praxis/praxis-app`, `/praxis/kosten` | **Locked routes, not created.** Created only by their B phase with approved content. Today they answer 404 (tests). No „coming soon“ pages. |

## 3. Route ownership table (reference for later phases)

| Topic | Route | Owner facts | Publication gate | Cross-links | Homepage? |
|---|---|---|---|---|---|
| Praxis hub | `/praxis` | — (composition) | lists only existing, published routes | all Praxis pages | no (Start links „Praxis“ path only) |
| Neu bei uns? | `/praxis/neu-bei-uns` *(exists)* | F48, F77, F79 (+ E1/E2 rendered) | only confirmed items (today: call, hours, address) | → Gut vorbereitet, Kontakt, Sprechzeiten | no |
| Gut vorbereitet | `/praxis/gut-vorbereitet` *(exists since 10.1B, STAGING working input)* | F91, F92, F93 (physician), F94 (physician; = F47) | 10.1A approvals; `selectPublicFirstVisitItems` | ← Neu bei uns; → Leistungen (vaccinations), Mein Kind/Impfungen | no |
| Wobei können wir helfen? / Leistungen | `/praxis/leistungen` *(exists, entry points only)* | F66–F74, F80–F82 | confirmed service entries only (FB-12) | → Kosten (paid services), Mein Kind/Vorsorge + Impfungen, Rezepte (F80) | no (Start's existing `NEEDS` links stay) |
| Rezepte | `/praxis/rezepte` *(not created)* | F101–F109 (F104 ↔ F18, F105 ↔ F91) | 10.3A approvals | → Praxis-App (if F103 confirms the app channel), Kontakt | no |
| Praxis-App | `/praxis/praxis-app` *(not created)* | F95–F100 | 10.2A approvals (F100 + legal review) | → Rezepte (one line, if F98 confirms prescriptions) | no |
| Kosten | `/praxis/kosten` *(not created)* | F110–F117 (+ F111 ↔ F66–F74) | 10.4A approvals; every price references a confirmed service | → Leistungen (service description) | no |
| Ärztinnen | `/praxis/aerztinnen` *(exists, consent-gated)* | F20–F23, F33, F34, F11 | consent (`decidePerson`), photo rule (`decidePersonPhoto`) | → Team, Neu bei uns | no |
| Team | `/praxis/team` *(exists, consent-gated)* | F26–F33, F118, F119, F34, F11 | consent per person; photo consent separate | → Ärztinnen | no |
| Kontakt & Anfahrt | `/praxis/kontakt` *(exists)* | F01, F13–F19, F85–F88 | E1 working data (10.0B); usage note for e-mail only after F18 | → Sprechzeiten, Notfall; Rezepte / App once they exist | Anrufen + quiet E-Mail (Variant B) |
| Current operational state | `/heute`, `/heute/sprechzeiten`, `/heute/aktuelles`, PRAXIS PULS | F35–F54 | 09.x governance | → Notfall, Kontakt | yes — status + one highlight |
| Vaccination orientation | `/mein-kind/impfungen` *(exists)* | official sources (E13), F68 for „practice vaccinates“ | source-policy §4 | → Gut vorbereitet (Impfpass line), Leistungen | no |
| Legal | `/impressum`, `/datenschutz`, `/barrierefreiheit` | F02–F10, LB-16 | `legalLaunchReady` | footer only | footer only |

## 4. Single source of public truth

A topic may be **referenced** elsewhere (one line + link), but its full explanation lives in exactly one place.

| Information | Authoritative home | Elsewhere only as |
|---|---|---|
| What to bring / how to prepare a visit | Gut vorbereitet | a link from Neu bei uns, Impfungen |
| How to become a patient / first contact | Neu bei uns? | a link from Praxis hub, Mein Kind 0–2 |
| What the practice offers (service description) | Leistungen (section of P-33) | age pages list relevant entries (rendered from the same data) |
| What a paid service costs, how to pay | Kosten | „kostenpflichtig – Preis unter Kosten“ link on the service entry |
| How a prescription request works | Rezepte | one line on Praxis-App, one link on Kontakt |
| Which app, what for, how to register | Praxis-App | a link from Rezepte if the app is a confirmed channel |
| Who works here | Ärztinnen / Team | — |
| How to reach and find the practice | Kontakt & Anfahrt (E1) | footer, Impressum and Neu bei uns render E1 (no copies) |
| Current operational state | Heute / PRAXIS PULS | Start shows status + one highlight |
| General vaccination / check-up orientation | Mein Kind → Impfungen / Vorsorge | Leistungen links there |

## 5. Duplication rules

1. **Vaccination.** „Impfpass mitbringen“ (F92) → Gut vorbereitet. „Ohne Impfpass keine Impfung“ (F93) → Gut vorbereitet, **only after physician confirmation**, never merged with F92. „Die Praxis impft“ (F68) → Leistungen. General orientation (STIKO, why, when) → Mein Kind/Impfungen. No explanatory paragraph appears on two pages; the others link.
2. **Prescriptions ↔ app.** Rezepte owns the process (who, which, how, prerequisites, when, E-Rezept/paper). Praxis-App owns the app (name, provider, stores, functions, registration). If prescriptions run through the app, the app page says „Rezeptanfragen sind über die App möglich.“ and links to Rezepte; Rezepte names the app as a channel and links back. Wording: „Rezept **anfragen**“, never „bestellen“ — an inquiry is not issuance.
3. **Services ↔ prices.** Leistungen describes *what* a service is (incl. a clearly separated „Selbstzahlerleistungen“ block if confirmed); it shows no amounts. Kosten shows *what it costs and how to pay*; every price item references a confirmed service — no service, no standalone price. No separate „Zusatzleistungen“ page.
4. **Contact ↔ e-mail.** Kontakt and Start show the e-mail address as a general contact. No page describes e-mail as a channel for prescriptions, medical questions or health data until F18 / F104 define the allowed use; the defining text then lives in the contextual page (Rezepte for prescriptions, Kontakt for the general usage note).
5. **Banners / highlights** are for temporary operational relevance only (vacation, temporary closure, important temporary notice). Never for evergreen content (app, prices, Gesundheitskarte, prescription instructions). This preserves Variant B.

## 6. Praxis hub concept (implemented in 10.1B — `PRAXIS_GROUPS` in `src/content/site.ts`)

`/praxis` becomes the service hub: one intent → one obvious tap, no reading before choosing. A compact grouped list (existing `BigLinks` pattern, no new card system), no introductory marketing prose before the choices.

```
VOR DEM BESUCH      Neu bei uns? · Gut vorbereitet
ANGEBOT & SERVICE   Wobei können wir helfen? (Leistungen) · Rezepte · Praxis-App · Kosten
ÜBER UNS            Ärztinnen · Team · Kontakt & Anfahrt
```

A group shows only routes that exist and are published; an empty group is omitted. The header keeps the single „Praxis“ item (no seven-link header); the section's secondary navigation follows the same grouping. On mobile the groups are a single column of large targets.

## 7. Primary user question per page (guides future copy)

| Page | Primary question |
|---|---|
| Neu bei uns? | „Wie werden wir Patient, und wie läuft der erste Kontakt?“ |
| Gut vorbereitet | „Was muss ich mitbringen?“ |
| Wobei können wir helfen? / Leistungen | „Was bietet die Praxis an?“ |
| Rezepte | „Wie bekomme ich ein Rezept?“ |
| Praxis-App | „Welche App brauche ich und wofür?“ |
| Kosten | „Was kostet die Leistung und wie bezahle ich?“ |
| Ärztinnen / Team | „Wer arbeitet hier?“ |
| Kontakt & Anfahrt | „Wie erreiche ich die Praxis?“ |

**Content length rule:** utility first, short explanation second, details only where needed. No introductory marketing prose before task content — parents often arrive with a sick child.

## 8. Topic specifications

**Gut vorbereitet** — Belongs: Gesundheitskarte / Versichertenkarte (F91), Impfpass (F92), vaccination preparation rule (F93, physician), infection / mask instruction (F94 = F47, physician), other items the practice explicitly confirms. Not: service catalogue, prices, payment, prescription process, app download, medical treatment advice. Design (10.1A): small cards — short title, one line, optional link.

**Leistungen** — Belongs: confirmed services (F66–F74: general care, U/J, vaccinations, certificates incl. Kita-Tauglichkeit, …), Kind-krank-Bescheinigung (F81), insurance notes (F82) if confirmed; a separated self-pay block if confirmed. Not: prices, payment, invented catalogue entries, the 2020 list unconfirmed.

**Rezepte** — Belongs: which prescriptions may be requested without an appointment, channels, prerequisites (card read, F105), required information, E-Rezept / paper, availability. Not: app setup, prices, medical advice. Only confirmed channels become buttons.

**Praxis-App** — Belongs: exact name, provider, store / web links, functions the practice actually uses, registration (code / invitation / QR). Not: the full prescription process, app marketing, mock-ups, unconfirmed QR codes. Not on Start, PULS or the dock.

**Kosten** — Belongs: service name, price / price form, payment methods, timing, „keine Barzahlung“ only if confirmed, billing notes if confirmed. Not: service definitions, a checkout, payment links, card data.

**Ärztinnen / Team** — Belongs: people with publication consent; name and photo consent separate; optional role labels once confirmed (F32). Not: mandatory bios, invented hobbies / quotes / stories, AI portraits. The current working roster stays internal (`/review/team`) until consent passes.

**Kontakt & Anfahrt** — Belongs: address, phone, fax (while useful, NH-13), e-mail, hours context, later a route link / map only if approved and privacy-appropriate. Not: prescription instructions, full app instructions, price list — cross-link instead.

## 9. Cross-link matrix (task-driven, no „Mehr erfahren“ walls)

| From | To | Task served |
|---|---|---|
| Neu bei uns? | Gut vorbereitet | „what do I bring to the first visit“ |
| Gut vorbereitet | Leistungen (vaccinations), Mein Kind/Impfungen | „which vaccinations / why“ |
| Leistungen (paid entry) | Kosten | „what does it cost“ |
| Kosten | Leistungen | „what exactly is this service“ |
| Leistungen (F80 entry) | Rezepte | „how do I get a repeat prescription“ |
| Praxis-App | Rezepte (only if F98 confirms) | „request a prescription in the app“ |
| Rezepte | Praxis-App (only if F103 confirms), Kontakt | „use the channel“ |
| Kontakt | Sprechzeiten, Notfall; Rezepte / App once published | reach the right place |
| Start | the current highlight's destination only | temporary operational info |

A link is added only when both ends are published. Links never go to review routes.

## 10. Phase 10B rollout plan (coordinated, dependency-ordered)

The A packages keep their numbers as approval gates (10.1A–10.5A); the B implementations ship as one system in waves. Leistungen gets its own step **10.6B** (it had no A package; its gate is FB-12 / F66–F74), so existing references to 10.2B–10.5B stay valid.

| Wave | Step | Content | Depends on | Why this position |
|---|---|---|---|---|
| 1 | **10.1B — done** | Gut vorbereitet + Praxis hub grouping (§6) + link from Neu bei uns | F91–F94 answers (practice input 2026-11-16) | Smallest, organisational; establishes the hub every later page plugs into |
| 2 | **10.6B** | Leistungen section on P-33 (+ self-pay block if confirmed) | F66–F74, F80–F82 (Z3) | Kosten references services; Rezepte (F80) and vaccination wording depend on it |
| 3 | **10.3B + 10.2B** | Rezepte and Praxis-App, one release | F101–F109, F95–F100, F18/F104 (K5, K4, K1) | The two pages reference each other (F103 ↔ F98); shipping them separately creates dangling or wrong links |
| 4 | **10.4B** | Kosten | F110–F117 + confirmed services from wave 2 (Z1, Z2) | No price without a published service |
| parallel | **10.5B** | Ärztinnen / Team with consented people and photos | F33, F34, F11, F23, F32 (T1–T3, M1–M3) | Independent of the service pages; ships when consent arrives |
| separate | legal | Datenschutz, Barrierefreiheit, legal finalisation | F02–F10, LB-16 | Legal track, gated by `legalLaunchReady` |

If answers arrive out of order, a wave may ship early **only** if its dependencies are met (e.g. Praxis-App alone if F98 confirms the app has no prescription function). Each wave reuses the shared page system (PageFrame, PageIntro, Section, BigLinks / Steps) — no review-prototype styling promoted to production.

## 11. Approval boundaries (statuses unchanged)

| Route | Gate |
|---|---|
| Gut vorbereitet | 10.1A · F91–F94 |
| Praxis-App | 10.2A · F95–F100 |
| Rezepte | 10.3A · F101–F109 |
| Kosten | 10.4A · F110–F117 |
| Ärztinnen / Team | 10.5A · F20–F34, F118, F119 (name consent, photo consent) |
| Leistungen | FB-12 · F66–F74, F80–F82 |

No TO_BE_CONFIRMED content becomes public through this document. 10.0D changes no page, no navigation and no fact status.

## 12. Guard

`src/content/__tests__/content-architecture.test.ts` reads §3 of this document and checks: routes marked *not created* do not exist; every Praxis link in `SITEMAP` points to an existing page; review routes never appear in public navigation; top level and dock are unchanged.
