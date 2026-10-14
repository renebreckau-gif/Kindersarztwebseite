// 7.5 Urlaub / geplante Schließzeit (Phase 09.5C) — the first real multi-day workflow.
// Pure: current DATABASE snapshot + input + server time → draft (one Closure, ChangeSet, engine
// preview at several meaningful dates) or plain-German problems per form section.
// Only existing domain rules are used: validateReplacementPeriods / uncoveredDays (replacement
// periods), evaluateFreshness(…, "replacementPractice") (directory), applyChangeSet,
// introducedUnknown (no new UNKNOWN day) and getPracticeStatus (every preview status).
// The same function runs for the preview AND again inside the publish transaction.

import type { Closure, OpeningHourException, ReplacementPractice } from "../../domain/content-types.ts";
import { getPracticeStatus, type PracticeStatusResult, type PulsData } from "../../domain/practice-status.ts";
import { applyChangeSet, blocks, introducedUnknown, uncoveredDays, validateReplacementPeriods, type PeriodIssue } from "../../domain/operations.ts";
import { evaluateFreshness, FRESHNESS_POLICIES, isUsable, type FactVerification, type Freshness } from "../../domain/verification.ts";
import { addDays, compareDates, daysBetween, isLocalDate, zonedToInstant, type LocalDate } from "../../domain/time.ts";
import { berlinNow } from "../read-model.ts";
import { dayFacts, diffDay, type FactKey, type FactRow } from "../facts.ts";
import { MAX_PERIODS, MAX_PLANNED_TEXT, PLANNED_KINDS, type Blocked, type BlockCode, type Draft, type PlannedClosureInput, type PlannedKind, type PlannedSection } from "./types.ts";
import { CLOSURE_KIND_TITLE, dayMonth, NO_REPLACEMENT_EFFECT, shortRange } from "./wording.ts";

/** Title of a closure kind in sentences ("Urlaub 19.–23. Oktober"). */
export const KIND_TITLE: Record<Closure["kind"], string> = CLOSURE_KIND_TITLE;
/** Choice labels in the form. */
export const KIND_CHOICE: Record<PlannedKind, string> = { VACATION: "Urlaub", TRAINING: "Fortbildung", OTHER: "Sonstiges" };
const ID_PREFIX: Record<PlannedKind, string> = { VACATION: "urlaub", TRAINING: "fortbildung", OTHER: "schliessung" };

/** Default lead time of the announcement (a proposal only — any valid date may be chosen). */
export const ANNOUNCE_DAYS = 14;
/** Upper bound of one closure (keeps every engine check bounded; not a business rule about vacations). */
export const MAX_RANGE_DAYS = 366;
/** Time of day used for the day previews. */
export const PREVIEW_TIME = "09:00";

const SECTION_ORDER: PlannedSection[] = ["art", "zeitraum", "ankuendigung", "vertretung", "hinweis"];

export const isPlannedKind = (k: unknown): k is PlannedKind => PLANNED_KINDS.includes(k as PlannedKind);

/** An existing record this workflow may edit: ACTIVE (the repository returns nothing else), planned kind, not yet over. */
export const isEditablePlanned = (c: Closure, today: LocalDate) => isPlannedKind(c.kind) && compareDates(c.endDate, today) >= 0;

/** Proposed "Auf der Website ankündigen ab": 14 days before the start, or today if that has passed. */
export function defaultAnnounceFrom(from: LocalDate, today: LocalDate): LocalDate {
  const d = addDays(from, -ANNOUNCE_DAYS);
  return compareDates(d, today) < 0 ? today : d;
}

const maxDate = (a: LocalDate, b: LocalDate) => (compareDates(a, b) >= 0 ? a : b);
const minDate = (a: LocalDate, b: LocalDate) => (compareDates(a, b) <= 0 ? a : b);

/** Overlap of a record with [from, to], restricted to today and later (the past is history). */
function overlapFromToday(x: { startDate: LocalDate; endDate: LocalDate }, from: LocalDate, to: LocalDate, today: LocalDate): { from: LocalDate; to: LocalDate } | null {
  const a = maxDate(maxDate(x.startDate, from), today);
  const b = minDate(x.endDate, to);
  return compareDates(a, b) <= 0 ? { from: a, to: b } : null;
}

// ---------------------------------------------------------------- replacement directory

