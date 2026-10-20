# Deployment model — GLOBAL PROJECT RULE

Date: 2026-10-13
Code: `SITE_STAGE` in [`src/content/release.ts`](../../src/content/release.ts)

## Current deployment model

**The current Vercel deployment is the project's STAGING environment. It is not the live practice website.**

- **Visible for review:** implemented functionality is normally visible on staging, with no special query parameter, hidden URL or Vercel environment variable.
- **Gates wait for production:** formal publication gates are kept for the future production launch. They do not automatically hide staging content.
- **Visibility is not approval:** visibility on staging is never approval provenance. Approval records (practice, content, medical, AI-child) stay truthful, e.g. `TO_BE_CONFIRMED` without names or dates, until real approvals exist.
- **Indexing stays off:** staging stays non-indexable (`RELEASE.indexable = false`, `noindex, nofollow` as meta tag and `X-Robots-Tag` header).

This rule applies to all work in this repository.

## One concept: `SITE_STAGE`

| Value | Meaning |
|---|---|
| `"STAGING"` (current) | Review environment. Implemented pages, chapters, the `/review` overview and the cockpit prototype (`/lab/praxis-cockpit`) are reachable. Content-specific `RELEASE` gates do not hide implemented work. |
| `"PRODUCTION"` (future) | Live practice website. `RELEASE` gates are authoritative: a chapter needs its publication decision, `/review` answers 404, and the cockpit prototype under `/lab/praxis-cockpit` answers 404. |

- `SITE_STAGE` is set **explicitly in the repository**. It is not derived from `VERCEL_ENV`, because Vercel calls the main-branch deployment "production" although the project uses it as staging.
- There is no second "review environment" concept. The former `REVIEW_HUB_ENABLED` environment variable and `src/content/environment.ts` were removed.

### What uses it

| Area | STAGING | PRODUCTION |
|---|---|---|
| ENTDECKEN chapters (`chapterPublishable`) | Visible when implemented (final, non-placeholder production images), regardless of pending approvals | Visible only with the explicit production publication decision (`RELEASE.meinArztbesuchPublished`) **and** complete formal approvals (`approvalsComplete`) **and** final images |
| Mein Arztbesuch | Currently visible for review: chapter 1 on `/entdecken`, all six scenes on `/entdecken/mein-arztbesuch` | Gated: requires the explicit production publication decision (`meinArztbesuchPublished`, currently `false`) plus complete formal practice, content and medical (03–05) approvals, checked in code by `approvalsComplete` (all still open). The AI-child publication decision is also open; it is documented but not yet modelled in code and must be part of the launch review. |
| `/review` | Convenience overview (normal website, Praxis Cockpit, Mein Arztbesuch); unlocks nothing | 404 |
| `/lab/praxis-cockpit` (mock login, prototype labelling) | Reachable for testing; never in the patient navigation | 404 (layout guard) |
| `?vorschau=freigabe` (+ `&zeit=`) | Editorial review preview: PRAXIS PULS time preview, simulated publication consent on Start / Team / Ärztinnen (labelled "Vorschau"), draft chapters in Entdecken | **Ignored** (10.5A.1): one central gate `isPublicReviewPreview` (`src/content/release.ts`, via `stageAllowsReview`) — LIVE behaviour, no review time, no consent simulation, no drafts |
| Indexing | `RELEASE.indexable = false` | Decided at launch |

## Switching to production (not done)

`SITE_STAGE: "STAGING" → "PRODUCTION"` is a deliberate launch step with its own review. It covers, among others:

- which pages and chapters are released, and which approvals are complete
- cockpit protection or removal, and blocking of the other `/lab` routes (only the cockpit layout is guarded so far)
- review hub availability
- indexing / SEO
- the real domain
- analytics and privacy decisions
- production authentication
- final medical and practice review

## Correction (2026-10-13)

An earlier version of this page stated that Mein Arztbesuch would also be visible in PRODUCTION because of `meinArztbesuchPublished = true`. That was wrong: the user decision was to show implemented work on STAGING, not to pre-approve it for the live website.

- `meinArztbesuchPublished` is now `false`.
- PRODUCTION requires the publication decision **and** complete formal approvals.
- STAGING is unchanged.
