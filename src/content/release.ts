// Release gates: decisions that are not facts but launch conditions
// (docs/research/project-blockers.md). One place, so launch is a reviewed change.

export const RELEASE = {
  /**
   * LB-00 — the practice has signed off the opening hours for PRAXIS PULS.
   * Approved for this project on 2026-10-07 (human decision after Phase 07 review).
   * PRAXIS PULS now derives the live state from the verified weekly hours via the
   * domain engine. All other gates are unchanged: weekend (F40), holidays (F49),
   * acute hours (F44–F46) stay unconfirmed and still resolve to UNKNOWN.
   */
  pulsPracticeSignOff: true,
  /**
   * ENTDECKEN · Mein Arztbesuch (V1, S04). The story describes a visit to THIS practice;
   * its order and wording need practice + physician approval, and the final D1
   * illustrations do not exist yet. Until both: public route shows "In Vorbereitung";
   * the full story is only reachable in the review preview (?vorschau=freigabe).
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
