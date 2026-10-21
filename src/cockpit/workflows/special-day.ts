// Sonderöffnungszeiten / Feiertag klären (Phase 09.5F) — one date, one OpeningHourException. Pure.
//
// "Was gilt an diesem Tag?" → CLOSED (no intervals) or SPECIAL_HOURS (the COMPLETE opening of the
// day). The same workflow resolves an unresolved public holiday for that ONE date; the global holiday
// policy (REQUIRE_EXPLICIT_ENTRY) is never changed. No recurring rules, no date ranges, no weekly
// schedule editing. Database snapshot + input + server time → draft or plain-German block; the same
// function runs for the preview and again inside the publish transaction.
//
// Final today rule: 09.5F plans FUTURE dates only. Today belongs to the dedicated quick actions
// (Heute geschlossen / Heute früher schließen / Akutsprechstunde) — no competing records.

import type { ConsultationTypeCode, OpeningHourException } from "../../domain/content-types.ts";
import { getPracticeStatus, type PracticeStatusResult, type PulsData } from "../../domain/practice-status.ts";
import { applyChangeSet, blocks, classifyChange, rulesSegments, type Segment } from "../../domain/operations.ts";
import { ACUTE_TODAY_MARKER, acuteExceptionProblem, nonAcuteSegments } from "../../domain/acute.ts";
import { evaluateFreshness, isUsable, type FactVerification } from "../../domain/verification.ts";
import { compareDates, formatDayMonth, formatGermanDate, formatMinutes, isLocalDate, parseTime, zonedToInstant, type LocalDate, type LocalTime } from "../../domain/time.ts";
import { berlinNow } from "../read-model.ts";
import type { Blocked, Draft } from "./types.ts";
import { unknownReason } from "./wording.ts";

import { SPECIAL_DAY_MARKER } from "../../domain/operations.ts";
export { SPECIAL_DAY_MARKER };
/**
 * Priority of a planned single-day exception: the collection's default for planned exceptions (10),
 * deliberately BELOW the same-day priority (100) so a short-notice change for that day still wins.
 * (09.5F blocks any other exception on the same date anyway.)
 */
export const SPECIAL_DAY_PRIORITY = 10;
export const MAX_SPECIAL_TEXT = 280;
export const MAX_SPECIAL_ROWS = 8;
export const TODAY_TEXT = "Änderungen für heute nehmen Sie bitte über die Schnellaktionen vor.";
export const PRIVACY_TEXT = "Keine Namen von Patientinnen und Patienten oder medizinische Angaben.";
export const HOLIDAY_UNRESOLVED_TEXT = "Die Website kann für diesen Feiertag aktuell keinen klaren Status anzeigen.";
export const HOLIDAY_RESOLVED_TEXT = "Mit dieser Änderung ist der Feiertag geklärt.";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const covers = (x: { startDate: LocalDate; endDate: LocalDate }, d: LocalDate) => compareDates(x.startDate, d) <= 0 && compareDates(d, x.endDate) <= 0;
const span = (list: { start: string; end: string }[]) => list.map((b) => `${b.start}–${b.end}`).join(" und ");

export type SpecialDayMode = "CLOSED" | "SPECIAL";
export interface SpecialDayInput {
  /** Domain id of the ACTIVE record being edited (re-loaded on the server, never trusted). */
  recordId?: string;
  date: string;
  mode?: SpecialDayMode;
  rows: { start: string; end: string; type: string }[];
  message?: string;
}

export const isSpecialDayRecord = (x: OpeningHourException) => x.reason === SPECIAL_DAY_MARKER && x.startDate === x.endDate;

// ---------------------------------------------------------------- consultation types

export interface TypeOption {
  code: ConsultationTypeCode;
  label: string;
  usable: boolean;
  /** Why it cannot be chosen (plain German). */
  note?: string;
}

/**
 * Selectable consultation types for a date — ONLY from the data (no static list): verified and fresh.
 * ACUTE additionally needs the READY physician baseline (09.5E guard, same helper).
 */
