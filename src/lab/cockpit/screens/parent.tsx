"use client";

// Parent-facing rendering of the prototype state. Status, dates, replacements and next opening
// come from the real PRAXIS PULS engine (mock data); the look reuses the public components
// (PageIntro, StatusStatement, Section, public action styles). Calls are never dialled here.

import { useState } from "react";
import s from "../cockpit.module.css";
import b from "@/site/blocks.module.css";
import { PageIntro, Section, StatusStatement } from "@/site/blocks";
import { Icon } from "@/design-system/icons";
import { publicEmergency } from "@/content/notices";
import type { PracticeStatusResult } from "@/domain/practice-status";
import { useClock, useCockpit } from "../store";
import { DateField, TimeField, toPulsView } from "../ui";
import { dateRange, dayMonth, longDate, replacementSchedule, statusAt, visibleAnnouncements, type CockpitData, type ReplacementPeriod } from "../model";
import { addDays, isLocalDate, weekdayOf } from "@/domain/time";

type Panel = "vertretung" | "notfall" | null;

/** Inert telephone control: a real-looking action that never dials in the prototype. */
function CallButton({ label, number, onCall, variant = "call", asStatic }: { label: string; number?: string; onCall: (n: string) => void; variant?: "call" | "emergency"; asStatic?: boolean }) {
  if (asStatic)
    return (
      <span className={`${variant === "call" ? b.call : b.emergencyLink} ${s.parentAction} ${s.fauxAction}`}>
        <Icon name={variant === "call" ? "phone" : "alert"} size={20} />
        <span>{label}</span>
      </span>
    );
  return (
    <button type="button" className={`${variant === "call" ? b.call : b.emergencyLink} ${s.parentAction}`} onClick={() => onCall(number ?? label)}>
      <Icon name={variant === "call" ? "phone" : "alert"} size={20} />
      <span>{label}</span>
    </button>
  );
}

