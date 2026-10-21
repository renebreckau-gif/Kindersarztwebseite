// Sprechstundenarten (Phase 09.5J) — pure rules for physician-confirmed consultation types.
//
// Two separate authorities over ONE collection:
//   REGULAR (09.5J) — GENERAL / HEALTHY_ONLY / APPOINTMENT / OTHER: label + optional explanation
//   ACUTE   (09.5E) — the acute type, only through the acute-baseline workflow
// The code is the logical identity (fixed enum, immutable once stored). WHEN a type applies is the
// weekly plan's business (09.5I) — never decided here. ONE validator for workflow and Payload hook.

import type { ConsultationType, ConsultationTypeCode } from "./content-types.ts";
import { evaluateFreshness, type FactVerification, type Freshness } from "./verification.ts";
import { daysBetween, type LocalDate } from "./time.ts";

export const REGULAR_TYPE_CODES = ["GENERAL", "HEALTHY_ONLY", "APPOINTMENT", "OTHER"] as const satisfies readonly ConsultationTypeCode[];
export type RegularTypeCode = (typeof REGULAR_TYPE_CODES)[number];
export const isRegularTypeCode = (c: unknown): c is RegularTypeCode => REGULAR_TYPE_CODES.includes(c as RegularTypeCode);

export const TYPE_LABEL_MAX = 80;
export const TYPE_EXPLANATION_MAX = 400;
/** Plain-German status words share the 09.5G / 09.5I window: "fällig" 30 days before reviewDue. */
export const TYPE_DUE_DAYS = 30;

export const ACUTE_SEPARATE_TEXT = "Die Akutsprechstunde wird separat verwaltet.";
export const CODE_IMMUTABLE_TEXT = "Die Art einer gespeicherten Sprechstundenart kann nicht geändert werden.";

export interface TypeWording {
  label: string;
  /** Absent = no explanation (an empty input is not stored). */
  explanation?: string;
}

/** Trim + validate the physician's wording. Never invents a label, never defaults to the code. */
export function normalizeTypeWording(input: { label?: string | null; explanation?: string | null }): { wording?: TypeWording; problems: { field: "label" | "explanation"; message: string }[] } {
  const label = (input.label ?? "").trim();
  const explanation = (input.explanation ?? "").trim();
  const problems: { field: "label" | "explanation"; message: string }[] = [];
  if (!label) problems.push({ field: "label", message: "Bitte eine Bezeichnung eingeben." });
  else if (label.length > TYPE_LABEL_MAX) problems.push({ field: "label", message: `Die Bezeichnung darf höchstens ${TYPE_LABEL_MAX} Zeichen haben.` });
  if (explanation.length > TYPE_EXPLANATION_MAX) problems.push({ field: "explanation", message: `Die Erklärung darf höchstens ${TYPE_EXPLANATION_MAX} Zeichen haben.` });
  if (problems.length) return { problems };
  return { wording: explanation ? { label, explanation } : { label }, problems };
}

export type TypeWriteMode = "REGULAR" | "ACUTE";

/**
 * Invariants of ONE consultation-type write (also enforced by the Payload guard hook):
 * REGULAR — never ACUTE; ACUTE — only ACUTE; the code of a stored record never changes; wording valid.
 */
export function typeWriteProblems(next: { code?: string | null; label?: string | null; explanation?: string | null }, stored: { code?: string | null } | null, mode: TypeWriteMode): string[] {
  const out: string[] = [];
  const code = next.code ?? stored?.code;
  if (stored?.code && next.code !== undefined && next.code !== stored.code) out.push(CODE_IMMUTABLE_TEXT);
  if (mode === "REGULAR" && !isRegularTypeCode(code)) out.push(code === "ACUTE" ? ACUTE_SEPARATE_TEXT : "Unbekannte Sprechstundenart.");
  if (mode === "ACUTE" && code !== "ACUTE") out.push("Hier darf nur die Akutsprechstunde geändert werden.");
  out.push(...normalizeTypeWording(next).problems.map((p) => p.message));
  return out;
}

// ---------------------------------------------------------------- physician status

export type TypeState = "CURRENT" | "DUE" | "EXPIRED" | "UNCONFIRMED" | "WITHDRAWN";
export interface TypeStatus {
  state: TypeState;
  freshness: Freshness;
  lastVerified?: LocalDate;
  reviewDue?: LocalDate;
  verifiedBy?: string;
}

/** Physician status with the existing `consultationType` freshness (60 days grace); "fällig" 30 days ahead. */
export function consultationTypeStatus(v: FactVerification, today: LocalDate): TypeStatus {
  const freshness = evaluateFreshness(v, today, "consultationType");
  const base = { freshness, lastVerified: v.lastVerified, reviewDue: v.reviewDue, verifiedBy: v.verifiedBy };
  if (freshness === "OUTDATED") return { ...base, state: "WITHDRAWN" };
  if (freshness === "UNVERIFIED") return { ...base, state: "UNCONFIRMED" };
  if (freshness === "REVIEW_EXPIRED") return { ...base, state: "EXPIRED" };
  if (freshness === "REVIEW_DUE" || (v.reviewDue && daysBetween(today, v.reviewDue) <= TYPE_DUE_DAYS)) return { ...base, state: "DUE" };
  return { ...base, state: "CURRENT" };
}

export const TYPE_STATE_TEXT: Record<TypeState, string> = {
  CURRENT: "Ärztlich bestätigt",
  DUE: "Bestätigung fällig",
  EXPIRED: "Bestätigung abgelaufen",
  UNCONFIRMED: "Noch nicht ärztlich bestätigt",
  WITHDRAWN: "Nicht mehr zur Veröffentlichung freigegeben",
};

/** Stored wording of a type (label + explanation) as the workflow compares it. */
export const wordingOf = (t: Pick<ConsultationType, "label" | "explanation">): TypeWording => (t.explanation ? { label: t.label, explanation: t.explanation } : { label: t.label });
export const sameWording = (a: TypeWording, b: TypeWording) => a.label === b.label && (a.explanation ?? "") === (b.explanation ?? "");
