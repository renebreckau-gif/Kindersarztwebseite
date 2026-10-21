// Real Praxis Cockpit — read model (pure; no Payload, no React, no lab mocks).
//
// app/(intern) → src/cockpit (queries → read model) → PayloadPracticeRepository → src/domain
// Status always comes from the domain engine (getPracticeStatus); this module only selects,
// sorts and words what the cockpit shows. Writes happen only in src/cockpit/workflows (publish.ts).

import type { Announcement, Closure, OpeningHourException } from "../domain/content-types.ts";
import { getPracticeStatus, type PracticeStatusResult, type PulsData } from "../domain/practice-status.ts";
import { announcementExpired, blocks, notExpired, rulesSegments, SPECIAL_DAY_MARKER, uncoveredDays } from "../domain/operations.ts";
import { evaluateFreshness } from "../domain/verification.ts";
import { decideAnnouncement } from "../domain/publication.ts";
import { acuteBaselineStatus } from "../domain/acute.ts";
import { holidayPolicyStatus } from "../domain/holiday-policy.ts";
import { shortRange } from "./workflows/wording.ts";
import { addDays, compareDates, daysBetween, formatGermanDate, weekdayOf, zonedParts, zonedToInstant, formatMinutes, type LocalDate, type LocalTime } from "../domain/time.ts";

export interface CockpitInput {
  data: PulsData;
  announcements: Announcement[];
  now: Date;
}

export interface TodayView {
  date: LocalDate;
  time: LocalTime;
  result: PracticeStatusResult;
  /** Planned opening blocks of the day (display only — the status itself is the engine's). */
  hours: { start: LocalTime; end: LocalTime }[];
}

export interface UpcomingItem {
  id: string;
  kind: "CLOSURE" | "EXCEPTION" | "ANNOUNCEMENT";
  startDate: LocalDate;
  endDate?: LocalDate;
  /** "Montag, 19. Oktober – Freitag, 23. Oktober" */
  when: string;
  title: string;
  detail?: string;
  /** Already running today. */
  active: boolean;
  /** Not confirmed: the website does not show it. */
  unconfirmed: boolean;
  /** 09.5C: confirmation state in plain German (closures). */
  confirmation?: string;
  /** 09.5C: edit route of an editable ACTIVE planned closure (domain record id, never the database id). */
  editHref?: string;
}

export interface ReviewItem {
  id: string;
  title: string;
  text: string;
  /** 09.5F: the workflow that resolves the item (e.g. "Feiertag klären"). */
  action?: { label: string; href: string };
}

export interface CockpitHome {
  today: TodayView;
  upcoming: UpcomingItem[];
  review: ReviewItem[];
}

/** How far ahead "Nächste Termine" and the holiday check look. */
export const HORIZON_DAYS = 90;
export const HOLIDAY_CHECK_DAYS = 60;
export const SCHEDULE_REVIEW_WARN_DAYS = 30;

const CLOSURE_TITLE: Record<Closure["kind"], string> = {
  VACATION: "Urlaub",
  TRAINING: "Fortbildung",
  SHORT_NOTICE: "Kurzfristig geschlossen",
  OTHER: "Praxis geschlossen",
};

const covers = (x: { startDate: LocalDate; endDate: LocalDate }, date: LocalDate) => compareDates(x.startDate, date) <= 0 && compareDates(date, x.endDate) <= 0;

export function dateRange(from: LocalDate, to?: LocalDate): string {
  return !to || to === from ? formatGermanDate(from) : `${formatGermanDate(from)} – ${formatGermanDate(to)}`;
}

export const berlinNow = (now: Date) => {
  const p = zonedParts(now);
  return { date: p.date, time: formatMinutes(p.minutes) as LocalTime };
};

/** Planned blocks for a date: closure → none; exception → its intervals; holiday → none; else weekly rules. */
export function dayPlan(data: PulsData, date: LocalDate): { start: LocalTime; end: LocalTime }[] {
  if (data.closures.some((c) => covers(c, date))) return [];
  const ex = data.exceptions.filter((x) => covers(x, date)).sort((a, b) => b.priority - a.priority)[0];
  if (ex) return ex.kind === "CLOSED" ? [] : blocks(ex.intervals.map((i) => ({ start: i.start, end: i.end, type: i.consultationType })));
  if (data.publicHolidays.includes(date)) return [];
  return data.schedule ? blocks(rulesSegments(data.schedule.rules, date)) : [];
}

export function todayView(data: PulsData, now: Date): TodayView {
  const { date, time } = berlinNow(now);
  return { date, time, result: getPracticeStatus(now, data), hours: dayPlan(data, date) };
}

const verified = (x: { verification: { status: string } }) => x.verification.status === "VERIFIED_CURRENT";

