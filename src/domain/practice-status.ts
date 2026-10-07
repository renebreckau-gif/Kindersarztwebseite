// PRAXIS PULS engine — deterministic, pure, fail-safe.
// Spec: docs/architecture/practice-pulse-logic.md
//
// Principle: SAFE UNKNOWN over CONFIDENT BUT UNSUPPORTED. A specific state is only
// returned when every record it depends on is verified and fresh enough; any doubt,
// conflict or gap resolves to UNKNOWN.

import type {
  Closure,
  ClosureKind,
  ConsultationType,
  ConsultationTypeCode,
  OpeningHourException,
  ReplacementPractice,
  WeeklySchedule,
} from "./content-types.ts";
import type { FactVerification, Freshness, FreshnessCategory } from "./verification.ts";
import { evaluateFreshness, isUsable } from "./verification.ts";
import type { LocalDate, LocalTime } from "./time.ts";
import {
  PRACTICE_TIME_ZONE,
  addDays,
  compareDates,
  daysBetween,
  formatGermanDate,
  formatMinutes,
  inRange,
  parseTime,
  weekdayOf,
  zonedParts,
  zonedToInstant,
} from "./time.ts";

// ---------------------------------------------------------------- public types

export const PRACTICE_STATUSES = [
  "OPEN",
  "CLOSED",
  "OPENING_SOON",
  "CLOSING_SOON",
  "ACUTE_CONSULTATION",
  "SPECIAL_HOURS",
  "VACATION",
  "TEMPORARILY_CLOSED",
  "UNKNOWN",
] as const;
export type PracticeStatus = (typeof PRACTICE_STATUSES)[number];

/** Visual family. UNKNOWN maps to NONE: no colour, no dot — it must never resemble OPEN. */
export type StatusIndicator = "OPEN" | "NEUTRAL" | "ATTENTION" | "CLOSURE" | "NONE";

export type StatusActionId = "CALL" | "HOURS" | "EMERGENCY" | "REPLACEMENT" | "DETAILS";
export interface StatusAction {
  id: StatusActionId;
  label: string;
}

export type ReasonCode =
  | "OK"
  | "INVALID_NOW"
  | "NO_SCHEDULE"
  | "SCHEDULE_UNVERIFIED"
  | "SCHEDULE_REVIEW_EXPIRED"
  | "RULE_UNVERIFIED"
  | "RULE_CONFLICT"
  | "NO_RULES_FOR_DAY"
  | "INVALID_DATA"
  | "EXCEPTION_UNVERIFIED"
  | "EXCEPTION_CONFLICT"
  | "CLOSURE_UNVERIFIED"
  | "CLOSURE_EXCEPTION_CONFLICT"
  | "HOLIDAY_WITHOUT_RULE"
  | "HOLIDAY_POLICY_UNVERIFIED"
  | "ACUTE_CONFLICT";

export interface NextOpening {
  date: LocalDate;
  time: LocalTime;
  /** Absolute instant (ISO, UTC) — DST-correct. */
  instant: string;
  /** "heute um 14:00 Uhr" · "morgen um 08:00 Uhr" · "am Montag, 30. März um 08:00 Uhr" */
  label: string;
}

export interface PublicReplacement {
  id: string;
  practiceName: string;
  contactPersons: string[];
  address: string;
  phone: string;
  from: LocalDate;
  until: LocalDate;
  note?: string;
}

export interface PracticeStatusResult {
  status: PracticeStatus;
  indicator: StatusIndicator;
  headline: string;
  detail: string;
  primaryAction: StatusAction;
  secondaryActions: StatusAction[];
  currentInterval?: { start: LocalTime; end: LocalTime; consultationType: ConsultationTypeCode };
  /** undefined = not applicable; null = cannot be determined safely (never invented). */
  nextOpening?: NextOpening | null;
  consultationType?: ConsultationTypeCode;
  activeException?: { id: string; kind: OpeningHourException["kind"]; message?: string; intervals: string[] };
  activeClosure?: { id: string; kind: ClosureKind; startDate: LocalDate; endDate: LocalDate; message?: string };
  upcomingClosure?: { id: string; kind: ClosureKind; startDate: LocalDate; endDate: LocalDate; message?: string };
  replacementPractices: PublicReplacement[];
  /** True when a closure is active but no verified, fresh replacement can be shown. */
  replacementFallback: boolean;
  /** Acute rules exist but are not usable: the acute state is suppressed, never inferred. */
  acuteSuppressed: boolean;
  dataConfidence: "VERIFIED" | "REVIEW_DUE" | "UNKNOWN";
  /** Internal diagnostic code — not for public display. */
  reason: ReasonCode;
  /** Internal: records the result depends on (for editor preview / audit). */
  sourceRecordIds: string[];
  lastVerified?: LocalDate;
  evaluatedAt: { instant: string; localDate: LocalDate; localTime: LocalTime; timeZone: string };
}

