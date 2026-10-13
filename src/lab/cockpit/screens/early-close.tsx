"use client";

import { useState } from "react";
import s from "../cockpit.module.css";
import { useCockpit } from "../store";
import { Blocked, Button, ConfirmedBy, PageHead, Success, TextField, TimeField, WebsitePreview, useBusy } from "../ui";
import {
  MOCK_NOW,
  MOCK_TODAY,
  ROLES,
  blocks,
  checkChange,
  earlyCloseEffect,
  earlyCloseLabel,
  entryVerification,
  lastEnd,
  plannedSegments,
  statusAt,
  visibleAnnouncements,
  type CockpitData,
  type EarlyCloseEffect,
  type Problem,
} from "../model";
import { formatMinutes, parseTime } from "@/domain/time";

type Step = "form" | "preview" | "blocked" | "done";

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
  const [step, setStep] = useState<Step>("form");
  const [time, setTime] = useState("13:00");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string>();
  const [draft, setDraft] = useState<CockpitData>();
  const [problem, setProblem] = useState<Problem>();
  const [doneId, setDoneId] = useState<string>();
  const { busy, run } = useBusy();

  const today = plannedSegments(state.data, MOCK_TODAY);
  const end = lastEnd(today);
  const valid = /^\d{2}:\d{2}$/.test(time);
  const effect = valid ? earlyCloseEffect(today, time) : undefined;
  const label = effect ? earlyCloseLabel(effect, time) : "";

  function preview() {
    if (!valid || !effect) return setError("Bitte eine Uhrzeit wählen.");
    if (parseTime(time) <= parseTime(MOCK_NOW)) return setError(`Die Uhrzeit liegt vor jetzt (${MOCK_NOW} Uhr). Wenn die Praxis sofort schließt, nutzen Sie „Heute geschlossen“.`);
    if (effect.kind === "TOO_LATE") return setError(end ? `Heute ist ohnehin nur bis ${end} Uhr geöffnet.` : "Heute ist ohnehin keine Sprechzeit geplant.");
    if (effect.kind === "TOO_EARLY") return setError("Zu dieser Uhrzeit hat die Praxis heute noch nicht geöffnet. Bitte „Heute geschlossen“ nutzen.");
    setError(undefined);
    const who = ROLES[state.role];
    const next: CockpitData = {
      ...state.data,
      exceptions: [
        ...state.data.exceptions,
        {
          id: `heute-frueher-${time}`,
          kind: "SPECIAL_HOURS",
          startDate: MOCK_TODAY,
          endDate: MOCK_TODAY,
          intervals: effect.segments.map((x) => ({ start: x.start, end: x.end, consultationType: x.type })),
          publicMessage: message.trim() || undefined,
          priority: 1,
          verification: entryVerification(who.person, state.role, MOCK_TODAY),
        },
      ],
    };
    run(700, () => {
      const p = checkChange(state.data, next, MOCK_TODAY);
      setDraft(next);
      setProblem(p ?? undefined);
      setStep(p ? "blocked" : "preview");
    });
  }

  function publish() {
    if (!draft || !effect) return;
    run(600, () => {
      const id = apply(draft, {
        title: label,
        detail: effect.kind === "GAP" ? `Gewählt: ${time} Uhr (regulär bereits geschlossen)` : "Öffnungszeit heute geändert",
        before: range(blocks(today)),
        after: range(blocks(effect.segments)),
        undoSentence: `Die Praxis wäre heute wieder bis ${end} geöffnet.`,
        entityIds: [draft.exceptions.at(-1)!.id],
      });
      setDoneId(id);
      setStep("done");
    });
  }

  const after = effect?.lastEnd ? formatMinutes(parseTime(effect.lastEnd) + 1) : MOCK_NOW;

  return (
    <div className={s.flow}>
      <PageHead title="Heute früher schließen" focusKey={step} intro={step === "form" ? `Heute geplant: ${range(blocks(today)) || "keine Sprechzeit"} Uhr` : undefined} />

      {step === "form" ? (
        <form
          className={s.form}
          onSubmit={(e) => {
            e.preventDefault();
            preview();
          }}
          noValidate
        >
          <TimeField label="Bis wann ist heute geöffnet?" value={time} onChange={setTime} error={error} big />
          {effect && !error && effect.kind === "GAP" && parseTime(time) > parseTime(MOCK_NOW) ? <GapExplanation effect={effect} time={time} /> : null}
          {effect && !error && effect.kind === "INSIDE" && parseTime(time) > parseTime(MOCK_NOW) ? (
            <p className={s.note}>Danach gilt heute: {range(blocks(effect.segments))} Uhr.</p>
          ) : null}
          <TextField label="Hinweis für die Website" optional value={message} onChange={setMessage} max={140} placeholder="Heute schließen wir früher." />
          <div className={s.actions}>
            <Button type="submit" busy={busy} busyLabel="Vorschau wird erstellt …">
              Vorschau ansehen
            </Button>
          </div>
        </form>
      ) : null}

      {step === "preview" && draft && effect ? (
        <div className={s.stack}>
          {effect.kind === "GAP" ? <GapExplanation effect={effect} time={time} /> : null}
          <p className={s.lead}>Sprechzeiten heute danach: {range(blocks(effect.segments))} Uhr</p>
          <WebsitePreview heading="Jetzt" when={`Heute, ${MOCK_NOW} Uhr`} result={statusAt(draft, MOCK_TODAY, MOCK_NOW)} announcements={visibleAnnouncements(draft, MOCK_TODAY)} />
          <WebsitePreview heading="Danach" when={`Heute ab ${effect.lastEnd} Uhr`} result={statusAt(draft, MOCK_TODAY, after)} />
          <p className={s.note}>Morgen gelten wieder die normalen Sprechzeiten. Die Änderung endet heute Abend automatisch.</p>
          <ConfirmedBy />
          <div className={s.actions}>
            <Button onClick={publish} busy={busy} busyLabel="Wird übernommen …">
              {label}
            </Button>
            <Button variant="quiet" onClick={() => setStep("form")}>
              Zurück
            </Button>
          </div>
        </div>
      ) : null}

      {step === "blocked" && problem ? <Blocked problem={problem} onBack={() => setStep("form")} /> : null}

      {step === "done" && draft ? (
        <Success title="Änderung übernommen" undoId={doneId}>
          <WebsitePreview heading="Website würde jetzt zeigen" headingLevel={3} when={`Heute, ${MOCK_NOW} Uhr`} result={statusAt(draft, MOCK_TODAY, MOCK_NOW)} />
          <p className={s.muted}>Ab morgen gelten wieder die normalen Sprechzeiten.</p>
        </Success>
      ) : null}
    </div>
  );
}
