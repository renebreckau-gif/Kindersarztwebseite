// Preventive examinations — regulatory status kept apart from medical editorial approval
// and from the practice's own offer (Phase 08, U10 governance).
//
// Three layers that must never be merged:
//   1. OFFICIAL REGULATION   decided ≠ in force (decision, BMG review, publication, entry into force)
//   2. EDITORIAL APPROVAL     a physician of the practice approved the public wording
//   3. PRACTICE OFFER         the practice performs it (separate practice fact)
// None of them is an individual recommendation — the website never gives one.

import type { FactVerification } from "../domain/verification.ts";
import type { LocalDate } from "../domain/time.ts";

const UNCONFIRMED: FactVerification = { status: "TO_BE_CONFIRMED", sourceIds: [] };

export type DecisionStatus = "BESCHLOSSEN" | "AUFGEHOBEN";
export type MinistryReview = "AUSSTEHEND" | "NICHT_BEANSTANDET" | "BEANSTANDET";
export type GazettePublication = "AUSSTEHEND" | "VEROEFFENTLICHT";
export type EntryIntoForce = { state: "NOCH_NICHT_IN_KRAFT" } | { state: "IN_KRAFT"; since: LocalDate };

export interface RegulatoryDecision {
  id: string;
  examination: string;
  title: string;
  decisionDate: LocalDate;
  decisionStatus: { value: DecisionStatus; verification: FactVerification };
  ministryReview: { value: MinistryReview; date?: LocalDate; verification: FactVerification };
  gazettePublication: { value: GazettePublication; reference?: string; verification: FactVerification };
  entryIntoForce: { value: EntryIntoForce; verification: FactVerification };
  /** Physician of the practice approved the public explanation (source-policy §4). */
  editorialApproval: { approvedBy?: string; verification: FactVerification };
  /** Does this practice perform it? Separate practice fact (like F67). */
  offeredByPractice: { value: boolean | null; verification: FactVerification };
  sourceIds: string[];
  lastVerified: LocalDate;
}

const CHECKED_GBA: FactVerification = {
  status: "VERIFIED_CURRENT",
  lastVerified: "2026-10-07",
  reviewDue: "2026-11-07",
  verifiedBy: "Projektprüfung g-ba.de/beschluesse/7982 (Phase 08)",
  sourceIds: ["GBA_U10"],
};

export const U10: RegulatoryDecision = {
  id: "u10-2026",
  examination: "U10",
  title: "Kinder-Richtlinie: Einführung einer neuen Früherkennungsuntersuchung für Kinder nach § 26 SGB V",
  decisionDate: "2026-08-20",
  decisionStatus: { value: "BESCHLOSSEN", verification: CHECKED_GBA },
  // From the Phase 08 brief: BMG did not object on 30.09.2026. Not shown on the G-BA
  // decision page on 2026-10-07 → recorded, but not verified by the project.
  ministryReview: {
    value: "NICHT_BEANSTANDET",
    date: "2026-09-30",
    verification: { ...UNCONFIRMED, internalNotes: "Angabe aus dem Phase-08-Auftrag; auf der G-BA-Beschlussseite am 07.10.2026 nicht angegeben." },
  },
  gazettePublication: { value: "AUSSTEHEND", verification: CHECKED_GBA },
  entryIntoForce: { value: { state: "NOCH_NICHT_IN_KRAFT" }, verification: CHECKED_GBA },
  editorialApproval: { verification: UNCONFIRMED },
  offeredByPractice: { value: null, verification: UNCONFIRMED },
  sourceIds: ["GBA_U10"],
  lastVerified: "2026-10-07",
};

const verified = (v: FactVerification) => v.status === "VERIFIED_CURRENT";

/**
 * Public sentence about a decided examination, or null. Shown only when the decision is
 * verifiably IN FORCE *and* a physician approved the wording. The practice offer is never
 * implied by this sentence — it needs its own verified fact.
 */
export function publicDecisionStatement(d: RegulatoryDecision): string | null {
  const inForce = d.entryIntoForce.value.state === "IN_KRAFT" && verified(d.entryIntoForce.verification);
  const approved = verified(d.editorialApproval.verification);
  if (!inForce || !approved) return null;
  return `Die ${d.examination} gehört zu den Früherkennungsuntersuchungen der Kinder-Richtlinie.`;
}

/** Practice offer statement — only from its own verified fact. */
export function practiceOffers(d: RegulatoryDecision): boolean {
  return d.offeredByPractice.value === true && verified(d.offeredByPractice.verification);
}
