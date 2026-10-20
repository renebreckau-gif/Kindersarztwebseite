// Akutsprechstunde (Phase 09.5E) — the two cockpit workflows, pure.
//
// 09.5E-1  PHYSICIAN BASELINE  (DOCTOR only): ACUTE consultation type + recurring weekly ACUTE rules.
// 09.5E-2  TODAY               (STAFF / DOCTOR / ADMIN, only on a READY baseline): one SPECIAL_HOURS
//          exception that carries the COMPLETE day (non-ACUTE intervals + the acute interval).
// Database snapshot + input + server time → draft or plain-German block. The same functions run for
// the preview and again inside the publish transaction. No acute time is ever suggested as a fact.

import type { OpeningHourException } from "../../domain/content-types.ts";
import { getPracticeStatus, type PracticeStatusResult, type PulsData } from "../../domain/practice-status.ts";
import { applyChangeSet, blocks, classifyChange, type Segment } from "../../domain/operations.ts";
import {
  ACUTE_TODAY_MARKER,
  OverlayError,
  acuteBaselineStatus,
  baselineWindowProblems,
  nonAcuteSegments,
  proposeBaseline,
  recurringAcute,
  slotChecks,
  validateSlots,
  withAcuteForDay,
  type AcuteBaselineStatus,
  type AcuteSlot,
  type SlotCheck,
  type SlotProblem,
} from "../../domain/acute.ts";
import { evaluateFreshness, isUsable, type FactVerification } from "../../domain/verification.ts";
import { compareDates, formatGermanDate, formatMinutes, parseTime, weekdayOf, zonedToInstant, type LocalDate, type LocalTime } from "../../domain/time.ts";
import { berlinNow } from "../read-model.ts";
import { SAME_DAY_PRIORITY } from "./today.ts";
import type { Blocked, Draft } from "./types.ts";
import { unknownReason } from "./wording.ts";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const covers = (x: { startDate: LocalDate; endDate: LocalDate }, d: LocalDate) => compareDates(x.startDate, d) <= 0 && compareDates(d, x.endDate) <= 0;
const span = (list: { start: string; end: string }[]) => list.map((b) => `${b.start}–${b.end}`).join(" und ");

export const NOT_CONFIRMED_TEXT = "Die Akutsprechstunde ist noch nicht ärztlich bestätigt und wird auf der Website nicht angezeigt.";
export const SPECIAL_EXISTS_TEXT = "Für heute gibt es bereits geänderte Sprechzeiten. Bitte diese Änderung zuerst prüfen.";
export const ACUTE_ENDED_TEXT = "Die Akutsprechstunde für heute ist bereits beendet.";

// ---------------------------------------------------------------- 09.5E-1 physician baseline

export interface AcuteBaselineInput {
  /** "Die Praxis hat eine regelmäßige Akutsprechstunde." — required to publish, not for the preview. */
  confirmed: boolean;
  rows: { weekday: string; start: string; end: string }[];
}

export type BaselineDraft =
  | {
      ok: true;
      today: LocalDate;
      fingerprint: string;
      before: AcuteBaselineStatus;
      /** First physician confirmation (audit VERIFY) vs. a later change (UPDATE). */
      first: boolean;
      slots: AcuteSlot[];
      proposed: PulsData;
      checks: SlotCheck[];
      actionLabel: string;
      effect: string;
    }
  | { ok: false; today: LocalDate; fingerprint: string; before: AcuteBaselineStatus; problems: SlotProblem[]; message: string };

const slotText = (s: AcuteSlot) => `${["", "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"][s.weekday]} ${s.start}–${s.end} Uhr`;

