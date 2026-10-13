"use client";

// Reusable cockpit pattern (Phase 09.1.3):
// EDIT → LIVE WEBSITE PREVIEW → PUBLISH → AUTO-EXPIRE → NORMAL RULES RESUME.
// Desktop: change left, Website-Vorschau right. Mobile/tablet: change, preview, then the exact
// publish action. Every status shown here is a real engine result (previewPair / statusAt);
// this file has no open/closed logic of its own.

import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import s from "../cockpit.module.css";
import { StatusMark } from "@/design-system/components/primitives";
import type { PracticeStatusResult } from "@/domain/practice-status";
import { Glyph } from "../ui";
import { ParentStatus, ReplacementCards } from "./parent";
import { afterEnd, dateRange, longDate, previewPair, type CockpitData, type Problem, type ReplacementPeriod } from "../model";
import type { LocalDate, LocalTime } from "@/domain/time";

/** Grid: edit | preview, actions below the edit column; stacked as edit → preview → actions. */
export function EditLayout({ edit, preview, actions }: { edit: ReactNode; preview: ReactNode; actions: ReactNode }) {
  return (
    <div className={s.editLayout}>
      <section className={s.editPane} aria-label="Änderung">
        <h2 className={s.paneTitle}>Änderung</h2>
        {edit}
      </section>
      <div className={s.previewPane}>{preview}</div>
      <div className={s.publishPane}>{actions}</div>
    </div>
  );
}

export interface Moment {
  /** e.g. "Jetzt · 09:20 Uhr", "Ab 12:00 Uhr", "Montag, 19. Oktober, 09:00 Uhr" */
  label: string;
  date: LocalDate;
  time: LocalTime;
  /** Show "Aktuell auf der Website" next to "Mit dieser Änderung" for this moment. */
  compare?: boolean;
  /** Extra website content under the status (e.g. replacement cards). */
  extra?: (result: PracticeStatusResult) => ReactNode;
}

function CompactStatus({ result }: { result: PracticeStatusResult }) {
  return (
    <p className={s.compact}>
      {result.indicator === "NONE" ? null : <StatusMark indicator={result.indicator} />}
      <span>
        <strong>{result.headline}</strong> · {result.detail}
      </span>
    </p>
  );
}

/** Announces only a settled summary, never every keystroke, and never moves focus. */
function useSettled(text: string, ms = 900) {
  const [settled, setSettled] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setSettled(text), ms);
    return () => window.clearTimeout(t);
  }, [text, ms]);
  return settled;
}

export function LivePreview({ base, draft, moments, problem, footer }: { base: CockpitData; draft: CockpitData | null; moments: Moment[]; problem?: Problem | null; footer?: ReactNode }) {
  const id = useId();
  const pairs = moments.map((m) => ({ m, p: previewPair(base, problem ? null : draft, m.date, m.time) }));
  const first = pairs[0]?.p;
  const summary = first ? `${first.changed ? "Mit dieser Änderung" : "Aktuell auf der Website"}: ${(first.changed ?? first.current).headline}, ${(first.changed ?? first.current).detail}` : "";
  const settled = useSettled(summary);

  return (
    <section className={s.live} aria-labelledby={`${id}-t`}>
      <div className={s.liveHead}>
        <h2 id={`${id}-t`} className={s.liveTitle}>
          <Glyph name="eye" size={20} />
          Website-Vorschau
        </h2>
        <p className={s.muted}>So sieht es auf der Website aus.</p>
      </div>
      <p className="visually-hidden" aria-live="polite">
        {settled}
      </p>

      {problem ? (
        <div className={s.liveProblem} role="alert">
          <p className={s.inlineBlockTitle}>{problem.title}</p>
          <p>{problem.text}</p>
          <p className={s.muted}>So wird die Änderung nicht veröffentlicht. Die Website zeigt weiter den bisherigen Stand.</p>
          {problem.relatedIds[0] ? (
            <Link className={s.textLink} href={`/lab/praxis-cockpit/verlauf/eintrag?objekt=${encodeURIComponent(problem.relatedIds[0])}`}>
              Bestehende Änderung ansehen
            </Link>
          ) : null}
        </div>
      ) : null}

      {pairs.map(({ m, p }, i) => {
        const shown = p.changed ?? p.current;
        return (
          <div key={`${m.label}-${i}`} className={s.moment}>
            <p className={s.momentLabel}>{m.label}</p>
            {p.changed && m.compare ? (
              <div className={s.before}>
                <p className={s.tagCurrent}>Aktuell auf der Website</p>
                <CompactStatus result={p.current} />
              </div>
            ) : null}
            <p className={p.changed ? s.tagChanged : s.tagCurrent}>{p.changed ? "Mit dieser Änderung" : "Aktuell auf der Website"}</p>
            <div className={`ds-root ${s.momentBody}`}>
              <ParentStatus result={shown} open={null} onAction={() => {}} onCall={() => {}} staticActions />
              {m.extra ? m.extra(shown) : null}
            </div>
          </div>
        );
      })}
      {footer}
    </section>
  );
}

/** Website section "Vertretung" as it will appear (cards lead with the dates). */
export function ReplacementPreview({ periods }: { periods: ReplacementPeriod[] }) {
  if (!periods.length) return null;
  return (
    <div className={s.parentSection}>
      <h3 className={s.parentSectionTitle}>Vertretung</h3>
      <ReplacementCards periods={periods} onCall={() => {}} staticCall />
    </div>
  );
}

/** "Gültig … / Danach …" — the validity window is part of the publishing decision. */
export function Validity({ data, from, to, noun }: { data: CockpitData | null; from: LocalDate; to: LocalDate; noun: string }) {
  const after = data ? afterEnd(data, to) : null;
  return (
    <div className={s.validity}>
      <h3 className={s.h3}>Automatisches Ende</h3>
      <dl className={s.validityList}>
        <div>
          <dt>Gültig</dt>
          <dd>{from === to ? longDate(from) : dateRange(from, to)}</dd>
        </div>
        <div>
          <dt>Danach</dt>
          <dd>{after && !after.clear ? "nicht eindeutig" : "reguläre Sprechzeiten"}</dd>
        </div>
      </dl>
      <p>
        {noun} endet am {longDate(to)} automatisch. Danach gelten wieder die regulären Sprechzeiten, sofern keine andere Sonderregel aktiv ist.
      </p>
      {after ? <p className={after.clear ? s.muted : s.unclear}>{after.text}</p> : null}
    </div>
  );
}