export type HolidayPolicy =
  | { mode: "REQUIRE_EXPLICIT_ENTRY" }
  | { mode: "CLOSED_ON_PUBLIC_HOLIDAYS"; verification: FactVerification };

export interface PulsData {
  schedule?: WeeklySchedule;
  consultationTypes: ConsultationType[];
  exceptions: OpeningHourException[];
  closures: Closure[];
  replacementPractices: ReplacementPractice[];
  /** Public holidays for the practice's state (Sachsen-Anhalt), maintained as data. */
  publicHolidays: LocalDate[];
  holidayPolicy: HolidayPolicy;
}

export interface PulsOptions {
  /** Minutes for OPENING_SOON / CLOSING_SOON. null/undefined = states disabled (threshold not yet agreed). */
  soonThresholdMinutes?: number | null;
  /** How far ahead "next opening" may be searched. */
  nextOpeningSearchDays?: number;
}

// ---------------------------------------------------------------- internals

interface Interval {
  start: number; // minutes since local midnight
  end: number;
  type: ConsultationTypeCode;
  id: string;
}

type DayPlan =
  | { kind: "UNKNOWN"; reason: ReasonCode; records: string[] }
  | { kind: "CLOSURE"; closure: Closure; records: string[]; worst: Freshness }
  | { kind: "CLOSED"; message?: string; exception?: OpeningHourException; records: string[]; worst: Freshness }
  | { kind: "SPECIAL"; exception: OpeningHourException; intervals: Interval[]; records: string[]; worst: Freshness }
  | { kind: "REGULAR"; intervals: Interval[]; acute: Interval[]; acuteSuppressed: boolean; records: string[]; worst: Freshness };

const CLOSURE_RANK: Record<ClosureKind, number> = { SHORT_NOTICE: 3, TRAINING: 2, OTHER: 2, VACATION: 1 };

function fresh(v: FactVerification | undefined, day: LocalDate, cat: FreshnessCategory) {
  return evaluateFreshness(v, day, cat);
}

function worse(a: Freshness, b: Freshness): Freshness {
  const order: Freshness[] = ["CURRENT", "REVIEW_DUE", "REVIEW_EXPIRED", "UNVERIFIED", "OUTDATED"];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

const notOutdated = (x: { verification: FactVerification }) => x.verification.status !== "OUTDATED_DO_NOT_PUBLISH";

function toIntervals(list: { start: LocalTime; end: LocalTime; consultationType: ConsultationTypeCode }[], id: string): Interval[] | null {
  const out: Interval[] = [];
  for (const i of list) {
    let s: number, e: number;
    try {
      s = parseTime(i.start);
      e = parseTime(i.end);
    } catch {
      return null;
    }
    if (e <= s) return null; // cross-midnight or empty intervals are invalid data
    out.push({ start: s, end: e, type: i.consultationType, id });
  }
  return out.sort((a, b) => a.start - b.start);
}

function overlaps(list: Interval[]): boolean {
  for (let i = 1; i < list.length; i++) if (list[i].start < list[i - 1].end) return true;
  return false;
}

/** Contiguous intervals form one opening block ("open until" = end of block). */
function blocks(list: Interval[]): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  for (const i of list) {
    const last = out[out.length - 1];
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push({ start: i.start, end: i.end });
  }
  return out;
}

function sameException(a: OpeningHourException, b: OpeningHourException) {
  return a.kind === b.kind && JSON.stringify(a.intervals) === JSON.stringify(b.intervals);
}

/**
 * Resolves the plan for one local date. `today` is the evaluation date (for freshness).
 * Precedence: closures → exceptions → public-holiday policy → weekly rules.
 * Contradictions between layers (closed vs. open) → UNKNOWN.
 */