export function typeOptions(data: PulsData, date: LocalDate, today: LocalDate): TypeOption[] {
  return data.consultationTypes.map((t) => {
    const fresh = isUsable(evaluateFreshness(t.verification, date, "consultationType"));
    if (!fresh) return { code: t.code, label: t.label, usable: false, note: "nicht bestätigt" };
    if (t.code === "ACUTE") {
      const problem = acuteExceptionProblem(data, { kind: "SPECIAL_HOURS", startDate: date, endDate: date, intervals: [{ start: "00:00", end: "00:01", consultationType: "ACUTE" }] }, today);
      if (problem) return { code: t.code, label: t.label, usable: false, note: "nicht ärztlich bestätigt" };
    }
    return { code: t.code, label: t.label, usable: true };
  });
}

// ---------------------------------------------------------------- intervals

export interface RowProblem {
  index: number;
  message: string;
}

/** Editor rows → sorted, merged intervals (same type, touching). Every problem names its row. */
export function validateIntervals(rows: SpecialDayInput["rows"], options: TypeOption[]): { intervals: Segment[]; problems: RowProblem[] } {
  const problems: RowProblem[] = [];
  const ok: (Segment & { index: number })[] = [];
  rows.forEach((r, index) => {
    if (!r.start && !r.end && !r.type) return;
    if (!TIME.test(r.start) || !TIME.test(r.end)) return problems.push({ index, message: "Bitte Beginn und Ende als Uhrzeit angeben (HH:MM)." });
    if (parseTime(r.start) >= parseTime(r.end)) return problems.push({ index, message: "Das Ende muss nach dem Beginn liegen (nicht über Mitternacht)." });
    const opt = options.find((o) => o.code === r.type);
    if (!opt) return problems.push({ index, message: "Bitte eine Sprechstundenart wählen." });
    if (!opt.usable) return problems.push({ index, message: `„${opt.label}“ ist ${opt.note ?? "nicht verfügbar"} und kann nicht gewählt werden.` });
    ok.push({ index, start: r.start, end: r.end, type: opt.code });
  });
  for (const s of ok) {
    const earlier = ok.filter((o) => o.index < s.index);
    if (earlier.some((o) => o.start === s.start && o.end === s.end)) problems.push({ index: s.index, message: "Diese Zeile ist doppelt eingetragen." });
    else if (earlier.some((o) => parseTime(s.start) < parseTime(o.end) && parseTime(o.start) < parseTime(s.end))) problems.push({ index: s.index, message: "Diese Zeit überschneidet sich mit einer anderen Zeile." });
  }
  if (problems.length) return { intervals: [], problems: problems.sort((a, b) => a.index - b.index) };
  const sorted = [...ok].sort((a, b) => parseTime(a.start) - parseTime(b.start));
  const merged: Segment[] = [];
  for (const s of sorted) {
    const last = merged.at(-1);
    if (last && last.type === s.type && last.end === s.start) last.end = s.end;
    else merged.push({ start: s.start, end: s.end, type: s.type });
  }
  return { intervals: merged, problems: [] };
}

/** The confirmed weekly plan of that weekday as an EDITOR starting point (never published by itself). */
export function regularTemplate(data: PulsData, date: LocalDate, options: TypeOption[]): Segment[] {
  if (!data.schedule || !isUsable(evaluateFreshness(data.schedule.verification, date, "openingHours"))) return [];
  const usableRules = data.schedule.rules.filter((r) => isUsable(evaluateFreshness(r.verification, date, "openingHours")));
  const acuteOk = options.some((o) => o.code === "ACUTE" && o.usable);
  return acuteOk ? rulesSegments(usableRules, date) : nonAcuteSegments(usableRules, date);
}

// ---------------------------------------------------------------- moments (engine preview)

export interface Moment {
  label: string;
  time: LocalTime;
  before: PracticeStatusResult;
  after: PracticeStatusResult;
}

