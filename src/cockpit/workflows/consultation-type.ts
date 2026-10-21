// Sprechstundenarten (Phase 09.5J) — the physician workflow for NON-ACUTE consultation types, pure.
//
// Overview for every role (stored types + codes the weekly plan references but that are missing),
// draft for the DOCTOR: wording (label + explanation) → preview (AKTUELL / NACH DER ÄNDERUNG) → explicit
// confirmation. The same draft function runs for the preview and again inside the publish transaction.
// ACUTE is shown but managed only in /intern/akutsprechstunde (09.5E).

import type { ConsultationType, ConsultationTypeCode } from "../../domain/content-types.ts";
import type { PulsData } from "../../domain/practice-status.ts";
import { compareDates, type LocalDate } from "../../domain/time.ts";
import {
  ACUTE_SEPARATE_TEXT,
  REGULAR_TYPE_CODES,
  consultationTypeStatus,
  isRegularTypeCode,
  normalizeTypeWording,
  sameWording,
  wordingOf,
  type RegularTypeCode,
  type TypeStatus,
  type TypeWording,
} from "../../domain/consultation-types.ts";
import { typeSummary } from "../../content/schedule.ts";
import { recordFingerprint } from "./snapshot.ts";

export const TYPE_STALE = "Die Sprechstundenart wurde inzwischen geändert. Bitte prüfen Sie die Angaben erneut.";
export const TYPE_CHECKBOX = "Ich bestätige diese Bezeichnung und Erklärung für die Praxis.";
export const TYPE_INTRO = "Diese Bezeichnungen werden im Wochenplan und bei Sonderöffnungszeiten verwendet.";
export const NOTHING_CHANGED = "Es wurde nichts geändert.";
export const READ_ONLY_TEXT = "Sprechstundenarten können nur ärztlich geändert und bestätigt werden.";

/** URL slug ↔ code (validated; never a collection id from the browser). */
export const TYPE_SLUG: Record<ConsultationTypeCode, string> = { GENERAL: "sprechstunde", HEALTHY_ONLY: "gesunde-kinder", APPOINTMENT: "termin", OTHER: "sonstige", ACUTE: "akut" };
export const codeOfSlug = (slug: string | undefined): ConsultationTypeCode | undefined => (Object.entries(TYPE_SLUG).find(([, s]) => s === slug)?.[0] as ConsultationTypeCode | undefined);

// ---------------------------------------------------------------- overview / usage

export interface TypeItem {
  code: ConsultationTypeCode;
  stored?: ConsultationType;
  /** Two or more stored records with the same code — never silently pick one. */
  duplicate: boolean;
  status?: TypeStatus;
  /** Recurring weekly rules use this code (any day, any verification). */
  usedByWeeklyRules: boolean;
  /** Concise weekly usage from the stored rules, e.g. "Di, Mi, Do, Fr 08:00–10:00 Uhr". */
  weeklyUsage: string[];
  /** A current / future ACTIVE exception (special hours) uses this code. */
  usedBySpecialHours: boolean;
  acute: boolean;
}

/** Stored types + codes referenced by the weekly plan / special hours but missing. ACUTE included (read only). */
export function typeItems(data: PulsData, today: LocalDate): TypeItem[] {
  const rules = (data.schedule?.rules ?? []).filter((r) => r.verification.status !== "OUTDATED_DO_NOT_PUBLISH");
  const exceptions = data.exceptions.filter((x) => compareDates(x.endDate, today) >= 0);
  const codes = new Set<ConsultationTypeCode>([...data.consultationTypes.map((t) => t.code), ...rules.map((r) => r.consultationType), ...exceptions.flatMap((x) => x.intervals.map((i) => i.consultationType))]);
  const order: ConsultationTypeCode[] = [...REGULAR_TYPE_CODES, "ACUTE"];
  return order
    .filter((c) => codes.has(c))
    .map((code) => {
      const all = data.consultationTypes.filter((t) => t.code === code);
      const stored = all[0];
      // Weekly usage from the stored rules (all verification states): the existing summary helper.
      const unverified = { schedule: data.schedule ? { ...data.schedule, rules: rules.map((r) => ({ ...r, verification: { ...r.verification, status: "VERIFIED_CURRENT" as const } })) } : undefined, consultationTypes: data.consultationTypes };
      return {
        code,
        stored,
        duplicate: all.length > 1,
        status: stored ? consultationTypeStatus(stored.verification, today) : undefined,
        usedByWeeklyRules: rules.some((r) => r.consultationType === code),
        weeklyUsage: typeSummary(code, unverified),
        usedBySpecialHours: exceptions.some((x) => x.intervals.some((i) => i.consultationType === code)),
        acute: code === "ACUTE",
      };
    });
}

