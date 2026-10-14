// Deterministic fingerprint of the operational dataset (Phase 09.5A).
//
// Purpose: detect that the database changed between "Vorschau" and "Veröffentlichen" (someone
// else published meanwhile). It is a concurrency DETECTOR, not authorization — every publish
// re-validates everything on the server anyway.
// Input is the domain PulsData only: no passwords, sessions, secrets or audit records.

import { createHash } from "node:crypto";
import type { PulsData } from "../../domain/practice-status.ts";

/** Canonical JSON: object keys sorted, undefined dropped; list order preserved (it is semantic). */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
        .sort()
        .map((k) => [k, canonical((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}

/** Collections are sets: sort records by id so storage order never changes the fingerprint. */
const byId = <T extends { id: string }>(list: T[]) => [...list].sort((a, b) => a.id.localeCompare(b.id));

export function datasetFingerprint(data: PulsData): string {
  const normalized = {
    schedule: data.schedule ? { ...data.schedule, rules: byId(data.schedule.rules) } : null,
    consultationTypes: [...data.consultationTypes].sort((a, b) => a.code.localeCompare(b.code)),
    exceptions: byId(data.exceptions),
    closures: byId(data.closures),
    replacementPractices: byId(data.replacementPractices),
    publicHolidays: [...data.publicHolidays].sort(),
    holidayPolicy: data.holidayPolicy,
  };
  return createHash("sha256").update(JSON.stringify(canonical(normalized))).digest("hex");
}
