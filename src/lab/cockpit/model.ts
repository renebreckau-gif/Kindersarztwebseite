// PRAXIS COCKPIT — Phase 09.1 lab prototype model.
// MOCK DATA ONLY: every hour, name, practice and date below is invented for usability
// testing ("PROTOTYP · keine echten Daten"). Nothing here is practice data, nothing is
// persisted, and nothing is read from src/content/. Status and conflicts come from the
// real, pure PRAXIS PULS engine (src/domain) — there is no second status implementation.

import { getPracticeStatus, type PulsData, type PracticeStatusResult, type ReasonCode } from "../../domain/practice-status.ts";
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
import { addDays, compareDates, formatMinutes, parseTime, weekdayOf, zonedToInstant, type IsoWeekday, type LocalDate, type LocalTime } from "../../domain/time.ts";

// ------------------------------------------------------------------ clock & people

/** Fixed test clock so every usability session starts from the same situation. */
export const MOCK_TODAY: LocalDate = "2026-10-13";
export const MOCK_NOW: LocalTime = "09:20";

export type Role = "STAFF" | "DOCTOR" | "ADMIN";

export const ROLES: Record<Role, { label: string; person: string; greeting: string }> = {
  STAFF: { label: "Praxisteam", person: "Anna Beispiel", greeting: "Anna" },
  DOCTOR: { label: "Ärztin / Arzt", person: "Dr. Beispiel", greeting: "Dr. Beispiel" },
  ADMIN: { label: "Verwaltung", person: "Ben Beispiel", greeting: "Ben" },
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

const directoryEntry = (id: string, letter: string, verification: FactVerification): ReplacementPractice => ({
  id,
  practiceName: `Praxis Beispiel ${letter}`,
  contactPersons: [],
  street: `Beispielstraße ${letter === "A" ? 1 : letter === "B" ? 2 : 3}`,
  postalCode: "00000",
  city: "Musterstadt",
  phone: `0000 00000${letter === "A" ? 1 : letter === "B" ? 2 : 3}`,
  verification,
});

export const MOCK_DIRECTORY: ReplacementPractice[] = [
  directoryEntry("vb-a", "A", { status: "VERIFIED_CURRENT", lastVerified: "2026-09-15", reviewDue: "2027-03-15", verifiedBy: "Prototyp-Testdaten", sourceIds: ["MOCK"] }),
  directoryEntry("vb-b", "B", { status: "VERIFIED_CURRENT", lastVerified: "2026-08-20", reviewDue: "2027-02-20", verifiedBy: "Prototyp-Testdaten", sourceIds: ["MOCK"] }),
  // Review expired → not selectable: "Vertretung muss bestätigt werden".
  directoryEntry("vb-c", "C", { status: "VERIFIED_CURRENT", lastVerified: "2026-03-30", reviewDue: "2026-09-30", verifiedBy: "Prototyp-Testdaten", sourceIds: ["MOCK"] }),
];

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
  role: Role;
  data: CockpitData;
  audit: AuditEntry[];
  seq: number;
}

const segmentsToIntervals = (segs: Segment[]) => segs.map((s) => ({ start: s.start, end: s.end, consultationType: s.type }));