export interface DirectoryOption {
  id: string;
  name: string;
  city: string;
  /** Usable today (verified and fresh by the engine's own rule). */
  usable: boolean;
  /** Last day the confirmation lets the engine show this practice (verified entries only). */
  usableUntil?: LocalDate;
  /** Plain-German state for the selector (internal; never shown to parents). */
  note: string;
}

const STATE_NOTE: Record<Freshness, string> = {
  CURRENT: "bestätigt",
  REVIEW_DUE: "Prüfung fällig",
  REVIEW_EXPIRED: "Bestätigung abgelaufen",
  UNVERIFIED: "nicht ärztlich bestätigt",
  OUTDATED: "veraltet",
};

/** Last day evaluateFreshness still counts the practice as usable (reviewDue + grace of the category). */
function usableUntil(v: FactVerification | undefined): LocalDate | undefined {
  if (!v || v.status !== "VERIFIED_CURRENT" || !v.lastVerified || !v.reviewDue) return undefined;
  return addDays(v.reviewDue, FRESHNESS_POLICIES.replacementPractice.graceDays);
}

const usableOn = (p: ReplacementPractice, d: LocalDate) => isUsable(evaluateFreshness(p.verification, d, "replacementPractice"));

/** The verified directory as the cockpit offers it: usable entries selectable, the rest shown with the reason. */
export function directoryOptions(data: PulsData, today: LocalDate): DirectoryOption[] {
  return data.replacementPractices
    .map((p) => {
      const f = evaluateFreshness(p.verification, today, "replacementPractice");
      const until = usableUntil(p.verification);
      return {
        id: p.id,
        name: p.practiceName,
        city: p.city,
        usable: isUsable(f),
        usableUntil: isUsable(f) ? until : undefined,
        note: isUsable(f) && until ? `bestätigt bis ${dayMonth(until, true)}` : STATE_NOTE[f],
      };
    })
    .sort((a, b) => Number(b.usable) - Number(a.usable) || a.name.localeCompare(b.name, "de"));
}

// ---------------------------------------------------------------- preview dates

export type MomentKind = "ANNOUNCE" | "FIRST" | "PERIOD" | "GAP" | "REMOVED" | "AFTER";

export interface PlannedMoment {
  kind: MomentKind;
  label: string;
  date: LocalDate;
  /** Engine result on the current database data. */
  before: PracticeStatusResult;
  /** Engine result with this change applied. */
  after: PracticeStatusResult;
  /** What the website would show that day with the change (structured, plain German). */
  facts: Record<FactKey, string>;
  /** Facts that differ from the current database state that day. */
  changes: FactRow[];
}

const MAX_MOMENTS = 8;

function previewMoments(data: PulsData, after: PulsData, record: Closure, gaps: { from: LocalDate; to: LocalDate }[], editing: Closure | undefined, today: LocalDate, nameOf: (id: string) => string): PlannedMoment[] {
  const out: { kind: MomentKind; label: string; date: LocalDate }[] = [];
  const firstDay = maxDate(record.startDate, today);
  if (record.announceFrom && compareDates(record.announceFrom, record.startDate) < 0) {
    const d = maxDate(record.announceFrom, today);
    if (compareDates(d, record.startDate) < 0) out.push({ kind: "ANNOUNCE", label: `Ankündigung (${dayMonth(d)})`, date: d });
  }
  out.push({ kind: "FIRST", label: compareDates(record.startDate, today) < 0 ? `Heute im Zeitraum (${dayMonth(firstDay)})` : `Erster Tag (${dayMonth(firstDay)})`, date: firstDay });
  for (const r of record.replacements) {
    const d = maxDate(r.from, today);
    if (compareDates(d, r.until) <= 0) out.push({ kind: "PERIOD", label: `Vertretung ${nameOf(r.replacementPracticeId)} (${dayMonth(d)})`, date: d });
  }
  for (const g of gaps) {
    const d = maxDate(g.from, today);
    if (compareDates(d, g.to) <= 0) out.push({ kind: "GAP", label: `Ohne Vertretung (${dayMonth(d)})`, date: d });
  }
  if (editing) {
    for (const r of uncoveredDays(editing.startDate, editing.endDate, [{ from: record.startDate, to: record.endDate }])) {
      const d = maxDate(r.from, today);
      if (compareDates(d, r.to) <= 0) out.push({ kind: "REMOVED", label: `Nicht mehr geschlossen (${dayMonth(d)})`, date: d });
    }
  }
  const dayAfter = addDays(record.endDate, 1);
  out.push({ kind: "AFTER", label: `Erster Tag danach (${dayMonth(dayAfter)})`, date: dayAfter });

  const seen = new Set<LocalDate>();
  return out
    .filter((m) => (seen.has(m.date) ? false : (seen.add(m.date), true)))
    .sort((a, b) => compareDates(a.date, b.date))
    .slice(0, MAX_MOMENTS)
    .map((m) => {
      const at = zonedToInstant(m.date, PREVIEW_TIME);
      return { ...m, before: getPracticeStatus(at, data), after: getPracticeStatus(at, after), facts: dayFacts(after, m.date, PREVIEW_TIME), changes: diffDay(data, after, m.date) };
    });
}

