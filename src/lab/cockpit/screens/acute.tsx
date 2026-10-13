"use client";

import { useState } from "react";
import s from "../cockpit.module.css";
import { useCockpit } from "../store";
import { Blocked, Button, ConfirmedBy, Glyph, PageHead, Success, TimeField, WebsitePreview, useBusy } from "../ui";
import { MOCK_NOW, MOCK_TODAY, ROLES, checkChange, entryVerification, plannedSegments, statusAt, type CockpitData, type Problem, type Segment } from "../model";
import { formatMinutes, parseTime } from "@/domain/time";

type Step = "overview" | "change" | "preview" | "blocked" | "done";

/** Rebuild today's plan with a new (or no) acute window inside the opening hours. */
function withAcute(segs: Segment[], acute: { start: string; end: string } | null): Segment[] | null {
  const general = segs.map((x) => ({ ...x, type: x.type === "ACUTE" ? ("GENERAL" as const) : x.type }));
  const merged: Segment[] = [];
  for (const x of general) {
    const last = merged.at(-1);
    if (last && last.end === x.start && last.type === x.type) last.end = x.end;
    else merged.push({ ...x });
  }
  if (!acute) return merged;
  const a0 = parseTime(acute.start);
  const a1 = parseTime(acute.end);
  const host = merged.find((x) => parseTime(x.start) <= a0 && a1 <= parseTime(x.end));
  if (!host || a1 <= a0) return null;
  return merged.flatMap((x) =>
    x !== host
      ? [x]
      : [
          ...(parseTime(x.start) < a0 ? [{ ...x, end: acute.start }] : []),
          { start: acute.start, end: acute.end, type: "ACUTE" as const },
          ...(a1 < parseTime(x.end) ? [{ ...x, start: acute.end }] : []),
        ],
  );
}

export function Acute() {
  const { state, apply } = useCockpit();
  const [step, setStep] = useState<Step>("overview");
  const [cancel, setCancel] = useState(false);
  const today = plannedSegments(state.data, MOCK_TODAY);
  const current = today.find((x) => x.type === "ACUTE");
  const [start, setStart] = useState(current?.start ?? "10:00");
  const [end, setEnd] = useState(current?.end ?? "11:00");
  const [error, setError] = useState<string>();
  const [draft, setDraft] = useState<CockpitData>();
  const [problem, setProblem] = useState<Problem>();
  const [doneId, setDoneId] = useState<string>();
  const { busy, run } = useBusy();

  function build(isCancel: boolean) {
    const segs = withAcute(today, isCancel ? null : { start, end });
    if (!segs) return setError("Die Akutsprechstunde muss innerhalb der Sprechzeit liegen, und das Ende muss nach dem Beginn liegen.");
    setError(undefined);
    setCancel(isCancel);
    const who = ROLES[state.role];
    const next: CockpitData = {
      ...state.data,
      exceptions: [
        ...state.data.exceptions,
        {
          id: `akut-heute-${isCancel ? "entfaellt" : start}`,
          kind: "SPECIAL_HOURS",
          startDate: MOCK_TODAY,
          endDate: MOCK_TODAY,
          intervals: segs.map((x) => ({ start: x.start, end: x.end, consultationType: x.type })),
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

  const label = cancel ? "Akutsprechstunde heute absagen" : `Akutsprechstunde heute auf ${start}–${end} Uhr ändern`;

  function publish() {
    if (!draft) return;
    run(600, () => {
      const id = apply(draft, {
        title: cancel ? "Akutsprechstunde heute abgesagt" : `Akutsprechstunde heute ${start}–${end} Uhr`,
        detail: "Akutsprechstunde heute geändert",
        before: current ? `${current.start}–${current.end}` : "keine",
        after: cancel ? "entfällt" : `${start}–${end}`,
        undoSentence: current ? `Die Akutsprechstunde wäre heute wieder ${current.start}–${current.end} Uhr.` : "Der bisherige Stand wäre wiederhergestellt.",
        entityIds: [draft.exceptions.at(-1)!.id],
      });
      setDoneId(id);
      setStep("done");
    });
  }

  const sample = cancel ? (current?.start ? formatMinutes(parseTime(current.start) + 10) : MOCK_NOW) : formatMinutes(parseTime(start) + 10);

  return (
    <div className={s.flow}>
      <PageHead title="Akutsprechstunde ändern" focusKey={step} />

      <div className={s.protoWarn} role="note">
        <Glyph name="attention" size={20} />
        <p>
          <strong>Prototyp-Hinweis:</strong> Diese Regel muss vor der ersten Veröffentlichung ärztlich bestätigt werden. Die Zeiten hier sind Testdaten.
        </p>
      </div>

      {step === "overview" ? (
        <div className={s.stack}>
          <section className={s.panel} aria-labelledby="akut-heute">
            <h2 id="akut-heute" className={s.h2}>
              Heute
            </h2>
            <p className={s.bigTime}>{current ? `${current.start}–${current.end} Uhr` : "Keine Akutsprechstunde"}</p>
            <p className={s.muted}>Regel: montags bis freitags 10:00–11:00 Uhr (Testdaten)</p>
          </section>
          <div className={s.actions}>
            <Button variant="secondary" onClick={() => setStep("change")}>
              Heute ändern
            </Button>
            {current ? (
              <Button variant="secondary" onClick={() => build(true)} busy={busy} busyLabel="Vorschau wird erstellt …">
                Heute entfällt
              </Button>
            ) : null}
          </div>
          {state.role === "STAFF" ? (
            <p className={s.confirmedBy}>Die Regel dauerhaft ändern oder zum ersten Mal bestätigen kann nur eine Ärztin oder ein Arzt.</p>
          ) : (
            <p className={s.confirmedBy}>Dauerhafte Änderung und erste ärztliche Bestätigung: im Prototyp nicht ausgebaut.</p>
          )}
        </div>
      ) : null}

      {step === "change" ? (
        <form className={s.form} noValidate onSubmit={(e) => (e.preventDefault(), build(false))}>
          <div className={s.row2}>
            <TimeField label="Heute von" value={start} onChange={setStart} />
            <TimeField label="bis" value={end} onChange={setEnd} error={error} />
          </div>
          <div className={s.actions}>
            <Button type="submit" busy={busy} busyLabel="Vorschau wird erstellt …">
              Vorschau ansehen
            </Button>
            <Button variant="quiet" onClick={() => setStep("overview")}>
              Zurück
            </Button>
          </div>
        </form>
      ) : null}

      {step === "preview" && draft ? (
        <div className={s.stack}>
          <WebsitePreview heading={cancel ? "Zur bisherigen Akutzeit" : "Während der Akutsprechstunde"} when={`Heute, ${sample} Uhr`} result={statusAt(draft, MOCK_TODAY, sample)} />
          <ConfirmedBy />
          <div className={s.actions}>
            <Button onClick={publish} busy={busy} busyLabel="Wird übernommen …">
              {label}
            </Button>
            <Button variant="quiet" onClick={() => setStep("overview")}>
              Zurück
            </Button>
          </div>
        </div>
      ) : null}

      {step === "blocked" && problem ? <Blocked problem={problem} onBack={() => setStep("overview")} /> : null}

      {step === "done" && draft ? (
        <Success title="Änderung übernommen" undoId={doneId}>
          <WebsitePreview heading="Website würde dann zeigen" headingLevel={3} when={`Heute, ${sample} Uhr`} result={statusAt(draft, MOCK_TODAY, sample)} />
        </Success>
      ) : null}
    </div>
  );
}