export function acuteBaselineDraft(data: PulsData, now: Date, input: AcuteBaselineInput, fingerprint: string): BaselineDraft {
  const today = berlinNow(now).date;
  const before = acuteBaselineStatus(data, today);
  const block = (message: string, problems: SlotProblem[] = []): BaselineDraft => ({ ok: false, today, fingerprint, before, problems, message });
  if (!data.schedule || !isUsable(evaluateFreshness(data.schedule.verification, today, "openingHours"))) {
    return block("Die regulären Sprechzeiten sind in der Cockpit-Datenbank nicht ärztlich bestätigt. Die Akutsprechstunde kann erst danach eingetragen werden.");
  }
  const { slots, problems } = validateSlots(input.rows, data, today);
  if (problems.length) return block("Bitte die markierten Zeilen prüfen.", problems);
  if (!slots.length) return block("Bitte mindestens eine regelmäßige Akutsprechstunde eintragen (Wochentag, von, bis).");
  const proposed = proposeBaseline(data, slots, today);
  const window = baselineWindowProblems(data, proposed, slots, today);
  if (window.length) {
    const w = window[0];
    return block(`Diese Akutsprechstunde würde am ${formatGermanDate(w.date)} um ${w.time} Uhr widersprüchliche Angaben erzeugen: ${unknownReason(w.reason)}`);
  }
  const checks = slotChecks(proposed, slots, today);
  const wrong = checks.find((c) => c.date && !c.ok);
  if (wrong) return block(`Die Vorschau zeigt für ${slotText(wrong.slot)} keine Akutsprechstunde. Bitte die Zeiten prüfen.`);
  const first = before.state !== "READY";
  const same = !first && JSON.stringify(before.slots) === JSON.stringify(slots);
  return {
    ok: true,
    today,
    fingerprint,
    before,
    first,
    slots,
    proposed,
    checks,
    actionLabel: first ? "Akutsprechstunde ärztlich bestätigen" : same ? "Akutsprechstunde erneut ärztlich bestätigen" : "Regelmäßige Akutsprechstunde ändern",
    effect: `Regelmäßige Akutsprechstunde: ${slots.map(slotText).join(", ")}. Die übrigen Sprechzeiten bleiben unverändert.`,
  };
}

/** Plain German for the history / confirmation of a baseline write. */
export const baselineHistoryText = (first: boolean) => (first ? "Akutsprechstunde ärztlich bestätigt" : "Regelmäßige Akutsprechstunde geändert");

// ---------------------------------------------------------------- 09.5E-2 today

export interface AcuteTodayInput {
  mode: "CHANGE" | "CANCEL";
  start?: string;
  end?: string;
}

/** Provenance the publish hook will generate — used only so the PREVIEW evaluates like the stored record. */
const provisional = (today: LocalDate): FactVerification => ({ status: "VERIFIED_CURRENT", lastVerified: today, reviewDue: today, verifiedBy: "Vorschau", sourceIds: ["PRACTICE_COCKPIT"] });

export interface AcuteTodayContext {
  today: LocalDate;
  now: LocalTime;
  baseline: AcuteBaselineStatus;
  /** The cockpit's own acute-today record for today, if any (edit target). */
  existing?: OpeningHourException;
  /** Acute intervals in force today (the record's, else the recurring ones). */
  current: { start: LocalTime; end: LocalTime }[];
  /** Recurring acute intervals of today's weekday. */
  recurring: { start: LocalTime; end: LocalTime }[];
}

export const isAcuteTodayRecord = (x: OpeningHourException, today: LocalDate) => x.reason === ACUTE_TODAY_MARKER && x.kind === "SPECIAL_HOURS" && x.startDate === today && x.endDate === today;
const acuteOf = (x: OpeningHourException) => x.intervals.filter((i) => i.consultationType === "ACUTE").map((i) => ({ start: i.start, end: i.end }));

export function acuteTodayContext(data: PulsData, now: Date): AcuteTodayContext {
  const { date: today, time } = berlinNow(now);
  const baseline = acuteBaselineStatus(data, today);
  const existing = data.exceptions.find((x) => isAcuteTodayRecord(x, today));
  const recurring = data.schedule ? recurringAcute(data.schedule.rules, today) : [];
  return { today, now: time, baseline, existing, recurring, current: existing ? acuteOf(existing) : recurring };
}