/** Regular codes that may still be created (not stored yet). */
export const creatableCodes = (data: PulsData): RegularTypeCode[] => REGULAR_TYPE_CODES.filter((c) => !data.consultationTypes.some((t) => t.code === c));

export const matters = (i: TypeItem) => i.usedByWeeklyRules || i.usedBySpecialHours;

// ---------------------------------------------------------------- fingerprint

/** Fingerprint of the stored type of one code (code, label, explanation, verification) — or "missing". */
export function typeFingerprint(data: PulsData, code: ConsultationTypeCode): string {
  const all = data.consultationTypes.filter((t) => t.code === code);
  return recordFingerprint(all.length ? all.map((t) => ({ code: t.code, label: t.label, explanation: t.explanation ?? null, verification: t.verification })) : { code, missing: true });
}

// ---------------------------------------------------------------- draft

export type TypeMode = "CREATE" | "CONFIRM" | "RECONFIRM" | "CHANGE";
export type TypeDraft =
  | {
      ok: true;
      code: RegularTypeCode;
      mode: TypeMode;
      /** VERIFY: creation, first / renewed confirmation; UPDATE: change of a confirmed type. */
      audit: "VERIFY" | "UPDATE";
      before?: TypeWording;
      next: TypeWording;
      changed: { label: boolean; explanation: boolean };
      fingerprint: string;
      actionLabel: string;
      effect: string;
    }
  | { ok: false; code: ConsultationTypeCode; reason: "ACUTE" | "UNKNOWN" | "DUPLICATE" | "INVALID" | "NO_CHANGE"; message: string; problems: { field: "label" | "explanation"; message: string }[]; fingerprint: string };

export function typeDraft(data: PulsData, code: ConsultationTypeCode | undefined, input: { label?: string; explanation?: string }, today: LocalDate): TypeDraft {
  const c = (code ?? "OTHER") as ConsultationTypeCode;
  const fingerprint = code ? typeFingerprint(data, code) : "";
  const block = (reason: "ACUTE" | "UNKNOWN" | "DUPLICATE" | "INVALID" | "NO_CHANGE", message: string, problems: { field: "label" | "explanation"; message: string }[] = []): TypeDraft => ({ ok: false, code: c, reason, message, problems, fingerprint });
  if (code === "ACUTE") return block("ACUTE", ACUTE_SEPARATE_TEXT);
  if (!isRegularTypeCode(code)) return block("UNKNOWN", "Unbekannte Sprechstundenart.");
  const all = data.consultationTypes.filter((t) => t.code === code);
  if (all.length > 1) return block("DUPLICATE", `Sprechstundenart ${code} ist mehrfach vorhanden.`);
  const n = normalizeTypeWording(input);
  if (!n.wording) return block("INVALID", "Bitte die markierten Angaben prüfen.", n.problems);
  const next = n.wording;
  const stored = all[0];
  if (!stored) {
    return { ok: true, code, mode: "CREATE", audit: "VERIFY", next, changed: { label: true, explanation: Boolean(next.explanation) }, fingerprint, actionLabel: "Sprechstundenart ärztlich bestätigen", effect: `„${next.label}“ wird angelegt und ärztlich bestätigt.` };
  }
  const before = wordingOf(stored);
  const status = consultationTypeStatus(stored.verification, today);
  const changed = { label: before.label !== next.label, explanation: (before.explanation ?? "") !== (next.explanation ?? "") };
  if (sameWording(before, next)) {
    if (status.state === "CURRENT") return block("NO_CHANGE", NOTHING_CHANGED);
    const first = status.state === "UNCONFIRMED";
    return { ok: true, code, mode: first ? "CONFIRM" : "RECONFIRM", audit: "VERIFY", before, next, changed, fingerprint, actionLabel: first ? "Sprechstundenart ärztlich bestätigen" : "Sprechstundenart erneut bestätigen", effect: first ? `„${next.label}“ wird ärztlich bestätigt.` : `„${next.label}“ bleibt unverändert und wird erneut ärztlich bestätigt.` };
  }
  const confirmed = status.state === "CURRENT" || status.state === "DUE";
  return { ok: true, code, mode: "CHANGE", audit: confirmed ? "UPDATE" : "VERIFY", before, next, changed, fingerprint, actionLabel: "Sprechstundenart ärztlich bestätigen", effect: `Sprechstundenart „${before.label}“ wird geändert und ärztlich bestätigt.` };
}

/** Plain German for history / confirmation pages. */
export function typeHistoryText(mode: TypeMode, label: string, before?: string): string {
  if (mode === "RECONFIRM") return `„${label}“ erneut bestätigt`;
  if (mode === "CHANGE") return `Sprechstundenart „${before ?? label}“ geändert`;
  return `„${label}“ ärztlich bestätigt`;
}
