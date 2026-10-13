// Operational change logic shared by the Website-Vorschau and the (future) server-side publish
// process. Framework-free: no Payload, no React, no lab mocks. Extracted from the Phase 09.1
// cockpit prototype (docs/architecture/backend-foundation.md §4). Wording stays in the UI layer:
// these functions return structured results (kinds, dates, record ids), never German sentences.

import type { Announcement, Closure, ConsultationTypeCode, OpeningHourException, OpeningHoursRule } from "./content-types.ts";
import type { PulsData, ReasonCode } from "./practice-status.ts";
import { getPracticeStatus } from "./practice-status.ts";
import { addDays, compareDates, formatMinutes, isLocalDate, parseTime, weekdayOf, zonedToInstant, type LocalDate, type LocalTime } from "./time.ts";

// ---------------------------------------------------------------- schedule derivation

export interface Segment {
  start: LocalTime;
  end: LocalTime;
  type: ConsultationTypeCode;
}

/** Weekly rules for a date as non-overlapping segments (acute windows cut out of their block). */
export function rulesSegments(rules: OpeningHoursRule[], date: LocalDate): Segment[] {
  const wd = weekdayOf(date);
  const day = rules.filter((r) => r.weekday === wd && (!r.validFrom || compareDates(r.validFrom, date) <= 0) && (!r.validUntil || compareDates(date, r.validUntil) <= 0));
  const acute = day.filter((r) => r.consultationType === "ACUTE");
  const out: Segment[] = [];
  for (const g of day.filter((r) => r.consultationType !== "ACUTE")) {
    let cursor = parseTime(g.start);
    const end = parseTime(g.end);
    for (const a of acute.filter((x) => parseTime(x.start) >= cursor && parseTime(x.end) <= end).sort((x, y) => parseTime(x.start) - parseTime(y.start))) {
      if (parseTime(a.start) > cursor) out.push({ start: formatMinutes(cursor), end: a.start, type: g.consultationType });
      out.push({ start: a.start, end: a.end, type: "ACUTE" });
      cursor = parseTime(a.end);
    }
    if (cursor < end) out.push({ start: formatMinutes(cursor), end: g.end, type: g.consultationType });
  }
  return out.sort((a, b) => parseTime(a.start) - parseTime(b.start));
}

/** Merge touching segments into opening blocks ("08:00–12:00"). */
export function blocks(segs: Segment[]): { start: LocalTime; end: LocalTime }[] {
  const out: { start: LocalTime; end: LocalTime }[] = [];
  for (const s of [...segs].sort((a, b) => parseTime(a.start) - parseTime(b.start))) {
    const last = out.at(-1);
    if (last && last.end === s.start) last.end = s.end;
    else out.push({ start: s.start, end: s.end });
  }
  return out;
}

/** Cut a day's segments at a time (everything from that time on is removed). */
export function cutAt(segs: Segment[], time: LocalTime): Segment[] {
  const t = parseTime(time);
  return segs.filter((s) => parseTime(s.start) < t).map((s) => ({ ...s, end: parseTime(s.end) > t ? time : s.end }));
}

export const lastEnd = (segs: Segment[]): LocalTime | undefined =>
  segs.length ? segs.reduce((m, s) => (parseTime(s.end) > parseTime(m) ? s.end : m), segs[0].end) : undefined;

export interface EarlyCloseEffect {
  /** INSIDE: time lies in an opening block · GAP: already regularly closed then (e.g. lunch) ·
   *  TOO_LATE: after the last block · TOO_EARLY: nothing would remain. */
  kind: "INSIDE" | "GAP" | "TOO_LATE" | "TOO_EARLY";
  segments: Segment[];
  lastEnd?: LocalTime;
  /** Whole opening blocks that disappear (e.g. 14:00–16:00). */
  removed: { start: LocalTime; end: LocalTime }[];
}

/** What "close earlier at <time>" does to a day's segments (never snaps silently). */
export function earlyCloseEffect(segs: Segment[], time: LocalTime): EarlyCloseEffect {
  const bl = blocks(segs);
  const t = parseTime(time);
  if (!bl.length || t >= parseTime(bl[bl.length - 1].end)) return { kind: "TOO_LATE", segments: segs, lastEnd: lastEnd(segs), removed: [] };
  if (t <= parseTime(bl[0].start)) return { kind: "TOO_EARLY", segments: [], removed: bl };
  const cut = cutAt(segs, time);
  return {
    kind: bl.some((b) => parseTime(b.start) < t && t < parseTime(b.end)) ? "INSIDE" : "GAP",
    segments: cut,
    lastEnd: lastEnd(cut),
    removed: bl.filter((b) => parseTime(b.start) >= t),
  };
}

