# Strategy Lock

Phase: 01.5 — Strategy Lock and Clarifications
Date: 2026-10-07
Status: **LOCKED**

The decisions below are stable. They change only when later evidence clearly requires it (e.g. user testing, legal review, confirmed practice facts), and any change is recorded in §4 with its reason.

Detail lives in the other documents in `/docs/product/` and `/docs/research/`; this file is the summary of record.

---

## 1. Locked decisions

| # | Decision | Locked value | Detail |
|---|---|---|---|
| 1 | **North star** | **Gesund groß werden.** | [north-star.md](north-star.md) |
| 2 | **Product principle** | **Utility first. Wonder second.** — utility first, *not* utility only | [product-principles.md](product-principles.md) P3 |
| 3 | **Design direction** | **Warm Editorial + Cobalt** (name of the approved direction; its visual system is defined in the design phase) | — |
| 4 | **Core product** | **PRAXIS PULS** — persistent, fail-safe answer to "What is relevant about the practice right now?" | [feature-priorities.md](feature-priorities.md) C04, S01 |
| 5 | **Primary paths** | **Heute · Mein Kind · Praxis · Entdecken** ("Heute" is the public name of the operational layer referred to as JETZT in Phase 01 documents) | [value-proposition.md](value-proposition.md) |
| 6 | **Signature entry** | **Growing Mobile** — sculptural, interactive, part of navigation; transforms into time/status (Praxis), age (Mein Kind) and explorer (Entdecken) instruments; enhancement, never dependency | [feature-priorities.md](feature-priorities.md) S02 |
| 7 | **Public language** | **German** — all public UI, child experiences, accessible names and CMS labels for practice staff; code and internal docs may be English | [product-principles.md](product-principles.md) P14 |
| 8 | **Fact policy** | **VERIFIED_CURRENT · TO_BE_CONFIRMED · OUTDATED_DO_NOT_PUBLISH**; never guess, fail safe | [source-policy.md](../research/source-policy.md), [fact-status-register.md](../research/fact-status-register.md) |
| 9 | **Privacy** | **Privacy-first and minimal data** — minimise tracking, third-party dependencies and consent friction; no health-data collection, no accounts | [product-principles.md](product-principles.md) P9 |
| 10 | **Child V1** | **Mein Arztbesuch** — chapter 1 of the ENTDECKEN world | [feature-priorities.md](feature-priorities.md) S04 |
| 11 | **CMS** | Operational content (hours, closures, replacements, notices, team, emergency directory) maintainable by **non-technical practice staff**, in German | [feature-priorities.md](feature-priorities.md) C12, C13 |

## 2. Clarifications adopted in Phase 01.5

### 2.1 Launch blockers are not development blockers
A launch or feature blocker means *"resolve before this claim or feature is publicly launched"* — not *"stop the project"*. Design and development continue with safe fallbacks, clearly marked mock data and placeholders, disabled states and `TO_BE_CONFIRMED` markers.

Examples:
- Acute consultation unconfirmed → PRAXIS PULS is built completely; the acute-specific state stays disabled/fallback.
- Team status unconfirmed → Team experience is built; unresolved entries use placeholders / internal status.
- Parking unknown → Anfahrt is built without parking information.

Mock data and placeholders never appear on public production URLs.

### 2.2 Privacy-first, not "no cookie banner at any cost"
Prefer architecture that does not need consent where practical: self-hosted fonts, no or privacy-friendly analytics, no advertising technology, no third-party media embedded by default, privacy-conscious map implementation. **No claim is made that a cookie banner is legally unnecessary** until the final technical implementation and the legal/privacy review are complete.

### 2.3 Vaccination orientation must add value
Model: **curated explanation + official source + update governance**. Per age range: which vaccinations are typically relevant, what they protect against, why they are discussed at that age, where current official recommendations can be verified, with "Stand" date. Never: an individual child's status, an independent recommendation engine, a static schedule without governance, recommendation content without an official source.

### 2.4 MEIN KIND age model
Default UX: age ranges **0–2 · 3–6 · 7–12 · 13–17**. No birthdates collected or persisted in V1. Architecture stays extensible for a future local-only precise age selector if it adds meaningful value.

### 2.5 Child experience scope
V1: **Mein Arztbesuch**. Phase 2: **Reise in deinen Körper**, **Wachstum**, **Ernährung** — their conceptual and technical architecture is preserved from V1 on. The Growing Mobile and ENTDECKEN entry foreshadow the larger discovery world; the V1 chapter must not feel isolated.

### 2.6 Signature experience remains critical
The utility strategy must not make the website visually conservative. Target: international-level digital craft, distinctive art direction, a memorable entry, high-end motion, spatial/3D interaction where useful, and an immediate emotional and visual reaction — layered on top of indestructible critical utility.

## 3. Invariants (apply to every later phase)

1. Phone, opening hours, practice status, emergency, route and contact never depend on 3D, animation, WebGL, scroll choreography, pointer precision or JavaScript.
2. PRAXIS PULS shows a specific state only when every underlying fact is `VERIFIED_CURRENT`; otherwise a neutral fallback.
3. `OUTDATED_DO_NOT_PUBLISH` content never appears as current.
4. No invented doctors, staff, qualifications, services, hours, rules, testimonials or medical claims.
5. Medical content: official source + "Stand" + physician approval.
6. WCAG 2.2 AA as the floor, including child experiences.
7. Everything on the DO NOT BUILD YET list stays unbuilt without a documented decision.

## 4. Change log

| Date | Change | Reason |
|---|---|---|
| 2026-10-07 | Strategy locked; clarifications 2.1–2.6 adopted; Phase 01 documents and `research/project-blockers.md` updated accordingly | Phase 01.5 review |

## 5. Phase 01.5 document changes

| File | Change |
|---|---|
| `product/feature-priorities.md` | "Blockers do not stop development" section; SIGNATURE definition; age ranges; vaccination orientation model; ENTDECKEN chapter architecture; P05–P07 renamed; P09/P13 revised; P15 added; X06 revised |
| `product/product-principles.md` | P3 "utility first, not utility only"; P9 consent wording; P13 development vs. release |
| `product/success-criteria.md` | L1/L2 consent wording |
| `product/anti-patterns.md` | Consent wording; age ranges; "publishing" vs. "building"; bare-link and conservative-design anti-patterns added |
| `product/trust-model.md` | Privacy row; vaccination orientation |
| `product/value-proposition.md` | Vaccination row; age ranges; ENTDECKEN chapter names |
| `research/project-blockers.md` | Clarification note: blockers gate public release, not development |