// ---------------------------------------------------------------- the draft

export interface PeriodProblem {
  message: string;
  /** "beyond": the explicit correction offered (never applied silently). */
  fix?: { from: LocalDate; to: LocalDate };
}

export interface PlannedDetails {
  today: LocalDate;
  editing?: Closure;
  /** The input as evaluated (announce default filled in, kind defaulted). */
  input: PlannedClosureInput;
  /** Problems per section (all of them, for the form). */
  problems: Blocked[];
  /** Problems of individual TEILEN rows, by row index. */
  periodProblems: Record<number, PeriodProblem>;
  /** Days of the closure without replacement (only when replacements are chosen). */
  gaps: { from: LocalDate; to: LocalDate }[];
  /** Gaps on days the edited closure did not cover before (extension) — never stretched silently. */
  newGaps: { from: LocalDate; to: LocalDate }[];
  /** The record as it would be stored (when the dates allow one), for summaries. */
  record?: Closure;
  /** Active data with the record applied (preview cards). */
  after?: PulsData;
  moments: PlannedMoment[];
  options: DirectoryOption[];
}

export interface PlannedResult {
  draft: Draft;
  details: PlannedDetails;
}

/** Provenance the publish hook will generate (reviewDue = end, as reviewDueFor) — PREVIEW only. */
const provisional = (today: LocalDate, end: LocalDate): FactVerification => ({ status: "VERIFIED_CURRENT", lastVerified: today, reviewDue: end, verifiedBy: "Vorschau", sourceIds: ["PRACTICE_COCKPIT"] });

function cleanMessage(text: string | undefined): { value?: string; error?: string } {
  const value = text?.replace(/\s+/g, " ").trim() || undefined;
  if (value && value.length > MAX_PLANNED_TEXT) return { error: `Der Hinweis darf höchstens ${MAX_PLANNED_TEXT} Zeichen lang sein (jetzt ${value.length}).` };
  return { value };
}

const businessOf = (c: Closure) =>
  JSON.stringify({
    kind: c.kind,
    startDate: c.startDate,
    endDate: c.endDate,
    announceFrom: c.announceFrom ?? null,
    publicMessage: c.publicMessage ?? null,
    replacements: [...c.replacements].sort((a, b) => compareDates(a.from, b.from)).map((r) => [r.replacementPracticeId, r.from, r.until, r.note ?? null]),
  });

const PERIOD_TEXT: Record<PeriodIssue["kind"], string> = {
  invalid: "Bitte gültige Daten eintragen (der letzte Tag darf nicht vor dem ersten liegen).",
  outside: "Dieser Zeitraum liegt außerhalb der Schließung. Bitte anpassen oder entfernen.",
  beyond: "Dieser Zeitraum reicht über die Schließung hinaus.",
  overlap: "Dieser Zeitraum überschneidet sich mit einem anderen Vertretungszeitraum.",
};

/** The replacement summary in plain German, e.g. "Praxis A (19.–21. Oktober), Praxis B (23. Oktober)". */
export function replacementSummary(c: Closure, nameOf: (id: string) => string): string {
  return c.replacements.map((r) => `${nameOf(r.replacementPracticeId)} (${shortRange(r.from, r.until)})`).join(", ");
}

/** Initial form values of an existing record: replacement dates stay EXPLICIT (periods), so an edit never stretches them. */
export function inputFromClosure(c: Closure): PlannedClosureInput {
  return {
    recordId: c.id,
    kind: isPlannedKind(c.kind) ? c.kind : undefined,
    from: c.startDate,
    to: c.endDate,
    announceFrom: c.announceFrom ?? "",
    message: c.publicMessage,
    mode: c.replacements.length ? "TEILEN" : "KEINE",
    periods: c.replacements.map((r) => ({ from: r.from, to: r.until, practice: r.replacementPracticeId })),
    gapsAccepted: false,
  };
}

