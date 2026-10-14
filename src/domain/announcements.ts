// Structural rules of an announcement ("Hinweis") — ONE helper for the cockpit workflow and the
// Payload collection hook (REST / admin writes), so the invariants cannot drift apart.
// Framework-free. Time-dependent rules (no start in the past, …) belong to the workflow; these
// rules hold for every stored record, at any time.

import { compareDates, isLocalDate } from "./time.ts";

export const ANNOUNCEMENT_TITLE_MAX = 80;
export const ANNOUNCEMENT_TEXT_MAX = 280;
/** Default priority of a new announcement (same as the collection default). */
export const ANNOUNCEMENT_DEFAULT_PRIORITY = 10;

/** Collapse whitespace and trim (titles and short texts are single-paragraph plain text). */
export const normalizeText = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

export type AnnouncementField = "title" | "shortText" | "validFrom" | "validUntil";

export interface AnnouncementShape {
  title?: string | null;
  shortText?: string | null;
  validFrom?: string | null;
  /** Storage: a LocalDate for finite notices, null/empty when open-ended. */
  validUntil?: string | null;
  openEnded?: boolean | null;
}

/** Problems of a stored / to-be-stored announcement, per field, in plain German. Empty = valid. */
export function announcementShapeProblems(a: AnnouncementShape): { field: AnnouncementField; message: string }[] {
  const out: { field: AnnouncementField; message: string }[] = [];
  const title = normalizeText(a.title);
  const text = normalizeText(a.shortText);
  if (!title) out.push({ field: "title", message: "Bitte einen Titel eingeben." });
  else if (title.length > ANNOUNCEMENT_TITLE_MAX) out.push({ field: "title", message: `Der Titel darf höchstens ${ANNOUNCEMENT_TITLE_MAX} Zeichen lang sein (jetzt ${title.length}).` });
  if (!text) out.push({ field: "shortText", message: "Bitte einen kurzen Hinweistext eingeben." });
  else if (text.length > ANNOUNCEMENT_TEXT_MAX) out.push({ field: "shortText", message: `Der Hinweis darf höchstens ${ANNOUNCEMENT_TEXT_MAX} Zeichen lang sein (jetzt ${text.length}).` });
  const from = a.validFrom ?? "";
  if (!isLocalDate(from)) out.push({ field: "validFrom", message: from ? "„Gültig ab“ ist kein gültiges Datum." : "Bitte angeben, ab wann der Hinweis gilt." });
  if (a.openEnded) {
    if (a.validUntil) out.push({ field: "validUntil", message: "Ein Hinweis ohne Enddatum darf kein „Gültig bis“ haben." });
  } else {
    const until = a.validUntil ?? "";
    if (!until) out.push({ field: "validUntil", message: "Bitte ein Enddatum angeben – oder „Ohne Enddatum“ wählen." });
    else if (!isLocalDate(until)) out.push({ field: "validUntil", message: "„Gültig bis“ ist kein gültiges Datum." });
    else if (isLocalDate(from) && compareDates(until, from) < 0) out.push({ field: "validUntil", message: "„Gültig bis“ liegt vor „Gültig ab“." });
  }
  return out;
}