function resolveDay(date: LocalDate, today: LocalDate, data: PulsData): DayPlan {
  // 1. Closures covering the date
  const closures = data.closures.filter(notOutdated).filter((c) => inRange(date, c.startDate, c.endDate));
  for (const c of closures) {
    if (!isUsable(fresh(c.verification, today, "closure"))) return { kind: "UNKNOWN", reason: "CLOSURE_UNVERIFIED", records: [c.id] };
  }
  const closure = [...closures].sort((a, b) => CLOSURE_RANK[b.kind] - CLOSURE_RANK[a.kind])[0];

  // 2. Exceptions covering the date
  const exceptions = data.exceptions.filter(notOutdated).filter((x) => inRange(date, x.startDate, x.endDate));
  for (const x of exceptions) {
    if (!isUsable(fresh(x.verification, today, "exception"))) return { kind: "UNKNOWN", reason: "EXCEPTION_UNVERIFIED", records: [x.id] };
  }
  const sortedEx = [...exceptions].sort((a, b) => b.priority - a.priority);
  if (sortedEx.length > 1 && sortedEx[0].priority === sortedEx[1].priority && !sameException(sortedEx[0], sortedEx[1])) {
    return { kind: "UNKNOWN", reason: "EXCEPTION_CONFLICT", records: sortedEx.slice(0, 2).map((x) => x.id) };
  }
  const exception = sortedEx[0];

  if (closure) {
    if (exception && exception.kind === "SPECIAL_HOURS") {
      return { kind: "UNKNOWN", reason: "CLOSURE_EXCEPTION_CONFLICT", records: [closure.id, exception.id] };
    }
    return { kind: "CLOSURE", closure, records: [closure.id], worst: fresh(closure.verification, today, "closure") };
  }

  if (exception) {
    const w = fresh(exception.verification, today, "exception");
    if (exception.kind === "CLOSED") return { kind: "CLOSED", exception, message: exception.publicMessage, records: [exception.id], worst: w };
    const iv = toIntervals(exception.intervals, exception.id);
    if (!iv || iv.length === 0 || overlaps(iv)) return { kind: "UNKNOWN", reason: "INVALID_DATA", records: [exception.id] };
    return { kind: "SPECIAL", exception, intervals: iv, records: [exception.id], worst: w };
  }

  // 3. Public holidays: never assume closed without an explicit, verified rule
  if (data.publicHolidays.includes(date)) {
    if (data.holidayPolicy.mode === "REQUIRE_EXPLICIT_ENTRY") return { kind: "UNKNOWN", reason: "HOLIDAY_WITHOUT_RULE", records: [] };
    const hf = fresh(data.holidayPolicy.verification, today, "openingHours");
    if (!isUsable(hf)) return { kind: "UNKNOWN", reason: "HOLIDAY_POLICY_UNVERIFIED", records: [] };
    return { kind: "CLOSED", message: "Feiertag", records: ["holiday-policy"], worst: hf };
  }

  // 4. Weekly schedule
  const sched = data.schedule;
  if (!sched) return { kind: "UNKNOWN", reason: "NO_SCHEDULE", records: [] };
  const sf = fresh(sched.verification, today, "openingHours");
  if (sf === "REVIEW_EXPIRED") return { kind: "UNKNOWN", reason: "SCHEDULE_REVIEW_EXPIRED", records: ["schedule"] };
  if (!isUsable(sf)) return { kind: "UNKNOWN", reason: "SCHEDULE_UNVERIFIED", records: ["schedule"] };

  const weekday = weekdayOf(date);
  const rules = sched.rules.filter(notOutdated).filter((r) => r.weekday === weekday && inRange(date, r.validFrom, r.validUntil));
  const general = rules.filter((r) => r.consultationType !== "ACUTE");
  const acuteRules = rules.filter((r) => r.consultationType === "ACUTE");
  let worst: Freshness = sf;

  for (const r of general) {
    const rf = fresh(r.verification, today, "openingHours");
    if (!isUsable(rf)) return { kind: "UNKNOWN", reason: "RULE_UNVERIFIED", records: [r.id] };
    worst = worse(worst, rf);
  }
  const closedDay = sched.confirmedClosedWeekdays.includes(weekday);
  if (general.length === 0) {
    if (!closedDay) return { kind: "UNKNOWN", reason: "NO_RULES_FOR_DAY", records: ["schedule"] };
    return { kind: "REGULAR", intervals: [], acute: [], acuteSuppressed: false, records: ["schedule"], worst };
  }
  if (closedDay) return { kind: "UNKNOWN", reason: "RULE_CONFLICT", records: ["schedule", ...general.map((r) => r.id)] };

  const intervals: Interval[] = [];
  for (const r of general) {
    const iv = toIntervals([r], r.id);
    if (!iv) return { kind: "UNKNOWN", reason: "INVALID_DATA", records: [r.id] };
    intervals.push(...iv);
  }
  intervals.sort((a, b) => a.start - b.start);
  // Exact duplicates are harmless; any other overlap is a conflict.
  const deduped = intervals.filter((iv, i) => !intervals.slice(0, i).some((o) => o.start === iv.start && o.end === iv.end && o.type === iv.type));
  if (overlaps(deduped)) return { kind: "UNKNOWN", reason: "RULE_CONFLICT", records: deduped.map((i) => i.id) };

  // Acute overlay: used only if both the rule and the ACUTE consultation type are verified.
  const acuteType = data.consultationTypes.find((t) => t.code === "ACUTE");
  const acuteTypeUsable = !!acuteType && isUsable(fresh(acuteType.verification, today, "consultationType"));
  const acute: Interval[] = [];
  let acuteSuppressed = false;
  for (const r of acuteRules) {
    const usable = acuteTypeUsable && isUsable(fresh(r.verification, today, "openingHours"));
    if (!usable) {
      acuteSuppressed = true;
      continue;
    }
    const iv = toIntervals([r], r.id);
    if (!iv) return { kind: "UNKNOWN", reason: "INVALID_DATA", records: [r.id] };
    const inside = blocks(deduped).some((b) => iv[0].start >= b.start && iv[0].end <= b.end);
    if (!inside) return { kind: "UNKNOWN", reason: "ACUTE_CONFLICT", records: [r.id] };
    acute.push(...iv);
  }

  return {
    kind: "REGULAR",
    intervals: deduped,
    acute,
    acuteSuppressed,
    records: ["schedule", ...deduped.map((i) => i.id), ...acute.map((i) => i.id)],
    worst,
  };
}

