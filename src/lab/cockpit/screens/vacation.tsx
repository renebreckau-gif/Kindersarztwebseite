"use client";

import { useState } from "react";
import s from "../cockpit.module.css";
import { useCockpit } from "../store";
import { Blocked, Button, Choice, ConfirmedBy, DateField, PageHead, Success, TextField, WebsitePreview, useBusy } from "../ui";
import { ReplacementPicker } from "./replacement";
import { MOCK_NOW, MOCK_TODAY, ROLES, checkChange, dateRange, dayMonth, entryVerification, statusAt, visibleAnnouncements, type CockpitData, type Problem } from "../model";
import { addDays, compareDates, isLocalDate, type LocalDate } from "@/domain/time";
import type { ClosureKind } from "@/domain/content-types";

type Step = 1 | 2 | 3 | 4 | "blocked" | "done";
type Kind = "urlaub" | "fortbildung" | "sonstiges";
type Mode = "ganz" | "teilen" | "keine";
interface Period {
  from: string;
  to: string;
  practice: string;
}

const KIND: Record<Kind, { label: string; closure: ClosureKind; noun: string }> = {
  urlaub: { label: "Urlaub", closure: "VACATION", noun: "Urlaub" },
  fortbildung: { label: "Fortbildung", closure: "TRAINING", noun: "Fortbildung" },
  sonstiges: { label: "Andere Schließzeit", closure: "OTHER", noun: "Schließzeit" },
};

const STEPS = ["Zeitraum", "Text für die Website", "Vertretung", "Vorschau"];
const DEFAULT_TEXT = "Die Praxis ist in diesem Zeitraum geschlossen.";