export function acuteTodayDraft(data: PulsData, now: Date, input: AcuteTodayInput, fingerprint: string): Draft {
  const ctx = acuteTodayContext(data, now);
  const { today } = ctx;
  const nowTime = ctx.now;
  const before = getPracticeStatus(now, data);
  const base = { kind: "ACUTE_TODAY" as const, today, now: nowTime, before, fingerprint };
  const block = (b: Blocked): Draft => ({ ...base, ok: false, blocked: b });

  if (ctx.baseline.state !== "READY") return block({ code: "BASELINE_NOT_READY", message: `${NOT_CONFIRMED_TEXT} Änderungen für heute sind erst danach möglich.` });

  const closure = data.closures.find((c) => covers(c, today));
  if (closure) return block({ code: "CLOSURE_EXISTS", message: `Für heute ist eine Schließung eingetragen (${formatGermanDate(closure.startDate)}${closure.endDate !== closure.startDate ? ` – ${formatGermanDate(closure.endDate)}` : ""}). Die Akutsprechstunde kann heute nicht geändert werden.` });
  const others = data.exceptions.filter((x) => covers(x, today) && x.id !== ctx.existing?.id);
  if (others.some((x) => x.kind === "CLOSED")) return block({ code: "CLOSURE_EXISTS", message: "Die Praxis ist heute laut einer bestehenden Änderung geschlossen." });
  if (others.length) return block({ code: "SPECIAL_HOURS_EXISTS", message: SPECIAL_EXISTS_TEXT });
  if (before.status === "UNKNOWN") {
    return block({ code: "DAY_UNKNOWN", message: `Der heutige Tag kann nicht sicher beurteilt werden: ${unknownReason(before.reason)} Eine Änderung der Akutsprechstunde würde den Tag nicht verlässlicher machen.` });
  }
  const weekdayRules = (data.schedule?.rules ?? []).filter((r) => r.weekday === weekdayOf(today) && r.consultationType !== "ACUTE");
  if (weekdayRules.some((r) => !isUsable(evaluateFreshness(r.verification, today, "openingHours")))) {
    return block({ code: "DAY_UNKNOWN", message: "Eine Sprechzeit von heute ist nicht bestätigt. Die Akutsprechstunde kann heute nicht geändert werden." });
  }
  const baseSegs: Segment[] = data.schedule ? nonAcuteSegments(data.schedule.rules, today) : [];
  if (!baseSegs.length) return block({ code: "NOTHING_LEFT", message: "Heute ist regulär keine Sprechzeit. Eine Akutsprechstunde kann nur innerhalb der Sprechzeit liegen." });

  let segments: Segment[];
  let requested: { start: LocalTime; end: LocalTime } | null = null;
  const nowMin = parseTime(nowTime);
  if (input.mode === "CANCEL") {
    if (!ctx.current.length) return block({ code: "NO_CHANGE", message: "Für heute ist keine Akutsprechstunde eingetragen. Es gibt nichts, was entfallen könnte." });
    if (ctx.current.every((a) => parseTime(a.end) <= nowMin)) return block({ code: "TIME_NOT_AFTER_NOW", message: ACUTE_ENDED_TEXT });
    segments = withAcuteForDay(baseSegs, null);
  } else {
    const s = (input.start ?? "").trim();
    const e = (input.end ?? "").trim();
    if (!TIME.test(s) || !TIME.test(e)) return block({ code: "INVALID_INPUT", message: "Bitte Beginn und Ende als Uhrzeit angeben (HH:MM)." });
    if (parseTime(s) >= parseTime(e)) return block({ code: "INVALID_INPUT", message: "Das Ende muss nach dem Beginn liegen (nicht über Mitternacht)." });
    if (parseTime(e) <= nowMin) return block({ code: "TIME_NOT_AFTER_NOW", message: `${e} Uhr ist bereits vorbei. Eine Akutsprechstunde kann nur für die verbleibende Zeit von heute eingetragen werden.` });
    requested = { start: s, end: e };
    try {
      segments = withAcuteForDay(baseSegs, requested);
    } catch (err) {
      if (err instanceof OverlayError) return block({ code: "INVALID_INPUT", message: "Die Akutsprechstunde muss vollständig innerhalb der heutigen Sprechzeit liegen." });
      throw err;
    }
  }

  const intervals = segments.map((x) => ({ start: x.start, end: x.end, consultationType: x.type }));
  // Effective today without a change: the existing record, else the weekly plan with its recurring acute.
  const effectiveNow = ctx.existing
    ? ctx.existing.intervals
    : (ctx.recurring.length ? withAcuteForDay(baseSegs, ctx.recurring[0]) : withAcuteForDay(baseSegs, null)).map((x) => ({ start: x.start, end: x.end, consultationType: x.type }));
  if (JSON.stringify(effectiveNow) === JSON.stringify(intervals) && (ctx.existing || ctx.recurring.length <= 1)) {
    return block({ code: "NO_CHANGE", message: input.mode === "CANCEL" ? "Die Akutsprechstunde entfällt heute bereits. Es wird nichts geändert." : "Genau diese Akutsprechstunde gilt heute bereits. Es wird nichts geändert." });
  }

  const record: OpeningHourException = {
    id: ctx.existing?.id ?? `akut-heute-${today}`,
    kind: "SPECIAL_HOURS",
    startDate: today,
    endDate: today,
    intervals,
    reason: ACUTE_TODAY_MARKER,
    priority: ctx.existing?.priority ?? SAME_DAY_PRIORITY,
    verification: provisional(today),
  };
  const changeSet = { upsertExceptions: [record] };
  const cls = classifyChange(data, changeSet, today);
  if (cls.kind === "CONFLICT") return block({ code: "CONFLICT", message: `Diese Änderung würde widersprüchliche Angaben erzeugen: ${unknownReason(cls.conflict!.reason)}` });

  const open = span(blocks(segments));
  const regular = ctx.recurring.length ? ` Regulär: ${span(ctx.recurring)} Uhr.` : "";
  const add = input.mode === "CHANGE" && !ctx.current.length;
  return {
    ...base,
    ok: true,
    mode: ctx.existing ? "EDIT" : "NEW",
    changeSet,
    record: { collection: "openingHourExceptions", value: record },
    after: getPracticeStatus(now, applyChangeSet(data, changeSet)),
    actionLabel: input.mode === "CANCEL" ? "Akutsprechstunde heute entfallen lassen" : add ? `Akutsprechstunde heute eintragen: ${requested!.start}–${requested!.end} Uhr` : `Akutsprechstunde heute ${requested!.start}–${requested!.end} Uhr`,
    effect:
      input.mode === "CANCEL"
        ? `Die Akutsprechstunde entfällt heute.${regular} Die Praxis bleibt zu den übrigen Sprechzeiten geöffnet (${open} Uhr).`
        : `Heute ist die Akutsprechstunde von ${requested!.start} bis ${requested!.end} Uhr.${regular} Die übrigen Sprechzeiten bleiben (${open} Uhr).`,
  };
}

/** Engine checks of a today change: before / inside / after the acute interval (or the cancelled one), from now on. */
export function todayPoints(data: PulsData, draft: Draft): { label: string; time: LocalTime; before: PracticeStatusResult; after: PracticeStatusResult }[] {
  if (!draft.ok || draft.kind !== "ACUTE_TODAY") return [];
  const record = draft.record.value as OpeningHourException;
  const ref = record.intervals.find((i) => i.consultationType === "ACUTE") ?? acuteTodayContext(data, zonedToInstant(draft.today, draft.now)).current[0];
  if (!ref) return [];
  const s = parseTime(ref.start);
  const e = parseTime(ref.end);
  const nowMin = parseTime(draft.now);
  const changed = applyChangeSet(data, draft.changeSet);
  return [
    { label: "vor der Akutsprechstunde", min: s - 1 },
    { label: "während", min: Math.floor((s + e) / 2) },
    { label: "danach", min: e },
  ]
    .filter((p) => p.min >= nowMin && p.min >= 0)
    .map((p) => {
      const time = formatMinutes(p.min);
      const at = zonedToInstant(draft.today, time);
      return { label: p.label, time, before: getPracticeStatus(at, data), after: getPracticeStatus(at, changed) };
    });
}
