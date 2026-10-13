"use client";

import { useState } from "react";
import s from "../cockpit.module.css";
import { useCockpit } from "../store";
import { Blocked, Button, ConfirmedBy, PageHead, Success, TextField, TimeField, WebsitePreview, useBusy } from "../ui";
import { MOCK_NOW, MOCK_TODAY, ROLES, blocks, checkChange, cutAt, entryVerification, lastEnd, plannedSegments, statusAt, visibleAnnouncements, type CockpitData, type Problem } from "../model";
import { formatMinutes, parseTime } from "@/domain/time";

type Step = "form" | "preview" | "blocked" | "done";

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
  const cut = cutAt(today, time || "00:00");
  const effective = lastEnd(cut);
  const inBreak = Boolean(effective && time && parseTime(effective) < parseTime(time));
  const resume = time ? today.find((x) => parseTime(x.start) >= parseTime(time))?.start : undefined;

  function preview() {
    if (!time) return setError("Bitte eine Uhrzeit wählen.");
    if (parseTime(time) <= parseTime(MOCK_NOW)) return setError(`Die Uhrzeit liegt vor jetzt (${MOCK_NOW} Uhr). Wenn die Praxis sofort schließt, nutzen Sie „Heute geschlossen“.`);
    if (!end || parseTime(time) >= parseTime(end)) return setError(end ? `Heute ist ohnehin nur bis ${end} Uhr geöffnet.` : "Heute ist ohnehin keine Sprechzeit geplant.");
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
          intervals: cut.map((x) => ({ start: x.start, end: x.end, consultationType: x.type })),
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
    if (!draft) return;
    run(600, () => {
      const id = apply(draft, {
        title: `Heute um ${time} schließen`,
        detail: "Öffnungszeit heute geändert",
        before: `bis ${end}`,
        after: `bis ${effective}${inBreak ? ` (gewählt: ${time})` : ""}`,
        undoSentence: `Die Praxis wäre heute wieder bis ${end} geöffnet.`,
        entityIds: [draft.exceptions.at(-1)!.id],
      });
      setDoneId(id);
      setStep("done");
    });
  }

  const after = formatMinutes(Math.max(parseTime(time || "00:00"), parseTime(effective ?? "00:00")) + 1);

  return (
    <div className={s.flow}>
      <PageHead title="Heute früher schließen" focusKey={step} intro={step === "form" ? `Heute geplant: ${blocks(today).map((b) => `${b.start}–${b.end}`).join(" und ") || "keine Sprechzeit"}` : undefined} />

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
          {inBreak && !error ? (
            <p className={s.note}>
              Zwischen {effective} und {resume} Uhr ist ohnehin Pause. Praktisch endet die Sprechzeit heute also um {effective} Uhr; die Sprechzeit {resume}–{end} Uhr entfällt.
            </p>
          ) : null}
          <TextField label="Hinweis für die Website" optional value={message} onChange={setMessage} max={140} placeholder="Heute schließen wir früher." />
          <div className={s.actions}>
            <Button type="submit" busy={busy} busyLabel="Vorschau wird erstellt …">
              Vorschau ansehen
            </Button>
          </div>
        </form>
      ) : null}

      {step === "preview" && draft ? (
        <div className={s.stack}>
          <WebsitePreview heading="Jetzt" when={`Heute, ${MOCK_NOW} Uhr`} result={statusAt(draft, MOCK_TODAY, MOCK_NOW)} announcements={visibleAnnouncements(draft, MOCK_TODAY)} />
          <WebsitePreview heading="Danach" when={`Heute ab ${effective} Uhr`} result={statusAt(draft, MOCK_TODAY, after)} />
          <p className={s.note}>
            {inBreak ? `Gewählt: ${time} Uhr. Weil ab ${effective} Uhr ohnehin Pause ist, endet die Sprechzeit praktisch um ${effective} Uhr. ` : ""}
            Morgen gelten wieder die normalen Sprechzeiten. Die Änderung endet heute Abend automatisch.
          </p>
          <ConfirmedBy />
          <div className={s.actions}>
            <Button onClick={publish} busy={busy} busyLabel="Wird übernommen …">
              Heute um {time} schließen
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
