// Deterministic fingerprint of the operational dataset (Phase 09.5A).
//
// Purpose: detect that the database changed between "Vorschau" and "Veröffentlichen" (someone
// else published meanwhile). It is a concurrency DETECTOR, not authorization — every publish
// re-validates everything on the server anyway.
// Input is domain data only: no passwords, sessions, secrets or audit records.
//
// Three views on ONE canonical hash (09.5D):
//   pulsFingerprint (= datasetFingerprint)  — Praxis Puls data (today / vacation workflows)
//   announcementFingerprint                 — ACTIVE announcements (Hinweis workflow)
//   operationalFingerprint                  — both (generic undo, whose change sets may mix types)
// A false "stale" is acceptable; a missed change is not.

import { createHash } from "node:crypto";
import type { Announcement } from "../../domain/content-types.ts";
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

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");

const normalizedPuls = (data: PulsData) => ({
    schedule: data.schedule ? { ...data.schedule, rules: byId(data.schedule.rules) } : null,
    consultationTypes: [...data.consultationTypes].sort((a, b) => a.code.localeCompare(b.code)),
    exceptions: byId(data.exceptions),
    closures: byId(data.closures),
    replacementPractices: byId(data.replacementPractices),
    publicHolidays: [...data.publicHolidays].sort(),
    holidayPolicy: data.holidayPolicy,
});

export function datasetFingerprint(data: PulsData): string {
  return hash(normalizedPuls(data));
}
export const pulsFingerprint = datasetFingerprint;

export function announcementFingerprint(announcements: Announcement[]): string {
  return hash({ announcements: byId(announcements) });
}

export function operationalFingerprint(state: { data: PulsData; announcements: Announcement[] }): string {
  return hash({ puls: normalizedPuls(state.data), announcements: byId(state.announcements) });
}