export function plannedClosureDraft(data: PulsData, now: Date, raw: PlannedClosureInput, fingerprint: string): PlannedResult {
  const { date: today, time } = berlinNow(now);
  const before = getPracticeStatus(now, data);
  const base = { kind: "PLANNED_CLOSURE" as const, today, now: time, before, fingerprint };
  const options = directoryOptions(data, today);
  const nameOf = (id: string) => data.replacementPractices.find((p) => p.id === id)?.practiceName ?? "unbekannte Praxis";
  const problems: Blocked[] = [];
  const add = (section: PlannedSection | undefined, code: BlockCode, message: string, suggestion?: Blocked["suggestion"]) => problems.push({ section, code, message, suggestion });

  // ---- which record (edit = the SAME domain record id, re-loaded here — never trusted from the form)
  let editing: Closure | undefined;
  if (raw.recordId !== undefined) {
    editing = data.closures.find((c) => c.id === raw.recordId);
    if (!editing || !isEditablePlanned(editing, today)) {
      const blocked: Blocked = { code: "NOT_EDITABLE", message: "Dieser Eintrag kann hier nicht bearbeitet werden: Er existiert nicht (mehr), ist bereits vorbei oder ist keine geplante Schließung." };
      return { draft: { ...base, ok: false, blocked }, details: { today, input: raw, problems: [blocked], periodProblems: {}, gaps: [], newGaps: [], moments: [], options } };
    }
  }

  const input: PlannedClosureInput = {
    ...raw,
    kind: raw.kind ?? (editing && isPlannedKind(editing.kind) ? editing.kind : "VACATION"),
    announceFrom: raw.announceFrom || (isLocalDate(raw.from) ? defaultAnnounceFrom(raw.from, today) : ""),
  };
  const { from, to } = input;

  // ---- art
  if (!isPlannedKind(input.kind)) add("art", "INVALID_INPUT", "Bitte die Art der Schließung wählen.");
  const kind = isPlannedKind(input.kind) ? input.kind : "VACATION";

  // ---- Zeitraum (Europe/Berlin calendar dates; browser constraints are never trusted)
  const zeitraum = (message: string) => add("zeitraum", "INVALID_INPUT", message);
  if (!from) zeitraum("Bitte den ersten Tag angeben.");
  else if (!isLocalDate(from)) zeitraum("Der erste Tag ist kein gültiges Datum.");
  if (!to) zeitraum("Bitte den letzten Tag angeben.");
  else if (!isLocalDate(to)) zeitraum("Der letzte Tag ist kein gültiges Datum.");
  if (isLocalDate(from) && isLocalDate(to)) {
    if (compareDates(to, from) < 0) zeitraum("Der letzte Tag liegt vor dem ersten Tag.");
    else if (compareDates(to, today) < 0) zeitraum("Dieser Zeitraum ist bereits vorbei. Vergangene Schließungen werden hier nicht eingetragen.");
    else if (compareDates(from, today) < 0 && !(editing && from === editing.startDate)) zeitraum("Der erste Tag liegt in der Vergangenheit. Bitte heute oder einen späteren Tag wählen.");
    else if (daysBetween(from, to) + 1 > MAX_RANGE_DAYS) zeitraum(`Ein Zeitraum kann höchstens ${MAX_RANGE_DAYS} Tage umfassen.`);
  }
  const datesOk = !problems.some((p) => p.section === "zeitraum");

  // ---- Ankündigen ab (default proposal only; must not start after the closure ends)
  if (!input.announceFrom) add("ankuendigung", "INVALID_INPUT", "Bitte angeben, ab wann die Website die Schließung ankündigt.");
  else if (!isLocalDate(input.announceFrom)) add("ankuendigung", "INVALID_INPUT", "Das Datum der Ankündigung ist kein gültiges Datum.");
  else if (datesOk && compareDates(input.announceFrom, to) > 0) add("ankuendigung", "INVALID_INPUT", "Die Ankündigung muss spätestens am letzten Tag der Schließung beginnen.");

  // ---- Hinweis für die Website
  const message = cleanMessage(input.message);
  if (message.error) add("hinweis", "INVALID_INPUT", message.error);

  // ---- Vertretung (existing directory only; periods via the domain helpers)
  const periodProblems: Record<number, PeriodProblem> = {};
  let rows: { from: string; to: string; practice: string; index: number }[] = [];
  let gaps: { from: LocalDate; to: LocalDate }[] = [];
  let newGaps: { from: LocalDate; to: LocalDate }[] = [];
  if (!input.mode) add("vertretung", "INVALID_INPUT", "Bitte festlegen, wer vertritt – oder „Keine Vertretung“ wählen.");
  if (input.mode === "GANZ") {
    if (!input.practice) add("vertretung", "INVALID_INPUT", "Bitte die Vertretungspraxis wählen.");
    rows = datesOk ? [{ from, to, practice: input.practice ?? "", index: 0 }] : [];
  }
  if (input.mode === "TEILEN") {
    rows = input.periods.slice(0, MAX_PERIODS).map((p, index) => ({ ...p, index })).filter((p) => p.from || p.to || p.practice);
    if (!rows.length) add("vertretung", "INVALID_INPUT", "Bitte mindestens einen Vertretungszeitraum ausfüllen – oder „Keine Vertretung“ wählen.");
  }
  let expires = false;
  if (datesOk && (input.mode === "GANZ" || input.mode === "TEILEN") && rows.length) {
    const coverage = validateReplacementPeriods(from, to, rows, editing ? { from: editing.startDate, to: editing.endDate } : undefined);
    for (const issue of coverage.issues) {
      const row = rows[issue.index];
      periodProblems[row.index] = { message: PERIOD_TEXT[issue.kind], fix: issue.fix };
    }
    for (const row of rows) {
      if (periodProblems[row.index]) continue;
      const p = data.replacementPractices.find((x) => x.id === row.practice);
      if (!row.practice) periodProblems[row.index] = { message: "Bitte eine Vertretungspraxis wählen." };
      else if (!p) periodProblems[row.index] = { message: "Diese Praxis ist nicht im Verzeichnis." };
      else if (compareDates(row.to, today) >= 0) {
        // Usable for the WHOLE (remaining) sub-period — the engine's own freshness rule, no new one.
        const start = maxDate(row.from, today);
        if (!usableOn(p, start)) {
          periodProblems[row.index] = { message: `${p.practiceName} ist ${STATE_NOTE[evaluateFreshness(p.verification, start, "replacementPractice")]} und kann nicht als Vertretung eingetragen werden.` };
        } else if (!usableOn(p, row.to)) {
          const until = usableUntil(p.verification);
          expires = true;
          periodProblems[row.index] = {
            message: `Die Bestätigung der Vertretungspraxis ${p.practiceName} läuft am ${until ? dayMonth(until) : "Ende des Zeitraums"} ab. Danach kann sie auf der Website nicht mehr angezeigt werden. Bitte den Zeitraum kürzen oder eine andere Praxis wählen; die erneute Bestätigung erfolgt im Vertretungsverzeichnis.`,
          };
        }
      }
    }
    if (Object.keys(periodProblems).length) {
      add("vertretung", expires ? "REPLACEMENT_EXPIRES" : "REPLACEMENT_PERIODS", input.mode === "GANZ" ? Object.values(periodProblems)[0].message : "Bitte die markierten Vertretungszeiträume korrigieren.");
    }
    gaps = coverage.gaps;
    newGaps = coverage.newGaps;
    if (gaps.length && !input.gapsAccepted) {
      add("vertretung", "GAP_NOT_CONFIRMED", `Ohne Vertretung: ${gaps.map((g) => shortRange(g.from, g.to)).join(", ")}. Bitte die Lücke schließen oder bestätigen, dass diese Tage bewusst ohne Vertretung bleiben.`);
    }
  }

  // ---- conflicts with other ACTIVE records (never merged, never silently replaced)
  if (datesOk) {
    for (const c of data.closures) {
      if (c.id === editing?.id) continue;
      const o = overlapFromToday(c, from, to, today);
      if (!o) continue;
      add(
        "zeitraum",
        "OVERLAP_CLOSURE",
        `Für ${shortRange(o.from, o.to)} ist bereits „${KIND_TITLE[c.kind]} ${shortRange(c.startDate, c.endDate)}“ eingetragen. Zwei Schließungen für dieselben Tage sind nicht möglich; Zeiträume werden nicht automatisch zusammengelegt. Bitte den Zeitraum anpassen.`,
        isEditablePlanned(c, today) ? { label: `${KIND_TITLE[c.kind]} ${shortRange(c.startDate, c.endDate)} bearbeiten`, href: `/intern/urlaub/${encodeURIComponent(c.id)}` } : undefined,
      );
    }
    for (const x of data.exceptions) {
      const o = x.kind === "SPECIAL_HOURS" ? overlapFromToday(x, from, to, today) : null;
      if (!o) continue;
      add(
        "zeitraum",
        "OVERLAP_SPECIAL_HOURS",
        `Für ${shortRange(o.from, o.to)} sind geänderte Sprechzeiten eingetragen (${spanOf(x)} Uhr). Eine Schließung würde ihnen widersprechen. Bitte den Zeitraum anpassen; bestehende Änderungen werden hier nicht automatisch ersetzt.`,
      );
    }
  }

  // ---- the record (built as soon as the dates allow, so the preview helps while fixing the rest)
  let record: Closure | undefined;
  let moments: PlannedMoment[] = [];
  let afterData: PulsData | undefined;
  const announceOk = !problems.some((p) => p.section === "ankuendigung");
  if (datesOk && announceOk) {
    const validRows = rows.filter((r) => !periodProblems[r.index] && r.practice);
    const notes = new Map((editing?.replacements ?? []).map((r) => [`${r.replacementPracticeId}|${r.from}|${r.until}`, r.note]));
    record = {
      id: editing?.id ?? `${ID_PREFIX[kind]}-${from}`,
      kind,
      startDate: from,
      endDate: to,
      announceFrom: input.announceFrom,
      publicMessage: message.value,
      replacements: validRows
        .sort((a, b) => compareDates(a.from, b.from))
        .map((r) => ({ replacementPracticeId: r.practice, from: r.from, until: r.to, ...(notes.get(`${r.practice}|${r.from}|${r.to}`) ? { note: notes.get(`${r.practice}|${r.from}|${r.to}`) } : {}) })),
      ...(editing?.emergencyInformationIds?.length ? { emergencyInformationIds: editing.emergencyInformationIds } : {}),
      verification: provisional(today, to),
    };
    afterData = applyChangeSet(data, { upsertClosures: [record] });
    if (editing && businessOf(editing) === businessOf(record)) add(undefined, "NO_CHANGE", "Es wurde nichts geändert. Der Eintrag ist bereits genau so gespeichert.");
    // No-new-UNKNOWN from one day before to one day after the affected range (old and new range on edit).
    if (!problems.some((p) => p.code === "OVERLAP_SPECIAL_HOURS" || p.code === "OVERLAP_CLOSURE")) {
      const lo = addDays(editing ? minDate(from, editing.startDate) : from, -1);
      const hi = addDays(editing ? maxDate(to, editing.endDate) : to, 1);
      const conflict = introducedUnknown(data, afterData, maxDate(lo, addDays(today, -1)), hi);
      if (conflict) add("zeitraum", "CONFLICT", `Diese Schließung würde am ${dayMonth(conflict.date)} widersprüchliche Angaben auf der Website erzeugen. Bitte den Zeitraum oder die bestehenden Einträge für diesen Tag prüfen.`);
    }
    moments = previewMoments(data, afterData, record, input.mode === "KEINE" ? [] : gaps, editing, today, nameOf);
  }

  const details: PlannedDetails = { today, editing, input, problems, periodProblems, gaps, newGaps, record, after: afterData, moments, options };
  if (problems.length || !record || !afterData) {
    const first = [...problems].sort((a, b) => rank(a.section) - rank(b.section))[0] ?? { code: "INVALID_INPUT" as const, message: "Bitte die Angaben vervollständigen." };
    return { draft: { ...base, ok: false, blocked: first }, details };
  }

  const title = KIND_TITLE[kind];
  const range = shortRange(from, to);
  const announced = record.announceFrom && compareDates(record.announceFrom, from) < 0 ? (compareDates(record.announceFrom, today) <= 0 ? " Die Website kündigt die Schließung ab sofort an." : ` Die Website kündigt die Schließung ab ${dayMonth(record.announceFrom)} an.`) : "";
  const replacementText =
    input.mode === "KEINE" || !record.replacements.length
      ? ` Keine Vertretung: ${NO_REPLACEMENT_EFFECT}`
      : ` Vertretung: ${replacementSummary(record, nameOf)}.${gaps.length ? ` Ohne Vertretung: ${gaps.map((g) => shortRange(g.from, g.to)).join(", ")}. ${NO_REPLACEMENT_EFFECT}` : ""}`;
  const previously = editing ? `Bisher: ${KIND_TITLE[editing.kind]} ${shortRange(editing.startDate, editing.endDate)}. Neu: ` : "";
  return {
    draft: {
      ...base,
      ok: true,
      mode: editing ? "EDIT" : "NEW",
      changeSet: { upsertClosures: [record] },
      record: { collection: "closures", value: record },
      after: getPracticeStatus(now, afterData),
      actionLabel: editing ? `${title} ${range} aktualisieren` : `${title} ${range} veröffentlichen`,
      effect: `${previously}${title} ${range}.${announced}${replacementText}`,
    },
    details,
  };
}

