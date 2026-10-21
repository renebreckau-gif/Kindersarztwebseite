// Regular weekly plan (Phase 09.5I) — pure domain rules. No Payload, no React, no practice facts.
//
// The physician-confirmed STANDING week: every weekday 1–7 is resolved EXPLICITLY — either at least
// one regular (non-ACUTE) opening interval, or listed in confirmedClosedWeekdays; never both, never
// neither. ACUTE rules belong to 09.5E (/intern/akutsprechstunde) and are only checked here: they must
// lie inside the regular opening of their weekday, and never on a regularly closed weekday.
//
// ONE invariant validator (`weeklyScheduleProblems`) — used by the cockpit workflow (preview + publish)
// AND by the Payload hook on every physician weekly-plan write. No second implementation.

import type { ConsultationType, OpeningHoursRule, WeeklySchedule } from "./content-types.ts";
import type { IsoWeekday } from "./time.ts";
import { evaluateFreshness, isUsable, type FactVerification, type Freshness } from "./verification.ts";
import { compareDates, daysBetween, parseTime, type LocalDate } from "./time.ts";

export const WEEKDAYS_ALL: readonly IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];
export const DAY_NAME: Record<IsoWeekday, string> = { 1: "Montag", 2: "Dienstag", 3: "Mittwoch", 4: "Donnerstag", 5: "Freitag", 6: "Samstag", 7: "Sonntag" };
/** Plain-German status words share the 09.5G window: "fällig" 30 days before reviewDue. */
export const PLAN_DUE_DAYS = 30;

export const ACUTE_ON_CLOSED_DAY = "Für diesen Wochentag ist eine Akutsprechstunde hinterlegt. Bitte ändern Sie diese zuerst im Bereich Akutsprechstunde.";
export const ACUTE_OUTSIDE_HOURS = "Die bestehende Akutsprechstunde liegt außerhalb der neuen Sprechzeit. Bitte passen Sie zuerst die Akutsprechstunde an.";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const notOutdated = (r: OpeningHoursRule) => r.verification.status !== "OUTDATED_DO_NOT_PUBLISH";
const windowsMeet = (a: OpeningHoursRule, b: OpeningHoursRule) =>
  (!a.validUntil || !b.validFrom || compareDates(b.validFrom, a.validUntil) <= 0) && (!b.validUntil || !a.validFrom || compareDates(a.validFrom, b.validUntil) <= 0);

/** Regular (non-ACUTE) rules of a weekday, not withdrawn. */
export const regularRules = (s: WeeklySchedule, wd: IsoWeekday) => s.rules.filter((r) => r.weekday === wd && r.consultationType !== "ACUTE" && notOutdated(r));
export const acuteRulesOf = (s: WeeklySchedule, wd: IsoWeekday) => s.rules.filter((r) => r.weekday === wd && r.consultationType === "ACUTE" && notOutdated(r));

/** A consultation type the regular week may use: present, verified and fresh — never ACUTE. */
export function regularTypeUsable(types: ConsultationType[], code: string, today: LocalDate): boolean {
  if (code === "ACUTE") return false;
  const t = types.filter((x) => x.code === code);
  return t.length === 1 && isUsable(evaluateFreshness(t[0].verification, today, "consultationType"));
}

// ---------------------------------------------------------------- the invariant validator

export type PlanProblemKind = "CLOSED_WEEKDAYS" | "UNRESOLVED" | "BOTH" | "TIME" | "TYPE" | "OVERLAP" | "DUPLICATE_ID" | "ACUTE_CLOSED" | "ACUTE_OUTSIDE";
export interface PlanProblem {
  kind: PlanProblemKind;
  weekday?: IsoWeekday;
  ruleId?: string;
  message: string;
}

/** Non-ACUTE opening blocks of a weekday in minutes, touching intervals merged (what ACUTE must fit into). */
export function regularBlocks(s: WeeklySchedule, wd: IsoWeekday): { start: number; end: number }[] {
  const list = regularRules(s, wd)
    .filter((r) => TIME.test(r.start) && TIME.test(r.end) && parseTime(r.start) < parseTime(r.end))
    .map((r) => ({ start: parseTime(r.start), end: parseTime(r.end) }))
    .sort((a, b) => a.start - b.start);
  const out: { start: number; end: number }[] = [];
  for (const i of list) {
    const last = out.at(-1);
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push({ ...i });
  }
  return out;
}

/** ACUTE boundary only (also enforced for the 09.5E acute-baseline write): not on a closed day, inside regular hours. */
export function acuteBoundaryProblems(s: WeeklySchedule): PlanProblem[] {
  const out: PlanProblem[] = [];
  for (const wd of WEEKDAYS_ALL) {
    for (const a of acuteRulesOf(s, wd)) {
      if (s.confirmedClosedWeekdays.includes(wd)) {
        out.push({ kind: "ACUTE_CLOSED", weekday: wd, ruleId: a.id, message: ACUTE_ON_CLOSED_DAY });
        continue;
      }
      const ok = TIME.test(a.start) && TIME.test(a.end) && regularBlocks(s, wd).some((b) => parseTime(a.start) >= b.start && parseTime(a.end) <= b.end);
      if (!ok) out.push({ kind: "ACUTE_OUTSIDE", weekday: wd, ruleId: a.id, message: ACUTE_OUTSIDE_HOURS });
    }
  }
  return out;
}

/**
 * Every invariant of a physician-confirmed regular week. Empty list = the week may be confirmed.
 * `types` = the stored consultation types (usability judged on `today`).
 */
