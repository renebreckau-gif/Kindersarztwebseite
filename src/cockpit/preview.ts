// Website-Vorschau (/intern/vorschau): what the website WOULD show if the database were the
// public source, compared with what it shows today (static snapshot). Both sides run through the
// same engine; this module only compares the results and words the differences. Diagnostic tool
// for STAGING — only reachable inside the authenticated cockpit.

import { getPracticeStatus, type PracticeStatusResult, type PulsData } from "../domain/practice-status.ts";
import { isLocalDate, zonedToInstant, type LocalDate, type LocalTime } from "../domain/time.ts";
import { berlinNow, dateRange } from "./read-model.ts";

export interface PreviewInstant {
  date: LocalDate;
  time: LocalTime;
  at: Date;
  /** The input was invalid and the current Berlin time is used instead. */
  corrected: boolean;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Parse "Datum" / "Uhrzeit" (Europe/Berlin). Missing or invalid → now. Future dates allowed. */
export function previewInstant(datum: unknown, zeit: unknown, now: Date): PreviewInstant {
  const current = berlinNow(now);
  const d = typeof datum === "string" && datum ? datum : current.date;
  const t = typeof zeit === "string" && zeit ? zeit : current.time;
  if (!isLocalDate(d) || !TIME.test(t)) return { ...current, at: now, corrected: true };
  return { date: d, time: t, at: zonedToInstant(d, t), corrected: false };
}

export interface PreviewComparison {
  database: PracticeStatusResult;
  website: PracticeStatusResult;
  equal: boolean;
  /** Plain-German, meaningful differences (empty when equal). */
  differences: string[];
}

const interval = (i?: { start: string; end: string }) => (i ? `${i.start}–${i.end} Uhr` : "keine");
const opening = (n?: { label: string } | null) => (n === undefined ? "–" : n === null ? "nicht sicher bestimmbar" : n.label);
const closure = (c?: { kind: string; startDate: string; endDate: string }) => (c ? `${c.kind === "VACATION" ? "Urlaub" : "Schließung"} ${dateRange(c.startDate, c.endDate)}` : "keine");
const reps = (r: PracticeStatusResult) => r.replacementPractices.map((p) => `${p.practiceName} (${dateRange(p.from, p.until)})`).join(", ") || "keine";
const CONFIDENCE: Record<PracticeStatusResult["dataConfidence"], string> = { VERIFIED: "bestätigt", REVIEW_DUE: "Prüfung fällig", UNKNOWN: "unsicher" };

export function comparePreview(websiteData: PulsData, databaseData: PulsData, at: Date): PreviewComparison {
  const website = getPracticeStatus(at, websiteData);
  const database = getPracticeStatus(at, databaseData);
  const differences: string[] = [];
  const diff = (label: string, w: string, d: string) => {
    if (w !== d) differences.push(`${label}: Website „${w}“ · Datenbank „${d}“`);
  };
  diff("Status", website.headline, database.headline);
  diff("Hinweis", website.detail, database.detail);
  diff("Aktuelle Sprechzeit", interval(website.currentInterval), interval(database.currentInterval));
  diff("Nächste Sprechzeit", opening(website.nextOpening), opening(database.nextOpening));
  diff("Schließung", closure(website.activeClosure ?? website.upcomingClosure), closure(database.activeClosure ?? database.upcomingClosure));
  diff("Geänderte Sprechzeiten", website.activeException?.intervals.join(", ") ?? "keine", database.activeException?.intervals.join(", ") ?? "keine");
  diff("Vertretung", reps(website), reps(database));
  diff("Datensicherheit", CONFIDENCE[website.dataConfidence], CONFIDENCE[database.dataConfidence]);
  if (!differences.length && (website.status !== database.status || website.reason !== database.reason)) {
    differences.push(`Interne Bewertung abweichend (${website.status}/${website.reason} · ${database.status}/${database.reason})`);
  }
  return { website, database, equal: differences.length === 0, differences };
}
