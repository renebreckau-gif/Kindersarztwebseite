// Release gates: decisions that are not facts but launch conditions
// (docs/research/project-blockers.md). One place, so launch is a reviewed change.

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
   * ENTDECKEN · Mein Arztbesuch (V1, S04). Released 2026-10-12: practice, content,
   * physician (scenes 03–05) and AI-child publication approved by Nadine Probst
   * (docs/reviews/discovery-approval-package.md); all six final images integrated.
   * The chapter is public only while chapterPublishable() also holds — a revoked
   * approval or a placeholder image closes it again automatically.
   */
  meinArztbesuchApproved: true,
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
