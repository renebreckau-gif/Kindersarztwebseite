"use client";

import { useState } from "react";
import s from "../cockpit.module.css";
import { useClock, useCockpit } from "../store";
import { Button, Choice, ConfirmedBy, PageHead, Success, TextField, TimeField, useBusy } from "../ui";
import { ReplacementPicker } from "./replacement";
import { EditLayout, ExistingNotice, LivePreview, ReplacementPreview, Validity } from "./live";
import { ROLES, blocks, checkChange, cutAt, entryVerification, existingTodayChange, existingTodayClosure, lastEnd, plannedSegments, replacementSchedule, rulesSegments, withClosure, type CockpitData } from "../model";
import { formatMinutes, parseTime } from "@/domain/time";
import type { Closure } from "@/domain/content-types";

type From = "sofort" | "uhrzeit";
type Reason = "krankheit" | "fortbildung" | "stoerung" | "kein" | "sonstiges";

const REASON_TEXT: Record<Exclude<Reason, "sonstiges" | "kein">, string> = {
  krankheit: "Die Praxis ist heute wegen Krankheit geschlossen.",
  fortbildung: "Die Praxis ist heute wegen einer Fortbildung geschlossen.",
  stoerung: "Die Praxis ist heute wegen einer technischen Störung geschlossen.",
};

function reasonOf(c: Closure | undefined): { reason: Reason | ""; other: string } {
  if (!c) return { reason: "", other: "" };
  if (!c.publicMessage) return { reason: "kein", other: "" };
  const hit = (Object.keys(REASON_TEXT) as (keyof typeof REASON_TEXT)[]).find((k) => REASON_TEXT[k] === c.publicMessage);
  return hit ? { reason: hit, other: "" } : { reason: "sonstiges", other: c.publicMessage };
}

const range = (b: { start: string; end: string }[]) => b.map((x) => `${x.start}–${x.end}`).join(" und ");

