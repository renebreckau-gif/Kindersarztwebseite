// PRAXIS COCKPIT — Phase 09.1 lab prototype model.
// MOCK DATA ONLY: every hour, name, practice and date below is invented for usability
// testing ("PROTOTYP · keine echten Daten"). Nothing here is practice data, nothing is
// persisted, and nothing is read from src/content/. Status and conflicts come from the
// real, pure PRAXIS PULS engine (src/domain) — there is no second status implementation.

import { getPracticeStatus, type PublicReplacement, type PulsData, type PracticeStatusResult, type ReasonCode } from "../../domain/practice-status.ts";
import type {
  Announcement,
  Closure,
  ConsultationType,
  ConsultationTypeCode,
  OpeningHourException,
  OpeningHoursRule,
  ReplacementPractice,
} from "../../domain/content-types.ts";
import { evaluateFreshness, type FactVerification } from "../../domain/verification.ts";
import { decideAnnouncement } from "../../domain/publication.ts";
import { addDays, compareDates, formatMinutes, isLocalDate, parseTime, weekdayOf, zonedToInstant, type IsoWeekday, type LocalDate, type LocalTime } from "../../domain/time.ts";

// ------------------------------------------------------------------ clock & people

/** Fixed test clock so every usability session starts from the same situation. */
export const MOCK_TODAY: LocalDate = "2026-10-13";
export const MOCK_NOW: LocalTime = "09:20";

export type Role = "STAFF" | "DOCTOR" | "ADMIN";

export const ROLES: Record<Role, { label: string; person: string; greeting: string }> = {
  STAFF: { label: "Praxisteam", person: "Anna Beispiel", greeting: "Anna" },
  DOCTOR: { label: "Ärztin / Arzt", person: "Dr. Lena Beispiel", greeting: "Dr. Beispiel" },
  ADMIN: { label: "Verwaltung", person: "Max Beispiel", greeting: "Max" },
};

// ------------------------------------------------------------------ mock practice

const MOCK_VERIFIED: FactVerification = {
  status: "VERIFIED_CURRENT",
  lastVerified: "2026-10-01",
  reviewDue: "2027-04-01",
  verifiedBy: "Prototyp-Testdaten",
  sourceIds: ["MOCK"],
};

const rule = (id: string, weekday: IsoWeekday, start: LocalTime, end: LocalTime, consultationType: ConsultationTypeCode = "GENERAL"): OpeningHoursRule => ({
  id,
  weekday,
  start,
  end,
  consultationType,
  verification: MOCK_VERIFIED,
});

/** Mock week: Mon–Fri 08–12 and 14–16, acute consultation 10–11 inside the morning. */
export const MOCK_RULES: OpeningHoursRule[] = ([1, 2, 3, 4, 5] as IsoWeekday[]).flatMap((d) => [
  rule(`m${d}-vm`, d, "08:00", "12:00"),
  rule(`m${d}-nm`, d, "14:00", "16:00"),
  rule(`m${d}-akut`, d, "10:00", "11:00", "ACUTE"),
]);

export const MOCK_TYPES: ConsultationType[] = [
  { code: "GENERAL", label: "Reguläre Sprechzeit", verification: MOCK_VERIFIED },
  { code: "ACUTE", label: "Akutsprechstunde", verification: MOCK_VERIFIED },
];

/** Public holidays (calendar facts) inside the prototype horizon. */
export const MOCK_HOLIDAYS: { date: LocalDate; name: string }[] = [
  { date: "2026-10-31", name: "Reformationstag" },
  { date: "2026-12-25", name: "1. Weihnachtstag" },
  { date: "2026-12-26", name: "2. Weihnachtstag" },
];

const mockCheck = (lastVerified: LocalDate, reviewDue: LocalDate): FactVerification => ({ status: "VERIFIED_CURRENT", lastVerified, reviewDue, verifiedBy: "Prototyp-Testdaten", sourceIds: ["MOCK"] });

/** Invented replacement practices — no real external practice, address or phone number. */
export const MOCK_DIRECTORY: ReplacementPractice[] = [
  { id: "vb-a", practiceName: "Praxis Beispiel A", contactPersons: [], street: "Beispielstraße 12", postalCode: "00000", city: "Musterstadt", phone: "01234 567890", publicNote: "Bitte melden Sie sich vorher telefonisch.", verification: mockCheck("2026-09-15", "2027-03-15") },
  { id: "vb-b", practiceName: "Praxis Beispiel B", contactPersons: [], street: "Am Beispielpark 3", postalCode: "00000", city: "Beispielhausen", phone: "01234 567891", verification: mockCheck("2026-08-20", "2027-02-20") },
  // Review expired → not selectable: "Vertretung muss zuerst erneut bestätigt werden".
  { id: "vb-c", practiceName: "Praxis Beispiel C", contactPersons: [], street: "Musterweg 7", postalCode: "00000", city: "Musterstadt", phone: "01234 567892", verification: mockCheck("2026-03-30", "2026-09-30") },
];