// ---------------------------------------------------------------- change sets

/** A proposed operational change. Upserts replace records with the same id (edit = new version). */
export interface ChangeSet {
  upsertExceptions?: OpeningHourException[];
  upsertClosures?: Closure[];
  /** Records explicitly replaced by this change (supersede), removed from the active set. */
  removeExceptionIds?: string[];
  removeClosureIds?: string[];
}

export function applyChangeSet(data: PulsData, change: ChangeSet): PulsData {
  const exIds = new Set([...(change.upsertExceptions ?? []).map((x) => x.id), ...(change.removeExceptionIds ?? [])]);
  const clIds = new Set([...(change.upsertClosures ?? []).map((x) => x.id), ...(change.removeClosureIds ?? [])]);
  return {
    ...data,
    exceptions: [...data.exceptions.filter((x) => !exIds.has(x.id)), ...(change.upsertExceptions ?? [])],
    closures: [...data.closures.filter((x) => !clIds.has(x.id)), ...(change.upsertClosures ?? [])],
  };
}

export interface IntroducedUnknown {
  date: LocalDate;
  reason: ReasonCode;
  /** Existing records involved (excluding the change's own records). */
  relatedIds: string[];
}

/**
 * The publish guard: a change must not make a day UNKNOWN that was not UNKNOWN before.
 * Both sides are real engine results (Europe/Berlin noon of each day).
 */
export function introducedUnknown(base: PulsData, draft: PulsData, from: LocalDate, to: LocalDate = from): IntroducedUnknown | null {
  const baseIds = new Set([...base.exceptions, ...base.closures].map((x) => x.id));
  for (let date = from; compareDates(date, to) <= 0; date = addDays(date, 1)) {
    const before = getPracticeStatus(zonedToInstant(date, "12:00"), base);
    const after = getPracticeStatus(zonedToInstant(date, "12:00"), draft);
    if (after.status === "UNKNOWN" && before.status !== "UNKNOWN") {
      return { date, reason: after.reason, relatedIds: after.sourceRecordIds.filter((id) => baseIds.has(id)) };
    }
  }
  return null;
}

export type ChangeClass = "EDIT" | "SUPERSEDE" | "NEW" | "CONFLICT";

/**
 * EDIT      — the change replaces an existing record with the same id (new version)
 * SUPERSEDE — the change explicitly removes other existing records (needs confirmation in the UI)
 * NEW       — a new, independent record
 * CONFLICT  — the result contains contradictions (blocked), whatever the intent
 */
export function classifyChange(base: PulsData, change: ChangeSet, from: LocalDate, to: LocalDate = from): { kind: ChangeClass; conflict: IntroducedUnknown | null } {
  const conflict = introducedUnknown(base, applyChangeSet(base, change), from, to);
  if (conflict) return { kind: "CONFLICT", conflict };
  const existing = new Set([...base.exceptions, ...base.closures].map((x) => x.id));
  const upserts = [...(change.upsertExceptions ?? []), ...(change.upsertClosures ?? [])];
  if ((change.removeExceptionIds?.length ?? 0) + (change.removeClosureIds?.length ?? 0) > 0) return { kind: "SUPERSEDE", conflict: null };
  if (upserts.some((x) => existing.has(x.id))) return { kind: "EDIT", conflict: null };
  return { kind: "NEW", conflict: null };
}

// ---------------------------------------------------------------- existing records (edit offers)

const covers = (x: { startDate: LocalDate; endDate: LocalDate }, date: LocalDate) => compareDates(x.startDate, date) <= 0 && compareDates(date, x.endDate) <= 0;

/** Today's single-day special hours — the record an "edit existing change" flow modifies. */
export const findDaySpecialHours = (exceptions: OpeningHourException[], date: LocalDate) =>
  exceptions.find((x) => x.kind === "SPECIAL_HOURS" && x.startDate === date && x.endDate === date);

/** A short-notice closure covering a date ("Heute geschlossen"). */
export const findShortNoticeClosure = (closures: Closure[], date: LocalDate) => closures.find((c) => c.kind === "SHORT_NOTICE" && covers(c, date));