/** Useful instants of the date: closed → 10:00; changed hours → before / inside each interval / gaps / after. */
export function specialDayMoments(data: PulsData, draft: Draft): Moment[] {
  if (!draft.ok || draft.kind !== "SPECIAL_DAY") return [];
  const record = draft.record.value as OpeningHourException;
  const date = record.startDate;
  const pts: { label: string; min: number }[] = [];
  if (record.kind === "CLOSED") pts.push({ label: "Vormittag", min: 600 });
  else {
    const iv = record.intervals;
    const first = parseTime(iv[0].start);
    if (first > 0) pts.push({ label: "vor Beginn", min: first - 1 });
    iv.forEach((i, n) => {
      pts.push({ label: `während ${i.start}–${i.end}`, min: Math.floor((parseTime(i.start) + parseTime(i.end)) / 2) });
      const next = iv[n + 1];
      if (next && parseTime(next.start) > parseTime(i.end)) pts.push({ label: `Pause ${i.end}–${next.start}`, min: Math.floor((parseTime(i.end) + parseTime(next.start)) / 2) });
    });
    const last = parseTime(iv.at(-1)!.end);
    if (last < 24 * 60) pts.push({ label: "nach Ende", min: last });
  }
  const changed = applyChangeSet(data, draft.changeSet);
  return pts.map((p) => {
    const time = formatMinutes(p.min);
    const at = zonedToInstant(date, time);
    return { label: p.label, time, before: getPracticeStatus(at, data), after: getPracticeStatus(at, changed) };
  });
}

/** Is the date a public holiday the engine cannot resolve (website shows no clear status)? */
export const holidayUnresolved = (data: PulsData, date: LocalDate) => {
  if (!data.publicHolidays.includes(date)) return false;
  const r = getPracticeStatus(zonedToInstant(date, "12:00"), data);
  return r.reason === "HOLIDAY_WITHOUT_RULE" || r.reason === "HOLIDAY_POLICY_UNVERIFIED";
};

// ---------------------------------------------------------------- draft

/** Provenance the publish hook will generate — used only so the PREVIEW evaluates like the stored record. */
const provisional = (today: LocalDate, date: LocalDate): FactVerification => ({ status: "VERIFIED_CURRENT", lastVerified: today, reviewDue: date, verifiedBy: "Vorschau", sourceIds: ["PRACTICE_COCKPIT"] });

