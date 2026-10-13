"use client";

import { useState } from "react";
import s from "../cockpit.module.css";
import { useClock, useCockpit } from "../store";
import { Button, Choice, ConfirmedBy, PageHead, Success, TextField, TimeField, useBusy } from "../ui";
import { ReplacementPicker } from "./replacement";
import { EditLayout, LivePreview, ReplacementPreview, Validity } from "./live";
import { ROLES, checkChange, cutAt, entryVerification, lastEnd, plannedSegments, replacementSchedule, type CockpitData } from "../model";
import { formatMinutes, parseTime } from "@/domain/time";

type From = "sofort" | "uhrzeit";
type Reason = "krankheit" | "fortbildung" | "stoerung" | "kein" | "sonstiges";

const REASON_TEXT: Record<Exclude<Reason, "sonstiges" | "kein">, string> = {
  krankheit: "Die Praxis ist heute wegen Krankheit geschlossen.",
  fortbildung: "Die Praxis ist heute wegen einer Fortbildung geschlossen.",
  stoerung: "Die Praxis ist heute wegen einer technischen Störung geschlossen.",
};

export function ClosedToday() {
  const { state, apply } = useCockpit();
  const { today, now } = useClock();
  const [from, setFrom] = useState<From | "">("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState<Reason | "">("");
  const [other, setOther] = useState("");
  const [replacement, setReplacement] = useState("keine");
  const [done, setDone] = useState<string>();
  const { busy, run } = useBusy();

  const base = state.data;
  const planned = plannedSegments(base, today);
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
  const ready = from === "sofort" || (from === "uhrzeit" && time && !timeError);
  const draft: CockpitData | null = !ready
    ? null
    : from === "sofort"
      ? {
          ...base,
          closures: [
            ...base.closures,
            {
              id: `heute-geschlossen-${today}`,
              kind: "SHORT_NOTICE",
              startDate: today,
              endDate: today,
              publicMessage: message,
              replacements: replacement !== "keine" ? [{ replacementPracticeId: replacement, from: today, until: today }] : [],
              verification: v,
            },
          ],
        }
      : {
          ...base,
          exceptions: [
            ...base.exceptions,
            {
              id: `heute-ab-${today}-${time}`,
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
  const label = from === "uhrzeit" && time ? `Praxis heute ab ${time} Uhr schließen` : "Praxis heute ab sofort schließen";

  function publish() {
    if (!draft || problem || !reason) return;
    run(600, () => {
      setDone(
        apply(draft, {
          title: from === "sofort" ? "Heute geschlossen (ab sofort)" : `Heute ab ${time} Uhr geschlossen`,
          detail: message,
          before: end ? `geöffnet bis ${end}` : "keine Sprechzeit",
          after: from === "sofort" ? "geschlossen" : `geschlossen ab ${time}`,
          undoSentence: end ? `Die Praxis wäre heute wieder bis ${end} geöffnet.` : "Der bisherige Stand wäre wiederhergestellt.",
          entityIds: [from === "sofort" ? draft.closures.at(-1)!.id : draft.exceptions.at(-1)!.id],
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

  const closureId = draft?.closures.find((c) => c.startDate === today && c.kind === "SHORT_NOTICE")?.id;

  return (
    <div className={s.flowWide}>
      <PageHead title="Heute geschlossen" />
      <EditLayout
        edit={
          <div className={s.form}>
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
                {label}
              </Button>
            </div>
            {missingReason ? <p className={s.muted}>Bitte noch einen Grund wählen – oder „Kein Grund anzeigen“.</p> : null}
          </>
        }
      />
    </div>
  );
}