export function weeklyScheduleProblems(s: WeeklySchedule, types: ConsultationType[], today: LocalDate): PlanProblem[] {
  const out: PlanProblem[] = [];
  const closed = s.confirmedClosedWeekdays;
  if (closed.some((w) => !WEEKDAYS_ALL.includes(w)) || new Set(closed).size !== closed.length) {
    out.push({ kind: "CLOSED_WEEKDAYS", message: "Die geschlossenen Wochentage sind ungültig oder doppelt angegeben." });
  }
  const ids = s.rules.map((r) => r.id);
  if (ids.some((id, i) => !id || ids.indexOf(id) !== i)) out.push({ kind: "DUPLICATE_ID", message: "Eine Sprechzeit ist doppelt gespeichert." });

  for (const wd of WEEKDAYS_ALL) {
    const rules = regularRules(s, wd);
    const isClosed = closed.includes(wd);
    if (!rules.length && !isClosed) out.push({ kind: "UNRESOLVED", weekday: wd, message: `${DAY_NAME[wd]}: Bitte Sprechzeiten eintragen oder den Tag als geschlossen markieren.` });
    if (rules.length && isClosed) out.push({ kind: "BOTH", weekday: wd, message: `${DAY_NAME[wd]} ist zugleich geöffnet und geschlossen eingetragen.` });
    rules.forEach((r, i) => {
      if (!TIME.test(r.start) || !TIME.test(r.end) || parseTime(r.start) >= parseTime(r.end)) {
        out.push({ kind: "TIME", weekday: wd, ruleId: r.id, message: `${DAY_NAME[wd]}: Eine Sprechzeit hat ungültige Uhrzeiten (Ende nach Beginn, nicht über Mitternacht).` });
        return;
      }
      if (!regularTypeUsable(types, r.consultationType, today)) {
        const label = types.find((t) => t.code === r.consultationType)?.label ?? r.consultationType;
        out.push({ kind: "TYPE", weekday: wd, ruleId: r.id, message: `${DAY_NAME[wd]} ${r.start}–${r.end}: Die Sprechstundenart „${label}“ ist nicht bestätigt oder nicht vorhanden.` });
      }
      const clash = rules.slice(0, i).some((o) => TIME.test(o.start) && TIME.test(o.end) && windowsMeet(o, r) && parseTime(r.start) < parseTime(o.end) && parseTime(o.start) < parseTime(r.end));
      if (clash) out.push({ kind: "OVERLAP", weekday: wd, ruleId: r.id, message: `${DAY_NAME[wd]}: Zwei Sprechzeiten überschneiden sich.` });
    });
  }
  return [...out, ...acuteBoundaryProblems(s)];
}

// ---------------------------------------------------------------- structure + status

/** Structural signature of a rule (no id, no verification) — exact-row matching, never row index. */
export const ruleSignature = (r: Pick<OpeningHoursRule, "weekday" | "start" | "end" | "consultationType" | "validFrom" | "validUntil" | "publicNote">) =>
  JSON.stringify([r.weekday, r.start, r.end, r.consultationType, r.validFrom ?? null, r.validUntil ?? null, r.publicNote ?? null]);

/** The regular structure of a week (non-ACUTE rule signatures + closed days) — "has anything changed?". */
export function regularStructure(s: WeeklySchedule | undefined): string {
  if (!s) return "";
  const sigs = s.rules.filter((r) => r.consultationType !== "ACUTE" && notOutdated(r)).map(ruleSignature).sort();
  return JSON.stringify({ sigs, closed: [...s.confirmedClosedWeekdays].sort() });
}

export type PlanState = "MISSING" | "UNCONFIRMED" | "CURRENT" | "DUE" | "EXPIRED";
export interface PlanStatus {
  state: PlanState;
  freshness?: Freshness;
  verifiedBy?: string;
  lastVerified?: LocalDate;
  reviewDue?: LocalDate;
}

/** Physician status of the weekly plan (existing openingHours freshness; "fällig" 30 days ahead). */
export function weeklyPlanStatus(s: WeeklySchedule | undefined, today: LocalDate): PlanStatus {
  if (!s) return { state: "MISSING" };
  const v: FactVerification = s.verification;
  const freshness = evaluateFreshness(v, today, "openingHours");
  const base = { freshness, verifiedBy: v.verifiedBy, lastVerified: v.lastVerified, reviewDue: v.reviewDue };
  if (freshness === "UNVERIFIED" || freshness === "OUTDATED") return { ...base, state: "UNCONFIRMED" };
  if (freshness === "REVIEW_EXPIRED") return { ...base, state: "EXPIRED" };
  if (freshness === "REVIEW_DUE" || (v.reviewDue && daysBetween(today, v.reviewDue) <= PLAN_DUE_DAYS)) return { ...base, state: "DUE" };
  return { ...base, state: "CURRENT" };
}

export const PLAN_STATE_TEXT: Record<PlanState, string> = {
  MISSING: "Kein Wochenplan hinterlegt",
  UNCONFIRMED: "Noch nicht ärztlich bestätigt",
  CURRENT: "Ärztlich bestätigt",
  DUE: "Bestätigung fällig",
  EXPIRED: "Bestätigung abgelaufen",
};

/** Server-generated rule id: weekly-<weekday>-<suffix>, never one already in use. */
export function newRuleId(wd: IsoWeekday, taken: Set<string>, suffix: () => string): string {
  for (;;) {
    const id = `weekly-${wd}-${suffix()}`;
    if (!taken.has(id)) {
      taken.add(id);
      return id;
    }
  }
}

/** Ordered intervals of a weekday for display (start time, then type). */
export const sortRules = (list: OpeningHoursRule[]) => [...list].sort((a, b) => a.weekday - b.weekday || parseTime(a.start) - parseTime(b.start) || a.consultationType.localeCompare(b.consultationType));

export const isWeekday = (n: number): n is IsoWeekday => Number.isInteger(n) && n >= 1 && n <= 7;
