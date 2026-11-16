// Legal launch readiness (Phase 10.0C). A pure guard for a FUTURE switch to PRODUCTION — it never blocks
// STAGING rendering and changes no release flag. The site is legally launch-ready only when every required
// legal fact is VERIFIED_CURRENT and the § 18 Abs. 2 MStV question (LB-16) has an explicit legal answer.
// An existing Impressum page is not a legal approval.

import type { VerificationStatus } from "./verification.ts";

/**
 * Facts required before PRODUCTION: provider / legal form (F02), responsible person(s) (F03), statutory
 * professional titles (F04) and the privacy-policy data (F10 — the Datenschutzerklärung is part of the
 * legal launch set). F05–F07 (professional bodies) must stay verified as well.
 */
export const REQUIRED_LEGAL_FACTS = ["F02", "F03", "F04", "F05", "F06", "F07", "F10"] as const;
export type RequiredLegalFact = (typeof REQUIRED_LEGAL_FACTS)[number];

export interface LegalState {
  facts: Record<RequiredLegalFact, VerificationStatus>;
  /** LB-16: has the legal review answered whether § 18 Abs. 2 MStV applies (either way)? */
  mstvApplicabilityDecided: boolean;
}

export interface LegalReadiness {
  ready: boolean;
  /** What still blocks: fact ids not VERIFIED_CURRENT, plus "LB-16" while the MStV question is open. */
  open: string[];
}

export function legalLaunchReady(state: LegalState): LegalReadiness {
  const open: string[] = REQUIRED_LEGAL_FACTS.filter((id) => state.facts[id] !== "VERIFIED_CURRENT");
  if (!state.mstvApplicabilityDecided) open.push("LB-16");
  return { ready: open.length === 0, open };
}