/** Public subtitle per mock practice (display only). */
export const DIRECTORY_SUBTITLE: Record<string, string> = {
  "vb-a": "Kinderarztpraxis Musterstadt",
  "vb-b": "Kinderzentrum Beispielhausen",
  "vb-c": "Kinderarztpraxis am Musterweg",
};

// ------------------------------------------------------------------ mock login (no real authentication)

/** Obvious test accounts for the lab prototype only. Not real users, not real passwords. */
export const MOCK_ACCOUNTS: { email: string; password: string; role: Role }[] = [
  { email: "team@beispiel.test", password: "test1234", role: "STAFF" },
  { email: "aerztin@beispiel.test", password: "test1234", role: "DOCTOR" },
  { email: "verwaltung@beispiel.test", password: "test1234", role: "ADMIN" },
];

export function mockLogin(email: string, password: string): Role | null {
  const a = MOCK_ACCOUNTS.find((x) => x.email === email.trim().toLowerCase());
  return a && a.password === password ? a.role : null;
}

/** Prototype session (sessionStorage): only the mock role, never a password or token. */
export const SESSION_KEY = "praxis-cockpit-prototyp-rolle";
type SessionStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export function readSession(store: SessionStore | undefined): Role | null {
  try {
    const v = store?.getItem(SESSION_KEY);
    return v === "STAFF" || v === "DOCTOR" || v === "ADMIN" ? v : null;
  } catch {
    return null;
  }
}
export function writeSession(store: SessionStore | undefined, role: Role | null): void {
  try {
    if (role) store?.setItem(SESSION_KEY, role);
    else store?.removeItem(SESSION_KEY);
  } catch {
    // storage blocked: the prototype then simply forgets the login on reload
  }
}

// ------------------------------------------------------------------ state

export interface CockpitData {
  exceptions: OpeningHourException[];
  closures: Closure[];
  announcements: Announcement[];
  directory: ReplacementPractice[];
}

export interface AuditEntry {
  id: string;
  date: LocalDate;
  time: LocalTime;
  actor: string;
  role: Role;
  title: string;
  detail?: string;
  before?: string;
  after?: string;
  /** Sentence for the undo preview, e.g. "Die Praxis wäre heute wieder bis 16:00 geöffnet." */
  undoSentence?: string;
  /** Data before this change (session changes only) — enables "Änderung zurücknehmen". */
  snapshot?: CockpitData;
  revertedBy?: string;
  revertOf?: string;
  entityIds: string[];
}

export interface CockpitState {
  /** Lab-only test clock (Europe/Berlin wall time). */
  clock: { date: LocalDate; time: LocalTime };
  role: Role;
  data: CockpitData;
  audit: AuditEntry[];
  seq: number;
}

const segmentsToIntervals = (segs: Segment[]) => segs.map((s) => ({ start: s.start, end: s.end, consultationType: s.type }));

export function initialState(): CockpitState {
  const wednesday = "2026-10-14";
  return {
    clock: { date: MOCK_TODAY, time: MOCK_NOW },
    role: "STAFF",
    seq: 0,
    data: {
      exceptions: [
        {
          id: "mock-mi-14",
          kind: "SPECIAL_HOURS",
          startDate: wednesday,
          endDate: wednesday,
          intervals: segmentsToIntervals(rulesSegments(wednesday).filter((s) => parseTime(s.end) <= parseTime("12:00"))),
          publicMessage: "Am Nachmittag ist das Team auf Fortbildung.",
          priority: 1,
          verification: entryVerification("Dr. Lena Beispiel", "DOCTOR", wednesday, "2026-10-12"),
        },
      ],
      closures: [],
      announcements: [
        {
          id: "mock-hinweis-fortbildung",
          category: "INFO",
          title: "Fortbildung am Mittwoch",
          shortText: "Am Mittwoch, 14. Oktober, ist die Praxis nur vormittags geöffnet.",
          validFrom: "2026-10-12",
          validUntil: wednesday,
          priority: 1,
          homepageHighlight: false,
          published: true,
          verification: entryVerification("Dr. Lena Beispiel", "DOCTOR", wednesday, "2026-10-12"),
        },
      ],
      directory: MOCK_DIRECTORY,
    },
    audit: [
      {
        id: "seed-2",
        date: "2026-10-12",
        time: "15:21",
        actor: "Dr. Lena Beispiel",
        role: "DOCTOR",
        title: "Hinweis veröffentlicht",
        detail: "„Fortbildung am Mittwoch“",
        after: "sichtbar bis 14. Oktober",
        entityIds: ["mock-hinweis-fortbildung"],
      },
      {
        id: "seed-1",
        date: "2026-10-12",
        time: "15:18",
        actor: "Dr. Lena Beispiel",
        role: "DOCTOR",
        title: "Sonderzeit eingetragen",
        detail: "Mittwoch, 14. Oktober",
        before: "08:00–12:00 und 14:00–16:00",
        after: "nur 08:00–12:00",
        entityIds: ["mock-mi-14"],
      },
    ],
  };
}

