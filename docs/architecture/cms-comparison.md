# CMS Comparison — Sanity vs. Payload

Phase: 04
Date: 2026-10-07
Scope: this project only — a small paediatric practice, a handful of non-technical editors, high-risk operational data, German admin, privacy-first, Next.js codebase already in place. Popularity is not a criterion.

## 0. Sources checked (2026-10-07)

| Fact | Source | Status |
|---|---|---|
| Sanity plans: Free (up to 20 seats, 2 permission roles, 2 datasets **public only**), Growth ($15/seat/month, up to 50 seats, 5 roles, private datasets, scheduled drafts), Enterprise (custom; content releases, full audit trail) | https://www.sanity.io/pricing | Verified on vendor page |
| Sanity Content Releases: "paid feature … available on certain Enterprise plans" | https://www.sanity.io/docs/user-guides/content-releases | Verified on vendor page |
| Sanity Studio repo: MIT, actively maintained | GitHub API `sanity-io/sanity` | Verified |
| Payload: open source, MIT, actively maintained | GitHub API `payloadcms/payload` | Verified |
| Payload admin panel translated into 30+ languages incl. German (`@payloadcms/translations/languages/de`) | https://payloadcms.com/docs/configuration/i18n | Verified on vendor page |
| Payload scheduled publish/unpublish (`schedulePublish`) | https://payloadcms.com/docs/versions/drafts | Verified on vendor page |
| Payload team joined Figma (announced 17 June 2025); Payload remains open source; self-hosting remains supported | https://www.figma.com/blog/payload-joins-figma/ · https://payloadcms.com/posts/blog/payload-is-joining-figma | **Verified** — official Figma and Payload announcements; Payload is under Figma ownership/stewardship |
| Payload Cloud (vendor-hosted offering) availability for new projects | Secondary sources only | Not verified — irrelevant to the recommendation (self-hosting) |
| Sanity data residency options | — | **Not verified** — to be clarified with vendor if Sanity is chosen |

Note: this project's expiry logic does **not** depend on scheduled publishing — validity windows are evaluated at request time by the domain layer (`src/domain/`). Scheduling is a convenience, not a requirement.

## 1. Evaluation

Scale: ++ strong · + good · ○ neutral · – weak · –– problematic (for this project).

| Criterion | Sanity | Payload | Notes |
|---|---|---|---|
| Ease for practice staff | ++ | + | Sanity Studio is very polished; Payload's admin is form-based and clear. Both need a tailored, minimal configuration (few fields, German help texts). |
| German editor experience | + | ++ | Payload ships German admin translations in core; Sanity Studio localisation via plugin/custom labels — all project field labels are custom in both. |
| Structured content | ++ | ++ | Both schema-in-code; references, arrays, validation. |
| Preview capability | ++ | + | Sanity Presentation/visual editing is mature; Payload has live preview / visual editor. PULS date-preview is custom in both. |
| Validation (publish-blocking rules) | + | ++ | Both support validation; Payload hooks run server-side in the same codebase and can call `src/domain/` directly (e.g. block conflicting exceptions). Sanity validation runs in Studio; server-side guarantees need extra work. |
| Scheduled / expiring content | ○ (Growth: scheduled drafts; releases Enterprise) | + (`schedulePublish`) | Not critical — expiry is computed by the domain layer. |
| Media handling | ++ (hosted asset pipeline, image CDN) | + (uploads to own storage, image sizes) | Low media volume; rights metadata custom in both. |
| Role permissions | – on Free (2 roles), + on Growth (5) | ++ (code-defined access control, field-level) | Emergency information needs a restricted role. |
| Hosting | ++ (fully hosted Content Lake) | – (self-host Next.js + database + storage) | Payload adds operational responsibility. |
| Maintenance | ++ | – | Payload: DB backups, updates, security patches are ours. |
| Next.js integration | + (client/GROQ, separate Studio or embedded) | ++ (runs inside the Next.js app, Local API, shared TypeScript types) | |
| Developer experience | + | ++ | Domain types and CMS collections can share one TypeScript model. |
| Vendor dependency | – (proprietary Content Lake) | + (MIT, own DB; under Figma ownership) | Future product direction under Figma ownership should be monitored |
| Long-term cost | – ($15/seat/month for private data + roles; scales with editors) | + (no licence fee; hosting + maintenance cost) | Real total cost depends on the maintenance contract. |
| Data portability | + (export via CLI/API) | ++ (own Postgres/Mongo) | |
| **Privacy / data control** | –– on Free (public datasets expose published documents incl. internal metadata), ○ on Growth (vendor cloud, DPA needed) | ++ (EU hosting of our choice, internal fields never leave our infrastructure) | Decisive for verification metadata (`verifiedBy`, internal notes) and staff consent records. |

## 2. Project-specific findings

1. **Sanity Free is not viable**: public datasets would make internal verification metadata, notes and unpublished-but-referenced content queryable. Sanity therefore means Growth (per-seat cost) at minimum.
2. **Payload's main weakness is operations**: someone must own hosting, database backups and updates — for a medical practice this must be a contracted service, not an assumption.
3. **The domain layer favours Payload**: PULS rules, publish-blocking validation and freshness logic already exist as TypeScript (`src/domain/`) and can run as Payload hooks in the same process, giving server-side guarantees.
4. **Editor UX can be made good in both**; the decisive work is a minimal, German, task-oriented configuration (see cms-requirements.md), not the product choice.
5. **Vendor direction**: Payload is under Figma ownership (verified, June 2025); Payload states it remains open source and that self-hosting remains supported. Future product direction under Figma ownership should be monitored; the MIT licence and self-hosting limit the impact (the code and data stay usable).

## 3. Recommendation

**Payload**, self-hosted in the EU, embedded in the existing Next.js application, with PostgreSQL and object storage, under a maintenance agreement.

Why, in one sentence: it keeps sensitive internal verification and consent data on infrastructure we control, lets the already-written domain rules enforce publication safety server-side, ships a German admin, and has no per-editor licence cost — at the price of operational responsibility that must be explicitly contracted.

Conditions for this recommendation (to confirm before Phase 05):
- A named party accepts hosting, backups, updates and security patching (maintenance agreement).
- EU hosting and database provider chosen with a DPA (privacy review).
- Future product direction under Figma ownership should be monitored (re-check roadmap and licence at decision time).

**Fallback:** Sanity Growth if no one can own operations — accepting per-seat cost, vendor-cloud data (DPA), and client-side-centric validation (mitigated by re-validating with `src/domain/` at render time, which the site does anyway).

Neither CMS is integrated in this phase.
