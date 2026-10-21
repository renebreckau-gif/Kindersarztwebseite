// Vertretungspraxen (Phase 09.5G) — directory read model, role actions and the ADMIN draft. Pure.
//
// ADMIN = structural data (create / correct; always unverified afterwards) · DOCTOR = confirmation of
// the stored data (or "Nicht mehr als Vertretung verwenden") · STAFF = read; Urlaub offers only usable
// entries. Usability = evaluateFreshness(…, "replacementPractice") + isUsable — nothing else.
// These helpers drive the UI; the server checks (access, hooks, publish) stay authoritative.

import type { ReplacementPractice } from "../../domain/content-types.ts";
import type { StaffRole } from "../../domain/governance.ts";
import { evaluateFreshness, isUsable, type Freshness } from "../../domain/verification.ts";
import { daysBetween, formatDayMonth, type LocalDate } from "../../domain/time.ts";
import { normalizeReplacement, replacementProblems, structuralChanges, type FieldProblem, type ReplacementInput } from "../../domain/replacement.ts";
import { recordFingerprint } from "./snapshot.ts";

export const REPLACEMENT_STALE = "Die Angaben wurden inzwischen geändert. Bitte prüfen Sie die Vertretungspraxis erneut.";
export const VERIFY_INSTRUCTION = "Bitte prüfen Sie die Angaben und bestätigen Sie die Vertretungspraxis, nachdem die Vertretung telefonisch abgestimmt wurde.";
export const VERIFY_CHECKBOX = "Ich habe die Vertretung mit der Praxis abgestimmt und die angezeigten Kontaktdaten geprüft.";
export const WITHDRAW_CHECKBOX = "Diese Praxis soll nicht mehr als Vertretung ausgewählt werden können.";
export const NOT_SELECTABLE = "Diese Praxis kann derzeit nicht als Vertretung ausgewählt werden.";
export const REVERIFY_SOON_DAYS = 30;

export type DirectoryAction = "VIEW" | "EDIT" | "VERIFY" | "REVERIFY";

export interface ReplacementDirectoryItem {
  id: string;
  practiceName: string;
  address: string;
  city: string;
  phone: string;
  email?: string;
  website?: string;
  publicNote?: string;
  freshness: Freshness;
  /** Plain German, never colour only. */
  statusLabel: string;
  lastVerified?: LocalDate;
  reviewDue?: LocalDate;
  usable: boolean;
  action: DirectoryAction;
}

const date = (d: LocalDate) => formatDayMonth(d, true);

export function statusLabel(p: ReplacementPractice, today: LocalDate): string {
  const f = evaluateFreshness(p.verification, today, "replacementPractice");
  const due = p.verification.reviewDue;
  if (f === "CURRENT") return due ? `Bestätigt bis ${date(due)}` : "Bestätigt";
  if (f === "REVIEW_DUE") return due ? `Bestätigung seit ${date(due)} fällig` : "Bestätigung fällig";
  if (f === "REVIEW_EXPIRED") return "Bestätigung abgelaufen";
  if (f === "OUTDATED") return "Nicht mehr zur Veröffentlichung freigegeben";
  return "Noch nicht ärztlich bestätigt";
}

/** Role-aware UI action (not authorization). */
export function directoryAction(p: ReplacementPractice, role: StaffRole, today: LocalDate): DirectoryAction {
  if (role === "ADMIN") return "EDIT";
  if (role !== "DOCTOR") return "VIEW";
  const f = evaluateFreshness(p.verification, today, "replacementPractice");
  if (f === "UNVERIFIED" || f === "OUTDATED") return "VERIFY";
  if (f === "REVIEW_EXPIRED" || f === "REVIEW_DUE") return "REVERIFY";
  const due = p.verification.reviewDue;
  return due && daysBetween(today, due) <= REVERIFY_SOON_DAYS ? "REVERIFY" : "VIEW";
}

export function directoryItem(p: ReplacementPractice, role: StaffRole, today: LocalDate): ReplacementDirectoryItem {
  const freshness = evaluateFreshness(p.verification, today, "replacementPractice");
  return {
    id: p.id,
    practiceName: p.practiceName,
    address: `${p.street}, ${p.postalCode} ${p.city}`,
    city: p.city,
    phone: p.phone,
    email: p.email,
    website: p.website,
    publicNote: p.publicNote,
    freshness,
    statusLabel: statusLabel(p, today),
    lastVerified: p.verification.lastVerified,
    reviewDue: p.verification.reviewDue,
    usable: isUsable(freshness),
    action: directoryAction(p, role, today),
  };
}

/** The whole directory: usable entries first, then by name. */
export function directoryItems(list: ReplacementPractice[], role: StaffRole, today: LocalDate): ReplacementDirectoryItem[] {
  return list.map((p) => directoryItem(p, role, today)).sort((a, b) => Number(b.usable) - Number(a.usable) || a.practiceName.localeCompare(b.practiceName, "de"));
}

/** Concurrency detector for ONE record: everything the physician saw, incl. the verification. */
export const replacementFingerprint = (p: ReplacementPractice) => recordFingerprint(p);

// ---------------------------------------------------------------- ADMIN draft (create / correct)

export type ReplacementDraft =
  | { ok: true; mode: "NEW" | "EDIT"; input: ReplacementInput; changes: ReturnType<typeof structuralChanges>; invalidates: boolean }
  | { ok: false; problems: FieldProblem[]; message: string };

export function replacementDraft(current: ReplacementPractice | undefined, raw: Partial<Record<keyof ReplacementInput, unknown>>, today: LocalDate): ReplacementDraft {
  const input = normalizeReplacement(raw);
  const problems = replacementProblems(input);
  if (problems.length) return { ok: false, problems, message: "Bitte die markierten Angaben prüfen." };
  const changes = structuralChanges(current, input);
  if (current && !changes.length) return { ok: false, problems: [], message: "Es wurde nichts geändert." };
  const invalidates = !!current && isUsable(evaluateFreshness(current.verification, today, "replacementPractice"));
  return { ok: true, mode: current ? "EDIT" : "NEW", input, changes, invalidates };
}

/** Server-generated domain id from the name ("vertretung-praxis-beispiel-a"); collision-safe on write. */
export function replacementRecordId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return `vertretung-${slug || "praxis"}`;
}