/**
 * Provenance for an entry published from the cockpit. Operational records only: the named,
 * logged-in account is the practice confirmation (praxis-cockpit.md §7.0). In the prototype
 * the name is a mock identity.
 */
export function entryVerification(person: string, role: Role, reviewDue: LocalDate, today: LocalDate = MOCK_TODAY): FactVerification {
  return {
    status: "VERIFIED_CURRENT",
    lastVerified: today,
    reviewDue,
    verifiedBy: `${person}, ${ROLES[role].label} (Praxis Cockpit · Prototyp)`,
    sourceIds: ["PRACTICE_COCKPIT"],
  };
}

// ------------------------------------------------------------------ engine bridge

export function pulsDataOf(d: CockpitData): PulsData {
  return {
    schedule: { rules: MOCK_RULES, confirmedClosedWeekdays: [6, 7], verification: MOCK_VERIFIED },
    consultationTypes: MOCK_TYPES,
    exceptions: d.exceptions,
    closures: d.closures,
    replacementPractices: d.directory,
    publicHolidays: MOCK_HOLIDAYS.map((h) => h.date),
    holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" },
  };
}

export function statusAt(d: CockpitData, date: LocalDate, time: LocalTime): PracticeStatusResult {
  return getPracticeStatus(zonedToInstant(date, time), pulsDataOf(d));
}

export const nowStatus = (d: CockpitData, today: LocalDate = MOCK_TODAY, now: LocalTime = MOCK_NOW) => statusAt(d, today, now);

// ------------------------------------------------------------------ day plans (display only)

export interface Segment {
  start: LocalTime;
  end: LocalTime;
  type: ConsultationTypeCode;
}

