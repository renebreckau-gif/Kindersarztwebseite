// "Hinweis veröffentlichen" (Phase 09.5D) — pure draft builder. No Payload, no React.
// Current ACTIVE announcements + the person's fields + server date + fingerprint → ready draft or
// plain-German problems. Publication visibility is never decided here: decideAnnouncement /
// selectPublicAnnouncements (src/domain/publication.ts) answer it for every preview date.
// The same function runs for the preview AND again inside the publish transaction.

import type { Announcement } from "../../domain/content-types.ts";
import { decideAnnouncement, selectPublicAnnouncements, type PublicationDecision } from "../../domain/publication.ts";
import { ANNOUNCEMENT_DEFAULT_PRIORITY, announcementShapeProblems, normalizeText, type AnnouncementField } from "../../domain/announcements.ts";
import type { FactVerification } from "../../domain/verification.ts";
import { addDays, compareDates, isLocalDate, type LocalDate } from "../../domain/time.ts";
import { reviewDueFor } from "../../backend/provenance.ts";
import { berlinNow } from "../read-model.ts";
import { dayMonth } from "./wording.ts";

export type AnnouncementSection = "titel" | "text" | "zeitraum";
export type AnnouncementMode = "FINITE" | "OPEN";

/** Exactly what a person chooses — category, priority, highlight, published, provenance are server-side. */
export interface AnnouncementInput {
  /** Domain record id of the ACTIVE announcement being edited (from the route; re-loaded on the server). */
  recordId?: string;
  title: string;
  shortText: string;
  validFrom: string;
  mode?: AnnouncementMode;
  /** Only for FINITE. */
  validUntil: string;
}

/** Proposal for a new finite notice: today + 14 days (no minimum duration). */
export const FINITE_DEFAULT_DAYS = 14;
export const OPEN_ENDED_NOTE = "Dieser Hinweis hat kein Enddatum und sollte regelmäßig geprüft werden.";

const SECTION: Record<AnnouncementField, AnnouncementSection> = { title: "titel", shortText: "text", validFrom: "zeitraum", validUntil: "zeitraum" };
const SECTION_ORDER: AnnouncementSection[] = ["titel", "text", "zeitraum"];

/** Current or future (not fully expired). Expired ones are history — no editing, no quick undo. */
export const isEditableAnnouncement = (a: Announcement, today: LocalDate) => a.validUntil === "OPEN_ENDED" || compareDates(a.validUntil, today) >= 0;

export const formDefaults = (today: LocalDate): AnnouncementInput => ({ title: "", shortText: "", validFrom: today, mode: "FINITE", validUntil: addDays(today, FINITE_DEFAULT_DAYS) });

export function inputFromAnnouncement(a: Announcement): AnnouncementInput {
  return { recordId: a.id, title: a.title, shortText: a.shortText, validFrom: a.validFrom, mode: a.validUntil === "OPEN_ENDED" ? "OPEN" : "FINITE", validUntil: a.validUntil === "OPEN_ENDED" ? "" : a.validUntil };
}

/** "Sichtbar vom 14. Oktober bis 28. Oktober" / "Ab 14. Oktober ohne Enddatum". */
export function validityText(a: Pick<Announcement, "validFrom" | "validUntil">): string {
  return a.validUntil === "OPEN_ENDED" ? `Ab ${dayMonth(a.validFrom)} ohne Enddatum` : `Sichtbar vom ${dayMonth(a.validFrom)} bis ${dayMonth(a.validUntil)}`;
}

/** Plain-German state of a stored notice today — from the publication rule, not re-derived. */
export function noticeState(a: Announcement, today: LocalDate): { label: string; attention: boolean } {
  const d = decideAnnouncement(a, today);
  if (d.visible) return { label: d.mode === "PUBLIC_WITH_WARNING" ? `Sichtbar · ${d.editorMessages[0]}` : "Sichtbar", attention: d.mode === "PUBLIC_WITH_WARNING" };
  if (a.published && compareDates(today, a.validFrom) < 0 && a.verification.status === "VERIFIED_CURRENT") return { label: `Sichtbar ab ${dayMonth(a.validFrom)}`, attention: false };
  return { label: d.editorMessages[0] ?? "Nicht sichtbar", attention: true };
}

