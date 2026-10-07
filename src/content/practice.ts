// Practice master data — every value carries its register status
// (docs/research/fact-status-register.md). Components never hard-code these facts.

import type { FactVerification } from "@/domain/verification.ts";
import type { VerifiedValue } from "@/domain/content-types.ts";

/** Register state "VERIFIED_CURRENT (as working data)": research-verified, practice sign-off (LB-00) pending. */
export const WORKING: FactVerification = {
  status: "VERIFIED_CURRENT",
  lastVerified: "2026-10-07",
  reviewDue: "2027-01-07",
  verifiedBy: "Projektrecherche Phase 00.5 (Arbeitsstand) – Praxisfreigabe LB-00 ausstehend",
  sourceIds: ["S01"],
};
export const UNCONFIRMED: FactVerification = { status: "TO_BE_CONFIRMED", sourceIds: [] };

const v = <T,>(value: T, verification: FactVerification = WORKING): VerifiedValue<T> => ({ value, verification });

export const PRACTICE = {
  /** F01 — TO_BE_CONFIRMED (two variants in use). Shown as the working name; LB-01. */
  name: v("Kinderarztpraxis Probst & Böhme", UNCONFIRMED),
  /** F15 */
  phone: v({ display: "03476 851157", href: "tel:+493476851157" }),
  /** F16 */
  fax: v("03476 854206"),
  /** F17 — address verified; usage for patient matters (F18) is not. */
  email: v("kinderarztpraxis-hettstedt@gmx.de"),
  /** F13 — TO_BE_CONFIRMED (spelling variants "Bahnhofstraße" / "Bahnhofsstraße"). Never rendered until confirmed. */
  street: v("Untere Bahnhofstraße 9", UNCONFIRMED),
  /** F14 */
  postalCode: v("06333"),
  city: v("Hettstedt"),
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