function openIntervals(plan: DayPlan): Interval[] {
  if (plan.kind === "REGULAR" || plan.kind === "SPECIAL") return plan.intervals;
  return [];
}

function nextOpeningLabel(today: LocalDate, date: LocalDate, time: LocalTime): string {
  const d = daysBetween(today, date);
  if (d === 0) return `heute um ${time} Uhr`;
  if (d === 1) return `morgen um ${time} Uhr`;
  return `am ${formatGermanDate(date)} um ${time} Uhr`;
}

/** Searches forward; any UNKNOWN day before an opening makes the answer unknown (null). */
function findNextOpening(today: LocalDate, nowMin: number, data: PulsData, maxDays: number, firstPlan: DayPlan): NextOpening | null {
  for (let i = 0; i <= maxDays; i++) {
    const date = addDays(today, i);
    const plan = i === 0 ? firstPlan : resolveDay(date, today, data);
    if (plan.kind === "UNKNOWN") return null;
    const next = openIntervals(plan).find((iv) => (i === 0 ? iv.start > nowMin : true));
    if (next) {
      const time = formatMinutes(next.start);
      return { date, time, instant: zonedToInstant(date, time).toISOString(), label: nextOpeningLabel(today, date, time) };
    }
  }
  return null;
}

const A = {
  call: { id: "CALL", label: "Anrufen" },
  hours: { id: "HOURS", label: "Sprechzeiten ansehen" },
  emergency: { id: "EMERGENCY", label: "Notfall-Hinweise" },
  replacement: { id: "REPLACEMENT", label: "Vertretung anzeigen" },
  details: { id: "DETAILS", label: "Details ansehen" },
} as const satisfies Record<string, StatusAction>;

function lastVerifiedOf(records: string[], data: PulsData): LocalDate | undefined {
  const all: (FactVerification | undefined)[] = [];
  for (const id of records) {
    if (id === "schedule") all.push(data.schedule?.verification);
    all.push(data.schedule?.rules.find((r) => r.id === id)?.verification);
    all.push(data.exceptions.find((x) => x.id === id)?.verification);
    all.push(data.closures.find((c) => c.id === id)?.verification);
  }
  const dates = all.map((v) => v?.lastVerified).filter((d): d is LocalDate => !!d).sort();
  return dates[0]; // oldest — the honest "Stand"
}

// ---------------------------------------------------------------- engine