export interface AnnouncementMoment {
  kind: "TODAY" | "START" | "END" | "AFTER" | "REVIEW";
  label: string;
  date: LocalDate;
  /** decideAnnouncement for THIS notice on that day. */
  decision: PublicationDecision;
  /** Public selection from the database now / with the change (selectPublicAnnouncements). */
  before: Announcement[];
  after: Announcement[];
}

export interface AnnouncementProblem {
  section?: AnnouncementSection;
  code: "INVALID_INPUT" | "NOT_EDITABLE" | "NO_CHANGE";
  message: string;
}

export type AnnouncementDraft =
  | {
      ok: true;
      mode: "NEW" | "EDIT";
      record: Announcement;
      reviewDue: LocalDate;
      before: Announcement[];
      after: Announcement[];
      actionLabel: string;
      effect: string;
      fingerprint: string;
      today: LocalDate;
    }
  | { ok: false; blocked: AnnouncementProblem; fingerprint: string; today: LocalDate };

export interface AnnouncementResult {
  draft: AnnouncementDraft;
  details: { today: LocalDate; input: AnnouncementInput; editing?: Announcement; problems: AnnouncementProblem[]; moments: AnnouncementMoment[]; record?: Announcement; reviewDue?: LocalDate };
}

const business = (a: Announcement) => JSON.stringify([a.title, a.shortText, a.validFrom, a.validUntil, a.category, a.priority, a.homepageHighlight, a.published]);

