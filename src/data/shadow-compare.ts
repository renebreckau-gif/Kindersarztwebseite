// Pure STATIC-vs-PAYLOAD shadow comparison (Phase 09.6B). No React, no Payload. Compares the domain
// snapshots AND everything parents would see derived from them, with the SAME helpers the public site
// uses (engine, public notice selection, homepage highlight, WeekHours / DayRuler views).
//
// Order: PulsData collections are sets (records sorted by id, holidays by date, types by code) — storage
// order never creates a false difference. Presentation lists keep their real semantics: the public notice
// selection and the slot views are compared in the order the site renders them.

import type { Announcement } from "../domain/content-types.ts";
import { getPracticeStatus, type PulsData } from "../domain/practice-status.ts";
import { selectPublicAnnouncements } from "../domain/publication.ts";
import { addDays, zonedToInstant, type IsoWeekday, type LocalDate, type LocalTime } from "../domain/time.ts";
import { selectHomepageHighlight } from "../content/homepage-highlight.ts";
import { slotsFor, weekHoursView } from "../content/schedule.ts";
import type { PublicOperationalSnapshot } from "./public-operational.ts";

export type ShadowDifferenceKind = "PULS_DATA" | "ANNOUNCEMENTS" | "STATUS" | "PUBLIC_ANNOUNCEMENTS" | "HOMEPAGE_HIGHLIGHT" | "WEEK_HOURS" | "DAY_RULER" | "READ_STATE";
export interface ShadowDifference {
  kind: ShadowDifferenceKind;
  date?: LocalDate;
  time?: LocalTime;
  description: string;
}
export interface ShadowComparison {
  equal: boolean;
  differences: ShadowDifference[];
}

/** Representative instants (Europe/Berlin) + a systematic window. */
export interface ShadowWindow {
  instants: { date: LocalDate; time: LocalTime }[];
  /** First day of the systematic sampling (every full hour for `days` days). */
  from?: LocalDate;
  days?: number;
}

const ALL_DAYS: { id: IsoWeekday }[] = [1, 2, 3, 4, 5, 6, 7].map((id) => ({ id: id as IsoWeekday }));
const byId = <T extends { id: string }>(list: T[]) => [...list].sort((a, b) => a.id.localeCompare(b.id));
/** Canonical JSON: object keys sorted (storage builds keys in another order), undefined dropped; arrays keep their order. */
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.keys(v as Record<string, unknown>)
        .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
        .sort()
        .map((k) => [k, canonical((v as Record<string, unknown>)[k])]),
    );
  }
  return v;
}
const same = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

/** Canonical PulsData: set-like collections ordered deterministically; schedule rules by id. */
export function canonicalPuls(p: PulsData): unknown {
  return {
    schedule: p.schedule ? { ...p.schedule, rules: byId(p.schedule.rules), confirmedClosedWeekdays: [...p.schedule.confirmedClosedWeekdays].sort() } : null,
    consultationTypes: [...p.consultationTypes].sort((a, b) => a.code.localeCompare(b.code)),
    exceptions: byId(p.exceptions),
    closures: byId(p.closures),
    replacementPractices: byId(p.replacementPractices),
    publicHolidays: [...p.publicHolidays].sort(),
    holidayPolicy: p.holidayPolicy,
  };
}

function instantsOf(w: ShadowWindow): { date: LocalDate; time: LocalTime }[] {
  const out = [...w.instants];
  if (w.from) for (let d = 0; d < (w.days ?? 28); d++) for (let h = 0; h < 24; h++) out.push({ date: addDays(w.from, d), time: `${String(h).padStart(2, "0")}:00` });
  return out;
}

export function compareShadow(base: PublicOperationalSnapshot, shadow: PublicOperationalSnapshot, window: ShadowWindow): ShadowComparison {
  const diffs: ShadowDifference[] = [];
  const add = (d: ShadowDifference) => diffs.push(d);
  if (base.meta.state !== shadow.meta.state) add({ kind: "READ_STATE", description: `Lesestatus ${base.meta.state} ≠ ${shadow.meta.state}` });

  // A. domain snapshots
  const pa = canonicalPuls(base.puls) as Record<string, unknown>;
  const pb = canonicalPuls(shadow.puls) as Record<string, unknown>;
  for (const k of Object.keys(pa)) if (!same(pa[k], pb[k])) add({ kind: "PULS_DATA", description: `PulsData.${k} unterscheidet sich` });
  if (!same(byId(base.announcements), byId(shadow.announcements))) add({ kind: "ANNOUNCEMENTS", description: "Hinweise (Datenstand) unterscheiden sich" });

  // F. WeekHours (all seven weekdays — broader than the rendered Mon–Fri on purpose)
  const wa = weekHoursView(base.puls, ALL_DAYS);
  const wb = weekHoursView(shadow.puls, ALL_DAYS);
  wa.forEach((d, i) => {
    if (!same(d, wb[i])) add({ kind: "WEEK_HOURS", description: `Wochenübersicht Wochentag ${d.weekday} unterscheidet sich` });
  });

  // C–E, G. derived per instant / date
  const dates = new Set<LocalDate>();
  for (const { date, time } of instantsOf(window)) {
    dates.add(date);
    const at = zonedToInstant(date, time);
    const ra = getPracticeStatus(at, base.puls);
    const rb = getPracticeStatus(at, shadow.puls);
    if (!same(ra, rb)) add({ kind: "STATUS", date, time, description: `Status ${ra.status} ≠ ${rb.status} (${ra.reason} / ${rb.reason})` });
    const ha = selectHomepageHighlight({ result: ra, announcements: base.announcements, today: date });
    const hb = selectHomepageHighlight({ result: rb, announcements: shadow.announcements, today: date });
    if (!same(ha, hb)) add({ kind: "HOMEPAGE_HIGHLIGHT", date, time, description: `Startseiten-Hinweis ${ha?.kind ?? "keiner"} ≠ ${hb?.kind ?? "keiner"}` });
  }
  for (const date of dates) {
    const sa = selectPublicAnnouncements(base.announcements, date).map((a: Announcement) => a.id);
    const sb = selectPublicAnnouncements(shadow.announcements, date).map((a: Announcement) => a.id);
    if (!same(sa, sb)) add({ kind: "PUBLIC_ANNOUNCEMENTS", date, description: `Öffentliche Hinweise [${sa.join(", ")}] ≠ [${sb.join(", ")}]` });
  }
  for (const { id } of ALL_DAYS) {
    if (!same(slotsFor(id, base.puls), slotsFor(id, shadow.puls))) add({ kind: "DAY_RULER", description: `Tageslineal Wochentag ${id} unterscheidet sich` });
  }
  return { equal: diffs.length === 0, differences: diffs };
}

/** Kinds present (for compact assertions / diagnostics). */
export const differenceKinds = (c: ShadowComparison) => [...new Set(c.differences.map((d) => d.kind))].sort();
