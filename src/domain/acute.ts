// Akutsprechstunde (Phase 09.5E) — pure domain rules. No Payload, no React, no practice facts.
//
// Two layers, two authorities:
//   PHYSICIAN BASELINE  — the ACUTE consultation type + recurring weekly ACUTE rules (DOCTOR only)
//   TODAY OVERRIDE      — a one-day SPECIAL_HOURS exception (STAFF / DOCTOR / ADMIN), allowed only
//                         on top of a READY physician baseline
// Nothing here knows real acute times: every time comes from data a physician entered.

import type { ConsultationType, ConsultationTypeCode, OpeningHourException, OpeningHoursRule } from "./content-types.ts";
import { acuteTypeUsable, getPracticeStatus, type PulsData, type ReasonCode } from "./practice-status.ts";
import type { Segment } from "./operations.ts";
import { evaluateFreshness, isUsable, type FactVerification, type Freshness } from "./verification.ts";
import { addDays, compareDates, formatMinutes, inRange, parseTime, weekdayOf, zonedToInstant, type IsoWeekday, type LocalDate, type LocalTime } from "./time.ts";

/** Internal, server-controlled marker of cockpit acute-today exceptions (never shown publicly). */
export const ACUTE_TODAY_MARKER = "COCKPIT_ACUTE_TODAY";
export const ACUTE_LABEL = "Akutsprechstunde";
/** How far ahead a proposed baseline is checked with the engine. */
export const BASELINE_WINDOW_DAYS = 28;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const notOutdated = (x: { verification: FactVerification }) => x.verification.status !== "OUTDATED_DO_NOT_PUBLISH";

export interface AcuteSlot {
  weekday: IsoWeekday;
  start: LocalTime;
  end: LocalTime;
}

export const slotKey = (s: AcuteSlot) => `${s.weekday}-${s.start}-${s.end}`;
const sortSlots = (list: AcuteSlot[]) => [...list].sort((a, b) => a.weekday - b.weekday || parseTime(a.start) - parseTime(b.start));

// ---------------------------------------------------------------- opening structure

/** Rules that still apply on/after `today` (open-ended or not yet ended). */
const current = (r: OpeningHoursRule, today: LocalDate) => notOutdated(r) && (!r.validUntil || compareDates(r.validUntil, today) >= 0);

/** Confirmed (usable) non-ACUTE opening blocks of a weekday, in minutes — what ACUTE must fit into. */
export function openingBlocks(data: PulsData, weekday: IsoWeekday, today: LocalDate): { start: number; end: number }[] {
  const sched = data.schedule;
  if (!sched || !isUsable(evaluateFreshness(sched.verification, today, "openingHours"))) return [];
  const list = sched.rules
    .filter((r) => r.weekday === weekday && r.consultationType !== "ACUTE" && current(r, today) && isUsable(evaluateFreshness(r.verification, today, "openingHours")))
    .flatMap((r) => (TIME.test(r.start) && TIME.test(r.end) && parseTime(r.start) < parseTime(r.end) ? [{ start: parseTime(r.start), end: parseTime(r.end) }] : []))
    .sort((a, b) => a.start - b.start);
  const out: { start: number; end: number }[] = [];
  for (const i of list) {
    const last = out.at(-1);
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push({ ...i });
  }
  return out;
}

const fits = (blocks: { start: number; end: number }[], start: number, end: number) => blocks.some((b) => start >= b.start && end <= b.end);

// ---------------------------------------------------------------- slot validation (baseline editor)

export type SlotProblemKind = "WEEKDAY" | "TIME" | "ORDER" | "DUPLICATE" | "OVERLAP" | "OUTSIDE";
export interface SlotProblem {
  index: number;
  kind: SlotProblemKind;
  message: string;
}
export const OUTSIDE_MESSAGE = "Die Akutsprechstunde muss vollständig innerhalb der bestätigten Sprechzeit liegen.";

