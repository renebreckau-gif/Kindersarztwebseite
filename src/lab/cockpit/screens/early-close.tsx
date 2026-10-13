"use client";

import { useState } from "react";
import s from "../cockpit.module.css";
import { useClock, useCockpit } from "../store";
import { Button, ConfirmedBy, PageHead, Success, TextField, TimeField, useBusy } from "../ui";
import { EditLayout, LivePreview, Validity } from "./live";
import { ROLES, blocks, checkChange, earlyCloseEffect, earlyCloseLabel, entryVerification, lastEnd, plannedSegments, type CockpitData, type EarlyCloseEffect } from "../model";
import { formatMinutes, parseTime } from "@/domain/time";

const range = (b: { start: string; end: string }[]) => b.map((x) => `${x.start}–${x.end}`).join(" und ");

/** Explains a lunch-gap choice: valid decision, not an error — and never silently snapped. */
function GapExplanation({ effect, time }: { effect: EarlyCloseEffect; time: string }) {
  const afternoon = effect.removed.every((b) => parseTime(b.start) >= parseTime("12:00"));
  return (
    <div className={s.note} role="note">
      <p>
        <strong>Um {time} Uhr ist die Praxis regulär bereits geschlossen.</strong>
      </p>
      <p>
        Mit dieser Änderung entfällt die {afternoon ? "Nachmittagssprechzeit" : "Sprechzeit"} von {range(effect.removed)} Uhr. Die letzte Sprechzeit endet heute um {effect.lastEnd} Uhr.
      </p>
    </div>
  );
}

export function EarlyClose() {
  const { state, apply } = useCockpit();
  const { today, now } = useClock();
  const [time, setTime] = useState("13:00");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState<string>();
  const { busy, run } = useBusy();

  const base = state.data;
  const planned = plannedSegments(base, today);
  const end = lastEnd(planned);
  const valid = /^\d{2}:\d{2}$/.test(time);
  const effect = valid ? earlyCloseEffect(planned, time) : undefined;

  // Live validation (plain German); the preview simply stays on "Aktuell auf der Website".
  const error = !valid
    ? "Bitte eine Uhrzeit wählen."
    : parseTime(time) <= parseTime(now)
      ? `Die Uhrzeit liegt vor jetzt (${now} Uhr). Wenn die Praxis sofort schließt, nutzen Sie „Heute geschlossen“.`
      : effect?.kind === "TOO_LATE"
        ? end
          ? `Heute ist ohnehin nur bis ${end} Uhr geöffnet.`
          : "Heute ist ohnehin keine Sprechzeit geplant."
        : effect?.kind === "TOO_EARLY"
          ? "Zu dieser Uhrzeit hat die Praxis heute noch nicht geöffnet. Bitte „Heute geschlossen“ nutzen."
          : undefined;

  const who = ROLES[state.role];
  const draft: CockpitData | null =
    !error && effect
      ? {
          ...base,
          exceptions: [
            ...base.exceptions,
            {
              id: `heute-frueher-${today}-${time}`,
              kind: "SPECIAL_HOURS",
              startDate: today,
              endDate: today,
              intervals: effect.segments.map((x) => ({ start: x.start, end: x.end, consultationType: x.type })),
              publicMessage: message.trim() || undefined,
              priority: 1,
              verification: entryVerification(who.person, state.role, today, today),
            },
          ],
        }
      : null;
  const problem = draft ? checkChange(base, draft, today, today, today) : null;
  const label = effect && !error ? earlyCloseLabel(effect, time) : "Heute früher schließen";

  function publish() {
    if (!draft || !effect || problem) return;
    run(600, () => {
      setDone(
        apply(draft, {
          title: label,
          detail: effect.kind === "GAP" ? `Gewählt: ${time} Uhr (regulär bereits geschlossen)` : "Öffnungszeit heute geändert",
          before: range(blocks(planned)),
          after: range(blocks(effect.segments)),
          undoSentence: `Die Praxis wäre heute wieder bis ${end} geöffnet.`,
          entityIds: [draft.exceptions.at(-1)!.id],
        }),
      );
    });
  }

  if (done) {
    return (
      <div className={s.flowWide}>
        <PageHead title="Heute früher schließen" focusKey={done} />
        <div className={s.doneLayout}>
          <Success title="Auf der Website veröffentlicht" undoId={done}>
            <p>Die Änderung gilt nur heute. Morgen gelten automatisch wieder die regulären Sprechzeiten.</p>
          </Success>
          <LivePreview base={state.data} draft={null} moments={[{ label: `Jetzt · ${now} Uhr`, date: today, time: now }]} />
        </div>
      </div>
    );
  }

  const after = effect?.lastEnd ? formatMinutes(parseTime(effect.lastEnd) + 1) : undefined;

  return (
    <div className={s.flowWide}>
      <PageHead title="Heute früher schließen" intro={`Heute geplant: ${range(blocks(planned)) || "keine Sprechzeit"}${planned.length ? " Uhr" : ""}`} />
      <EditLayout
        edit={
          <div className={s.form}>
            <TimeField label="Bis wann ist heute geöffnet?" value={time} onChange={setTime} error={error} big />
            {effect && !error && effect.kind === "GAP" ? <GapExplanation effect={effect} time={time} /> : null}
            {effect && !error && effect.kind === "INSIDE" ? <p className={s.note}>Danach gilt heute: {range(blocks(effect.segments))} Uhr.</p> : null}
            <TextField label="Hinweis für die Website" optional value={message} onChange={setMessage} max={140} placeholder="Heute schließen wir früher." />
            <Validity data={draft} from={today} to={today} noun="Diese Änderung" />
          </div>
        }
        preview={
          <LivePreview
            base={base}
            draft={draft}
            problem={problem}
            moments={[
              { label: `Jetzt · ${now} Uhr`, date: today, time: now, compare: true },
              ...(draft && after ? [{ label: `Ab ${effect!.lastEnd} Uhr`, date: today, time: after }] : []),
            ]}
          />
        }
        actions={
          <>
            <ConfirmedBy />
            <div className={s.actions}>
              <Button onClick={publish} busy={busy} busyLabel="Wird veröffentlicht …" disabled={!draft || Boolean(problem)}>
                {label}
              </Button>
            </div>
          </>
        }
      />
    </div>
  );
}