export function getPracticeStatus(now: Date, data: PulsData, options: PulsOptions = {}): PracticeStatusResult {
  const soon = options.soonThresholdMinutes ?? null;
  const searchDays = options.nextOpeningSearchDays ?? 14;

  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    return unknown("INVALID_NOW", { date: "0000-00-00", minutes: 0 }, now, []);
  }
  const local = zonedParts(now, PRACTICE_TIME_ZONE);
  const today = local.date;
  const nowMin = local.minutes;

  const plan = resolveDay(today, today, data);
  const upcomingClosure = findUpcomingClosure(today, data);

  if (plan.kind === "UNKNOWN") {
    return unknown(plan.reason, local, now, plan.records, upcomingClosure);
  }

  const confidence = plan.worst === "REVIEW_DUE" ? "REVIEW_DUE" : "VERIFIED";
  const base = {
    replacementPractices: [] as PublicReplacement[],
    replacementFallback: false,
    acuteSuppressed: plan.kind === "REGULAR" ? plan.acuteSuppressed : false,
    dataConfidence: confidence as PracticeStatusResult["dataConfidence"],
    reason: "OK" as ReasonCode,
    sourceRecordIds: plan.records,
    lastVerified: lastVerifiedOf(plan.records, data),
    evaluatedAt: evalStamp(now, local),
    upcomingClosure,
  };

  // ---- closure (vacation / temporary)
  if (plan.kind === "CLOSURE") {
    const c = plan.closure;
    const reps = publicReplacements(c, today, data);
    const maxDays = Math.max(searchDays, daysBetween(today, c.endDate) + 7);
    const next = findNextOpening(today, nowMin, data, maxDays, plan);
    const vacation = c.kind === "VACATION";
    const hasReps = reps.length > 0;
    return {
      ...base,
      status: vacation ? "VACATION" : "TEMPORARILY_CLOSED",
      indicator: vacation ? "CLOSURE" : "ATTENTION",
      headline: vacation ? "Praxisurlaub" : "Heute geschlossen",
      detail: vacation ? `Bis ${formatGermanDate(c.endDate)}` : c.publicMessage ?? "Bitte beachten Sie die aktuellen Hinweise.",
      primaryAction: hasReps ? A.replacement : A.emergency,
      secondaryActions: hasReps ? [A.emergency] : [A.hours],
      nextOpening: next,
      activeClosure: { id: c.id, kind: c.kind, startDate: c.startDate, endDate: c.endDate, message: c.publicMessage },
      replacementPractices: reps,
      replacementFallback: !hasReps,
    };
  }

  // ---- whole day closed by exception or holiday policy
  if (plan.kind === "CLOSED") {
    const next = findNextOpening(today, nowMin, data, searchDays, plan);
    return {
      ...base,
      status: "CLOSED",
      indicator: "NEUTRAL",
      headline: "Heute geschlossen",
      detail: next ? `Öffnet ${next.label}` : plan.message ?? "Nächste Sprechzeit ansehen",
      primaryAction: next ? A.hours : A.hours,
      secondaryActions: [A.emergency],
      nextOpening: next,
      activeException: plan.exception
        ? { id: plan.exception.id, kind: plan.exception.kind, message: plan.exception.publicMessage, intervals: [] }
        : undefined,
    };
  }

  const intervals = openIntervals(plan);
  const current = intervals.find((iv) => iv.start <= nowMin && nowMin < iv.end);
  const block = current ? blocks(intervals).find((b) => b.start <= nowMin && nowMin < b.end)! : undefined;

  // ---- special hours (the whole day is governed by the exception)
  if (plan.kind === "SPECIAL") {
    const ex = plan.exception;
    const list = intervals.map((iv) => `${formatMinutes(iv.start)}–${formatMinutes(iv.end)} Uhr`);
    const next = current ? undefined : findNextOpening(today, nowMin, data, searchDays, plan);
    return {
      ...base,
      status: "SPECIAL_HOURS",
      indicator: "ATTENTION",
      headline: "Geänderte Sprechzeit heute",
      detail: list.join(", "),
      primaryAction: current ? A.call : A.details,
      secondaryActions: current ? [A.details] : [A.hours],
      currentInterval: current ? { start: formatMinutes(current.start), end: formatMinutes(current.end), consultationType: current.type } : undefined,
      consultationType: current?.type,
      nextOpening: next,
      activeException: { id: ex.id, kind: ex.kind, message: ex.publicMessage, intervals: list },
    };
  }

  // ---- regular day
  const reg = plan as Extract<DayPlan, { kind: "REGULAR" }>;
  if (current && block) {
    const acuteNow = reg.acute.find((a) => a.start <= nowMin && nowMin < a.end);
    const ci = { start: formatMinutes(current.start), end: formatMinutes(current.end), consultationType: current.type };
    if (acuteNow) {
      return {
        ...base,
        status: "ACUTE_CONSULTATION",
        indicator: "OPEN",
        headline: "Akutsprechstunde",
        detail: `Heute bis ${formatMinutes(acuteNow.end)} Uhr`,
        primaryAction: A.call,
        secondaryActions: [A.hours],
        currentInterval: ci,
        consultationType: "ACUTE",
      };
    }
    const closingSoon = soon !== null && block.end - nowMin <= soon;
    return {
      ...base,
      status: closingSoon ? "CLOSING_SOON" : "OPEN",
      indicator: "OPEN",
      headline: "Praxis geöffnet",
      detail: closingSoon ? `Schließt um ${formatMinutes(block.end)} Uhr` : `Heute bis ${formatMinutes(block.end)} Uhr`,
      primaryAction: A.call,
      secondaryActions: [A.hours],
      currentInterval: ci,
      consultationType: current.type,
    };
  }

  const laterToday = intervals.find((iv) => iv.start > nowMin);
  if (laterToday && soon !== null && laterToday.start - nowMin <= soon) {
    const time = formatMinutes(laterToday.start);
    return {
      ...base,
      status: "OPENING_SOON",
      indicator: "NEUTRAL",
      headline: "Praxis öffnet bald",
      detail: `Heute ab ${time} Uhr`,
      primaryAction: A.hours,
      secondaryActions: [A.call],
      nextOpening: { date: today, time, instant: zonedToInstant(today, time).toISOString(), label: nextOpeningLabel(today, today, time) },
    };
  }

  const next = findNextOpening(today, nowMin, data, searchDays, plan);
  return {
    ...base,
    status: "CLOSED",
    indicator: "NEUTRAL",
    headline: "Praxis geschlossen",
    detail: next ? `Öffnet ${next.label}` : "Nächste Sprechzeit ansehen",
    primaryAction: A.hours,
    secondaryActions: [A.emergency],
    nextOpening: next,
  };
}

