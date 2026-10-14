// Operational facts of one day, for comparing two datasets (Phase 09.5C).
// Used where two status cards can look identical although the day differs (undo preview, planned
// closures): "Sprechzeiten", "Schließung", "Vertretung", "Angekündigt", "Nächste Sprechzeit".
// Status values come from the engine (getPracticeStatus); the planned hours of a day use the same
// display helper as the cockpit home (dayPlan). Pure — no Payload, no React.

import type { Closure, OpeningHourException } from "../domain/content-types.ts";
import { getPracticeStatus, type PulsData } from "../domain/practice-status.ts";
import { addDays, compareDates, zonedToInstant, type LocalDate } from "../domain/time.ts";
import { dayPlan } from "./read-model.ts";
import { CLOSURE_KIND_TITLE, dayMonth, shortRange } from "./workflows/wording.ts";

export type FactKey = "hours" | "closure" | "replacement" | "announcement" | "next";

export const FACT_LABEL: Record<FactKey, string> = {
  hours: "Sprechzeiten",
  closure: "Schließung",
  replacement: "Vertretung",
  announcement: "Angekündigte Schließung",
  next: "Nächste Sprechzeit",
};

const ORDER: FactKey[] = ["hours", "closure", "replacement", "announcement", "next"];

/** What the website would show about a day (09:00 Europe/Berlin), in plain German. */
export function dayFacts(data: PulsData, date: LocalDate, time = "09:00"): Record<FactKey, string> {
  const r = getPracticeStatus(zonedToInstant(date, time), data);
  const plan = dayPlan(data, date);
  const closure = r.activeClosure;
  const upcoming = !closure ? r.upcomingClosure : undefined;
  return {
    hours: r.status === "UNKNOWN" ? "nicht sicher bestimmbar" : closure || !plan.length ? "keine" : `${plan.map((b) => `${b.start}–${b.end}`).join(" und ")} Uhr`,
    closure: closure ? `${CLOSURE_KIND_TITLE[closure.kind]} ${shortRange(closure.startDate, closure.endDate)}` : "keine",
    replacement: closure ? (r.replacementPractices.length ? r.replacementPractices.map((p) => p.practiceName).join(", ") : "keine – Telefon und Notfall-Hinweise") : "–",
    announcement: upcoming ? `${CLOSURE_KIND_TITLE[upcoming.kind]} ${shortRange(upcoming.startDate, upcoming.endDate)}` : "keine",
    next: r.nextOpening ? r.nextOpening.label : r.nextOpening === null ? "nicht sicher bestimmbar" : "–",
  };
}

export interface FactRow {
  key: FactKey;
  label: string;
  before: string;
  after: string;
}

export interface DayDiff {
  date: LocalDate;
  label: string;
  rows: FactRow[];
}

/** Only the facts that differ between the two datasets on a day. */
export function diffDay(before: PulsData, after: PulsData, date: LocalDate): FactRow[] {
  const a = dayFacts(before, date);
  const b = dayFacts(after, date);
  return ORDER.filter((k) => a[k] !== b[k]).map((k) => ({ key: k, label: FACT_LABEL[k], before: a[k], after: b[k] }));
}

type Dated = (Closure | OpeningHourException) & { verification?: unknown };
const business = (x: Dated) => {
  const { verification: _v, ...rest } = x;
  return JSON.stringify(rest);
};

/**
 * Days worth comparing: for every record that differs between the two datasets (ignoring
 * provenance), its first remaining day and the day after it ends — earliest first, capped.
 */
export function affectedDates(before: PulsData, after: PulsData, today: LocalDate, max = 4): LocalDate[] {
  const changed: Dated[] = [];
  for (const key of ["exceptions", "closures"] as const) {
    const a = new Map<string, Dated>(before[key].map((x) => [x.id, x]));
    const b = new Map<string, Dated>(after[key].map((x) => [x.id, x]));
    for (const id of new Set([...a.keys(), ...b.keys()])) {
      const x = a.get(id);
      const y = b.get(id);
      if (x && y && business(x) === business(y)) continue;
      if (x) changed.push(x);
      if (y) changed.push(y);
    }
  }
  const dates = new Set<LocalDate>();
  for (const x of changed) {
    const first = compareDates(x.startDate, today) < 0 ? today : x.startDate;
    if (compareDates(first, x.endDate) <= 0) dates.add(first);
    dates.add(addDays(x.endDate, 1));
  }
  return [...dates].filter((d) => compareDates(d, today) >= 0).sort(compareDates).slice(0, max);
}

/** Structured differences for the undo preview (and any before/after comparison). */
export function dayDiffs(before: PulsData, after: PulsData, today: LocalDate): DayDiff[] {
  return affectedDates(before, after, today)
    .map((date) => ({ date, label: date === today ? `Heute (${dayMonth(date)})` : dayMonth(date), rows: diffDay(before, after, date) }))
    .filter((d) => d.rows.length);
}