/** "Vertretung: Praxis A (19.–21. Oktober), Praxis B (23. Oktober) · ohne Vertretung: 22. Oktober". */
export function closureReplacementText(c: Closure, practiceName: (id: string) => string): string {
  if (!c.replacements.length) return "Keine Vertretung eingetragen";
  const gaps = c.kind === "SHORT_NOTICE" ? [] : uncoveredDays(c.startDate, c.endDate, c.replacements.map((r) => ({ from: r.from, to: r.until })));
  const list = [...c.replacements].sort((a, b) => compareDates(a.from, b.from)).map((r) => `${practiceName(r.replacementPracticeId)} (${shortRange(r.from, r.until)})`);
  return `Vertretung: ${list.join(", ")}${gaps.length ? ` · ohne Vertretung: ${gaps.map((g) => shortRange(g.from, g.to)).join(", ")}` : ""}`;
}

/** Current and upcoming operational records, chronological; expired ones are history (not shown). */
export function upcomingItems(data: PulsData, announcements: Announcement[], today: LocalDate): UpcomingItem[] {
  const horizon = addDays(today, HORIZON_DAYS);
  const inHorizon = (start: LocalDate) => compareDates(start, horizon) <= 0;
  const practiceName = (id: string) => data.replacementPractices.find((p) => p.id === id)?.practiceName ?? "unbekannte Praxis";

  const closures: UpcomingItem[] = notExpired(data.closures, today)
    .filter((c) => inHorizon(c.startDate))
    .map((c) => ({
      id: c.id,
      kind: "CLOSURE",
      startDate: c.startDate,
      endDate: c.endDate,
      when: dateRange(c.startDate, c.endDate),
      title: CLOSURE_TITLE[c.kind],
      detail: closureReplacementText(c, practiceName),
      active: compareDates(c.startDate, today) <= 0,
      unconfirmed: !verified(c),
      confirmation: verified(c) ? `Bestätigt${c.verification.verifiedBy ? ` von ${c.verification.verifiedBy.split(",")[0]}` : ""}` : undefined,
      ...(c.kind !== "SHORT_NOTICE" ? { editHref: `/intern/urlaub/${encodeURIComponent(c.id)}` } : {}),
    }));

  const exceptions: UpcomingItem[] = notExpired(data.exceptions, today)
    .filter((x) => inHorizon(x.startDate))
    .map((x: OpeningHourException) => ({
      id: x.id,
      kind: "EXCEPTION",
      startDate: x.startDate,
      endDate: x.endDate,
      when: dateRange(x.startDate, x.endDate),
      title: x.kind === "CLOSED" ? "Praxis geschlossen" : "Geänderte Sprechzeiten",
      detail: x.kind === "CLOSED" ? x.publicMessage : blocks(x.intervals.map((i) => ({ start: i.start, end: i.end, type: i.consultationType }))).map((b) => `${b.start}–${b.end}`).join(" und ") + " Uhr",
      active: compareDates(x.startDate, today) <= 0,
      unconfirmed: !verified(x),
      // 09.5F: only single-date records of the special-day workflow, and only future ones, are editable here.
      ...(x.reason === SPECIAL_DAY_MARKER && x.startDate === x.endDate && compareDates(x.startDate, today) > 0 ? { editHref: `/intern/sonderzeiten/${encodeURIComponent(x.id)}` } : {}),
    }));

  const notices: UpcomingItem[] = announcements
    .filter((a) => a.published && !announcementExpired(a, today) && inHorizon(a.validFrom))
    .map((a) => {
      // Visibility from the publication rule (decideAnnouncement), not re-derived here.
      const d = decideAnnouncement(a, today);
      const future = compareDates(a.validFrom, today) > 0;
      return {
        id: a.id,
        kind: "ANNOUNCEMENT" as const,
        startDate: a.validFrom,
        endDate: a.validUntil === "OPEN_ENDED" ? undefined : a.validUntil,
        when: a.validUntil === "OPEN_ENDED" ? `ab ${formatGermanDate(a.validFrom)} · ohne Enddatum` : dateRange(a.validFrom, a.validUntil),
        title: `Hinweis: ${a.title}`,
        detail: d.visible ? (d.mode === "PUBLIC_WITH_WARNING" ? `Sichtbar · ${d.editorMessages[0]}` : "Sichtbar") : future ? `Sichtbar ab ${formatGermanDate(a.validFrom)}` : d.editorMessages[0],
        active: compareDates(a.validFrom, today) <= 0,
        unconfirmed: !verified(a),
        confirmation: verified(a) ? `Bestätigt${a.verification.verifiedBy ? ` von ${a.verification.verifiedBy.split(",")[0]}` : ""}` : undefined,
        editHref: `/intern/hinweis/${encodeURIComponent(a.id)}`,
      };
    });

  const order = { CLOSURE: 0, EXCEPTION: 1, ANNOUNCEMENT: 2 } as const;
  return [...closures, ...exceptions, ...notices].sort((a, b) => compareDates(a.startDate, b.startDate) || order[a.kind] - order[b.kind] || a.id.localeCompare(b.id));
}

