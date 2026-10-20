// Homepage highlight (Phase 10.0A, customer decision "Variant B"): AT MOST ONE current notice
// below PRAXIS PULS on the start page — or nothing. Pure: no React, no database.
//
// Sources (existing models only, no banner type):
//   1. an announced UPCOMING practice closure — the engine's own `upcomingClosure`
//      (Closure + announceFrom + verification, decided by getPracticeStatus)
//   2. an announcement marked `homepageHighlight`, AFTER the public publication rule
//      (selectPublicAnnouncements → decideAnnouncement); the first in priority order
// Priority: planned closure before announcement — it decides whether families can come at all.
// While a closure is ACTIVE, PRAXIS PULS already says so: no closure highlight is added then
// (no "Praxis geschlossen" twice). The renderer gets a tiny view model, never domain records.

import type { Announcement, ClosureKind } from "../domain/content-types.ts";
import type { PracticeStatusResult } from "../domain/practice-status.ts";
import { selectPublicAnnouncements } from "../domain/publication.ts";
import { formatDayMonth, formatShortRange, type LocalDate } from "../domain/time.ts";

export interface HomepageHighlight {
  kind: "CLOSURE" | "ANNOUNCEMENT";
  /** Record behind the highlight (announcements: excluded from the lower list on the same page). */
  sourceId: string;
  /** Visual family: planned closure (warm) or general notice (paper). Never emergency. */
  tone: "closure" | "notice";
  eyebrow: string;
  title: string;
  detail?: string;
  href: string;
  linkLabel: string;
}

const CLOSURE_COPY: Record<ClosureKind, { eyebrow: string; noun: string }> = {
  VACATION: { eyebrow: "Praxisurlaub", noun: "Urlaub" },
  TRAINING: { eyebrow: "Hinweis", noun: "Fortbildung" },
  OTHER: { eyebrow: "Aktueller Hinweis", noun: "Praxis geschlossen" },
  SHORT_NOTICE: { eyebrow: "Aktueller Hinweis", noun: "Praxis geschlossen" },
};

/** "am 24. Oktober" · "vom 19.–23. Oktober" · "vom 30. Oktober bis 2. November". */
export function closureWhen(from: LocalDate, to: LocalDate): string {
  if (from === to) return `am ${formatDayMonth(from)}`;
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  return sameMonth ? `vom ${formatShortRange(from, to)}` : `vom ${formatDayMonth(from, from.slice(0, 4) !== to.slice(0, 4))} bis ${formatDayMonth(to, from.slice(0, 4) !== to.slice(0, 4))}`;
}

export function selectHomepageHighlight({ result, announcements, today }: { result: PracticeStatusResult; announcements: Announcement[]; today: LocalDate }): HomepageHighlight | null {
  const closure = result.activeClosure ? undefined : result.upcomingClosure;
  if (closure) {
    const copy = CLOSURE_COPY[closure.kind];
    return {
      kind: "CLOSURE",
      sourceId: closure.id,
      tone: "closure",
      eyebrow: copy.eyebrow,
      title: `${copy.noun} ${closureWhen(closure.startDate, closure.endDate)}`,
      // Only the closure's own public message — the title already says what it is (calm on phones).
      ...(closure.message ? { detail: closure.message } : {}),
      href: "/heute",
      linkLabel: "Mehr unter „Heute“",
    };
  }
  const notice = selectPublicAnnouncements(announcements, today).find((a) => a.homepageHighlight);
  if (notice) {
    return {
      kind: "ANNOUNCEMENT",
      sourceId: notice.id,
      tone: "notice",
      eyebrow: "Hinweis",
      title: notice.title,
      detail: notice.shortText,
      href: "/heute/aktuelles",
      linkLabel: "Alle Hinweise",
    };
  }
  return null;
}

/** Announcement ids the lower homepage list must not repeat (the highlighted one, if any). */
export const highlightedAnnouncementIds = (h: HomepageHighlight | null): string[] => (h?.kind === "ANNOUNCEMENT" ? [h.sourceId] : []);