export function Vacation() {
  const { state, apply } = useCockpit();
  const [step, setStep] = useState<Step>(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kind, setKind] = useState<Kind>("urlaub");
  const [text, setText] = useState(DEFAULT_TEXT);
  const [mode, setMode] = useState<Mode | "">("");
  const [whole, setWhole] = useState("");
  const [periods, setPeriods] = useState<Period[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<CockpitData>();
  const [problem, setProblem] = useState<Problem>();
  const [doneId, setDoneId] = useState<string>();
  const { busy, run } = useBusy();

  const range = from && to ? dateRange(from, to) : "";
  const noun = KIND[kind].noun;

  function next1() {
    const e: Record<string, string> = {};
    if (!isLocalDate(from)) e.from = "Bitte den ersten Tag wählen.";
    else if (compareDates(from, MOCK_TODAY) < 0) e.from = "Der erste Tag liegt in der Vergangenheit.";
    if (!isLocalDate(to)) e.to = "Bitte den letzten Tag wählen.";
    else if (isLocalDate(from) && compareDates(to, from) < 0) e.to = "Der letzte Tag liegt vor dem ersten Tag.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setPeriods([{ from, to, practice: "" }]);
    setStep(2);
  }

  function next2() {
    if (!text.trim()) return setErrors({ text: "Bitte einen kurzen Text eingeben." });
    setErrors({});
    setStep(3);
  }

  function next3() {
    const e: Record<string, string> = {};
    if (!mode) e.mode = "Bitte wählen, ob es eine Vertretung gibt.";
    if (mode === "ganz" && !whole) e.whole = "Bitte eine Praxis wählen.";
    if (mode === "teilen") {
      periods.forEach((p, i) => {
        if (!isLocalDate(p.from) || !isLocalDate(p.to) || compareDates(p.to, p.from) < 0) e[`p${i}`] = "Bitte einen gültigen Zeitraum wählen.";
        else if (compareDates(p.from, from) < 0 || compareDates(p.to, to) > 0) e[`p${i}`] = `Der Zeitraum muss zwischen ${dayMonth(from)} und ${dayMonth(to)} liegen.`;
        else if (periods.some((q, j) => j < i && isLocalDate(q.from) && isLocalDate(q.to) && compareDates(p.from, q.to) <= 0 && compareDates(q.from, p.to) <= 0)) e[`p${i}`] = "Die Zeiträume überschneiden sich.";
        if (!p.practice) e[`pp${i}`] = "Bitte eine Praxis wählen.";
      });
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    const who = ROLES[state.role];
    const replacements =
      mode === "ganz" ? [{ replacementPracticeId: whole, from, until: to }] : mode === "teilen" ? periods.map((p) => ({ replacementPracticeId: p.practice, from: p.from, until: p.to })) : [];
    const nextData: CockpitData = {
      ...state.data,
      closures: [
        ...state.data.closures,
        {
          id: `schliesszeit-${from}`,
          kind: KIND[kind].closure,
          startDate: from,
          endDate: to,
          announceFrom: addDays(from, -14),
          publicMessage: text.trim(),
          replacements,
          verification: entryVerification(who.person, state.role, to),
        },
      ],
    };
    run(800, () => {
      const p = checkChange(state.data, nextData, from, to);
      setDraft(nextData);
      setProblem(p ?? undefined);
      setStep(p ? "blocked" : 4);
    });
  }

  function publish() {
    if (!draft) return;
    run(700, () => {
      const c = draft.closures.at(-1)!;
      const names = c.replacements.map((r) => state.data.directory.find((d) => d.id === r.replacementPracticeId)?.practiceName).filter(Boolean);
      const id = apply(draft, {
        title: `${noun} vom ${range} eingetragen`,
        detail: names.length ? `Vertretung: ${names.join(", ")}` : "ohne Vertretung",
        before: "normale Sprechzeiten",
        after: `geschlossen ${range}`,
        undoSentence: `Die Praxis wäre vom ${range} wieder mit den normalen Sprechzeiten auf der Website.`,
        entityIds: [c.id],
      });
      setDoneId(id);
      setStep("done");
    });
  }

  const gaps = mode === "teilen" ? uncovered(from, to, periods) : [];
  const stepNo = typeof step === "number" ? step : 4;
  const announce = from ? addDays(from, -14) : "";

  const previewDates: { date: LocalDate; label: string }[] = draft
    ? [
        { date: from, label: `Am ersten Tag · ${dayMonth(from, true)}, 09:00 Uhr` },
        ...(mode === "teilen" ? periods.slice(1).map((p) => ({ date: p.from, label: `Ab ${dayMonth(p.from, true)}, 09:00 Uhr` })) : []),
        { date: addDays(to, 1), label: `Erster Tag danach · ${dayMonth(addDays(to, 1), true)}, 09:00 Uhr` },
      ]
    : [];

  return (
    <div className={s.flowWide}>
      <PageHead title={`${KIND[kind].label} eintragen`} focusKey={step} step={typeof step === "number" ? `Schritt ${step} von 4 · ${STEPS[step - 1]}` : undefined} />
      <div className={s.wizard}>
        <ol className={s.steps} aria-label="Schritte">
          {STEPS.map((label, i) => (
            <li key={label} className={s.stepItem} aria-current={stepNo === i + 1 ? "step" : undefined} data-done={stepNo > i + 1 || step === "done" ? "" : undefined}>
              <span className={s.stepNum}>{i + 1}</span>
              <span>{label}</span>
            </li>
          ))}
        </ol>

        <div className={s.wizardMain}>
          {step === 1 ? (
            <form className={s.form} noValidate onSubmit={(e) => (e.preventDefault(), next1())}>
              <div className={s.row2}>
                <DateField label="Von" value={from} onChange={setFrom} min={MOCK_TODAY} error={errors.from} />
                <DateField label="Bis" value={to} onChange={setTo} min={from || MOCK_TODAY} error={errors.to} />
              </div>
              <Choice
                legend="Art"
                name="art"
                value={kind}
                onChange={setKind}
                options={[
                  { value: "urlaub", label: "Urlaub" },
                  { value: "fortbildung", label: "Fortbildung" },
                  { value: "sonstiges", label: "Andere Schließzeit" },
                ]}
              />
              <div className={s.actions}>
                <Button type="submit">Weiter</Button>
              </div>
            </form>
          ) : null}

          {step === 2 ? (
            <form className={s.form} noValidate onSubmit={(e) => (e.preventDefault(), next2())}>
              <TextField label="Was soll auf der Website stehen?" value={text} onChange={setText} max={280} multiline error={errors.text} />
              <p className={s.note}>
                Die Website kündigt die Schließung ab {dayMonth(announce)} an und zeigt den Text während {range}.
              </p>
              <div className={s.actions}>
                <Button type="submit">Weiter</Button>
                <Button variant="quiet" onClick={() => setStep(1)}>
                  Zurück
                </Button>
              </div>
            </form>
          ) : null}

          {step === 3 ? (
            <form className={s.form} noValidate onSubmit={(e) => (e.preventDefault(), next3())}>
              <Choice
                legend={`Gibt es eine Vertretung vom ${range}?`}
                name="vertretung-art"
                value={mode}
                onChange={setMode}
                error={errors.mode}
                options={[
                  { value: "ganz", label: "Eine Praxis für den ganzen Zeitraum" },
                  { value: "teilen", label: "Mehrere Praxen nacheinander", note: "z. B. erste Woche Praxis A, zweite Woche Praxis B" },
                  { value: "keine", label: "Keine Vertretung", note: "Die Website zeigt dann die Notfall-Hinweise." },
                ]}
              />
              {mode === "ganz" ? <ReplacementPicker name="vertretung-ganz" value={whole} onChange={setWhole} until={to} allowNone={false} legend="Welche Praxis vertritt?" error={errors.whole} /> : null}
              {mode === "teilen" ? (
                <div className={s.stack}>
                  {periods.map((p, i) => (
                    <fieldset key={i} className={s.period}>
                      <legend className={s.h3}>Zeitraum {i + 1}</legend>
                      <div className={s.row2}>
                        <DateField label="Von" value={p.from} min={from} onChange={(v) => setPeriods(periods.map((q, j) => (j === i ? { ...q, from: v } : q)))} />
                        <DateField label="Bis" value={p.to} min={p.from || from} onChange={(v) => setPeriods(periods.map((q, j) => (j === i ? { ...q, to: v } : q)))} error={errors[`p${i}`]} />
                      </div>
                      <ReplacementPicker name={`vertretung-${i}`} value={p.practice} onChange={(v) => setPeriods(periods.map((q, j) => (j === i ? { ...q, practice: v } : q)))} until={p.to || to} allowNone={false} legend="Praxis" error={errors[`pp${i}`]} />
                      {periods.length > 1 ? (
                        <Button variant="quiet" onClick={() => setPeriods(periods.filter((_, j) => j !== i))}>
                          Zeitraum {i + 1} entfernen
                        </Button>
                      ) : null}
                    </fieldset>
                  ))}
                  {periods.length < 3 ? (
                    <Button variant="secondary" onClick={() => setPeriods([...periods, { from: "", to: "", practice: "" }])}>
                      Weiteren Zeitraum hinzufügen
                    </Button>
                  ) : null}
                  {gaps.length ? <p className={s.note}>Ohne Vertretung: {gaps.map((g) => dateRange(g.from, g.to)).join(", ")}. An diesen Tagen zeigt die Website die Notfall-Hinweise.</p> : null}
                </div>
              ) : null}
              <div className={s.actions}>
                <Button type="submit" busy={busy} busyLabel="Vorschau wird erstellt …">
                  Vorschau ansehen
                </Button>
                <Button variant="quiet" onClick={() => setStep(2)}>
                  Zurück
                </Button>
              </div>
            </form>
          ) : null}

          {step === 4 && draft ? (
            <div className={s.stack}>
              <h2 className={s.h2}>Was sieht die Website?</h2>
              {compareDates(announce, MOCK_TODAY) <= 0 ? (
                <WebsitePreview heading="Ab heute" headingLevel={3} when={`Heute, ${MOCK_NOW} Uhr · Ankündigung`} result={statusAt(draft, MOCK_TODAY, MOCK_NOW)} announcements={visibleAnnouncements(draft, MOCK_TODAY)} />
              ) : (
                <p className={s.note}>Ab {dayMonth(announce)} kündigt die Website die Schließung an.</p>
              )}
              {previewDates.map((p) => (
                <WebsitePreview key={p.label} heading={p.label.split(" · ")[0]} headingLevel={3} when={p.label.split(" · ")[1] ?? p.label} result={statusAt(draft, p.date, "09:00")} />
              ))}
              <p className={s.expiry}>Dieser Hinweis verschwindet automatisch nach dem {dayMonth(to)}.</p>
              <ConfirmedBy />
              <div className={s.actions}>
                <Button onClick={publish} busy={busy} busyLabel="Wird veröffentlicht …">
                  {noun} vom {range} veröffentlichen
                </Button>
                <Button variant="quiet" onClick={() => setStep(3)}>
                  Zurück
                </Button>
              </div>
            </div>
          ) : null}

          {step === "blocked" && problem ? <Blocked problem={problem} onBack={() => setStep(3)} /> : null}

          {step === "done" && draft ? (
            <Success title={`${noun} vom ${range} veröffentlicht`} undoId={doneId}>
              <p>Die Website kündigt die Schließung ab {dayMonth(announce)} an. Nach dem {dayMonth(to)} verschwindet der Hinweis automatisch.</p>
            </Success>
          ) : null}
        </div>

        {typeof step === "number" && step > 1 ? (
          <aside className={s.summary} aria-label="Ihre Angaben">
            <h2 className={s.h3}>Ihre Angaben</h2>
            <dl>
              <dt>Zeitraum</dt>
              <dd>
                {range} · {KIND[kind].label}
              </dd>
              {step > 2 ? (
                <>
                  <dt>Text</dt>
                  <dd>{text}</dd>
                </>
              ) : null}
              {step > 3 ? (
                <>
                  <dt>Vertretung</dt>
                  <dd>
                    {mode === "keine"
                      ? "keine"
                      : (mode === "ganz" ? [{ practice: whole, from, to }] : periods).map((p) => (
                          <span key={`${p.practice}-${p.from}`} className={s.block}>
                            {state.data.directory.find((d) => d.id === p.practice)?.practiceName} ({dateRange(p.from, p.to)})
                          </span>
                        ))}
                  </dd>
                </>
              ) : null}
            </dl>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function uncovered(from: string, to: string, periods: Period[]): { from: LocalDate; to: LocalDate }[] {
  if (!isLocalDate(from) || !isLocalDate(to)) return [];
  const out: { from: LocalDate; to: LocalDate }[] = [];
  let start: LocalDate | null = null;
  for (let d = from; compareDates(d, to) <= 0; d = addDays(d, 1)) {
    const covered = periods.some((p) => isLocalDate(p.from) && isLocalDate(p.to) && compareDates(p.from, d) <= 0 && compareDates(d, p.to) <= 0);
    if (!covered && start === null) start = d;
    if (covered && start !== null) {
      out.push({ from: start, to: addDays(d, -1) });
      start = null;
    }
  }
  if (start !== null) out.push({ from: start, to });
  return out;
}
