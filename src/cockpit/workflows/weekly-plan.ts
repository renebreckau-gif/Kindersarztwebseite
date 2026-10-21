// Regelmäßige Sprechzeiten (Phase 09.5I) — the physician weekly-plan workflow, pure.
//
// The COMPLETE week is always edited and confirmed together: seven weekdays, each "Geöffnet" (one or
// more regular intervals) or "Geschlossen" — never implicit. NON-ACUTE only: recurring ACUTE rules
// (09.5E) are carried over as the SAME objects and only checked (inside the new hours, never on a
// closed day). Database snapshot + editor input + server date → draft or plain-German block; the same
// function runs for the preview and again inside the publish transaction.

import type { ConsultationTypeCode, OpeningHoursRule, WeeklySchedule } from "../../domain/content-types.ts";
import type { IsoWeekday } from "../../domain/time.ts";
import { getPracticeStatus, type PracticeStatus, type PulsData } from "../../domain/practice-status.ts";
import { previewVerification } from "../../domain/acute.ts";
import {
  ACUTE_OUTSIDE_HOURS,
  DAY_NAME,
  WEEKDAYS_ALL,
  acuteRulesOf,
  regularRules,
  regularStructure,
  regularTypeUsable,
  sortRules,
  weeklyPlanStatus,
  weeklyScheduleProblems,
  type PlanStatus,
} from "../../domain/weekly-plan.ts";
import { addDays, formatGermanDate, formatMinutes, inRange, parseTime, weekdayOf, zonedToInstant, type LocalDate, type LocalTime } from "../../domain/time.ts";
import type { ReasonCode } from "../../domain/practice-status.ts";
import { validateIntervals, type TypeOption } from "./special-day.ts";
import { unknownReason } from "./wording.ts";

export const MAX_WEEK_ROWS = 8;
export const PLAN_WINDOW_DAYS = 28;
export const PLAN_STALE = "Inzwischen wurden Sprechzeiten oder abhängige Daten geändert. Bitte prüfen Sie den Wochenplan erneut.";
export const PLAN_CHECKBOX = "Ich bestätige den vollständigen Wochenplan für die Praxis.";
export const READ_ONLY_TEXT = "Der regelmäßige Wochenplan kann nur ärztlich geändert und bestätigt werden.";
export const NOTHING_CHANGED = "Es wurde nichts geändert.";
export const ACUTE_SEPARATE = "Akutsprechzeiten werden separat verwaltet.";
export const PUBLIC_STATIC_NOTE = "Die öffentliche Website verwendet derzeit weiterhin die bisherigen Daten.";

export type DayState = "OPEN" | "CLOSED";
export interface DayInput {
  state?: DayState;
  rows: { start: string; end: string; type: string }[];
}
export type WeeklyPlanInput = Record<IsoWeekday, DayInput>;

/** The stored week as editor input (regular rules only; ACUTE never appears in the editor). */
export function inputFromSchedule(s: WeeklySchedule | undefined): WeeklyPlanInput {
  const out = {} as WeeklyPlanInput;
  for (const wd of WEEKDAYS_ALL) {
    const rules = s ? sortRules(regularRules(s, wd)) : [];
    const closed = s?.confirmedClosedWeekdays.includes(wd) ?? false;
    out[wd] = { state: closed && !rules.length ? "CLOSED" : rules.length && !closed ? "OPEN" : undefined, rows: rules.map((r) => ({ start: r.start, end: r.end, type: r.consultationType })) };
  }
  return out;
}

/** Regular consultation types the editor may offer — from the DATA only, never ACUTE. */
export function regularTypeOptions(data: PulsData, today: LocalDate): TypeOption[] {
  return data.consultationTypes
    .filter((t) => t.code !== "ACUTE")
    .map((t) => (regularTypeUsable(data.consultationTypes, t.code, today) ? { code: t.code, label: t.label, usable: true } : { code: t.code, label: t.label, usable: false, note: "nicht bestätigt" }));
}

export const typeLabel = (data: PulsData, code: string) => data.consultationTypes.find((t) => t.code === code)?.label ?? code;

// ---------------------------------------------------------------- draft

export interface DayCompare {
  weekday: IsoWeekday;
  before: { closed: boolean; rows: OpeningHoursRule[] };
  after: { closed: boolean; rows: OpeningHoursRule[]; fresh: Set<string> };
  acute: OpeningHoursRule[];
  removed: OpeningHoursRule[];
  changed: boolean;
  sentence?: string;
}
export interface EngineCheck {
  weekday: IsoWeekday;
  date?: LocalDate;
  points: { label: string; time: LocalTime; status: PracticeStatus; headline: string }[];
}

