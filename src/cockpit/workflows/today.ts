// Today workflows (Phase 09.5A): 7.1 "Heute früher schließen" and 7.2 "Heute geschlossen".
// Pure: current DATABASE snapshot + input + server time → draft (ChangeSet + engine preview) or a
// plain-German block. Only existing domain rules are used (rulesSegments, earlyCloseEffect,
// findDaySpecialHours, applyChangeSet, classifyChange/introducedUnknown, getPracticeStatus,
// evaluateFreshness). The same function runs for the preview AND again on publish.

import type { Closure, ConsultationTypeCode, OpeningHourException } from "../../domain/content-types.ts";
import { getPracticeStatus, type PulsData } from "../../domain/practice-status.ts";
import { applyChangeSet, blocks, classifyChange, earlyCloseEffect, findDaySpecialHours, rulesSegments, type Segment } from "../../domain/operations.ts";
import { evaluateFreshness, isUsable, type FactVerification } from "../../domain/verification.ts";
import { compareDates, formatMinutes, parseTime, type LocalDate, type LocalTime } from "../../domain/time.ts";
import { berlinNow, dateRange } from "../read-model.ts";
import { MAX_PUBLIC_TEXT, type Blocked, type ClosedTodayInput, type Draft, type EarlyCloseInput } from "./types.ts";
import { PRIVACY_HINT, REASON_TEXT, unknownReason } from "./wording.ts";

/**
 * Priority of same-day cockpit changes. The engine sorts exceptions by HIGHER priority first
 * (equal priority + different content = EXCEPTION_CONFLICT). A short-notice change for today must
 * win over planned multi-day exceptions (default priority 10), hence 100. An edited record keeps
 * its existing priority.
 */
export const SAME_DAY_PRIORITY = 100;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const covers = (x: { startDate: LocalDate; endDate: LocalDate }, d: LocalDate) => compareDates(x.startDate, d) <= 0 && compareDates(d, x.endDate) <= 0;
const CLOSURE_TITLE: Record<Closure["kind"], string> = { VACATION: "Urlaub", TRAINING: "Fortbildung", SHORT_NOTICE: "Heute geschlossen", OTHER: "Schließung" };
const span = (list: { start: string; end: string }[]) => list.map((b) => `${b.start}–${b.end}`).join(" und ");

/** Provenance the publish hook will generate — used only so the PREVIEW evaluates like the published record. */
const provisional = (today: LocalDate): FactVerification => ({ status: "VERIFIED_CURRENT", lastVerified: today, reviewDue: today, verifiedBy: "Vorschau", sourceIds: ["PRACTICE_COCKPIT"] });

const toSegments = (x: OpeningHourException): Segment[] => x.intervals.map((i) => ({ start: i.start, end: i.end, type: i.consultationType as ConsultationTypeCode }));

/** The plan the early-close cut applies to: a planned multi-day change for today, else the weekly rules. */
function baseSegments(data: PulsData, today: LocalDate, sameDayId?: string): Segment[] {
  const other = data.exceptions.filter((x) => covers(x, today) && x.id !== sameDayId && x.kind === "SPECIAL_HOURS").sort((a, b) => b.priority - a.priority)[0];
  if (other) return toSegments(other);
  return data.schedule ? rulesSegments(data.schedule.rules, today) : [];
}

function cleanText(text: string | undefined): { value?: string; error?: string } {
  const value = text?.replace(/\s+/g, " ").trim() || undefined;
  if (value && value.length > MAX_PUBLIC_TEXT) return { error: `Der Hinweis darf höchstens ${MAX_PUBLIC_TEXT} Zeichen lang sein.` };
  return { value };
}

const TO_CLOSED_TODAY = { label: "Heute geschlossen", href: "/intern/heute/geschlossen" };

/** Suggested default: the next half hour after now — only if it really shortens today. */
export function defaultEarlyCloseTime(data: PulsData, now: Date): LocalTime | undefined {
  const { date, time } = berlinNow(now);
  const existing = findDaySpecialHours(data.exceptions, date);
  const segs = baseSegments(data, date, existing?.id);
  const next = formatMinutes(Math.floor(parseTime(time) / 30) * 30 + 30) as LocalTime;
  if (parseTime(next) >= 24 * 60) return undefined;
  const effect = earlyCloseEffect(segs, next);
  return effect.kind === "INSIDE" || effect.kind === "GAP" ? next : undefined;
}

// ---------------------------------------------------------------- 7.1 Heute früher schließen