/** Weekly rules for a date as non-overlapping segments (acute cut out of the general block). */
export function rulesSegments(date: LocalDate): Segment[] {
  const wd = weekdayOf(date);
  const rules = MOCK_RULES.filter((r) => r.weekday === wd);
  const acute = rules.filter((r) => r.consultationType === "ACUTE");
  const out: Segment[] = [];
  for (const g of rules.filter((r) => r.consultationType !== "ACUTE")) {
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

const covers = (x: { startDate: LocalDate; endDate: LocalDate }, date: LocalDate) => compareDates(x.startDate, date) <= 0 && compareDates(date, x.endDate) <= 0;

/** What is planned for a date (data view for staff, not a status decision). */
export function plannedSegments(d: CockpitData, date: LocalDate): Segment[] {
  if (d.closures.some((c) => covers(c, date))) return [];
  const ex = d.exceptions.filter((x) => covers(x, date)).sort((a, b) => b.priority - a.priority)[0];
  if (ex) return ex.kind === "CLOSED" ? [] : ex.intervals.map((i) => ({ start: i.start, end: i.end, type: i.consultationType }));
  if (MOCK_HOLIDAYS.some((h) => h.date === date)) return [];
  return rulesSegments(date);
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

export function cutAt(segs: Segment[], time: LocalTime): Segment[] {
  const t = parseTime(time);
  return segs.filter((s) => parseTime(s.start) < t).map((s) => ({ ...s, end: parseTime(s.end) > t ? time : s.end }));
}

export interface EarlyCloseEffect {
  /** INSIDE: time lies in an opening block · GAP: practice is already regularly closed then
   *  (e.g. lunch break) · TOO_LATE: after the last block · TOO_EARLY: nothing would remain. */
  kind: "INSIDE" | "GAP" | "TOO_LATE" | "TOO_EARLY";
  segments: Segment[];
  lastEnd?: LocalTime;
  /** Whole opening blocks that disappear (e.g. 14:00–16:00). */
  removed: { start: LocalTime; end: LocalTime }[];
}

/**
 * Change set for "Heute früher schließen" (cockpit responsibility: what the request does to
 * today's intervals). Whether the practice is open is decided by the engine, not here.
 */
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

/** Exact publish wording: never "um 13:00 schließen" when 13:00 is already a closed gap. */
export function earlyCloseLabel(e: EarlyCloseEffect, time: LocalTime): string {
  if (e.kind !== "GAP") return `Heute um ${time} Uhr schließen`;
  const afternoon = e.removed.every((b) => parseTime(b.start) >= parseTime("12:00"));
  return afternoon ? "Nachmittagssprechzeit heute entfallen lassen" : `Sprechzeit ${e.removed.map((b) => `${b.start}–${b.end}`).join(", ")} Uhr heute entfallen lassen`;
}

export const lastEnd = (segs: Segment[]) => (segs.length ? segs.reduce((m, s) => (parseTime(s.end) > parseTime(m) ? s.end : m), segs[0].end) : undefined);

// ------------------------------------------------------------------ change check ("no new UNKNOWN")

export interface Problem {
  title: string;
  text: string;
  date: LocalDate;
  /** Existing entries involved (for "Bestehende Änderung ansehen"). */
  relatedIds: string[];
}

function problemFor(reason: ReasonCode, date: LocalDate, relatedIds: string[], today: LocalDate): Problem {
  const day = date === today ? "heute" : `den ${dayMonth(date)}`;
  switch (reason) {
    case "EXCEPTION_CONFLICT":
      return {
        title: "Widersprüchliche Angaben",
        text: `Für ${day} gibt es zwei unterschiedliche Änderungen, die gleichzeitig gelten würden: zwei verschiedene Sonderzeiten. Bitte prüfen Sie die bestehenden Änderungen.`,
        date,
        relatedIds,
      };
    case "CLOSURE_EXCEPTION_CONFLICT":
      return {
        title: "Widersprüchliche Angaben",
        text: `Für ${day} gibt es zwei unterschiedliche Änderungen, die gleichzeitig gelten würden: eine Schließung und eine geänderte Sprechzeit. Bitte prüfen Sie die bestehenden Änderungen.`,
        date,
        relatedIds,
      };
    default:
      return { title: "Änderung nicht möglich", text: `Mit dieser Änderung wäre für ${day} nicht mehr eindeutig, ob die Praxis geöffnet ist. Bitte prüfen Sie die Angaben.`, date, relatedIds };
  }
}

/**
 * Blocks a change that makes a day UNKNOWN that was not UNKNOWN before (praxis-cockpit.md §8).
 * Uses the engine for both sides; no own conflict rules.
 */
export function checkChange(base: CockpitData, draft: CockpitData, from: LocalDate, to: LocalDate = from, today: LocalDate = MOCK_TODAY): Problem | null {
  for (let date = from; compareDates(date, to) <= 0; date = addDays(date, 1)) {
    const before = statusAt(base, date, "12:00");
    const after = statusAt(draft, date, "12:00");
    if (after.status === "UNKNOWN" && before.status !== "UNKNOWN") {
      const own = new Set([...draft.exceptions, ...draft.closures].map((x) => x.id).filter((id) => ![...base.exceptions, ...base.closures].some((b) => b.id === id)));
      return problemFor(after.reason, date, after.sourceRecordIds.filter((id) => !own.has(id)), today);
    }
  }
  return null;
}

// ------------------------------------------------------------------ directory

export function directoryState(p: ReplacementPractice, until: LocalDate = MOCK_TODAY, today: LocalDate = MOCK_TODAY): { usable: boolean; note: string } {
  const now = evaluateFreshness(p.verification, today, "replacementPractice");
  const later = evaluateFreshness(p.verification, until, "replacementPractice");
  if (now !== "CURRENT" && now !== "REVIEW_DUE") return { usable: false, note: "Diese Vertretung wurde länger nicht geprüft und kann deshalb noch nicht veröffentlicht werden." };
  if (later !== "CURRENT" && later !== "REVIEW_DUE") return { usable: false, note: `Die Prüfung läuft am ${dayMonth(p.verification.reviewDue!)} ab – vor dem Ende dieses Zeitraums.` };
  return { usable: true, note: `Zuletzt bestätigt am ${dayMonth(p.verification.lastVerified!)}` };
}

// ------------------------------------------------------------------ replacements as parents see them

export interface ReplacementPeriod {
  from: LocalDate;
  until: LocalDate;
  rep: PublicReplacement;
  subtitle?: string;
  note?: string;
}

/**
 * Who is responsible when, from `fromDate` to the end of a closure. Each period comes from the
 * real engine evaluated on a day of that period, so only verified, fresh replacements appear.
 * Subtitle and public note are display-only fields of the mock directory.
 */
export function replacementSchedule(d: CockpitData, closureId: string, fromDate: LocalDate): ReplacementPeriod[] {
  const c = d.closures.find((x) => x.id === closureId);
  if (!c) return [];
  const out: ReplacementPeriod[] = [];
  for (const a of c.replacements) {
    if (compareDates(a.until, fromDate) < 0) continue;
    const day = compareDates(a.from, fromDate) < 0 ? fromDate : a.from;
    const rep = statusAt(d, day, "09:00").replacementPractices.find((p) => p.id === a.replacementPracticeId && p.from === a.from);
    if (rep) out.push({ from: a.from, until: a.until, rep, subtitle: DIRECTORY_SUBTITLE[rep.id], note: d.directory.find((p) => p.id === rep.id)?.publicNote });
  }
  return out.sort((x, y) => compareDates(x.from, y.from));
}

/** Internal (staff) summary of a closure's replacement assignments. */
export function replacementSummary(d: CockpitData, c: Closure): string {
  if (!c.replacements.length) return "keine – Website zeigt die Notfall-Hinweise";
  const name = (id: string) => d.directory.find((p) => p.id === id)?.practiceName ?? "unbekannt";
  if (c.replacements.length === 1 && c.replacements[0].from === c.startDate && c.replacements[0].until === c.endDate) return name(c.replacements[0].replacementPracticeId);
  return c.replacements.map((r) => `${name(r.replacementPracticeId)} (${dateRange(r.from, r.until)})`).join(", ");
}

// ------------------------------------------------------------------ edit vs. supersede vs. conflict (Phase 09.1.4)
//
// EXISTING RECORD                       → EDIT (same id, new version; never a second active record)
// NEW INTENT THAT REPLACES AN OLD ONE   → SUPERSEDE with preview + explicit confirmation
// INDEPENDENT CONTRADICTORY RECORDS     → CONFLICT, blocked (checkChange, engine-based)
// Only current records are offered for editing; expired ones belong to the history.

/** Today's published special hours (single day) — the record "Bestehende Änderung anpassen" edits. */
export function existingTodayChange(d: CockpitData, today: LocalDate): OpeningHourException | undefined {
  return d.exceptions.find((x) => x.kind === "SPECIAL_HOURS" && x.startDate === today && x.endDate === today);
}

/** Today's published short-notice closure ("Heute geschlossen"). */
export function existingTodayClosure(d: CockpitData, today: LocalDate): Closure | undefined {
  return d.closures.find((c) => c.kind === "SHORT_NOTICE" && covers(c, today));
}

/** A current or upcoming vacation overlapping [from, to] — likely the one the user wants to edit. */
export function overlappingVacation(d: CockpitData, from: LocalDate, to: LocalDate, today: LocalDate, excludeId?: string): Closure | undefined {
  return d.closures.find((c) => c.kind === "VACATION" && c.id !== excludeId && compareDates(c.endDate, today) >= 0 && compareDates(c.startDate, to) <= 0 && compareDates(from, c.endDate) <= 0);
}

/** Published announcements that are current or upcoming (editable); expired ones are history. */
export function editableAnnouncements(d: CockpitData, today: LocalDate): Announcement[] {
  return d.announcements.filter((a) => a.published && a.verification.status === "VERIFIED_CURRENT" && (a.validUntil === "OPEN_ENDED" || compareDates(a.validUntil, today) >= 0));
}

/** Edit = replace the record with the same id (new version). */
export const withException = (d: CockpitData, x: OpeningHourException): CockpitData => ({ ...d, exceptions: [...d.exceptions.filter((e) => e.id !== x.id), x] });
export const withClosure = (d: CockpitData, c: Closure): CockpitData => ({ ...d, closures: [...d.closures.filter((e) => e.id !== c.id), c] });
export const withAnnouncement = (d: CockpitData, a: Announcement): CockpitData => ({ ...d, announcements: [...d.announcements.filter((e) => e.id !== a.id), a] });

/**
 * Change set for "Heute früher schließen". With an existing change for today, the new time is
 * applied to the REGULAR plan and replaces that record (edit), so 15:00 → 13:00 never creates a
 * second, contradicting special-hours record.
 */
export function earlyCloseDraft(
  base: CockpitData,
  today: LocalDate,
  time: LocalTime,
  opts: { existing?: OpeningHourException; message?: string; person: string; role: Role },
): { effect: EarlyCloseEffect; draft: CockpitData | null } {
  const source = opts.existing ? rulesSegments(today) : plannedSegments(base, today);
  const effect = earlyCloseEffect(source, time);
  if (effect.kind === "TOO_LATE" || effect.kind === "TOO_EARLY") return { effect, draft: null };
  const record: OpeningHourException = {
    id: opts.existing?.id ?? `heute-frueher-${today}-${time}`,
    kind: "SPECIAL_HOURS",
    startDate: today,
    endDate: today,
    intervals: effect.segments.map((x) => ({ start: x.start, end: x.end, consultationType: x.type })),
    publicMessage: opts.message !== undefined ? opts.message || undefined : opts.existing?.publicMessage,
    priority: 1,
    verification: entryVerification(opts.person, opts.role, today, today),
  };
  return { effect, draft: withException(base, record) };
}

export interface PeriodInput {
  from: string;
  to: string;
  practice: string;
}
export interface PeriodIssue {
  index: number;
  kind: "invalid" | "outside" | "beyond" | "overlap";
  text: string;
  /** Suggested correction for "beyond" (clamp to the vacation). */
  fix?: { from: LocalDate; to: LocalDate };
}
export interface CoverageCheck {
  issues: PeriodIssue[];
  /** Vacation days without a replacement. */
  gaps: { from: LocalDate; to: LocalDate }[];
  /** Gaps on days that were NOT part of the previous vacation (extension). */
  newGaps: { from: LocalDate; to: LocalDate }[];
}

/** Uncovered days of [from, to] given replacement periods (only valid periods count). */
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
 * inside → keep · beyond the new range → correction required · overlap → blocked ·
 * new vacation days without replacement → warning (never stretched silently).
 */
export function checkReplacementPeriods(from: LocalDate, to: LocalDate, periods: PeriodInput[], previous?: { from: LocalDate; to: LocalDate }): CoverageCheck {
  const issues: PeriodIssue[] = [];
  const range = dateRange(from, to);
  periods.forEach((p, i) => {
    if (!p.from && !p.to) return;
    if (!isLocalDate(p.from) || !isLocalDate(p.to) || compareDates(p.to, p.from) < 0) {
      issues.push({ index: i, kind: "invalid", text: "Bitte einen gültigen Zeitraum wählen." });
      return;
    }
    if (compareDates(p.from, to) > 0 || compareDates(p.to, from) < 0) {
      issues.push({ index: i, kind: "outside", text: `Dieser Zeitraum liegt außerhalb des Urlaubs (${range}). Bitte entfernen oder anpassen.` });
      return;
    }
    if (compareDates(p.to, to) > 0 || compareDates(p.from, from) < 0) {
      const fix = { from: compareDates(p.from, from) < 0 ? from : p.from, to: compareDates(p.to, to) > 0 ? to : p.to };
      issues.push({
        index: i,
        kind: "beyond",
        text: compareDates(p.to, to) > 0 ? `Diese Vertretung reicht über das Urlaubsende (${dayMonth(to)}) hinaus. Bitte das Ende anpassen.` : `Diese Vertretung beginnt vor dem Urlaub (${dayMonth(from)}). Bitte den Beginn anpassen.`,
        fix,
      });
      return;
    }
    if (periods.some((q, j) => j !== i && isLocalDate(q.from) && isLocalDate(q.to) && compareDates(p.from, q.to) <= 0 && compareDates(q.from, p.to) <= 0)) {
      issues.push({ index: i, kind: "overlap", text: "Dieser Zeitraum überschneidet sich mit einer anderen Vertretung." });
    }
  });
  const valid = periods.filter((_, i) => !issues.some((x) => x.index === i && x.kind !== "overlap"));
  const gaps = uncoveredDays(from, to, valid);
  const newGaps = previous
    ? gaps.flatMap((g) => uncoveredDays(g.from, g.to, [{ from: previous.from, to: previous.to }]))
    : [];
  return { issues, gaps, newGaps };
}

// ------------------------------------------------------------------ live website preview + automatic end

export interface PreviewPair {
  /** "Aktuell auf der Website": published data only. */
  current: PracticeStatusResult;
  /** "Mit dieser Änderung": published data + current change set (undefined = no valid change yet). */
  changed?: PracticeStatusResult;
}

/** Both sides come from the same real engine call — the preview has no own status logic. */
export function previewPair(base: CockpitData, draft: CockpitData | null | undefined, date: LocalDate, time: LocalTime): PreviewPair {
  return { current: statusAt(base, date, time), changed: draft ? statusAt(draft, date, time) : undefined };
}

export interface AfterEnd {
  /** First Berlin day after the temporary state. */
  date: LocalDate;
  /** true when the engine can tell what applies then (incl. next opening). */
  clear: boolean;
  /** Plain German, e.g. "Nächste Sprechzeit am Montag, 26. Oktober um 08:00 Uhr." */
  text: string;
}

/**
 * What applies after an inclusive end date: the expired record simply stops counting and the
 * remaining rules are evaluated. Never assumes "open" — doubt is reported in plain German.
 */
export function afterEnd(d: CockpitData, endDate: LocalDate): AfterEnd {
  const date = addDays(endDate, 1);
  const r = statusAt(d, date, "00:01");
  if (r.status === "UNKNOWN") {
    const holiday = MOCK_HOLIDAYS.find((h) => h.date === date);
    const why =
      r.reason === "HOLIDAY_WITHOUT_RULE" && holiday
        ? `Am ${longDate(date)} ist ein Feiertag (${holiday.name}) noch nicht geklärt.`
        : r.reason === "EXCEPTION_CONFLICT" || r.reason === "CLOSURE_EXCEPTION_CONFLICT"
          ? `Am ${longDate(date)} widersprechen sich zwei Angaben.`
          : `Für ${longDate(date)} fehlt eine bestätigte Angabe.`;
    return { date, clear: false, text: `Der Zustand nach diesem Zeitraum ist noch nicht eindeutig. ${why}` };
  }
  if (r.nextOpening === null) return { date, clear: false, text: "Der Zustand nach diesem Zeitraum ist noch nicht eindeutig. Die nächste Sprechzeit lässt sich nicht sicher bestimmen." };
  // Absolute date: the engine label ("heute"/"morgen") is relative to the day after the end.
  const next = r.nextOpening ? `Nächste Sprechzeit am ${longDate(r.nextOpening.date)} um ${r.nextOpening.time} Uhr.` : "";
  return { date, clear: true, text: next };
}

export interface PastRecord {
  id: string;
  label: string;
  title: string;
  endedOn: LocalDate;
}

/** Expired temporary records: kept for history and correction review, no longer active. */
export function pastRecords(d: CockpitData, today: LocalDate = MOCK_TODAY): PastRecord[] {
  const out: PastRecord[] = [];
  for (const c of d.closures) if (compareDates(c.endDate, today) < 0) out.push({ id: c.id, label: dateRange(c.startDate, c.endDate), title: c.kind === "VACATION" ? "Urlaub" : "Schließung", endedOn: c.endDate });
  for (const x of d.exceptions) if (compareDates(x.endDate, today) < 0) out.push({ id: x.id, label: dayMonth(x.startDate, true), title: x.kind === "CLOSED" ? "Geschlossen" : "Geänderte Sprechzeit", endedOn: x.endDate });
  for (const a of d.announcements) if (a.validUntil !== "OPEN_ENDED" && compareDates(a.validUntil, today) < 0) out.push({ id: a.id, label: `bis ${dayMonth(a.validUntil)}`, title: `Hinweis „${a.title}“`, endedOn: a.validUntil });
  return out.sort((x, y) => compareDates(y.endedOn, x.endedOn));
}

// ------------------------------------------------------------------ home lists

export interface Upcoming {
  date: LocalDate;
  label: string;
  note: string;
  attention: boolean;
  /** Closures: published entry with detail and edit links. */
  closure?: { id: string; replacement: string };
  /** Temporary entries end by themselves on this (inclusive) Berlin date. */
  endsOn?: LocalDate;
  /** Edit link for an existing record (special hours today, announcement). */
  editHref?: string;
  editLabel?: string;
}

const holidayOf = (date: LocalDate) => MOCK_HOLIDAYS.find((h) => h.date === date);

/**
 * Active and future items only. Expired temporary records are NOT deleted: they stay in the
 * data (and the audit log) and simply stop counting — see pastRecords().
 */
export function upcoming(d: CockpitData, today: LocalDate = MOCK_TODAY, horizonDays = 90): Upcoming[] {
  const end = addDays(today, horizonDays);
  const items: Upcoming[] = [];
  for (const c of d.closures) {
    if (compareDates(c.endDate, today) < 0) continue;
    const kind = c.kind === "VACATION" ? "Urlaub" : c.kind === "TRAINING" ? "Fortbildung" : c.kind === "SHORT_NOTICE" ? "Praxis geschlossen" : "Schließzeit";
    items.push({ date: c.startDate, label: dateRange(c.startDate, c.endDate), note: kind, attention: false, closure: { id: c.id, replacement: replacementSummary(d, c) }, endsOn: c.endDate });
  }
  for (const x of d.exceptions) {
    if (compareDates(x.endDate, today) < 0) continue;
    const segs = x.intervals.map((i) => ({ start: i.start, end: i.end, type: i.consultationType }));
    const note = x.kind === "CLOSED" ? (holidayOf(x.startDate) ? `${holidayOf(x.startDate)!.name} · geschlossen` : "Geschlossen") : `Geänderte Sprechzeit · ${blocks(segs).map((b) => `${b.start}–${b.end}`).join(", ")}`;
    const todayEdit = x.kind === "SPECIAL_HOURS" && x.startDate === today && x.endDate === today;
    items.push({
      date: x.startDate,
      label: x.startDate === x.endDate ? dayMonth(x.startDate, true) : dateRange(x.startDate, x.endDate),
      note,
      attention: false,
      endsOn: x.kind === "SPECIAL_HOURS" ? x.endDate : undefined,
      editHref: todayEdit ? "/lab/praxis-cockpit/frueher-schliessen?anpassen=1" : undefined,
      editLabel: todayEdit ? "Anpassen" : undefined,
    });
  }
  for (const a of editableAnnouncements(d, today)) {
    items.push({
      date: compareDates(a.validFrom, today) > 0 ? a.validFrom : today,
      label: a.validUntil === "OPEN_ENDED" ? `ab ${dayMonth(a.validFrom)}` : compareDates(a.validFrom, today) > 0 ? dateRange(a.validFrom, a.validUntil) : `bis ${dayMonth(a.validUntil)}`,
      note: `Hinweis „${a.title}“`,
      attention: false,
      endsOn: a.validUntil === "OPEN_ENDED" ? undefined : a.validUntil,
      editHref: `/lab/praxis-cockpit/hinweis?bearbeiten=${encodeURIComponent(a.id)}`,
      editLabel: "Hinweis bearbeiten",
    });
  }
  for (const h of MOCK_HOLIDAYS) {
    if (compareDates(h.date, today) < 0 || compareDates(h.date, end) > 0) continue;
    if (d.exceptions.some((x) => covers(x, h.date))) continue;
    const r = statusAt(d, h.date, "10:00");
    if (r.status === "UNKNOWN") items.push({ date: h.date, label: dayMonth(h.date, true), note: `${h.name} · Prüfung nötig`, attention: true });
    else if (weekdayOf(h.date) >= 6) items.push({ date: h.date, label: dayMonth(h.date, true), note: `${h.name} · bereits durch Wochenendregel geklärt`, attention: false });
    else items.push({ date: h.date, label: dayMonth(h.date, true), note: `${h.name} · geklärt`, attention: false });
  }
  return items.sort((a, b) => compareDates(a.date, b.date));
}

export interface CheckItem {
  id: string;
  title: string;
  text: string;
  href: string;
  action: string;
}

export function checks(d: CockpitData, role: Role, today: LocalDate = MOCK_TODAY): CheckItem[] {
  const out: CheckItem[] = [];
  for (const h of MOCK_HOLIDAYS) {
    if (compareDates(h.date, today) < 0) continue;
    const r = statusAt(d, h.date, "10:00");
    if (r.status === "UNKNOWN" && r.reason === "HOLIDAY_WITHOUT_RULE") {
      out.push({
        id: `feiertag-${h.date}`,
        title: `${dayMonth(h.date, true)} · ${h.name}`,
        text: "Für diesen Feiertag ist noch nicht hinterlegt, ob die Praxis geöffnet oder geschlossen ist.",
        href: `/lab/praxis-cockpit/feiertag?datum=${h.date}`,
        action: "Prüfen",
      });
    }
  }
  if (role !== "STAFF") {
    for (const p of d.directory) {
      if (!directoryState(p, today, today).usable) {
        out.push({
          id: `vertretung-${p.id}`,
          title: `${p.practiceName} · Vertretung`,
          text: "Diese Vertretung wurde länger nicht geprüft. Bitte telefonisch bestätigen, bevor sie wieder ausgewählt werden kann.",
          href: `/lab/praxis-cockpit/vertretung-pruefen?id=${p.id}`,
          action: "Prüfen",
        });
      }
    }
  }
  return out;
}

/** Announcements the website would show on a date (engine publication rules). */
export const visibleAnnouncements = (d: CockpitData, date: LocalDate) => d.announcements.filter((a) => decideAnnouncement(a, date).visible);

// ------------------------------------------------------------------ staff wording

/** Plain explanation for staff when parents would see "Aktuelle Sprechzeiten". No codes. */
export function unknownExplanation(r: PracticeStatusResult): string | null {
  if (r.status !== "UNKNOWN") return null;
  switch (r.reason) {
    case "HOLIDAY_WITHOUT_RULE":
      return "An diesem Feiertag ist noch nicht hinterlegt, ob die Praxis geöffnet ist. Eltern sehen deshalb keinen Status, sondern nur den Hinweis auf die aktuellen Sprechzeiten und die Telefonnummer.";
    case "EXCEPTION_CONFLICT":
    case "CLOSURE_EXCEPTION_CONFLICT":
      return "Für diesen Tag widersprechen sich zwei Angaben. Die Website zeigt deshalb keinen Status, bis eine Angabe korrigiert ist.";
    default:
      return "Für diesen Zeitpunkt fehlt eine bestätigte Angabe. Die Website zeigt deshalb keinen Status – nie fälschlich „geöffnet“.";
  }
}

// ------------------------------------------------------------------ formatting

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

export function dayMonth(date: LocalDate, withWeekday = false): string {
  const [, m, d] = date.split("-").map(Number);
  const base = `${d}. ${MONTHS[m - 1]}`;
  return withWeekday ? `${WEEKDAYS[weekdayOf(date) - 1].slice(0, 2)}, ${base}` : base;
}

export const longDate = (date: LocalDate) => `${WEEKDAYS[weekdayOf(date) - 1]}, ${dayMonth(date)}`;

/** "20.–24. Oktober" · "28. Oktober – 3. November" */
export function dateRange(from: LocalDate, to: LocalDate): string {
  if (from === to) return dayMonth(from);
  const [, fm, fd] = from.split("-").map(Number);
  const [, tm] = to.split("-").map(Number);
  return fm === tm ? `${fd}.–${dayMonth(to)}` : `${dayMonth(from)} – ${dayMonth(to)}`;
}

export const typeLabel = (t: ConsultationTypeCode) => MOCK_TYPES.find((x) => x.code === t)?.label ?? "Sprechzeit";