/** Raw editor rows → validated slots. Empty rows are ignored; every problem names its row. */
export function validateSlots(rows: { weekday: string; start: string; end: string }[], data: PulsData, today: LocalDate): { slots: AcuteSlot[]; problems: SlotProblem[] } {
  const problems: SlotProblem[] = [];
  const slots: (AcuteSlot & { index: number })[] = [];
  rows.forEach((r, index) => {
    if (!r.weekday && !r.start && !r.end) return;
    const wd = Number(r.weekday);
    if (!Number.isInteger(wd) || wd < 1 || wd > 7) return problems.push({ index, kind: "WEEKDAY", message: "Bitte einen Wochentag wählen." });
    if (!TIME.test(r.start) || !TIME.test(r.end)) return problems.push({ index, kind: "TIME", message: "Bitte Beginn und Ende als Uhrzeit angeben (HH:MM)." });
    if (parseTime(r.start) >= parseTime(r.end)) return problems.push({ index, kind: "ORDER", message: "Das Ende muss nach dem Beginn liegen (nicht über Mitternacht)." });
    slots.push({ index, weekday: wd as IsoWeekday, start: r.start, end: r.end });
  });
  for (const s of slots) {
    const others = slots.filter((o) => o !== s && o.weekday === s.weekday);
    if (others.some((o) => o.index < s.index && o.start === s.start && o.end === s.end)) {
      problems.push({ index: s.index, kind: "DUPLICATE", message: "Diese Zeile ist doppelt eingetragen." });
      continue;
    }
    // The later row of a conflicting pair is the one flagged (the earlier one stays usable).
    if (others.some((o) => o.index < s.index && !(o.start === s.start && o.end === s.end) && parseTime(s.start) < parseTime(o.end) && parseTime(o.start) < parseTime(s.end))) {
      problems.push({ index: s.index, kind: "OVERLAP", message: "Diese Zeit überschneidet sich mit einer anderen Akutsprechstunde am selben Tag." });
      continue;
    }
    if (!fits(openingBlocks(data, s.weekday, today), parseTime(s.start), parseTime(s.end))) problems.push({ index: s.index, kind: "OUTSIDE", message: OUTSIDE_MESSAGE });
  }
  const bad = new Set(problems.map((p) => p.index));
  return { slots: sortSlots(slots.filter((s) => !bad.has(s.index)).map(({ index: _i, ...s }) => s)), problems: problems.sort((a, b) => a.index - b.index) };
}

// ---------------------------------------------------------------- baseline state

export type AcuteBaselineState = "NOT_CONFIGURED" | "NEEDS_CONFIRMATION" | "READY" | "INVALID";
export interface AcuteBaselineStatus {
  state: AcuteBaselineState;
  /** Plain-German reasons (empty for READY / NOT_CONFIGURED). */
  reasons: string[];
  type?: ConsultationType;
  typeFreshness?: Freshness;
  /** Current recurring ACUTE rules (all, whatever their verification). */
  rules: OpeningHoursRule[];
  slots: AcuteSlot[];
}

/**
 * READY only if: exactly one usable ACUTE type, at least one recurring ACUTE rule, every current
 * ACUTE rule usable, structurally valid, inside the confirmed opening structure of its weekday and
 * not overlapping another ACUTE rule. An ACUTE record merely existing is never READY.
 */