/** Status block with the engine's actions (Vertretung anzeigen / Notfall-Hinweise / …). */
export function ParentStatus({ result, open, onAction, onCall, staticActions }: { result: PracticeStatusResult; open: Panel; onAction: (p: Panel) => void; onCall: (n: string) => void; staticActions?: boolean }) {
  const message = result.activeClosure?.message ?? result.activeException?.message;
  const actions = [result.primaryAction, ...result.secondaryActions];
  if (staticActions) {
    // Cockpit preview: the same look, but not focusable — the buttons work on the website only.
    return (
      <div className={s.parentStatus}>
        <StatusStatement puls={toPulsView(result)} />
        {message ? <p className={s.parentMessage}>{message}</p> : null}
        {result.upcomingClosure && !result.activeClosure ? (
          <p className={s.parentMessage}>
            Bitte beachten: Die Praxis ist vom {dayMonth(result.upcomingClosure.startDate)} bis {dayMonth(result.upcomingClosure.endDate)} geschlossen.
          </p>
        ) : null}
        <ul className={s.parentActions} aria-label="Schaltflächen auf der Website">
          {actions.map((a, i) => (
            <li key={a.id} className={`${a.id === "EMERGENCY" ? b.emergencyLink : i === 0 ? b.call : s.btnSecondary} ${s.parentAction} ${s.fauxAction}`}>
              {a.id === "EMERGENCY" ? <Icon name="alert" size={20} /> : null}
              <span>{a.id === "CALL" ? "Praxis anrufen" : a.label}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className={s.parentStatus}>
      <StatusStatement puls={toPulsView(result)} />
      {message ? <p className={s.parentMessage}>{message}</p> : null}
      {result.upcomingClosure && !result.activeClosure ? (
        <p className={s.parentMessage}>
          Bitte beachten: Die Praxis ist vom {dayMonth(result.upcomingClosure.startDate)} bis {dayMonth(result.upcomingClosure.endDate)} geschlossen.
        </p>
      ) : null}
      <div className={s.parentActions}>
        {actions.map((a, i) => {
          if (a.id === "REPLACEMENT")
            return (
              <button key={a.id} type="button" className={`${b.call} ${s.parentAction}`} aria-expanded={open === "vertretung"} aria-controls="vertretung" onClick={() => onAction(open === "vertretung" ? null : "vertretung")}>
                <span>{a.label}</span>
              </button>
            );
          if (a.id === "EMERGENCY")
            return (
              <button key={a.id} type="button" className={`${b.emergencyLink} ${s.parentAction}`} aria-expanded={open === "notfall"} aria-controls="notfall" onClick={() => onAction(open === "notfall" ? null : "notfall")}>
                <Icon name="alert" size={20} />
                <span>{a.label}</span>
              </button>
            );
          if (a.id === "CALL") return <CallButton key={a.id} label="Praxis anrufen" onCall={onCall} />;
          return (
            <button key={a.id} type="button" className={i === 0 ? `${b.call} ${s.parentAction}` : s.btnSecondary} onClick={() => onCall(a.label)}>
              {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Replacement cards: the DATE leads each block — who is responsible when. */
export function ReplacementCards({ periods, onCall, headingLevel = 3, staticCall }: { periods: ReplacementPeriod[]; onCall: (n: string) => void; headingLevel?: 2 | 3; staticCall?: boolean }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <ul className={`${s.repList} ${periods.length === 2 ? s.repTwo : ""}`}>
      {periods.map((p) => (
        <li key={`${p.rep.id}-${p.from}`} className={s.repCard}>
          <p className={s.repDate}>{dateRange(p.from, p.until)}</p>
          <H className={s.repName}>{p.rep.practiceName}</H>
          {p.subtitle ? <p className={s.repSub}>{p.subtitle}</p> : null}
          <p className={s.repAddress}>
            {p.rep.address.split(", ").map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
          <p className={s.repPhone}>
            <span className={s.muted}>Telefon</span> {p.rep.phone}
          </p>
          {p.note ? <p className={s.repNote}>{p.note}</p> : null}
          <CallButton label={`${p.rep.phone} anrufen`} number={p.rep.phone} onCall={onCall} asStatic={staticCall} />
        </li>
      ))}
    </ul>
  );
}

function EmergencyBlock({ date, onCall }: { date: string; onCall: (n: string) => void }) {
  const list = publicEmergency(date);
  return (
    <ul className={s.repList}>
      {list.map((e) => (
        <li key={e.id} className={s.repCard}>
          <p className={s.repDate}>{e.whenToUse}</p>
          <h3 className={s.repName}>{e.name}</h3>
          {e.description ? <p className={s.repSub}>{e.description}</p> : null}
          {e.phone ? <CallButton label={`${e.phone} anrufen`} number={e.phone} onCall={onCall} variant={e.type === "IMMEDIATE_EMERGENCY" ? "emergency" : "call"} /> : null}
        </li>
      ))}
    </ul>
  );
}

/** Full parent page: approximates the public "Heute" page with the prototype data. */
export function ParentView({ initialDate, initialTime, initialPanel }: { initialDate?: string; initialTime?: string; initialPanel?: string }) {
  const { state } = useCockpit();
  const { today, now } = useClock();
  const closure = state.data.closures.filter((c) => c.endDate >= today).sort((a, c) => a.startDate.localeCompare(c.startDate))[0];
  const [date, setDate] = useState(initialDate && isLocalDate(initialDate) ? initialDate : closure?.startDate ?? today);
  const [time, setTime] = useState(initialTime && /^\d{2}:\d{2}$/.test(initialTime) ? initialTime : closure ? "09:00" : now);
  const [open, setOpen] = useState<Panel>(initialPanel === "vertretung" || initialPanel === "notfall" ? initialPanel : null);
  const [called, setCalled] = useState("");

  const valid = isLocalDate(date) && /^\d{2}:\d{2}$/.test(time);
  const result = valid ? statusAt(state.data, date, time) : statusAt(state.data, today, now);
  const periods = result.activeClosure ? replacementSchedule(state.data, result.activeClosure.id, date) : [];
  const notices = visibleAnnouncements(state.data, date);

  const chips: { label: string; date: string }[] = [{ label: `Heute (${dayMonth(today)})`, date: today }];
  if (closure) {
    let before = addDays(closure.startDate, -1);
    while (weekdayOf(before) >= 6) before = addDays(before, -1);
    if (before >= today) chips.push({ label: `Vor dem Urlaub (${dayMonth(before, true)})`, date: before });
    const starts = [...new Set([closure.startDate, ...closure.replacements.map((r) => r.from)])].sort();
    for (const d of starts) chips.push({ label: `Im Urlaub (${dayMonth(d, true)})`, date: d });
    const after = addDays(closure.endDate, 1);
    chips.push({ label: `Danach (${dayMonth(after, true)})`, date: after });
    let next = after;
    while (weekdayOf(next) >= 6) next = addDays(next, 1);
    if (next !== after) chips.push({ label: `Danach (${dayMonth(next, true)})`, date: next });
  }

  return (
    <div className={s.parentPage}>
      <div className={s.parentControls}>
        <p className={s.label} id="eltern-tag">
          Welchen Tag möchten Sie ansehen?
        </p>
        <div className={s.chips} role="group" aria-labelledby="eltern-tag">
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              className={s.chipBtn}
              aria-pressed={date === c.date}
              onClick={() => {
                setDate(c.date);
                setTime("09:00");
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <details className={s.parentMore}>
          <summary>Anderes Datum oder andere Uhrzeit</summary>
          <div className={s.row2}>
            <DateField label="Tag" value={date} onChange={setDate} />
            <TimeField label="Uhrzeit" value={time} onChange={setTime} />
          </div>
        </details>
      </div>

      <div aria-live="polite">
        <PageIntro variant="utility" title="Heute in der Praxis" context={`${longDate(valid ? date : today)}, ${valid ? time : now} Uhr`}>
          <ParentStatus result={result} open={open} onAction={setOpen} onCall={setCalled} />
        </PageIntro>
      </div>
      <p role="status" className={`${s.callNote} ${s.parentInner}`}>
        {called ? `Prototyp: Es wird nicht angerufen (${called}).` : ""}
      </p>

      {open === "vertretung" ? (
        <Section id="vertretung" title="Vertretung" tone="paper">
          {periods.length ? <ReplacementCards periods={periods} onCall={setCalled} /> : <p>Für diesen Tag ist keine Vertretung eingetragen. Bitte nutzen Sie die Notfall-Hinweise.</p>}
        </Section>
      ) : null}
      {open === "notfall" ? (
        <Section id="notfall" title="Notfall-Hinweise" tone="plaster">
          <EmergencyBlock date={date} onCall={setCalled} />
        </Section>
      ) : null}
      <Section id="hinweise" title="Aktuelle Hinweise" tone="paper">
        {notices.length ? (
          <ul className={s.repList}>
            {notices.map((n) => (
              <li key={n.id} className={s.repCard}>
                <h3 className={s.repName}>{n.title}</h3>
                <p>{n.shortText}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>Derzeit gibt es keine besonderen Hinweise.</p>
        )}
      </Section>
    </div>
  );
}