export type PlanMode = "FIRST" | "CHANGE" | "RECONFIRM";
export type WeeklyDraft =
  | {
      ok: true;
      today: LocalDate;
      fingerprint: string;
      status: PlanStatus;
      mode: PlanMode;
      /** Audit operation of the physician write: VERIFY (first / renewed confirmation) or UPDATE (change of a confirmed week). */
      audit: "VERIFY" | "UPDATE";
      proposed: PulsData;
      /** Regular rules of the proposal; `keep` = ids of stored rules preserved exactly. */
      regular: { rule: OpeningHoursRule; keep: boolean }[];
      closed: IsoWeekday[];
      days: DayCompare[];
      checks: EngineCheck[];
      actionLabel: string;
      effect: string;
    }
  | {
      ok: false;
      today: LocalDate;
      fingerprint: string;
      status: PlanStatus;
      code: "NO_SCHEDULE" | "INVALID" | "ACUTE" | "PRESERVE" | "WINDOW" | "NO_CHANGE";
      message: string;
      dayProblems: Partial<Record<IsoWeekday, string>>;
      rowProblems: { weekday: IsoWeekday; index: number; message: string }[];
    };

const spans = (rules: OpeningHoursRule[]) => rules.map((r) => `${r.start}–${r.end}`).join(", ");

/**
 * The same function for preview and publish. Nothing from the browser but the chosen state per
 * weekday and the interval rows: rule ids, provenance and the date are decided here / on the server.
 */