export function specialDayDraft(data: PulsData, now: Date, input: SpecialDayInput, fingerprint: string): Draft {
  const { date: today, time: nowTime } = berlinNow(now);
  const date = input.date.trim();
  const valid = isLocalDate(date);
  const before = getPracticeStatus(valid ? zonedToInstant(date, "12:00") : now, data);
  const base = { kind: "SPECIAL_DAY" as const, today, now: nowTime, before, fingerprint };
  const block = (b: Blocked): Draft => ({ ...base, ok: false, blocked: b });

  // Edit target: an ACTIVE record of THIS workflow (re-loaded here; the browser only names it).
  let existing: OpeningHourException | undefined;
  if (input.recordId !== undefined) {
    existing = data.exceptions.find((x) => x.id === input.recordId);
    if (!existing || !isSpecialDayRecord(existing)) return block({ code: "NOT_EDITABLE", message: "Dieser Eintrag kann hier nicht bearbeitet werden." });
    if (existing.startDate !== date) return block({ code: "NOT_EDITABLE", message: "Das Datum eines bestehenden Eintrags wird hier nicht verschoben." });
  }

  if (!valid) return block({ code: "INVALID_INPUT", message: "Bitte ein gültiges Datum wählen." });
  if (compareDates(date, today) < 0) return block({ code: "INVALID_INPUT", message: "Dieser Tag liegt in der Vergangenheit." });
  if (date === today) {
    return block({ code: "INVALID_INPUT", message: TODAY_TEXT, suggestion: { label: "Zur Übersicht", href: "/intern" } });
  }

  const closure = data.closures.find((c) => covers(c, date));
  if (closure) {
    return block({
      code: "CLOSURE_EXISTS",
      message: `Für diesen Tag ist bereits eine Schließung eingetragen (${formatGermanDate(closure.startDate)}${closure.endDate !== closure.startDate ? ` – ${formatGermanDate(closure.endDate)}` : ""}). Sie wird hier nicht überschrieben.`,
      ...(closure.kind !== "SHORT_NOTICE" ? { suggestion: { label: "Schließung bearbeiten", href: `/intern/urlaub/${encodeURIComponent(closure.id)}` } } : {}),
    });
  }
  const others = data.exceptions.filter((x) => covers(x, date) && x.id !== existing?.id);
  const own = others.find((x) => isSpecialDayRecord(x));
  if (own) return block({ code: "SPECIAL_HOURS_EXISTS", message: "Für diesen Tag gibt es bereits einen Eintrag. Bitte bearbeiten Sie diesen.", suggestion: { label: "Bestehenden Eintrag bearbeiten", href: `/intern/sonderzeiten/${encodeURIComponent(own.id)}` } });
  if (others.some((x) => x.reason === ACUTE_TODAY_MARKER)) return block({ code: "SPECIAL_HOURS_EXISTS", message: "Für diesen Tag ist die Akutsprechstunde geändert. Bitte nutzen Sie dafür „Akutsprechstunde“.", suggestion: { label: "Zur Akutsprechstunde", href: "/intern/akutsprechstunde" } });
  if (others.some((x) => x.id.startsWith("heute-frueher-"))) return block({ code: "SPECIAL_HOURS_EXISTS", message: "Für diesen Tag gilt „Heute früher schließen“. Bitte nutzen Sie dafür die Schnellaktionen.", suggestion: { label: "Zur Übersicht", href: "/intern" } });
  if (others.length) return block({ code: "SPECIAL_HOURS_EXISTS", message: "Für diesen Tag gibt es bereits eine andere Änderung der Sprechzeiten. Sie wird hier weder verändert noch ersetzt." });

  if (!input.mode) return block({ code: "INVALID_INPUT", message: "Bitte wählen Sie, was an diesem Tag gilt." });
  const text = input.message?.replace(/\s+/g, " ").trim() || undefined;
  if (text && text.length > MAX_SPECIAL_TEXT) return block({ code: "INVALID_INPUT", message: `Der Hinweis darf höchstens ${MAX_SPECIAL_TEXT} Zeichen lang sein.` });

  let intervals: Segment[] = [];
  if (input.mode === "SPECIAL") {
    const checked = validateIntervals(input.rows, typeOptions(data, date, today));
    if (checked.problems.length) return block({ code: "INVALID_INPUT", message: "Bitte die markierten Zeilen prüfen." });
    if (!checked.intervals.length) return block({ code: "INVALID_INPUT", message: "Bitte mindestens eine Sprechzeit eintragen." });
    intervals = checked.intervals;
  }

  const holiday = data.publicHolidays.includes(date);
  const record: OpeningHourException = {
    id: existing?.id ?? `${holiday ? "feiertag" : "sonderzeit"}-${date}`,
    kind: input.mode === "CLOSED" ? "CLOSED" : "SPECIAL_HOURS",
    startDate: date,
    endDate: date,
    intervals: intervals.map((i) => ({ start: i.start, end: i.end, consultationType: i.type })),
    reason: SPECIAL_DAY_MARKER,
    publicMessage: text,
    priority: existing?.priority ?? SPECIAL_DAY_PRIORITY,
    verification: provisional(today, date),
  };
  if (existing && JSON.stringify({ k: existing.kind, i: existing.intervals, m: existing.publicMessage }) === JSON.stringify({ k: record.kind, i: record.intervals, m: record.publicMessage })) {
    return block({ code: "NO_CHANGE", message: "Genau dieser Stand ist bereits eingetragen. Es wird nichts geändert." });
  }
  // 09.5E guard (same helper as the collection hook): ACUTE needs the READY physician baseline.
  const acute = acuteExceptionProblem(data, record, today);
  if (acute) return block({ code: "BASELINE_NOT_READY", message: acute });

  const changeSet = { upsertExceptions: [record] };
  const cls = classifyChange(data, changeSet, date);
  if (cls.kind === "CONFLICT") return block({ code: "CONFLICT", message: `Diese Änderung würde widersprüchliche Angaben erzeugen: ${unknownReason(cls.conflict!.reason)}` });

  const day = formatDayMonth(date);
  const open = span(blocks(intervals));
  return {
    ...base,
    ok: true,
    mode: existing ? "EDIT" : "NEW",
    changeSet,
    record: { collection: "openingHourExceptions", value: record },
    after: getPracticeStatus(zonedToInstant(date, "12:00"), applyChangeSet(data, changeSet)),
    actionLabel: input.mode === "CLOSED" ? `${day} als geschlossen eintragen` : existing ? `Sonderöffnungszeit für ${day} ändern` : `Sonderöffnungszeit für ${day} eintragen`,
    effect:
      input.mode === "CLOSED"
        ? `Am ${formatGermanDate(date)} ist die Praxis geschlossen.`
        : `Am ${formatGermanDate(date)} gilt nur diese Sprechzeit: ${open} Uhr. Alle anderen Zeiten dieses Tages sind geschlossen.`,
  };
}