export function acuteBaselineStatus(data: PulsData, today: LocalDate): AcuteBaselineStatus {
  const types = data.consultationTypes.filter((t) => t.code === "ACUTE");
  const type = types[0];
  const rules = (data.schedule?.rules ?? []).filter((r) => r.consultationType === "ACUTE" && current(r, today));
  const slots = sortSlots(rules.filter((r) => TIME.test(r.start) && TIME.test(r.end)).map((r) => ({ weekday: r.weekday, start: r.start, end: r.end })));
  const typeFreshness = type ? evaluateFreshness(type.verification, today, "consultationType") : undefined;
  const base = { type, typeFreshness, rules, slots };
  if (!type && rules.length === 0) return { ...base, state: "NOT_CONFIGURED", reasons: [] };

  const invalid: string[] = [];
  if (types.length > 1) invalid.push("Die Sprechstundenart „Akutsprechstunde“ ist mehrfach angelegt.");
  for (const r of rules) {
    if (!TIME.test(r.start) || !TIME.test(r.end) || parseTime(r.start) >= parseTime(r.end)) {
      invalid.push(`Eine Akutsprechstunde (${r.start}–${r.end}) hat ungültige Zeiten.`);
      continue;
    }
    if (rules.some((o) => o !== r && o.weekday === r.weekday && TIME.test(o.start) && TIME.test(o.end) && parseTime(r.start) < parseTime(o.end) && parseTime(o.start) < parseTime(r.end))) {
      invalid.push(`Zwei Akutsprechstunden überschneiden sich (${WEEKDAY_NAME[r.weekday]}).`);
    }
  }
  if (invalid.length) return { ...base, state: "INVALID", reasons: [...new Set(invalid)] };
  // Without confirmed regular hours there is nothing an acute rule could fit into.
  if (!data.schedule || !isUsable(evaluateFreshness(data.schedule.verification, today, "openingHours"))) {
    return { ...base, state: "NEEDS_CONFIRMATION", reasons: ["Die regulären Sprechzeiten sind nicht ärztlich bestätigt."] };
  }
  for (const r of rules) {
    if (!fits(openingBlocks(data, r.weekday, today), parseTime(r.start), parseTime(r.end))) {
      invalid.push(`Die Akutsprechstunde ${WEEKDAY_NAME[r.weekday]} ${r.start}–${r.end} Uhr liegt nicht vollständig in der bestätigten Sprechzeit.`);
    }
  }
  if (invalid.length) return { ...base, state: "INVALID", reasons: [...new Set(invalid)] };

  const needs: string[] = [];
  if (!type) needs.push("Die Sprechstundenart „Akutsprechstunde“ fehlt.");
  else if (!acuteTypeUsable(data, today)) needs.push(typeFreshness === "REVIEW_EXPIRED" ? "Die ärztliche Bestätigung der Akutsprechstunde ist abgelaufen." : "Die Akutsprechstunde ist nicht ärztlich bestätigt.");
  if (rules.length === 0) needs.push("Es ist keine regelmäßige Akutsprechstunde eingetragen.");
  else if (rules.some((r) => !isUsable(evaluateFreshness(r.verification, today, "openingHours")))) needs.push("Die regelmäßigen Zeiten der Akutsprechstunde sind nicht (mehr) ärztlich bestätigt.");
  if (needs.length) return { ...base, state: "NEEDS_CONFIRMATION", reasons: needs };
  return { ...base, state: "READY", reasons: [] };
}

export const WEEKDAY_NAME: Record<number, string> = { 1: "Montag", 2: "Dienstag", 3: "Mittwoch", 4: "Donnerstag", 5: "Freitag", 6: "Samstag", 7: "Sonntag" };

// ---------------------------------------------------------------- baseline proposal

/** Provenance used only so a PREVIEW evaluates like the stored record (the hook generates the real one). */
export const previewVerification = (today: LocalDate): FactVerification => ({ status: "VERIFIED_CURRENT", lastVerified: today, reviewDue: addDays(today, 182), verifiedBy: "Vorschau", sourceIds: ["PRACTICE_COCKPIT"] });

export const acuteRuleId = (s: AcuteSlot) => `akut-${s.weekday}-${s.start.replace(":", "")}-${s.end.replace(":", "")}`;

/**
 * The proposed physician baseline: the ACUTE subset is replaced by `slots`; every non-ACUTE rule is
 * kept as the SAME object (id, fields, verification, source provenance). The ACUTE type is the same
 * logical record if one exists (one per code).
 */
export function proposeBaseline(data: PulsData, slots: AcuteSlot[], today: LocalDate): PulsData {
  const sched = data.schedule!;
  const existing = sched.rules.filter((r) => r.consultationType === "ACUTE");
  const acuteRules: OpeningHoursRule[] = sortSlots(slots).map((s) => {
    const same = existing.find((r) => r.weekday === s.weekday && r.start === s.start && r.end === s.end);
    return { id: same?.id ?? acuteRuleId(s), weekday: s.weekday, start: s.start, end: s.end, consultationType: "ACUTE", verification: previewVerification(today) };
  });
  const type = data.consultationTypes.find((t) => t.code === "ACUTE");
  const acuteType: ConsultationType = { ...(type ?? {}), code: "ACUTE", label: ACUTE_LABEL, verification: previewVerification(today) };
  return {
    ...data,
    schedule: { ...sched, rules: [...sched.rules.filter((r) => r.consultationType !== "ACUTE"), ...acuteRules] },
    consultationTypes: [...data.consultationTypes.filter((t) => t.code !== "ACUTE"), acuteType],
  };
}