const rank = (s: PlannedSection | undefined) => (s ? SECTION_ORDER.indexOf(s) : SECTION_ORDER.length);
const spanOf = (x: OpeningHourException) => blocks(x.intervals.map((i) => ({ start: i.start, end: i.end, type: i.consultationType }))).map((b) => `${b.start}–${b.end}`).join(" und ");

// ---------------------------------------------------------------- form structure actions (GET, never a write)

/** "Zeitraum aufteilen" chosen without rows yet: start with ONE explicit row over the whole range. */
export function prepareFormInput(input: PlannedClosureInput): PlannedClosureInput {
  if (input.mode !== "TEILEN" || input.periods.length || !isLocalDate(input.from) || !isLocalDate(input.to)) return input;
  return { ...input, periods: [{ from: input.from, to: input.to, practice: input.practice ?? "" }] };
}

export type PeriodAction = { kind: "SPLIT" } | { kind: "REMOVE"; index: number } | { kind: "FIX"; index: number };

/** Midpoint split of a multi-day range: first half gets the extra day. */
function split(from: LocalDate, to: LocalDate): [LocalDate, LocalDate] | null {
  const days = daysBetween(from, to) + 1;
  if (days < 2) return null;
  const end = addDays(from, Math.ceil(days / 2) - 1);
  return [end, addDays(end, 1)];
}

