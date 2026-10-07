// Release gates: decisions that are not facts but launch conditions
// (docs/research/project-blockers.md). One place, so launch is a reviewed change.

export const RELEASE = {
  /**
   * LB-00 — the practice has signed off the opening hours for PRAXIS PULS.
   * The register allows showing the hours (VERIFIED_CURRENT as working data) but
   * PRAXIS PULS may only derive a live state after sign-off. Until then: UNKNOWN.
   */
  pulsPracticeSignOff: false,
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
