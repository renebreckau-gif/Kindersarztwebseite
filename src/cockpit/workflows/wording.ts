// Plain-German wording for the real cockpit workflows (UI layer on top of domain codes).

import type { ReasonCode } from "../../domain/practice-status.ts";
import type { PublicReason } from "./types.ts";

/** Why "today" cannot be judged safely — the engine's reason in understandable words. */
export const UNKNOWN_REASON: Partial<Record<ReasonCode, string>> = {
  NO_SCHEDULE: "Es ist kein Wochenplan hinterlegt.",
  SCHEDULE_UNVERIFIED: "Der Wochenplan ist nicht bestätigt.",
  SCHEDULE_REVIEW_EXPIRED: "Die Bestätigung des Wochenplans ist abgelaufen.",
  RULE_UNVERIFIED: "Eine Sprechzeit von heute ist nicht bestätigt.",
  RULE_CONFLICT: "Die Sprechzeiten von heute widersprechen sich.",
  NO_RULES_FOR_DAY: "Für heute sind keine Sprechzeiten hinterlegt und der Tag ist nicht als geschlossen bestätigt.",
  INVALID_DATA: "Die Angaben für heute sind unvollständig.",
  EXCEPTION_UNVERIFIED: "Eine Änderung für heute ist nicht bestätigt.",
  EXCEPTION_CONFLICT: "Für heute gibt es zwei widersprüchliche Änderungen.",
  CLOSURE_UNVERIFIED: "Eine Schließung für heute ist nicht bestätigt.",
  CLOSURE_EXCEPTION_CONFLICT: "Für heute gibt es eine Schließung und gleichzeitig geänderte Sprechzeiten.",
  HOLIDAY_WITHOUT_RULE: "Heute ist ein Feiertag, für den nicht eingetragen ist, ob die Praxis geöffnet ist.",
  HOLIDAY_POLICY_UNVERIFIED: "Die Feiertagsregel ist nicht bestätigt.",
  ACUTE_CONFLICT: "Die Akutsprechstunde von heute widerspricht den Sprechzeiten.",
};

export const unknownReason = (code: ReasonCode) => UNKNOWN_REASON[code] ?? "Der heutige Tag kann nicht sicher beurteilt werden.";

/** Predefined public reasons for "Heute geschlossen" (none is required). */
export const REASON_TEXT: Record<Exclude<PublicReason, "SONSTIGES" | "KEINER">, string> = {
  KRANKHEIT: "Die Praxis ist heute wegen Krankheit geschlossen.",
  FORTBILDUNG: "Die Praxis ist heute wegen einer Fortbildung geschlossen.",
  TECHNIK: "Die Praxis ist heute wegen einer technischen Störung geschlossen.",
};

export const REASON_LABEL: Record<PublicReason, string> = {
  KRANKHEIT: "Krankheit",
  FORTBILDUNG: "Fortbildung",
  TECHNIK: "Technische Störung",
  KEINER: "Kein Grund anzeigen",
  SONSTIGES: "Sonstiges",
};

export const PRIVACY_HINT = "Keine Namen von Patientinnen und Patienten und keine Diagnosen eintragen.";

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const parts = (d: string) => d.split("-").map(Number) as [number, number, number];

/** "22. Oktober" (with the year when asked). */
export function dayMonth(d: string, withYear = false): string {
  const [y, m, day] = parts(d);
  return `${day}. ${MONTHS[m - 1]}${withYear ? ` ${y}` : ""}`;
}

/** Compact range: "22. Oktober" · "19.–23. Oktober" · "30. Oktober – 2. November" · across years with years. */
export function shortRange(from: string, to: string): string {
  if (from === to) return dayMonth(from);
  const [fy, fm, fd] = parts(from);
  const [ty, tm] = parts(to);
  if (fy !== ty) return `${dayMonth(from, true)} – ${dayMonth(to, true)}`;
  if (fm === tm) return `${fd}.–${dayMonth(to)}`;
  return `${dayMonth(from)} – ${dayMonth(to)}`;
}

/** Title of a closure kind in sentences ("Urlaub 19.–23. Oktober"). */
export const CLOSURE_KIND_TITLE = { VACATION: "Urlaub", TRAINING: "Fortbildung", OTHER: "Schließung", SHORT_NOTICE: "Kurzfristige Schließung" } as const;

/** What parents see without a replacement (09.5A wording, reused for planned closures). */
export const NO_REPLACEMENT_EFFECT = "Die Website zeigt in diesem Zeitraum Telefon und Notfall-Hinweise.";

/** Staging-truthful publish wording (public website still static in 09.5A). */
export const STAGING_PUBLISHED = {
  title: "In der Testumgebung veröffentlicht",
  database: "Die Cockpit-Datenbank wurde aktualisiert.",
  website: "Die öffentliche Website verwendet derzeit noch die bisherigen Daten.",
  /** Shown BEFORE publishing (future tense: nothing is stored yet). */
  storedNote: "Die Änderung wird in der Cockpit-Datenbank gespeichert. Die öffentliche Website verwendet weiterhin die bisherigen Daten.",
} as const;

/** Concurrency detector message (09.5A / 09.5B) — the same text for publish and undo. */
export const STALE_UNDO = "Inzwischen wurde etwas geändert. Bitte prüfen Sie die Vorschau erneut.";

/** Truthful staging wording after an undo (public website still static). */
export const STAGING_REVERTED = {
  title: "Die Änderung wurde in der Testumgebung zurückgenommen.",
  website: "Die öffentliche Website verwendet weiterhin die bisherigen Daten.",
} as const;