export function earlyCloseDraft(data: PulsData, now: Date, input: EarlyCloseInput, fingerprint: string): Draft {
  const { date: today, time: nowTime } = berlinNow(now);
  const before = getPracticeStatus(now, data);
  const base = { kind: "EARLY_CLOSE" as const, today, now: nowTime, before, fingerprint };
  const block = (b: Blocked): Draft => ({ ...base, ok: false, blocked: b });

  if (!TIME.test(input.time)) return block({ code: "INVALID_INPUT", message: "Bitte eine Uhrzeit wählen (Format HH:MM)." });
  const text = cleanText(input.message);
  if (text.error) return block({ code: "INVALID_INPUT", message: text.error });

  const closure = data.closures.find((c) => covers(c, today));
  if (closure) {
    return block({ code: "CLOSURE_EXISTS", message: `Für heute ist bereits „${CLOSURE_TITLE[closure.kind]}“ (${dateRange(closure.startDate, closure.endDate)}) eingetragen. Früher schließen ist deshalb nicht möglich.` });
  }
  const closedEx = data.exceptions.find((x) => covers(x, today) && x.kind === "CLOSED");
  if (closedEx) return block({ code: "CLOSURE_EXISTS", message: "Die Praxis ist heute laut einer bestehenden Änderung bereits geschlossen." });
  if (before.status === "UNKNOWN") {
    return block({ code: "DAY_UNKNOWN", message: `Der heutige Tag kann nicht sicher beurteilt werden: ${unknownReason(before.reason)} Eine Änderung würde den Tag nicht verlässlicher machen. Bitte zuerst die Ursache klären.` });
  }

  const existing = findDaySpecialHours(data.exceptions, today);
  if (parseTime(input.time) <= parseTime(nowTime)) {
    return block({ code: "TIME_NOT_AFTER_NOW", message: `${input.time} Uhr ist bereits vorbei. Wenn die Praxis ab jetzt geschlossen ist, melden Sie das unter „Heute geschlossen“.`, suggestion: TO_CLOSED_TODAY });
  }

  const segs = baseSegments(data, today, existing?.id);
  const effect = earlyCloseEffect(segs, input.time as LocalTime);
  if (effect.kind === "TOO_LATE") {
    return block({
      code: "NO_CHANGE",
      message: segs.length ? `Die heutige Sprechzeit endet regulär um ${effect.lastEnd} Uhr. ${input.time} Uhr verkürzt die Öffnungszeiten nicht, es wird nichts geändert.` : "Für heute ist keine Sprechzeit eingetragen. Es gibt nichts zu verkürzen.",
    });
  }
  if (effect.kind === "TOO_EARLY") {
    return block({ code: "NOTHING_LEFT", message: `Vor ${input.time} Uhr gibt es heute keine Sprechzeit. Wenn die Praxis heute nicht öffnet, melden Sie das unter „Heute geschlossen“.`, suggestion: TO_CLOSED_TODAY });
  }

  const intervals = effect.segments.map((s) => ({ start: s.start, end: s.end, consultationType: s.type }));
  if (existing && JSON.stringify(existing.intervals) === JSON.stringify(intervals) && (existing.publicMessage ?? undefined) === text.value) {
    return block({ code: "NO_CHANGE", message: "Genau diese Sprechzeit ist für heute bereits eingetragen. Es wird nichts geändert." });
  }
  const record: OpeningHourException = {
    id: existing?.id ?? `heute-frueher-${today}`,
    kind: "SPECIAL_HOURS",
    startDate: today,
    endDate: today,
    intervals,
    publicMessage: text.value,
    priority: existing?.priority ?? SAME_DAY_PRIORITY,
    verification: provisional(today),
  };
  const changeSet = { upsertExceptions: [record] };
  const cls = classifyChange(data, changeSet, today);
  if (cls.kind === "CONFLICT") return block({ code: "CONFLICT", message: `Diese Änderung würde widersprüchliche Angaben erzeugen: ${unknownReason(cls.conflict!.reason)}` });

  const removed = effect.removed;
  const afternoon = removed.length > 0 && removed.every((b) => parseTime(b.start) >= parseTime("12:00"));
  const gap = effect.kind === "GAP";
  // EDIT: describe the change against what is in force today (the existing change), not the weekly plan.
  const editEffect = existing ? `Heute ist bis ${input.time} Uhr geöffnet (${span(blocks(effect.segments))} Uhr). Bisher eingetragen: ${span(blocks(toSegments(existing)))} Uhr.` : undefined;
  return {
    ...base,
    ok: true,
    mode: existing ? "EDIT" : "NEW",
    changeSet,
    record: { collection: "openingHourExceptions", value: record },
    after: getPracticeStatus(now, applyChangeSet(data, changeSet)),
    actionLabel: gap ? (afternoon ? "Nachmittagssprechzeit heute entfallen lassen" : `Sprechzeit ${span(removed)} Uhr heute entfallen lassen`) : `Heute um ${input.time} Uhr schließen`,
    effect: editEffect
      ? editEffect
      : gap
      ? `Um ${input.time} Uhr ist die Praxis regulär bereits geschlossen. Die Sprechzeit ${span(removed)} Uhr entfällt heute.`
      : `Heute ist bis ${input.time} Uhr geöffnet (${span(blocks(effect.segments))} Uhr).${removed.length ? ` Die Sprechzeit ${span(removed)} Uhr entfällt.` : ""}`,
  };
}

// ---------------------------------------------------------------- 7.2 Heute geschlossen

export interface ReplacementOption {
  id: string;
  name: string;
  usable: boolean;
  /** Why it cannot be selected (plain German). */
  note?: string;
}

