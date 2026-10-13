// Release gates: decisions that are not facts but launch conditions
// (docs/research/project-blockers.md). One place, so launch is a reviewed change.

/**
 * GLOBAL PROJECT RULE — deployment stage (docs/architecture/deployment-model.md).
 *
 * The current Vercel deployment is the project's STAGING / review environment, NOT the live
 * practice website. On STAGING, implemented work is directly visible for review (no special
 * query, no hidden URL, no Vercel environment variable). The content-specific gates in RELEASE
 * become authoritative only when SITE_STAGE is switched to "PRODUCTION" in a deliberate launch
 * step. Deliberately NOT derived from Vercel's environment name: Vercel calls the main-branch deployment
 * "production" although the project still uses it as staging.
 *
 * Staging visibility is never approval provenance: approval records stay truthful.
 */
export type SiteStage = "STAGING" | "PRODUCTION";
export const SITE_STAGE: SiteStage = "STAGING";

/** Review tooling (the /review hub and the cockpit prototype under /lab) is reachable on STAGING only. */
export const stageAllowsReview = (stage: SiteStage = SITE_STAGE) => stage === "STAGING";

export const RELEASE = {
  /**
   * LB-00 — the practice has signed off the opening hours for PRAXIS PULS.
   * Approved for this project on 2026-10-07 (human decision after Phase 07 review).
   * PRAXIS PULS now derives the live state from the verified weekly hours via the
   * domain engine. Weekend closure (F40) was confirmed by the practice on 2026-10-11
   * (Nadine Probst), so Saturdays/Sundays resolve to CLOSED with the next opening.
   * Still unconfirmed and resolving to UNKNOWN: holidays (F49), acute hours (F44–F46).
   */
  pulsPracticeSignOff: true,
  /**
   * ENTDECKEN · Mein Arztbesuch — PRODUCTION publication decision (future live website).
   * NOT set: showing the chapter on the current STAGING deployment (SITE_STAGE) is not a
   * pre-approval for production. In PRODUCTION the chapter additionally needs complete formal
   * approvals (approvalsComplete). On STAGING this flag makes no visible difference.
   */
  meinArztbesuchPublished: false,
  /**
   * ENTDECKEN · Mein Arztbesuch — FORMAL APPROVAL status (provenance, kept truthful).
   * Practice, content, medical (scenes 03–05) and AI-child publication approvals are still
   * OPEN (docs/reviews/discovery-approval-package.md); the per-scene records in discovery.ts
   * stay TO_BE_CONFIRMED without names or dates. Set to true only with real approval evidence.
   */
  meinArztbesuchApproved: false,
  /** Indexing stays off until launch blockers are resolved. Pages are built indexable. */
  indexable: false,
  /** Internal "Freigabe ausstehend" notes are visible in this pre-launch build. */
  showInternalNotes: true,
} as const;

/** Review-only query parameters (never linked from the public UI). */
export type ReviewParams = {
  /** "freigabe": simulate confirmed sign-off/consent for layout review. */
  vorschau?: string;
  /** ISO local date-time (Europe/Berlin) to evaluate PRAXIS PULS, e.g. 2026-10-06T09:30 */
  zeit?: string;
};