export function ClosedToday({ startEdit = false }: { startEdit?: boolean }) {
  const { state, apply } = useCockpit();
  const { today, now } = useClock();
  const base = state.data;
  const existing = existingTodayClosure(base, today);
  const changedHours = existing ? undefined : existingTodayChange(base, today);
  const init = reasonOf(existing);
  const [editing, setEditing] = useState(startEdit && Boolean(existing));
  const [from, setFrom] = useState<From | "">(existing ? "sofort" : "");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState<Reason | "">(init.reason);
  const [other, setOther] = useState(init.other);
  const [replacement, setReplacement] = useState(existing?.replacements[0]?.replacementPracticeId ?? "keine");
  const [supersede, setSupersede] = useState(false);
  const [done, setDone] = useState<string>();
  const { busy, run } = useBusy();

  // Supersede: an existing special-hours change is replaced only after explicit confirmation.
  const work: CockpitData = changedHours && supersede ? { ...base, exceptions: base.exceptions.filter((x) => x.id !== changedHours.id) } : base;
  const planned = changedHours && supersede ? rulesSegments(today) : plannedSegments(base, today);
  const end = lastEnd(planned);
  const message = reason === "sonstiges" ? other.trim() || undefined : reason && reason !== "kein" ? REASON_TEXT[reason] : undefined;

  const timeError =
    from !== "uhrzeit" || !time
      ? undefined
      : parseTime(time) <= parseTime(now)
        ? `Bitte eine Uhrzeit nach ${now} Uhr wählen.`
        : end && parseTime(time) >= parseTime(end)
          ? `Heute ist ohnehin nur bis ${end} Uhr geöffnet.`
          : undefined;

  const who = ROLES[state.role];
  const v = entryVerification(who.person, state.role, today, today);
  const ready = (from === "sofort" || (from === "uhrzeit" && time && !timeError)) && (!changedHours || supersede);
  const draft: CockpitData | null = !ready
    ? null
    : from === "sofort"
      ? withClosure(work, {
          id: existing?.id ?? `heute-geschlossen-${today}`,
          kind: "SHORT_NOTICE",
          startDate: today,
          endDate: today,
          publicMessage: message,
          replacements: replacement !== "keine" ? [{ replacementPracticeId: replacement, from: today, until: today }] : [],
          verification: v,
        })
      : {
          ...work,
          exceptions: [
            ...work.exceptions,
            {
              id: changedHours?.id ?? `heute-ab-${today}-${time}`,
              kind: "SPECIAL_HOURS",
              startDate: today,
              endDate: today,
              intervals: cutAt(planned, time).map((x) => ({ start: x.start, end: x.end, consultationType: x.type })),
              publicMessage: message,
              priority: 1,
              verification: v,
            },
          ],
        };
  const problem = draft ? checkChange(base, draft, today, today, today) : null;
  const missingReason = draft && !reason;
  const label = existing ? "Bestehende Schließung aktualisieren" : from === "uhrzeit" && time ? `Praxis heute ab ${time} Uhr schließen` : "Praxis heute ab sofort schließen";

  function publish() {
    if (!draft || problem || !reason) return;
    run(600, () => {
      setDone(
        apply(draft, {
          title: existing ? "Schließung heute geändert" : from === "sofort" ? "Heute geschlossen (ab sofort)" : `Heute ab ${time} Uhr geschlossen`,
          detail: existing ? "Bestehende Schließung aktualisiert" : changedHours ? `ersetzt die geänderte Sprechzeit (${range(blocks(changedHours.intervals.map((i) => ({ start: i.start, end: i.end, type: i.consultationType }))))} Uhr)` : message,
          before: existing ? `geschlossen · ${existing.publicMessage ?? "ohne Grund"}` : end ? `geöffnet bis ${end}` : "keine Sprechzeit",
          after: from === "sofort" ? `geschlossen · ${message ?? "ohne Grund"}` : `geschlossen ab ${time}`,
          undoSentence: existing ? "Es gälte wieder die vorherige Version der Schließung." : changedHours ? "Es gälte wieder die vorher veröffentlichte geänderte Sprechzeit." : end ? `Die Praxis wäre heute wieder bis ${end} geöffnet.` : "Der bisherige Stand wäre wiederhergestellt.",
          entityIds: [from === "sofort" ? (existing?.id ?? `heute-geschlossen-${today}`) : (changedHours?.id ?? `heute-ab-${today}-${time}`)],
        }),
      );
    });
  }

  if (done) {
    return (
      <div className={s.flowWide}>
        <PageHead title="Heute geschlossen" focusKey={done} />
        <div className={s.doneLayout}>
          <Success title="Auf der Website veröffentlicht" undoId={done}>
            <p>Die Schließung gilt nur heute. Morgen gelten automatisch wieder die regulären Sprechzeiten – kein „wieder öffnen“ nötig.</p>
          </Success>
          <LivePreview base={state.data} draft={null} moments={[{ label: `Jetzt · ${now} Uhr`, date: today, time: now }]} />
        </div>
      </div>
    );
  }

  if (existing && !editing) {
    return (
      <div className={s.flowWide}>
        <PageHead title="Heute geschlossen" />
        <ExistingNotice
          title="Heute geschlossen ist bereits veröffentlicht."
          tag="Bereits eingetragen"
          actions={<Button onClick={() => setEditing(true)}>Bestehende Schließung bearbeiten</Button>}
        >
          <p>{existing.publicMessage ?? "Ohne Grund auf der Website."}</p>
        </ExistingNotice>
        <LivePreview base={base} draft={null} moments={[{ label: `Jetzt · ${now} Uhr`, date: today, time: now }]} />
      </div>
    );
  }

  const closureId = draft?.closures.find((c) => c.startDate === today && c.kind === "SHORT_NOTICE")?.id;

  return (
    <div className={s.flowWide}>
      <PageHead title="Heute geschlossen" />
      {existing ? (
        <ExistingNotice title="Bestehende Schließung bearbeiten" tag="Bereits eingetragen">
          <p className={s.muted}>Sie bearbeiten die bereits veröffentlichte Schließung für heute. Die bisherige Version bleibt im Verlauf erhalten.</p>
        </ExistingNotice>
      ) : null}
      {changedHours ? (
        <ExistingNotice title="Für heute ist bereits eine geänderte Sprechzeit veröffentlicht.">
          <p className={s.lead}>Heute: {range(blocks(changedHours.intervals.map((i) => ({ start: i.start, end: i.end, type: i.consultationType }))))} Uhr</p>
          <p>Eine Schließung ersetzt diese Änderung. Beides gleichzeitig wäre widersprüchlich.</p>
          <label className={s.check}>
            <input type="checkbox" checked={supersede} onChange={(e) => setSupersede(e.target.checked)} />
            <span>Geänderte Sprechzeit durch diese Schließung ersetzen</span>
          </label>
        </ExistingNotice>
      ) : null}
      <EditLayout
        title={existing ? "Schließung bearbeiten" : "Änderung"}
        edit={
          <div className={s.form}>
            {existing ? null : (
              <Choice
                legend="Ab wann?"
                name="ab-wann"
                value={from}
                onChange={setFrom}
                options={[
                  { value: "sofort", label: "Ab sofort" },
                  { value: "uhrzeit", label: "Ab einer Uhrzeit" },
                ]}
              />
            )}
            {from === "uhrzeit" ? <TimeField label="Ab wie viel Uhr?" value={time} onChange={setTime} error={timeError} /> : null}
            <Choice
              legend="Grund für die Website"
              name="grund"
              value={reason}
              onChange={setReason}
              options={[
                { value: "krankheit", label: "Krankheit" },
                { value: "fortbildung", label: "Fortbildung" },
                { value: "stoerung", label: "Technische Störung" },
                { value: "kein", label: "Kein Grund anzeigen" },
                { value: "sonstiges", label: "Sonstiges" },
              ]}
            />
            {reason === "sonstiges" ? <TextField label="Text für die Website" value={other} onChange={setOther} max={140} /> : null}
            {from === "sofort" ? (
              <ReplacementPicker name="vertretung" value={replacement} onChange={setReplacement} until={today} legend="Vertretung (optional)" />
            ) : from === "uhrzeit" ? (
              <p className={s.note}>Eine Vertretung lässt sich nur für ganze Tage eintragen. Bei Schließung ab einer Uhrzeit zeigt die Website danach die Notfall-Hinweise und die Telefonnummer.</p>
            ) : null}
            {from ? <Validity data={draft} from={today} to={today} noun="Diese Schließung" /> : null}
          </div>
        }
        preview={
          <LivePreview
            base={base}
            draft={draft}
            problem={problem}
            moments={[
              {
                label: `Jetzt · ${now} Uhr`,
                date: today,
                time: now,
                compare: true,
                extra: () => (draft && closureId ? <ReplacementPreview periods={replacementSchedule(draft, closureId, today)} /> : null),
              },
              ...(draft && from === "uhrzeit" ? [{ label: `Ab ${time} Uhr`, date: today, time: formatMinutes(parseTime(time) + 1) }] : []),
            ]}
          />
        }
        actions={
          <>
            <ConfirmedBy />
            <div className={s.actions}>
              <Button onClick={publish} busy={busy} busyLabel="Wird veröffentlicht …" disabled={!draft || Boolean(problem) || !reason}>
                {changedHours && !existing ? `${label} (ersetzt die geänderte Sprechzeit)` : label}
              </Button>
            </div>
            {missingReason ? <p className={s.muted}>Bitte noch einen Grund wählen – oder „Kein Grund anzeigen“.</p> : null}
            {changedHours && !supersede && from ? <p className={s.muted}>Bitte zuerst bestätigen, dass die geänderte Sprechzeit ersetzt wird.</p> : null}
          </>
        }
      />
    </div>
  );
}
