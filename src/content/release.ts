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
   * ENTDECKEN · Mein Arztbesuch — PUBLICATION DECISION (visibility).
   * Explicitly enabled on 2026-10-13 by project decision: the chapter is shown on the normal
   * website in its current form (V1 text; wording may still be refined). This is a publication
   * decision, NOT a verification record: it does not claim that any approval was given.
   */
  meinArztbesuchPublished: true,
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
