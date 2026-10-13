"use client";

import { useState } from "react";
import s from "../cockpit.module.css";
import { useCockpit } from "../store";
import { Blocked, Button, Choice, ConfirmedBy, PageHead, Success, TextField, TimeField, WebsitePreview, useBusy } from "../ui";
import { ReplacementPicker } from "./replacement";
import { MOCK_NOW, MOCK_TODAY, ROLES, checkChange, cutAt, entryVerification, lastEnd, plannedSegments, statusAt, type CockpitData, type Problem } from "../model";
import { formatMinutes, parseTime } from "@/domain/time";

type Step = "form" | "preview" | "blocked" | "done";
type From = "sofort" | "uhrzeit";
type Reason = "krankheit" | "fortbildung" | "stoerung" | "kein" | "sonstiges";

const REASON_TEXT: Record<Exclude<Reason, "sonstiges" | "kein">, string> = {
  krankheit: "Die Praxis ist heute wegen Krankheit geschlossen.",
  fortbildung: "Die Praxis ist heute wegen einer Fortbildung geschlossen.",
  stoerung: "Die Praxis ist heute wegen einer technischen Störung geschlossen.",
};

export function ClosedToday() {
  const { state, apply } = useCockpit();
  const [step, setStep] = useState<Step>("form");
  const [from, setFrom] = useState<From | "">("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState<Reason | "">("");
  const [other, setOther] = useState("");
  const [replacement, setReplacement] = useState("keine");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<CockpitData>();
  const [problem, setProblem] = useState<Problem>();
  const [doneId, setDoneId] = useState<string>();
  const { busy, run } = useBusy();

  const today = plannedSegments(state.data, MOCK_TODAY);
  const end = lastEnd(today);
  const message = reason === "sonstiges" ? other.trim() : reason && reason !== "kein" ? REASON_TEXT[reason] : undefined;

  function preview() {
    const e: Record<string, string> = {};
    if (!from) e.from = "Bitte wählen, ab wann die Praxis geschlossen ist.";
    if (from === "uhrzeit" && (!time || parseTime(time) <= parseTime(MOCK_NOW))) e.time = `Bitte eine Uhrzeit nach ${MOCK_NOW} Uhr wählen.`;
    if (from === "uhrzeit" && time && end && parseTime(time) >= parseTime(end)) e.time = `Heute ist ohnehin nur bis ${end} Uhr geöffnet.`;
    if (!reason) e.reason = "Bitte einen Grund wählen – oder „Kein Grund anzeigen“.";
    if (reason === "sonstiges" && !other.trim()) e.other = "Bitte einen kurzen Text eingeben.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const who = ROLES[state.role];
    const v = entryVerification(who.person, state.role, MOCK_TODAY);
    const next: CockpitData =
      from === "sofort"
        ? {
            ...state.data,
            closures: [
              ...state.data.closures,
              {
                id: "heute-geschlossen",
                kind: "SHORT_NOTICE",
                startDate: MOCK_TODAY,
                endDate: MOCK_TODAY,
                publicMessage: message,
                replacements: replacement !== "keine" ? [{ replacementPracticeId: replacement, from: MOCK_TODAY, until: MOCK_TODAY }] : [],
                verification: v,
              },
            ],
          }
        : {
            ...state.data,
            exceptions: [
              ...state.data.exceptions,
              {
                id: `heute-ab-${time}`,
                kind: "SPECIAL_HOURS",
                startDate: MOCK_TODAY,
                endDate: MOCK_TODAY,
                intervals: cutAt(today, time).map((x) => ({ start: x.start, end: x.end, consultationType: x.type })),
                publicMessage: message,
                priority: 1,
                verification: v,
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

  const label = from === "sofort" ? "Praxis heute ab sofort schließen" : `Praxis heute ab ${time} Uhr schließen`;

  function publish() {
    if (!draft) return;
    run(600, () => {
      const id = apply(draft, {
        title: from === "sofort" ? "Heute geschlossen (ab sofort)" : `Heute ab ${time} Uhr geschlossen`,
        detail: message,
        before: end ? `geöffnet bis ${end}` : "keine Sprechzeit",
        after: from === "sofort" ? "geschlossen" : `geschlossen ab ${time}`,
        undoSentence: end ? `Die Praxis wäre heute wieder bis ${end} geöffnet.` : "Der bisherige Stand wäre wiederhergestellt.",
        entityIds: [from === "sofort" ? draft.closures.at(-1)!.id : draft.exceptions.at(-1)!.id],
      });
      setDoneId(id);
      setStep("done");
    });
  }

  return (
    <div className={s.flow}>
      <PageHead title="Heute geschlossen" focusKey={step} />

      {step === "form" ? (
        <form
          className={s.form}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            preview();
          }}
        >
          <Choice
            legend="Ab wann?"
            name="ab-wann"
            value={from}
            onChange={setFrom}
            error={errors.from}
            options={[
              { value: "sofort", label: "Ab sofort" },
              { value: "uhrzeit", label: "Ab einer Uhrzeit" },
            ]}
          />
          {from === "uhrzeit" ? <TimeField label="Ab wie viel Uhr?" value={time} onChange={setTime} error={errors.time} /> : null}
          <Choice
            legend="Grund für die Website"
            name="grund"
            value={reason}
            onChange={setReason}
            error={errors.reason}
            options={[
              { value: "krankheit", label: "Krankheit" },
              { value: "fortbildung", label: "Fortbildung" },
              { value: "stoerung", label: "Technische Störung" },
              { value: "kein", label: "Kein Grund anzeigen" },
              { value: "sonstiges", label: "Sonstiges" },
            ]}
          />
          {reason === "sonstiges" ? <TextField label="Text für die Website" value={other} onChange={setOther} max={140} error={errors.other} /> : null}
          {from === "sofort" ? (
            <ReplacementPicker name="vertretung" value={replacement} onChange={setReplacement} until={MOCK_TODAY} legend="Vertretung (optional)" />
          ) : from === "uhrzeit" ? (
            <p className={s.note}>Eine Vertretung lässt sich nur für ganze Tage eintragen. Bei Schließung ab einer Uhrzeit zeigt die Website danach die Notfall-Hinweise und die Telefonnummer.</p>
          ) : null}
          <div className={s.actions}>
            <Button type="submit" busy={busy} busyLabel="Vorschau wird erstellt …">
              Vorschau ansehen
            </Button>
          </div>
        </form>
      ) : null}

      {step === "preview" && draft ? (
        <div className={s.stack}>
          <WebsitePreview heading={from === "sofort" ? "So sieht es die Website" : "Jetzt"} when={`Heute, ${MOCK_NOW} Uhr`} result={statusAt(draft, MOCK_TODAY, MOCK_NOW)} />
          {from === "uhrzeit" ? <WebsitePreview heading="Danach" when={`Heute ab ${time} Uhr`} result={statusAt(draft, MOCK_TODAY, formatMinutes(parseTime(time) + 1))} /> : null}
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
        </Success>
      ) : null}
    </div>
  );
}