/** A current or upcoming vacation overlapping [from, to]. Expired vacations are history. */
export const findOverlappingVacation = (closures: Closure[], from: LocalDate, to: LocalDate, today: LocalDate, excludeId?: string) =>
  closures.find((c) => c.kind === "VACATION" && c.id !== excludeId && compareDates(c.endDate, today) >= 0 && compareDates(c.startDate, to) <= 0 && compareDates(from, c.endDate) <= 0);

// ---------------------------------------------------------------- expiry (records are kept, never deleted)

type Dated = { startDate: LocalDate; endDate: LocalDate };

/** Current or upcoming (end date today or later). */
export const notExpired = <T extends Dated>(records: T[], today: LocalDate) => records.filter((r) => compareDates(r.endDate, today) >= 0);
/** Ended before today — history, not deleted, no longer evaluated. */
export const expired = <T extends Dated>(records: T[], today: LocalDate) => records.filter((r) => compareDates(r.endDate, today) < 0);

export const announcementExpired = (a: Announcement, today: LocalDate) => a.validUntil !== "OPEN_ENDED" && compareDates(a.validUntil, today) < 0;

// ---------------------------------------------------------------- replacement periods

export interface PeriodInput {
  from: string;
  to: string;
  practice: string;
}
export interface PeriodIssue {
  index: number;
  kind: "invalid" | "outside" | "beyond" | "overlap";
  /** For "beyond": which side exceeds the vacation, and the clamped correction. */
  side?: "end" | "start";
  fix?: { from: LocalDate; to: LocalDate };
}
export interface CoverageCheck {
  issues: PeriodIssue[];
  gaps: { from: LocalDate; to: LocalDate }[];
  /** Gaps on days that were not part of the previous vacation (extension). */
  newGaps: { from: LocalDate; to: LocalDate }[];
}

/** Uncovered days of [from, to] given periods (only valid periods count). */
export function uncoveredDays(from: LocalDate, to: LocalDate, periods: { from: string; to: string }[]): { from: LocalDate; to: LocalDate }[] {
  if (!isLocalDate(from) || !isLocalDate(to) || compareDates(to, from) < 0) return [];
  const out: { from: LocalDate; to: LocalDate }[] = [];
  let start: LocalDate | null = null;
  for (let d = from; compareDates(d, to) <= 0; d = addDays(d, 1)) {
    const covered = periods.some((p) => isLocalDate(p.from) && isLocalDate(p.to) && compareDates(p.from, d) <= 0 && compareDates(d, p.to) <= 0);
    if (!covered && start === null) start = d;
    if (covered && start !== null) {
      out.push({ from: start, to: addDays(d, -1) });
      start = null;
    }
  }
  if (start !== null) out.push({ from: start, to });
  return out;
}

/**
 * Revalidates replacement periods against a (possibly edited) vacation:
 * inside → keep · beyond → correction required · overlap → blocked ·
 * new days without replacement → reported (never stretched silently).
 */
export function validateReplacementPeriods(from: LocalDate, to: LocalDate, periods: PeriodInput[], previous?: { from: LocalDate; to: LocalDate }): CoverageCheck {
  const issues: PeriodIssue[] = [];
  periods.forEach((p, i) => {
    if (!p.from && !p.to) return;
    if (!isLocalDate(p.from) || !isLocalDate(p.to) || compareDates(p.to, p.from) < 0) {
      issues.push({ index: i, kind: "invalid" });
      return;
    }
    if (compareDates(p.from, to) > 0 || compareDates(p.to, from) < 0) {
      issues.push({ index: i, kind: "outside" });
      return;
    }
    if (compareDates(p.to, to) > 0 || compareDates(p.from, from) < 0) {
      issues.push({
        index: i,
        kind: "beyond",
        side: compareDates(p.to, to) > 0 ? "end" : "start",
        fix: { from: compareDates(p.from, from) < 0 ? from : p.from, to: compareDates(p.to, to) > 0 ? to : p.to },
      });
      return;
    }
    if (periods.some((q, j) => j !== i && isLocalDate(q.from) && isLocalDate(q.to) && compareDates(p.from, q.to) <= 0 && compareDates(q.from, p.to) <= 0)) {
      issues.push({ index: i, kind: "overlap" });
    }
  });
  const valid = periods.filter((_, i) => !issues.some((x) => x.index === i && x.kind !== "overlap"));
  const gaps = uncoveredDays(from, to, valid);
  const newGaps = previous ? gaps.flatMap((g) => uncoveredDays(g.from, g.to, [{ from: previous.from, to: previous.to }])) : [];
  return { issues, gaps, newGaps };
}