export function weeklyPlanDraft(data: PulsData, today: LocalDate, input: WeeklyPlanInput, fingerprint: string): WeeklyDraft {
  const current = data.schedule;
  const status = weeklyPlanStatus(current, today);
  const base = { ok: false as const, today, fingerprint, status, dayProblems: {} as Partial<Record<IsoWeekday, string>>, rowProblems: [] as { weekday: IsoWeekday; index: number; message: string }[] };
  if (!current) return { ...base, code: "NO_SCHEDULE", message: "In der Cockpit-Datenbank ist kein Wochenplan hinterlegt." };

  // 1. Every weekday explicitly resolved; rows valid (shared editor-row validation, same as 09.5F).
  const options = regularTypeOptions(data, today);
  const intervals = {} as Record<IsoWeekday, { start: string; end: string; type: ConsultationTypeCode }[]>;
  for (const wd of WEEKDAYS_ALL) {
    const day = input[wd] ?? { rows: [] };
    if (day.state !== "OPEN" && day.state !== "CLOSED") {
      base.dayProblems[wd] = "Bitte „Geöffnet“ oder „Geschlossen“ wählen.";
      continue;
    }
    if (day.state === "CLOSED") {
      intervals[wd] = [];
      continue;
    }
    const v = validateIntervals(day.rows, options);
    v.problems.forEach((p) => base.rowProblems.push({ weekday: wd, index: p.index, message: p.message }));
    if (!v.problems.length && !v.intervals.length) base.dayProblems[wd] = "Bitte mindestens eine Sprechzeit eintragen oder den Tag als geschlossen markieren.";
    intervals[wd] = v.intervals.map((s) => ({ start: s.start, end: s.end, type: s.type }));
  }
  if (Object.keys(base.dayProblems).length || base.rowProblems.length) return { ...base, code: "INVALID", message: "Bitte die markierten Wochentage prüfen." };

  // 2. Exact-row matching (structure, never row index): an unchanged stored rule keeps its id and fields.
  const stored = current.rules.filter((r) => r.consultationType !== "ACUTE");
  const used = new Set<OpeningHoursRule>();
  const regular: { rule: OpeningHoursRule; keep: boolean }[] = [];
  let n = 0;
  for (const wd of WEEKDAYS_ALL) {
    for (const iv of intervals[wd]) {
      const same = stored.find((r) => !used.has(r) && r.weekday === wd && r.start === iv.start && r.end === iv.end && r.consultationType === iv.type);
      if (same) {
        used.add(same);
        regular.push({ rule: same, keep: true });
      } else {
        regular.push({ rule: { id: `neu-${wd}-${++n}`, weekday: wd, start: iv.start, end: iv.end, consultationType: iv.type, verification: previewVerification(today) }, keep: false });
      }
    }
  }
  // A stored validity window or public note is never dropped silently: this editor cannot carry them.
  const lost = stored.find((r) => !used.has(r) && (r.validFrom || r.validUntil || r.publicNote));
  if (lost) {
    return {
      ...base,
      code: "PRESERVE",
      message: `${DAY_NAME[lost.weekday]} ${lost.start}–${lost.end} Uhr hat ${lost.publicNote ? "einen öffentlichen Hinweis" : "einen Gültigkeitszeitraum"}, den dieser Editor nicht bearbeiten kann. Bitte lassen Sie diese Sprechzeit unverändert; eine Änderung wird gesondert geklärt.`,
    };
  }

  // 3. The proposed week: regular rules (preview provenance), ACUTE rules as the SAME objects.
  const closed = WEEKDAYS_ALL.filter((wd) => input[wd].state === "CLOSED");
  const acute = current.rules.filter((r) => r.consultationType === "ACUTE");
  const pv = previewVerification(today);
  const schedule: WeeklySchedule = {
    ...current,
    rules: [...regular.map((x) => ({ ...x.rule, verification: pv })), ...acute],
    confirmedClosedWeekdays: closed,
    verification: pv,
  };
  const proposed: PulsData = { ...data, schedule };

  // 4. ONE invariant validator (also run by the Payload hook on the write).
  const problems = weeklyScheduleProblems(schedule, data.consultationTypes, today);
  const acuteProblem = problems.find((p) => p.kind === "ACUTE_CLOSED" || p.kind === "ACUTE_OUTSIDE");
  if (acuteProblem) {
    if (acuteProblem.weekday) base.dayProblems[acuteProblem.weekday] = acuteProblem.message;
    return { ...base, code: "ACUTE", message: acuteProblem.kind === "ACUTE_OUTSIDE" ? ACUTE_OUTSIDE_HOURS : acuteProblem.message };
  }
  if (problems.length) return { ...base, code: "INVALID", message: problems[0].message };

  // 5. Nothing changed: only a due / expired / unconfirmed confirmation may be renewed.
  const changed = regularStructure(current) !== regularStructure(schedule);
  if (!changed && status.state === "CURRENT") return { ...base, code: "NO_CHANGE", message: NOTHING_CHANGED };

  // 6. The new week must not make the next 28 days less certain.
  const window = introducedProblems(data, proposed, today);
  if (window) return { ...base, code: "WINDOW", message: `Dieser Wochenplan würde am ${formatGermanDate(window.date)} um ${window.time} Uhr widersprüchliche Angaben erzeugen: ${unknownReason(window.reason)}` };

  const confirmed = status.state === "CURRENT" || status.state === "DUE";
  const mode: PlanMode = !changed ? "RECONFIRM" : confirmed ? "CHANGE" : "FIRST";
  const days = compareDays(current, schedule, regular);
  return {
    ok: true,
    today,
    fingerprint,
    status,
    mode,
    audit: mode === "CHANGE" ? "UPDATE" : "VERIFY",
    proposed,
    regular,
    closed,
    days,
    checks: engineChecks(proposed, today),
    actionLabel: mode === "RECONFIRM" ? "Wochenplan erneut bestätigen" : mode === "CHANGE" ? "Geänderten Wochenplan ärztlich bestätigen" : "Wochenplan ärztlich bestätigen",
    effect:
      mode === "RECONFIRM"
        ? "Der Wochenplan bleibt unverändert und wird erneut ärztlich bestätigt."
        : [...days.filter((d) => d.sentence).map((d) => d.sentence), "Die Akutsprechstunde bleibt unverändert."].join(" "),
  };
}

function compareDays(current: WeeklySchedule, next: WeeklySchedule, regular: { rule: OpeningHoursRule; keep: boolean }[]): DayCompare[] {
  return WEEKDAYS_ALL.map((wd) => {
    const beforeRows = sortRules(regularRules(current, wd));
    const afterRows = sortRules(regular.filter((x) => x.rule.weekday === wd).map((x) => x.rule));
    const fresh = new Set(regular.filter((x) => x.rule.weekday === wd && !x.keep).map((x) => x.rule.id));
    const kept = new Set(regular.filter((x) => x.keep).map((x) => x.rule.id));
    const removed = beforeRows.filter((r) => !kept.has(r.id));
    const wasClosed = current.confirmedClosedWeekdays.includes(wd) && !beforeRows.length;
    const isClosed = next.confirmedClosedWeekdays.includes(wd);
    const changed = wasClosed !== isClosed || fresh.size > 0 || removed.length > 0;
    const sentence = !changed
      ? undefined
      : isClosed
        ? `${DAY_NAME[wd]}: künftig regelmäßig geschlossen.`
        : wasClosed
          ? `${DAY_NAME[wd]}: künftig regelmäßig geöffnet (${spans(afterRows)} Uhr).`
          : `${DAY_NAME[wd]}: künftig ${spans(afterRows)} Uhr.`;
    return { weekday: wd, before: { closed: wasClosed, rows: beforeRows }, after: { closed: isClosed, rows: afterRows, fresh }, acute: acuteRulesOf(current, wd), removed, changed, sentence };
  });
}