export function announcementDraft(announcements: Announcement[], now: Date, raw: AnnouncementInput, fingerprint: string): AnnouncementResult {
  const today = berlinNow(now).date;
  const problems: AnnouncementProblem[] = [];
  const add = (section: AnnouncementSection | undefined, message: string, code: AnnouncementProblem["code"] = "INVALID_INPUT") => problems.push({ section, code, message });
  const fail = (): AnnouncementResult => {
    const first = [...problems].sort((a, b) => rank(a.section) - rank(b.section))[0];
    return { draft: { ok: false, blocked: first, fingerprint, today }, details: { today, input: raw, editing, problems, moments: [] } };
  };

  // ---- which record (edit = the SAME domain record id from the route, re-loaded here)
  let editing: Announcement | undefined;
  if (raw.recordId !== undefined) {
    editing = announcements.find((a) => a.id === raw.recordId);
    if (!editing || !isEditableAnnouncement(editing, today)) {
      add(undefined, "Dieser Hinweis kann hier nicht bearbeitet werden: Er existiert nicht (mehr), ist bereits abgelaufen oder wurde zurückgenommen.", "NOT_EDITABLE");
      return fail();
    }
  }

  const input = raw;
  const open = input.mode === "OPEN";
  if (!input.mode) add("zeitraum", "Bitte wählen: mit Enddatum oder ohne Enddatum.");
  // Structural rules: the SAME helper the Payload collection hook enforces for every write path.
  for (const p of announcementShapeProblems({ title: input.title, shortText: input.shortText, validFrom: input.validFrom, validUntil: open ? null : input.validUntil, openEnded: open })) {
    if (p.field === "validUntil" && !input.mode) continue;
    add(SECTION[p.field], p.message);
  }
  // Time-dependent rules (server date, Europe/Berlin).
  if (isLocalDate(input.validFrom) && compareDates(input.validFrom, today) < 0 && !(editing && input.validFrom === editing.validFrom)) {
    add("zeitraum", editing ? "Ein laufender Hinweis behält seinen ursprünglichen Beginn – oder er beginnt heute oder später." : "„Gültig ab“ liegt in der Vergangenheit. Bitte heute oder einen späteren Tag wählen.");
  }
  if (input.mode === "FINITE" && isLocalDate(input.validUntil) && compareDates(input.validUntil, today) < 0) {
    add("zeitraum", "„Gültig bis“ liegt in der Vergangenheit – der Hinweis wäre sofort abgelaufen.");
  }
  if (problems.length) return fail();

  const validUntil: Announcement["validUntil"] = open ? "OPEN_ENDED" : input.validUntil;
  const reviewDue = reviewDueFor("ANNOUNCEMENT", { validUntil: open ? null : input.validUntil, openEnded: open }, today);
  // Provenance the publish hook will generate — PREVIEW only (the stored one comes from the hook).
  const verification: FactVerification = { status: "VERIFIED_CURRENT", lastVerified: today, reviewDue, verifiedBy: "Vorschau", sourceIds: ["PRACTICE_COCKPIT"] };
  const record: Announcement = {
    id: editing?.id ?? `hinweis-${input.validFrom}`,
    // Not exposed in V1: the public site does not show categories or homepage highlights yet.
    category: editing?.category ?? "INFO",
    title: normalizeText(input.title),
    shortText: normalizeText(input.shortText),
    validFrom: input.validFrom,
    validUntil,
    priority: editing?.priority ?? ANNOUNCEMENT_DEFAULT_PRIORITY,
    homepageHighlight: editing?.homepageHighlight ?? false,
    // The workflow IS "Hinweis veröffentlichen": the server sets published after full validation.
    published: true,
    verification,
  };
  if (editing && business(editing) === business(record)) {
    add(undefined, "Es wurde nichts geändert. Der Hinweis ist bereits genau so veröffentlicht.", "NO_CHANGE");
    return fail();
  }
  const after = [...announcements.filter((a) => a.id !== record.id), record];

  // ---- preview dates (finite: today, start, end, day after · open-ended: today, start, review date)
  const wanted: { kind: AnnouncementMoment["kind"]; label: string; date: LocalDate }[] = [
    { kind: "TODAY", label: `Heute (${dayMonth(today)})`, date: today },
    { kind: "START", label: `Beginn (${dayMonth(record.validFrom)})`, date: record.validFrom },
    ...(validUntil === "OPEN_ENDED"
      ? [{ kind: "REVIEW" as const, label: `Prüfdatum (${dayMonth(reviewDue)})`, date: reviewDue }]
      : [
          { kind: "END" as const, label: `Letzter Tag (${dayMonth(validUntil)})`, date: validUntil },
          { kind: "AFTER" as const, label: `Erster Tag danach (${dayMonth(addDays(validUntil, 1))})`, date: addDays(validUntil, 1) },
        ]),
  ];
  const seen = new Set<LocalDate>();
  const moments: AnnouncementMoment[] = wanted
    .filter((m) => (seen.has(m.date) ? false : (seen.add(m.date), true)))
    .sort((a, b) => compareDates(a.date, b.date))
    .map((m) => ({ ...m, decision: decideAnnouncement(record, m.date), before: selectPublicAnnouncements(announcements, m.date), after: selectPublicAnnouncements(after, m.date) }));

  const validity = validityText(record);
  const effect = `${editing ? `Bisher: „${editing.title}“ (${validityText(editing)}). Neu: ` : ""}„${record.title}“ – ${validity}.${validUntil === "OPEN_ENDED" ? ` ${OPEN_ENDED_NOTE} Nächste Prüfung spätestens am ${dayMonth(reviewDue)}.` : " Danach verschwindet der Hinweis automatisch."}`;
  return {
    draft: { ok: true, mode: editing ? "EDIT" : "NEW", record, reviewDue, before: announcements, after, actionLabel: editing ? "Geänderten Hinweis veröffentlichen" : "Hinweis veröffentlichen", effect, fingerprint, today },
    details: { today, input, editing, problems, moments, record, reviewDue },
  };
}

const rank = (s: AnnouncementSection | undefined) => (s ? SECTION_ORDER.indexOf(s) : SECTION_ORDER.length);