export function initialState(): CockpitState {
  const wednesday = "2026-10-14";
  return {
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
          verification: entryVerification("Dr. Beispiel", "DOCTOR", wednesday, "2026-10-12"),
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
          verification: entryVerification("Dr. Beispiel", "DOCTOR", wednesday, "2026-10-12"),
        },
      ],
      directory: MOCK_DIRECTORY,
    },
    audit: [
      {
        id: "seed-2",
        date: "2026-10-12",
        time: "15:21",
        actor: "Dr. Beispiel",
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
        actor: "Dr. Beispiel",
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

export const nowStatus = (d: CockpitData) => statusAt(d, MOCK_TODAY, MOCK_NOW);

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

function problemFor(reason: ReasonCode, date: LocalDate, relatedIds: string[]): Problem {
  const day = date === MOCK_TODAY ? "heute" : `den ${dayMonth(date)}`;
  switch (reason) {
    case "EXCEPTION_CONFLICT":
      return { title: "Widersprüchliche Sonderzeiten", text: `Für ${day} gibt es bereits eine andere Sonderzeit. Bitte prüfen Sie die bestehende Änderung.`, date, relatedIds };
    case "CLOSURE_EXCEPTION_CONFLICT":
      return {
        title: "Widerspruch zu einer bestehenden Änderung",
        text: `Für ${day} ist bereits eine andere Änderung eingetragen. Schließung und geänderte Sprechzeit am selben Tag widersprechen sich. Bitte prüfen Sie die bestehende Änderung.`,
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
export function checkChange(base: CockpitData, draft: CockpitData, from: LocalDate, to: LocalDate = from): Problem | null {
  for (let date = from; compareDates(date, to) <= 0; date = addDays(date, 1)) {
    const before = statusAt(base, date, "12:00");
    const after = statusAt(draft, date, "12:00");
    if (after.status === "UNKNOWN" && before.status !== "UNKNOWN") {
      const own = new Set([...draft.exceptions, ...draft.closures].map((x) => x.id).filter((id) => ![...base.exceptions, ...base.closures].some((b) => b.id === id)));
      return problemFor(after.reason, date, after.sourceRecordIds.filter((id) => !own.has(id)));
    }
  }
  return null;
}

// ------------------------------------------------------------------ directory

export function directoryState(p: ReplacementPractice, until: LocalDate = MOCK_TODAY): { usable: boolean; note: string } {
  const now = evaluateFreshness(p.verification, MOCK_TODAY, "replacementPractice");
  const later = evaluateFreshness(p.verification, until, "replacementPractice");
  if (now !== "CURRENT" && now !== "REVIEW_DUE") return { usable: false, note: "Diese Vertretung wurde länger nicht geprüft und kann deshalb noch nicht veröffentlicht werden." };
  if (later !== "CURRENT" && later !== "REVIEW_DUE") return { usable: false, note: `Die Prüfung läuft am ${dayMonth(p.verification.reviewDue!)} ab – vor dem Ende dieses Zeitraums.` };
  return { usable: true, note: `Zuletzt bestätigt am ${dayMonth(p.verification.lastVerified!)}` };
}

// ------------------------------------------------------------------ home lists

export interface Upcoming {
  date: LocalDate;
  label: string;
  note: string;
  attention: boolean;
}

const holidayOf = (date: LocalDate) => MOCK_HOLIDAYS.find((h) => h.date === date);

export function upcoming(d: CockpitData, horizonDays = 90): Upcoming[] {
  const end = addDays(MOCK_TODAY, horizonDays);
  const items: Upcoming[] = [];
  for (const c of d.closures) {
    if (compareDates(c.endDate, MOCK_TODAY) < 0) continue;
    const kind = c.kind === "VACATION" ? "Urlaub" : c.kind === "TRAINING" ? "Fortbildung" : c.kind === "SHORT_NOTICE" ? "Praxis geschlossen" : "Schließzeit";
    items.push({ date: c.startDate, label: dateRange(c.startDate, c.endDate), note: kind, attention: false });
  }
  for (const x of d.exceptions) {
    if (compareDates(x.endDate, MOCK_TODAY) < 0) continue;
    const segs = x.intervals.map((i) => ({ start: i.start, end: i.end, type: i.consultationType }));
    const note = x.kind === "CLOSED" ? (holidayOf(x.startDate) ? `${holidayOf(x.startDate)!.name} · geschlossen` : "Geschlossen") : `Geänderte Sprechzeit · ${blocks(segs).map((b) => `${b.start}–${b.end}`).join(", ")}`;
    items.push({ date: x.startDate, label: x.startDate === x.endDate ? dayMonth(x.startDate, true) : dateRange(x.startDate, x.endDate), note, attention: false });
  }
  for (const h of MOCK_HOLIDAYS) {
    if (compareDates(h.date, MOCK_TODAY) < 0 || compareDates(h.date, end) > 0) continue;
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

export function checks(d: CockpitData, role: Role): CheckItem[] {
  const out: CheckItem[] = [];
  for (const h of MOCK_HOLIDAYS) {
    if (compareDates(h.date, MOCK_TODAY) < 0) continue;
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
      if (!directoryState(p).usable) {
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