const NEW_PROBLEM: ReasonCode[] = ["ACUTE_CONFLICT", "RULE_CONFLICT", "INVALID_DATA"];

/** Times worth checking on a date: noon, every interval's midpoint and every gap's midpoint (both plans). */
function probeTimes(s: WeeklySchedule | undefined, wd: IsoWeekday): LocalTime[] {
  const out = new Set<LocalTime>(["12:00"]);
  const rules = s ? sortRules(s.rules.filter((r) => r.weekday === wd)) : [];
  rules.forEach((r, i) => {
    out.add(formatMinutes(Math.floor((parseTime(r.start) + parseTime(r.end)) / 2)));
    const next = rules[i + 1];
    if (next && parseTime(next.start) > parseTime(r.end)) out.add(formatMinutes(Math.floor((parseTime(r.end) + parseTime(next.start)) / 2)));
  });
  return [...out];
}

/** "Introduced unknown": the proposal may not become UNKNOWN / conflicting where the current data was not. */
export function introducedProblems(base: PulsData, proposed: PulsData, today: LocalDate, days = PLAN_WINDOW_DAYS): { date: LocalDate; time: LocalTime; reason: ReasonCode } | null {
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const wd = weekdayOf(date);
    for (const time of new Set([...probeTimes(base.schedule, wd), ...probeTimes(proposed.schedule, wd)])) {
      const at = zonedToInstant(date, time);
      const before = getPracticeStatus(at, base);
      const after = getPracticeStatus(at, proposed);
      if (after.status === "UNKNOWN" && (before.status !== "UNKNOWN" || (NEW_PROBLEM.includes(after.reason) && before.reason !== after.reason))) return { date, time, reason: after.reason };
    }
  }
  return null;
}

/** Representative engine checks per weekday: the next ordinary date (no closure / exception / holiday). */
export function engineChecks(proposed: PulsData, today: LocalDate, days = PLAN_WINDOW_DAYS): EngineCheck[] {
  const s = proposed.schedule!;
  return WEEKDAYS_ALL.map((wd) => {
    for (let i = 1; i <= days; i++) {
      const date = addDays(today, i);
      if (weekdayOf(date) !== wd) continue;
      if (proposed.publicHolidays.includes(date) || proposed.closures.some((c) => inRange(date, c.startDate, c.endDate)) || proposed.exceptions.some((x) => inRange(date, x.startDate, x.endDate))) continue;
      const rows = sortRules(regularRules(s, wd));
      const pts: { label: string; time: LocalTime }[] = rows.length
        ? rows.flatMap((r, k) => {
            const list = [{ label: `während ${r.start}–${r.end}`, time: formatMinutes(Math.floor((parseTime(r.start) + parseTime(r.end)) / 2)) }];
            const nx = rows[k + 1];
            if (nx && parseTime(nx.start) > parseTime(r.end)) list.push({ label: `Pause ${r.end}–${nx.start}`, time: formatMinutes(Math.floor((parseTime(r.end) + parseTime(nx.start)) / 2)) });
            return list;
          })
        : [{ label: "tagsüber", time: "12:00" }];
      return {
        weekday: wd,
        date,
        points: pts.map((p) => {
          const r = getPracticeStatus(zonedToInstant(date, p.time), proposed);
          return { ...p, status: r.status, headline: r.headline };
        }),
      };
    }
    return { weekday: wd, points: [] };
  });
}

/** Plain German for history / confirmation. */
export const planHistoryText = (audit: "VERIFY" | "UPDATE") => (audit === "VERIFY" ? "Regelmäßige Sprechzeiten ärztlich bestätigt" : "Regelmäßige Sprechzeiten geändert");