/**
 * "Zeitraum teilen", "Zeitraum entfernen", "Auf … anpassen": pure transformations of the form
 * input. A correction is applied only when the person presses its button — never automatically.
 */
export function applyPeriodAction(input: PlannedClosureInput, action: PeriodAction): PlannedClosureInput {
  const datesOk = isLocalDate(input.from) && isLocalDate(input.to) && compareDates(input.to, input.from) >= 0;
  if (action.kind === "SPLIT") {
    if (input.mode !== "TEILEN") {
      if (!datesOk) return { ...input, mode: "TEILEN", periods: [{ from: "", to: "", practice: input.practice ?? "" }] };
      const s = split(input.from, input.to);
      const first = { from: input.from, to: s ? s[0] : input.to, practice: input.practice ?? "" };
      return { ...input, mode: "TEILEN", periods: s ? [first, { from: s[1], to: input.to, practice: "" }] : [first] };
    }
    const periods = [...input.periods];
    if (periods.length >= MAX_PERIODS) return input;
    for (let i = periods.length - 1; i >= 0; i--) {
      const p = periods[i];
      const s = isLocalDate(p.from) && isLocalDate(p.to) && compareDates(p.to, p.from) >= 0 ? split(p.from, p.to) : null;
      if (s) {
        periods.splice(i, 1, { ...p, to: s[0] }, { from: s[1], to: p.to, practice: "" });
        return { ...input, periods };
      }
    }
    return { ...input, periods: [...periods, { from: "", to: "", practice: "" }] };
  }
  if (action.kind === "REMOVE") return { ...input, periods: input.periods.filter((_, i) => i !== action.index) };
  if (!datesOk) return input;
  const coverage = validateReplacementPeriods(input.from, input.to, input.periods);
  const fix = coverage.issues.find((x) => x.index === action.index)?.fix;
  return fix ? { ...input, periods: input.periods.map((p, i) => (i === action.index ? { ...p, from: fix.from, to: fix.to } : p)) } : input;
}
