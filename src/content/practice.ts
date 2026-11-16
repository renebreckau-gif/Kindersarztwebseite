// Practice master data — every value carries its register status
// (docs/research/fact-status-register.md). Components never hard-code these facts.

import { standingReviewDue, type FactVerification } from "../domain/verification.ts";
import type { VerifiedValue } from "../domain/content-types.ts";

/** Register state "VERIFIED_CURRENT (as working data)": research-verified, practice sign-off (LB-00) pending. */
export const WORKING: FactVerification = {
  status: "VERIFIED_CURRENT",
  lastVerified: "2026-10-07",
  reviewDue: "2027-01-07",
  verifiedBy: "Projektrecherche Phase 00.5 (Arbeitsstand) – Praxisfreigabe LB-00 ausstehend",
  sourceIds: ["S01"],
};
export const UNCONFIRMED: FactVerification = { status: "TO_BE_CONFIRMED", sourceIds: [] };

/**
 * Practice input of 2026-11-16 (docs/reviews/practice-input-2026-11-16.md), relayed by the project owner.
 * No named person at the practice is recorded, so this is VERIFIED_CURRENT *as working data* for the
 * CONTACT data (project owner decision 2026-11-16) and the "Gut vorbereitet" items (F91–F94, project owner
 * brief 10.1B; first-visit.ts); the named sign-off before launch (LB-00) stays open.
 * Never used for opening hours, holidays, team, acute hours, closures or emergency data.
 */
export const INTAKE_2026_11_16 = "2026-11-16";
export const PRACTICE_INPUT: FactVerification = {
  status: "VERIFIED_CURRENT",
  lastVerified: INTAKE_2026_11_16,
  reviewDue: standingReviewDue(INTAKE_2026_11_16),
  verifiedBy: "Praxisangabe, übermittelt durch Projektinhaber",
  sourceIds: ["PI-2026-11-16"],
};

/**
 * Working input, not a final practice confirmation: STAGING may show it; PRODUCTION needs a named
 * confirmation first (LB-00, guarded by tests).
 */
export const isWorkingInput = (v: FactVerification) => v.verifiedBy === PRACTICE_INPUT.verifiedBy;

const v = <T,>(value: T, verification: FactVerification = WORKING): VerifiedValue<T> => ({ value, verification });

export const PRACTICE = {
  /** F01 — practice input 2026-11-16 (LB-01). */
  name: v("Kinderarztpraxis Probst & Böhme", PRACTICE_INPUT),
  /** F15 — practice input 2026-11-16. */
  phone: v({ display: "03476 851157", href: "tel:+493476851157" }, PRACTICE_INPUT),
  /** F16 — practice input 2026-11-16. */
  fax: v("03476 854206", PRACTICE_INPUT),
  /** F17 — address: practice input 2026-11-16; usage for patient matters (F18) is not confirmed. */
  email: v("kinderarztpraxis-hettstedt@gmx.de", PRACTICE_INPUT),
  /** F13 — "Untere Bahnhofstraße 9" (practice input 2026-11-16, LB-03); older variants are not used. */
  street: v("Untere Bahnhofstraße 9", PRACTICE_INPUT),
  /** F14 — practice input 2026-11-16. */
  postalCode: v("06333", PRACTICE_INPUT),
  city: v("Hettstedt", PRACTICE_INPUT),
  /** F19 — not stated anywhere. */
  telephoneHours: v<string | null>(null, UNCONFIRMED),
} as const;

/** Only verified values, ready for rendering. */
export function isPublic<T>(x: VerifiedValue<T>): boolean {
  return x.verification.status === "VERIFIED_CURRENT";
}

/** Address line with only the verified parts. Street appears once F13 is confirmed. */
export function publicAddress(): { street: string | null; cityLine: string } {
  return {
    street: isPublic(PRACTICE.street) ? PRACTICE.street.value : null,
    cityLine: `${PRACTICE.postalCode.value} ${PRACTICE.city.value}`,
  };
}