// ---------------------------------------------------------------- helpers

function evalStamp(now: Date, local: { date: LocalDate; minutes: number }) {
  return { instant: now.toISOString(), localDate: local.date, localTime: formatMinutes(local.minutes), timeZone: PRACTICE_TIME_ZONE };
}

function unknown(
  reason: ReasonCode,
  local: { date: LocalDate; minutes: number },
  now: Date,
  records: string[],
  upcomingClosure?: PracticeStatusResult["upcomingClosure"],
): PracticeStatusResult {
  const valid = now instanceof Date && !Number.isNaN(now.getTime());
  return {
    status: "UNKNOWN",
    indicator: "NONE",
    headline: "Aktuelle Sprechzeiten",
    detail: "Bitte aktuelle Informationen prüfen.",
    primaryAction: A.hours,
    secondaryActions: [A.call],
    nextOpening: null,
    replacementPractices: [],
    replacementFallback: false,
    acuteSuppressed: false,
    dataConfidence: "UNKNOWN",
    reason,
    sourceRecordIds: records,
    evaluatedAt: valid
      ? evalStamp(now, local)
      : { instant: "invalid", localDate: local.date, localTime: "00:00", timeZone: PRACTICE_TIME_ZONE },
    upcomingClosure,
  };
}

function publicReplacements(c: Closure, today: LocalDate, data: PulsData): PublicReplacement[] {
  const out: PublicReplacement[] = [];
  for (const a of c.replacements) {
    if (!inRange(today, a.from, a.until)) continue;
    const rp = data.replacementPractices.find((r) => r.id === a.replacementPracticeId);
    if (!rp || !isUsable(fresh(rp.verification, today, "replacementPractice"))) continue;
    out.push({
      id: rp.id,
      practiceName: rp.practiceName,
      contactPersons: rp.contactPersons,
      address: `${rp.street}, ${rp.postalCode} ${rp.city}`,
      phone: rp.phone,
      from: a.from,
      until: a.until,
      note: a.note,
    });
  }
  return out;
}

function findUpcomingClosure(today: LocalDate, data: PulsData): PracticeStatusResult["upcomingClosure"] {
  const candidates = data.closures
    .filter(notOutdated)
    .filter((c) => c.announceFrom && compareDates(c.announceFrom, today) <= 0 && compareDates(today, c.startDate) < 0)
    .filter((c) => isUsable(fresh(c.verification, today, "closure")))
    .sort((a, b) => compareDates(a.startDate, b.startDate));
  const c = candidates[0];
  return c ? { id: c.id, kind: c.kind, startDate: c.startDate, endDate: c.endDate, message: c.publicMessage } : undefined;
}