// ---------------------------------------------------------------- engine checks (28 days, preview points)

export interface WindowProblem {
  date: LocalDate;
  time: LocalTime;
  reason: ReasonCode;
}
const NEW_PROBLEM: ReasonCode[] = ["ACUTE_CONFLICT", "RULE_CONFLICT", "INVALID_DATA"];

/**
 * The baseline must not introduce uncertainty: for every day of the window, at noon and at every
 * proposed slot boundary / midpoint, the proposed data may not become UNKNOWN (or conflicting)
 * where the current data was not. Existing unrelated UNKNOWN days do not block.
 */
export function baselineWindowProblems(base: PulsData, proposed: PulsData, slots: AcuteSlot[], today: LocalDate, days = BASELINE_WINDOW_DAYS): WindowProblem[] {
  const out: WindowProblem[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const times = new Set<LocalTime>(["12:00"]);
    for (const s of slots.filter((x) => x.weekday === weekdayOf(date))) {
      times.add(s.start);
      times.add(formatMinutes(Math.floor((parseTime(s.start) + parseTime(s.end)) / 2)));
    }
    for (const time of times) {
      const at = zonedToInstant(date, time);
      const before = getPracticeStatus(at, base);
      const after = getPracticeStatus(at, proposed);
      if (after.status === "UNKNOWN" && (before.status !== "UNKNOWN" || (NEW_PROBLEM.includes(after.reason) && before.reason !== after.reason))) {
        out.push({ date, time, reason: after.reason });
        break;
      }
    }
  }
  return out;
}

export interface SlotCheck {
  slot: AcuteSlot;
  date?: LocalDate;
  points: { label: "vorher" | "während" | "danach"; time: LocalTime; status: string; headline: string }[];
  /** The engine returns ACUTE_CONSULTATION inside the slot. */
  ok: boolean;
}

/** For each slot: the next ordinary occurrence (no closure / exception) within the window, checked before / inside / after. */
export function slotChecks(proposed: PulsData, slots: AcuteSlot[], today: LocalDate, days = BASELINE_WINDOW_DAYS): SlotCheck[] {
  return slots.map((slot) => {
    for (let i = 0; i < days; i++) {
      const date = addDays(today, i);
      if (weekdayOf(date) !== slot.weekday) continue;
      if (proposed.closures.some((c) => inRange(date, c.startDate, c.endDate)) || proposed.exceptions.some((x) => inRange(date, x.startDate, x.endDate))) continue;
      const s = parseTime(slot.start);
      const e = parseTime(slot.end);
      const pts = [
        { label: "vorher" as const, time: formatMinutes(Math.max(0, s - 1)) },
        { label: "während" as const, time: formatMinutes(Math.floor((s + e) / 2)) },
        { label: "danach" as const, time: slot.end },
      ].map((p) => {
        const r = getPracticeStatus(zonedToInstant(date, p.time), proposed);
        return { ...p, status: r.status, headline: r.headline };
      });
      return { slot, date, points: pts, ok: pts[1].status === "ACUTE_CONSULTATION" && pts[0].status !== "ACUTE_CONSULTATION" && pts[2].status !== "ACUTE_CONSULTATION" };
    }
    return { slot, points: [], ok: false };
  });
}

// ---------------------------------------------------------------- collection guard (every write path)

/**
 * Server-side guard for ANY write of an exception (cockpit, REST, admin UI): SPECIAL_HOURS with an
 * ACUTE interval needs a READY physician baseline today and a usable ACUTE type on every affected
 * day. Returns a plain-German refusal, or null.
 */