/** Replacement practices for TODAY — only verified, fresh ones are selectable (same rule as the public engine). */
export function replacementOptions(data: PulsData, today: LocalDate): ReplacementOption[] {
  return data.replacementPractices.map((p) => {
    const f = evaluateFreshness(p.verification, today, "replacementPractice");
    return {
      id: p.id,
      name: p.practiceName,
      usable: isUsable(f),
      note: isUsable(f) ? undefined : f === "UNVERIFIED" ? "nicht ärztlich bestätigt" : f === "OUTDATED" ? "veraltet" : "Prüfung abgelaufen",
    };
  });
}

export function publicReasonText(reason: ClosedTodayInput["reason"], other?: string): { value?: string; error?: string } {
  if (reason === "SONSTIGES") return cleanText(other);
  if (reason === "KEINER") return {};
  if (!(reason in REASON_TEXT)) return { error: "Bitte einen Grund auswählen." };
  return { value: REASON_TEXT[reason as keyof typeof REASON_TEXT] };
}

export function closedTodayDraft(data: PulsData, now: Date, input: ClosedTodayInput, fingerprint: string): Draft {
  // "Ab einer Uhrzeit" is NOT a whole-day closure: it is the early-close workflow (one representation).
  if (input.mode === "FROM_TIME") {
    const reason = publicReasonText(input.reason, input.otherText);
    return earlyCloseDraft(data, now, { time: input.time ?? "", message: reason.value }, fingerprint);
  }
  const { date: today, time: nowTime } = berlinNow(now);
  const before = getPracticeStatus(now, data);
  const base = { kind: "CLOSED_TODAY" as const, today, now: nowTime, before, fingerprint };
  const block = (b: Blocked): Draft => ({ ...base, ok: false, blocked: b });

  const reason = publicReasonText(input.reason, input.otherText);
  if (reason.error) return block({ code: "INVALID_INPUT", message: reason.error });

  const covering = data.closures.filter((c) => covers(c, today));
  const sameKind = covering.find((c) => c.kind === "SHORT_NOTICE" && c.startDate === today && c.endDate === today);
  const other = covering.find((c) => c !== sameKind);
  if (other) {
    return block({ code: "CLOSURE_EXISTS", message: `Für ${dateRange(other.startDate, other.endDate)} ist bereits „${CLOSURE_TITLE[other.kind]}“ eingetragen. Diese Schließung wird hier nicht überschrieben.` });
  }
  const ex = data.exceptions.find((x) => covers(x, today));
  if (ex) {
    return block({
      code: "SPECIAL_HOURS_EXISTS",
      message:
        ex.kind === "CLOSED"
          ? "Die Praxis ist heute laut einer bestehenden Änderung bereits geschlossen."
          : `Für heute ist bereits eine geänderte Sprechzeit eingetragen (${span(blocks(toSegments(ex)))} Uhr). Eine Schließung würde ihr widersprechen. Das Ersetzen bestehender Änderungen folgt in einer späteren Ausbaustufe.`,
    });
  }

  const options = replacementOptions(data, today);
  const ids = [...new Set(input.replacementIds.filter(Boolean))];
  const bad = ids.find((id) => !options.some((o) => o.id === id && o.usable));
  if (bad) return block({ code: "REPLACEMENT_NOT_USABLE", message: "Diese Vertretung ist für heute nicht bestätigt und kann nicht ausgewählt werden." });

  const record: Closure = {
    id: sameKind?.id ?? `heute-geschlossen-${today}`,
    kind: "SHORT_NOTICE",
    startDate: today,
    endDate: today,
    publicMessage: reason.value,
    replacements: ids.map((id) => ({ replacementPracticeId: id, from: today, until: today })),
    verification: provisional(today),
  };
  if (sameKind && JSON.stringify({ m: sameKind.publicMessage, r: sameKind.replacements.map((r) => r.replacementPracticeId) }) === JSON.stringify({ m: record.publicMessage, r: ids })) {
    return block({ code: "NO_CHANGE", message: "Genau diese Meldung ist für heute bereits eingetragen. Es wird nichts geändert." });
  }
  const changeSet = { upsertClosures: [record] };
  const cls = classifyChange(data, changeSet, today);
  if (cls.kind === "CONFLICT") return block({ code: "CONFLICT", message: `Diese Änderung würde widersprüchliche Angaben erzeugen: ${unknownReason(cls.conflict!.reason)}` });

  const names = ids.map((id) => options.find((o) => o.id === id)!.name);
  return {
    ...base,
    ok: true,
    mode: sameKind ? "EDIT" : "NEW",
    changeSet,
    record: { collection: "closures", value: record },
    after: getPracticeStatus(now, applyChangeSet(data, changeSet)),
    actionLabel: sameKind ? "Meldung für heute aktualisieren" : "Heute geschlossen melden",
    effect: `Die Praxis ist heute ab sofort geschlossen.${names.length ? ` Vertretung: ${names.join(", ")}.` : " Ohne Vertretung zeigt die Website Telefon und Notfall-Hinweise."}`,
  };
}

export { PRIVACY_HINT };
