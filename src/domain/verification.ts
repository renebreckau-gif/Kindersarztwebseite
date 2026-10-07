// Fact verification and freshness.
// The three public confidence states are locked (docs/research/source-policy.md).
// Freshness is a separate dimension: old is not the same as false.

import type { LocalDate } from "./time.ts";
import { addDays, compareDates } from "./time.ts";

export const VERIFICATION_STATUSES = ["VERIFIED_CURRENT", "TO_BE_CONFIRMED", "OUTDATED_DO_NOT_PUBLISH"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export interface FactVerification {
  status: VerificationStatus;
  /** Local date (Europe/Berlin) of the last confirmation. */
  lastVerified?: LocalDate;
  /** Who confirmed: name + role, or institution. Never shown publicly. */
  verifiedBy?: string;
  /** Local date after which the fact needs re-confirmation. */
  reviewDue?: LocalDate;
  /** IDs of SourceReference records. */
  sourceIds: string[];
  internalNotes?: string;
}

/**
 * Freshness of a fact on a given day.
 * - CURRENT: verified and within its review interval
 * - REVIEW_DUE: verified, review date passed, still within grace — "stale but not contradicted"
 * - REVIEW_EXPIRED: verified, review date passed beyond grace — treat as unverified for high-risk use
 * - UNVERIFIED: TO_BE_CONFIRMED (or verified without the dates high-risk content requires)
 * - OUTDATED: OUTDATED_DO_NOT_PUBLISH — never public
 */
export type Freshness = "CURRENT" | "REVIEW_DUE" | "REVIEW_EXPIRED" | "UNVERIFIED" | "OUTDATED";

export interface FreshnessPolicy {
  /** Days after reviewDue during which the fact may still be used publicly (with editor warning). */
  graceDays: number;
  /** High-risk facts must carry lastVerified and reviewDue to count as verified. */
  requireDates: boolean;
}

/** Content categories with their freshness policy (proposal — intervals to be agreed with the practice). */
export const FRESHNESS_POLICIES = {
  openingHours: { graceDays: 60, requireDates: true },
  consultationType: { graceDays: 60, requireDates: true },
  exception: { graceDays: 0, requireDates: true },
  closure: { graceDays: 0, requireDates: true },
  replacementPractice: { graceDays: 0, requireDates: true },
  emergency: { graceDays: 0, requireDates: true },
  practiceContact: { graceDays: 90, requireDates: true },
  person: { graceDays: 90, requireDates: true },
  medical: { graceDays: 0, requireDates: true },
  editorial: { graceDays: 365, requireDates: false },
} as const satisfies Record<string, FreshnessPolicy>;

export type FreshnessCategory = keyof typeof FRESHNESS_POLICIES;

export function evaluateFreshness(v: FactVerification | undefined, today: LocalDate, category: FreshnessCategory): Freshness {
  if (!v) return "UNVERIFIED";
  if (v.status === "OUTDATED_DO_NOT_PUBLISH") return "OUTDATED";
  if (v.status === "TO_BE_CONFIRMED") return "UNVERIFIED";
  const policy: FreshnessPolicy = FRESHNESS_POLICIES[category];
  if (policy.requireDates && (!v.lastVerified || !v.reviewDue)) return "UNVERIFIED";
  if (!v.reviewDue) return "CURRENT";
  if (compareDates(today, v.reviewDue) <= 0) return "CURRENT";
  if (compareDates(today, addDays(v.reviewDue, policy.graceDays)) <= 0) return "REVIEW_DUE";
  return "REVIEW_EXPIRED";
}

/** May this fact back a public, authoritative statement today? */
export function isUsable(f: Freshness): boolean {
  return f === "CURRENT" || f === "REVIEW_DUE";
}