/**
 * Only genuinely actionable items — not every TO_BE_CONFIRMED field:
 * unresolved weekday holidays (website would show UNKNOWN), replacement practices that cannot be
 * shown during a coming closure, unconfirmed current/upcoming operational records, and the
 * weekly schedule's verification deadline.
 */
export function reviewItems(data: PulsData, today: LocalDate, announcements: Announcement[] = []): ReviewItem[] {
  const items: ReviewItem[] = [];

  if (!data.schedule) {
    items.push({ id: "schedule-missing", title: "Kein Wochenplan hinterlegt", text: "Ohne bestätigten Wochenplan zeigt die Website keine Öffnungszeiten an." });
  } else {
    const due = data.schedule.verification.reviewDue;
    const fresh = evaluateFreshness(data.schedule.verification, today, "openingHours");
    if (fresh === "UNVERIFIED" || fresh === "OUTDATED") {
      items.push({ id: "schedule-unverified", title: "Wochenplan nicht bestätigt", text: "Die regulären Sprechzeiten sind nicht ärztlich bestätigt. Die Website zeigt deshalb keinen sicheren Status." });
    } else if (due && daysBetween(today, due) <= SCHEDULE_REVIEW_WARN_DAYS) {
      items.push({
        id: "schedule-review",
        title: "Wochenplan erneut bestätigen",
        text: compareDates(due, today) < 0 ? `Die Bestätigung der Sprechzeiten ist seit ${formatGermanDate(due)} abgelaufen.` : `Die Bestätigung der Sprechzeiten läuft am ${formatGermanDate(due)} ab.`,
      });
    }
  }

  // 09.5E: only EXISTING acute data can need attention — no warning merely because no baseline exists
  // (the old acute information is unconfirmed; it does not prove the practice has one).
  const acute = acuteBaselineStatus(data, today);
  if (acute.state === "INVALID") {
    items.push({ id: "acute-invalid", title: "Akutsprechstunde prüfen", text: `${acute.reasons.join(" ")} Die Website zeigt deshalb keine Akutsprechstunde.` });
  } else if (acute.type || acute.rules.length) {
    const typeDue = acute.type?.verification.reviewDue;
    const expiredRule = acute.rules.some((r) => evaluateFreshness(r.verification, today, "openingHours") === "REVIEW_EXPIRED");
    if (acute.typeFreshness === "REVIEW_EXPIRED" || expiredRule) {
      items.push({ id: "acute-review-expired", title: "Akutsprechstunde erneut ärztlich bestätigen", text: "Die ärztliche Bestätigung der Akutsprechstunde ist abgelaufen. Die Website zeigt deshalb keine Akutsprechstunde." });
    } else if (acute.state === "READY" && typeDue && daysBetween(today, typeDue) <= SCHEDULE_REVIEW_WARN_DAYS) {
      items.push({ id: "acute-review", title: "Akutsprechstunde erneut ärztlich bestätigen", text: `Die ärztliche Bestätigung der Akutsprechstunde läuft am ${formatGermanDate(typeDue)} ab.` });
    }
  }

  // 09.5H: an EXPIRED physician confirmation of the holiday rule → ONE item; the holidays it leaves
  // unresolved are covered by it (no extra item per holiday). An unconfirmed rule raises nothing by
  // itself — unresolved holidays below are actionable enough.
  const policy = holidayPolicyStatus(data.holidayPolicy, today);
  if (policy.state === "EXPIRED") {
    items.push({
      id: "holiday-policy-expired",
      title: "Feiertagsregel erneut ärztlich bestätigen",
      text: "Die ärztliche Bestätigung der allgemeinen Feiertagsregel ist abgelaufen. Bis zur erneuten Bestätigung kann die Website Feiertage ohne eigenen Eintrag nicht sicher anzeigen.",
      action: { label: "Feiertagsregel prüfen", href: "/intern/feiertage" },
    });
  }

  // Weekday holidays the engine cannot resolve → website would show "Aktuelle Sprechzeiten" (UNKNOWN).
  const until = addDays(today, HOLIDAY_CHECK_DAYS);
  for (const h of [...data.publicHolidays].sort(compareDates)) {
    if (compareDates(h, today) < 0 || compareDates(h, until) > 0 || weekdayOf(h) > 5) continue;
    const r = getPracticeStatus(zonedToInstant(h, "12:00"), data);
    if (r.reason === "HOLIDAY_POLICY_UNVERIFIED" && policy.state === "EXPIRED") continue;
    if (r.reason === "HOLIDAY_WITHOUT_RULE" || r.reason === "HOLIDAY_POLICY_UNVERIFIED") {
      // PulsData carries holiday DATES only — no name is invented.
      items.push({
        id: `holiday-${h}`,
        title: `Feiertag ${formatGermanDate(h)} ungeklärt`,
        text: "Für diesen Feiertag ist nicht eingetragen, ob die Praxis geschlossen ist. Die Website kann an diesem Tag keinen klaren Status anzeigen.",
        // Today is not planned here (09.5F); "Heute geschlossen" covers it.
        ...(compareDates(h, today) > 0 ? { action: { label: "Feiertag klären", href: `/intern/sonderzeiten?datum=${h}` } } : {}),
      });
    }
  }

  const flaggedPractices = new Set<string>();
  for (const c of notExpired(data.closures, today)) {
    for (const a of c.replacements) {
      if (compareDates(a.until, today) < 0) continue;
      const p = data.replacementPractices.find((x) => x.id === a.replacementPracticeId);
      const from = compareDates(a.from, today) < 0 ? today : a.from;
      const usableAt = (d: LocalDate) => p && ["CURRENT", "REVIEW_DUE"].includes(evaluateFreshness(p.verification, d, "replacementPractice"));
      if (!p || !usableAt(from) || !usableAt(a.until)) {
        if (p) flaggedPractices.add(p.id);
        items.push({
          id: `replacement-${c.id}-${a.replacementPracticeId}-${a.from}`,
          title: `Vertretung ${p?.practiceName ?? "unbekannt"} nicht nutzbar`,
          text: `${CLOSURE_TITLE[c.kind]} ${dateRange(c.startDate, c.endDate)}: Die Vertretungsangaben sind für ${dateRange(a.from, a.until)} nicht ärztlich bestätigt oder laufen vorher ab. Die Website zeigt dann nur die Notfall-Hinweise.`,
          // 09.5G: straight to the directory entry (physician confirmation / ADMIN correction).
          ...(p ? { action: { label: "Vertretung prüfen", href: `/intern/vertretungen/${encodeURIComponent(p.id)}` } } : {}),
        });
      }
    }
  }

  // 09.5G: a once-confirmed directory entry whose confirmation EXPIRED needs a physician — one item
  // per practice, merged with a closure warning for the same practice. Never-confirmed ADMIN drafts
  // stay in /intern/vertretungen ("ärztliche Bestätigung erforderlich"), not on the home screen.
  for (const p of data.replacementPractices) {
    if (flaggedPractices.has(p.id) || p.verification.status !== "VERIFIED_CURRENT") continue;
    if (evaluateFreshness(p.verification, today, "replacementPractice") !== "REVIEW_EXPIRED") continue;
    items.push({
      id: `replacement-review-${p.id}`,
      title: "Vertretungspraxis erneut bestätigen",
      text: `Die ärztliche Bestätigung von ${p.practiceName} ist abgelaufen. Die Praxis kann bis zur erneuten Bestätigung nicht als Vertretung ausgewählt werden.`,
      action: { label: "Vertretung prüfen", href: `/intern/vertretungen/${encodeURIComponent(p.id)}` },
    });
  }

  for (const x of [...notExpired(data.closures, today), ...notExpired(data.exceptions, today)]) {
    if (!verified(x)) items.push({ id: `unconfirmed-${x.id}`, title: "Eintrag nicht bestätigt", text: `Der Eintrag für ${dateRange(x.startDate, x.endDate)} ist nicht bestätigt und erscheint deshalb nicht auf der Website.` });
  }

  // Published notices that need a person: open-ended ones at / after their review date, and notices
  // the publication rule no longer shows (or shows with a warning). A future start or a finite end
  // date is normal and raises nothing.
  for (const a of announcements) {
    if (!a.published || announcementExpired(a, today) || compareDates(a.validFrom, today) > 0) continue;
    const d = decideAnnouncement(a, today);
    const due = a.verification.reviewDue;
    if (a.validUntil === "OPEN_ENDED" && due && compareDates(due, today) <= 0) {
      items.push({ id: `notice-review-${a.id}`, title: `Hinweis „${a.title}“ prüfen`, text: `Der Hinweis hat kein Enddatum. Die vorgesehene Prüfung war am ${formatGermanDate(due)}: bitte bestätigen, ändern oder zurücknehmen.` });
    } else if (d.mode === "PUBLIC_WITH_WARNING" || (!d.visible && a.verification.status === "VERIFIED_CURRENT")) {
      items.push({ id: `notice-review-${a.id}`, title: `Hinweis „${a.title}“ prüfen`, text: d.editorMessages[0] ?? "Bitte prüfen." });
    }
  }
  return items;
}

export function cockpitHome(input: CockpitInput): CockpitHome {
  const today = todayView(input.data, input.now);
  return { today, upcoming: upcomingItems(input.data, input.announcements, today.date), review: reviewItems(input.data, today.date, input.announcements) };
}