export function acuteExceptionProblem(data: PulsData, x: Pick<OpeningHourException, "kind" | "startDate" | "endDate" | "intervals">, today: LocalDate): string | null {
  if (x.kind !== "SPECIAL_HOURS" || !(x.intervals ?? []).some((i) => i.consultationType === "ACUTE")) return null;
  if (acuteBaselineStatus(data, today).state !== "READY") return "Die Akutsprechstunde ist noch nicht ärztlich bestätigt. Geänderte Zeiten mit Akutsprechstunde sind deshalb nicht möglich.";
  for (let d = compareDates(x.startDate, today) > 0 ? x.startDate : today; compareDates(d, x.endDate) <= 0; d = addDays(d, 1)) {
    if (!acuteTypeUsable(data, d)) return `Die ärztliche Bestätigung der Akutsprechstunde gilt nicht mehr am ${d}.`;
  }
  return null;
}

// ---------------------------------------------------------------- today overlay

/** Non-ACUTE intervals of the weekly plan for a date (the recurring ACUTE overlay removed). */
export function nonAcuteSegments(rules: OpeningHoursRule[], date: LocalDate): Segment[] {
  const wd = weekdayOf(date);
  return rules
    .filter((r) => r.weekday === wd && r.consultationType !== "ACUTE" && inRange(date, r.validFrom, r.validUntil) && notOutdated(r))
    .map((r) => ({ start: r.start, end: r.end, type: r.consultationType }))
    .sort((a, b) => parseTime(a.start) - parseTime(b.start));
}

/** Recurring ACUTE rules of a date (as intervals). */
export function recurringAcute(rules: OpeningHoursRule[], date: LocalDate): { start: LocalTime; end: LocalTime }[] {
  const wd = weekdayOf(date);
  return rules
    .filter((r) => r.weekday === wd && r.consultationType === "ACUTE" && inRange(date, r.validFrom, r.validUntil) && notOutdated(r))
    .map((r) => ({ start: r.start, end: r.end }))
    .sort((a, b) => parseTime(a.start) - parseTime(b.start));
}

export class OverlayError extends Error {}

/**
 * The COMPLETE intervals of a day with one ACUTE interval (or none = cancel): start from the
 * non-ACUTE segments, drop any ACUTE, cut the requested interval out of whatever it crosses
 * (types are preserved on both sides), insert it, merge touching segments of the same type.
 * Throws when the result would overlap or the interval does not lie inside the opening.
 */
export function withAcuteForDay(base: Segment[], acute: { start: LocalTime; end: LocalTime } | null): Segment[] {
  const segs = base.filter((s) => s.type !== "ACUTE").map((s) => ({ start: parseTime(s.start), end: parseTime(s.end), type: s.type }));
  segs.sort((a, b) => a.start - b.start);
  for (let i = 1; i < segs.length; i++) if (segs[i].start < segs[i - 1].end) throw new OverlayError("Die Sprechzeiten des Tages überschneiden sich.");
  let out = segs;
  if (acute) {
    const a = parseTime(acute.start);
    const b = parseTime(acute.end);
    if (!(a < b)) throw new OverlayError("Das Ende muss nach dem Beginn liegen.");
    const merged: { start: number; end: number }[] = [];
    for (const s of segs) {
      const last = merged.at(-1);
      if (last && s.start <= last.end) last.end = Math.max(last.end, s.end);
      else merged.push({ start: s.start, end: s.end });
    }
    if (!merged.some((m) => a >= m.start && b <= m.end)) throw new OverlayError(OUTSIDE_MESSAGE);
    out = [];
    for (const s of segs) {
      if (s.end <= a || s.start >= b) out.push(s);
      else {
        if (s.start < a) out.push({ ...s, end: a });
        if (s.end > b) out.push({ ...s, start: b });
      }
    }
    out.push({ start: a, end: b, type: "ACUTE" as ConsultationTypeCode });
    out.sort((x, y) => x.start - y.start);
  }
  const result: { start: number; end: number; type: ConsultationTypeCode }[] = [];
  for (const s of out) {
    const last = result.at(-1);
    if (last && last.type === s.type && last.end === s.start) last.end = s.end;
    else result.push({ ...s });
  }
  for (let i = 1; i < result.length; i++) if (result[i].start < result[i - 1].end) throw new OverlayError("Die Sprechzeiten des Tages überschneiden sich.");
  return result.map((s) => ({ start: formatMinutes(s.start), end: formatMinutes(s.end), type: s.type }));
}
