"use client";

import { useState } from "react";
import s from "../cockpit.module.css";
import { useCockpit } from "../store";
import { Blocked, Button, Choice, ConfirmedBy, DateField, FieldError, LinkButton, PageHead, Success, TextField, useBusy } from "../ui";
import { ReplacementPicker, StaleReplacements } from "./replacement";
import { ParentPreview } from "./parent";
import { MOCK_TODAY, ROLES, checkChange, dateRange, dayMonth, directoryState, entryVerification, longDate, replacementSchedule, statusAt, type CockpitData, type Problem } from "../model";
import { addDays, compareDates, isLocalDate, type LocalDate } from "@/domain/time";
import type { Closure } from "@/domain/content-types";

type Step = 1 | 2 | 3 | 4 | "blocked" | "done";
type Mode = "ganz" | "teilen" | "keine";
interface Period {
  from: string;
  to: string;
  practice: string;
}

const STEPS = ["Zeitraum", "Text für Eltern", "Vertretung", "Vorschau"];
const DEFAULT_TEXT = "Die Praxis ist in diesem Zeitraum geschlossen.";
const overlapsRange = (a: { from: string; to: string }, b: { from: string; to: string }) => compareDates(a.from, b.to) <= 0 && compareDates(b.from, a.to) <= 0;

function fromClosure(c: Closure | undefined) {
  if (!c) return null;
  const extra = (c.publicMessage ?? "").startsWith(DEFAULT_TEXT) ? (c.publicMessage ?? "").slice(DEFAULT_TEXT.length).trim() : (c.publicMessage ?? "");
  const whole = c.replacements.length === 1 && c.replacements[0].from === c.startDate && c.replacements[0].until === c.endDate;
  return {
    from: c.startDate,
    to: c.endDate,
    extra,
    mode: (c.replacements.length === 0 ? "keine" : whole ? "ganz" : "teilen") as Mode,
    whole: whole ? c.replacements[0].replacementPracticeId : "",
    periods: whole ? [] : c.replacements.map((r) => ({ from: r.from, to: r.until, practice: r.replacementPracticeId })),
  };
}

export function Vacation({ editId }: { editId?: string }) {
  const { state, apply } = useCockpit();
  const editing = editId ? state.data.closures.find((c) => c.id === editId) : undefined;
  const init = fromClosure(editing);
  const [step, setStep] = useState<Step>(1);
  const [from, setFrom] = useState(init?.from ?? "");
  const [to, setTo] = useState(init?.to ?? "");
  const [extra, setExtra] = useState(init?.extra ?? "");
  const [mode, setMode] = useState<Mode | "">(init?.mode ?? "");
  const [whole, setWhole] = useState(init?.whole ?? "");
  const [periods, setPeriods] = useState<Period[]>(init?.periods ?? []);
  const [gapOk, setGapOk] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<CockpitData>();
  const [problem, setProblem] = useState<Problem>();
  const [doneId, setDoneId] = useState<string>();
  const [previewDate, setPreviewDate] = useState("");
  const { busy, run } = useBusy();

  const datesOk = isLocalDate(from) && isLocalDate(to) && compareDates(to, from) >= 0;
  const range = datesOk ? dateRange(from, to) : "";
  const message = extra.trim() ? `${DEFAULT_TEXT} ${extra.trim()}` : DEFAULT_TEXT;
  const usable = state.data.directory.filter((p) => datesOk && directoryState(p, to).usable);
  const name = (id: string) => state.data.directory.find((p) => p.id === id)?.practiceName ?? "";

  function next1() {
    const e: Record<string, string> = {};
    if (!isLocalDate(from)) e.from = "Bitte den ersten Urlaubstag wählen.";
    else if (compareDates(from, MOCK_TODAY) < 0) e.from = "Der erste Tag liegt in der Vergangenheit.";
    if (!isLocalDate(to)) e.to = "Bitte den letzten Urlaubstag wählen.";
    else if (isLocalDate(from) && compareDates(to, from) < 0) e.to = "Der letzte Tag liegt vor dem ersten Tag.";
    const other = state.data.closures.find((c) => c.id !== editId && isLocalDate(from) && isLocalDate(to) && overlapsRange({ from, to }, { from: c.startDate, to: c.endDate }));
    if (other && !e.from && !e.to) e.to = `In diesem Zeitraum ist bereits eine Schließung eingetragen (${dateRange(other.startDate, other.endDate)}).`;
    setErrors(e);
    if (Object.keys(e).length) return;
    setStep(2);
  }

  function chooseMode(m: Mode) {
    setMode(m);
    if (m === "teilen" && periods.length === 0 && datesOk) {
      const split = compareDates(addDays(from, 2), to) < 0 ? addDays(from, 2) : from;
      setPeriods(split === from ? [{ from, to, practice: "" }] : [{ from, to: split, practice: whole }, { from: addDays(split, 1), to, practice: "" }]);
    }
  }

  const gaps = mode === "teilen" ? uncovered(from, to, periods) : [];

  function next3() {
    const e: Record<string, string> = {};
    if (!mode) e.mode = "Bitte wählen, wer die Vertretung übernimmt – oder „Keine Vertretung eintragen“.";
    if (mode === "ganz" && !whole) e.whole = "Bitte eine Praxis wählen.";
    if (mode === "teilen") {
      periods.forEach((p, i) => {
        if (!isLocalDate(p.from) || !isLocalDate(p.to) || compareDates(p.to, p.from) < 0) e[`p${i}`] = "Bitte einen gültigen Zeitraum wählen.";
        else if (compareDates(p.from, from) < 0 || compareDates(p.to, to) > 0) e[`p${i}`] = `Dieser Zeitraum liegt außerhalb des Urlaubs (${range}).`;
        else if (periods.some((q, j) => j !== i && isLocalDate(q.from) && isLocalDate(q.to) && overlapsRange(p, q))) e[`p${i}`] = "Dieser Zeitraum überschneidet sich mit einer anderen Vertretung.";
        if (!p.practice) e[`pp${i}`] = "Bitte eine Vertretung wählen.";
      });
      if (gaps.length && !gapOk && !Object.keys(e).length) e.gap = "Bitte die Lücke schließen oder bewusst ohne Vertretung lassen.";
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    const who = ROLES[state.role];
    const replacements = mode === "ganz" ? [{ replacementPracticeId: whole, from, until: to }] : mode === "teilen" ? [...periods].sort((a, b) => a.from.localeCompare(b.from)).map((p) => ({ replacementPracticeId: p.practice, from: p.from, until: p.to })) : [];
    const closure: Closure = {
      id: editId ?? `urlaub-${from}-${Date.now().toString(36)}`,
      kind: "VACATION",
      startDate: from,
      endDate: to,
      announceFrom: addDays(from, -14),
      publicMessage: message,
      replacements,
      verification: entryVerification(who.person, state.role, to),
    };
    const nextData: CockpitData = { ...state.data, closures: [...state.data.closures.filter((c) => c.id !== editId), closure] };
    run(800, () => {
      const p = checkChange(state.data, nextData, from, to);
      setDraft(nextData);
      setProblem(p ?? undefined);
      setPreviewDate(from);
      setStep(p ? "blocked" : 4);
    });
  }

  function publish() {
    if (!draft) return;
    const c = draft.closures.find((x) => x.startDate === from && x.endDate === to)!;
    run(700, () => {
      const id = apply(draft, {
        title: editing ? `Urlaub vom ${range} geändert` : `Urlaub vom ${range} eingetragen`,
        detail: c.replacements.length ? `Vertretung: ${c.replacements.map((r) => `${name(r.replacementPracticeId)} (${dateRange(r.from, r.until)})`).join(", ")}` : "ohne Vertretung",
        before: editing ? `${dateRange(editing.startDate, editing.endDate)}` : "normale Sprechzeiten",
        after: `geschlossen ${range}`,
        undoSentence: editing ? "Der Urlaub wäre wieder wie vor der Änderung eingetragen." : `Die Praxis wäre vom ${range} wieder mit den normalen Sprechzeiten auf der Website.`,
        entityIds: [c.id],
      });
      setDoneId(id);
      setStep("done");
    });
  }

  const stepNo = typeof step === "number" ? step : 4;
  const closureId = draft?.closures.find((x) => x.startDate === from && x.endDate === to)?.id;
  const previewChips: { label: string; date: string }[] = draft
    ? [
        { label: `Erster Tag (${dayMonth(from, true)})`, date: from },
        ...(mode === "teilen" ? periods.slice(1).map((p) => ({ label: `Ab ${dayMonth(p.from, true)}`, date: p.from })) : []),
        { label: `Danach (${dayMonth(addDays(to, 1), true)})`, date: addDays(to, 1) },
      ]
    : [];
  const doneResult = draft ? statusAt(draft, from, "09:00") : undefined;
  const doneReps = draft && closureId ? replacementSchedule(draft, closureId, from) : [];

  return (
    <div className={s.flowWide}>
      <PageHead title={editing ? "Urlaub ändern" : "Urlaub eintragen"} focusKey={step} step={typeof step === "number" ? `Schritt ${step} von 4 · ${STEPS[step - 1]}` : undefined} />
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
              <h2 className={s.h2}>Von wann bis wann bleibt die Praxis geschlossen?</h2>
              <div className={s.row2}>
                <DateField label="Von" value={from} onChange={setFrom} min={MOCK_TODAY} error={errors.from} />
                <DateField label="Bis" value={to} onChange={setTo} min={from || MOCK_TODAY} error={errors.to} />
              </div>
              {datesOk ? (
                <p className={s.lead} aria-live="polite">
                  {longDate(from)} bis {longDate(to)}
                </p>
              ) : null}
              <div className={s.actions}>
                <Button type="submit">Weiter</Button>
              </div>
            </form>
          ) : null}

          {step === 2 ? (
            <form className={s.form} noValidate onSubmit={(e) => (e.preventDefault(), setStep(3))}>
              <h2 className={s.h2}>Was sollen Eltern sehen?</h2>
              <div className={s.quote}>
                <p className={s.muted}>Text auf der Website</p>
                <p>{DEFAULT_TEXT}</p>
              </div>
              <TextField label="Zusätzlicher Hinweis" optional value={extra} onChange={setExtra} max={140} placeholder="z. B. Rezepte bitte vorher abholen." />
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
              <h2 className={s.h2}>Wer übernimmt die Vertretung?</h2>
              <Choice
                legend={`Vertretung für ${range}`}
                name="vertretung-art"
                value={mode}
                onChange={chooseMode}
                error={errors.mode}
                options={[
                  { value: "ganz", label: "Eine Vertretung für den ganzen Zeitraum" },
                  { value: "teilen", label: "Zeitraum aufteilen", note: "Unterschiedliche Praxen für Teilzeiträume" },
                  { value: "keine", label: "Keine Vertretung eintragen" },
                ]}
              />
              {mode === "keine" ? (
                <div className={s.inlineBlock} role="note">
                  <p className={s.inlineBlockTitle}>Keine Vertretung eingetragen</p>
                  <p>Auf der Website wird dann keine Vertretung angezeigt. Eltern sehen stattdessen die Notfall-Hinweise.</p>
                </div>
              ) : null}
              {mode === "ganz" ? <ReplacementPicker name="vertretung-ganz" value={whole} onChange={setWhole} until={to} allowNone={false} legend="Welche Praxis vertritt?" error={errors.whole} /> : null}
              {mode === "teilen" ? (
                <div className={s.stack}>
                  {periods.map((p, i) => (
                    <fieldset key={i} className={s.period}>
                      <legend className={s.h3}>Teilzeitraum {i + 1}</legend>
                      <div className={s.row2}>
                        <DateField label="Von" value={p.from} min={from} onChange={(v) => setPeriods(periods.map((q, j) => (j === i ? { ...q, from: v } : q)))} />
                        <DateField label="Bis" value={p.to} min={p.from || from} onChange={(v) => setPeriods(periods.map((q, j) => (j === i ? { ...q, to: v } : q)))} error={errors[`p${i}`]} />
                      </div>
                      <div className={s.field}>
                        <label className={s.label} htmlFor={`vertretung-${i}`}>
                          Vertretung
                        </label>
                        <select
                          id={`vertretung-${i}`}
                          className={s.input}
                          value={p.practice}
                          onChange={(e) => setPeriods(periods.map((q, j) => (j === i ? { ...q, practice: e.target.value } : q)))}
                          aria-invalid={errors[`pp${i}`] ? true : undefined}
                          aria-describedby={errors[`pp${i}`] ? `vertretung-${i}-err` : undefined}
                        >
                          <option value="">Bitte wählen</option>
                          {usable.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.practiceName} · {u.city} (bestätigt)
                            </option>
                          ))}
                        </select>
                        <FieldError id={`vertretung-${i}-err`}>{errors[`pp${i}`]}</FieldError>
                      </div>
                      {periods.length > 1 ? (
                        <Button variant="quiet" onClick={() => setPeriods(periods.filter((_, j) => j !== i))}>
                          Teilzeitraum {i + 1} entfernen
                        </Button>
                      ) : null}
                    </fieldset>
                  ))}
                  {periods.length < 4 ? (
                    <Button variant="secondary" onClick={() => setPeriods([...periods, { from: "", to: "", practice: "" }])}>
                      Weiteren Zeitraum hinzufügen
                    </Button>
                  ) : null}
                  <StaleReplacements until={to} />
                  {gaps.length ? (
                    <div className={s.inlineBlock} role="note">
                      <p className={s.inlineBlockTitle}>Ohne Vertretung: {gaps.map((g) => dateRange(g.from, g.to)).join(", ")}</p>
                      <p>An diesen Tagen zeigt die Website die Notfall-Hinweise.</p>
                      <label className={s.check}>
                        <input type="checkbox" checked={gapOk} onChange={(e) => setGapOk(e.target.checked)} aria-describedby={errors.gap ? "gap-err" : undefined} />
                        <span>Diese Tage bewusst ohne Vertretung lassen</span>
                      </label>
                      <FieldError id="gap-err">{errors.gap}</FieldError>
                    </div>
                  ) : null}
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
              <h2 className={s.h2}>Was sehen Eltern?</h2>
              <div className={s.chips} role="group" aria-label="Tag der Vorschau">
                {previewChips.map((c) => (
                  <button key={c.label} type="button" className={s.chipBtn} aria-pressed={previewDate === c.date} onClick={() => setPreviewDate(c.date)}>
                    {c.label}
                  </button>
                ))}
              </div>
              <section className={s.preview} aria-label={`So sieht es die Website: ${longDate(previewDate)}`}>
                <div className={s.previewHead}>
                  <h3 className={s.previewTitle}>So sieht es die Website</h3>
                  <p className={s.previewWhen}>{longDate(previewDate)}, 09:00 Uhr</p>
                </div>
                <ParentPreview key={previewDate} data={draft} date={previewDate} time="09:00" />
              </section>
              <div className={s.note}>
                <p>
                  <strong>Dieser Urlaub endet automatisch am {dayMonth(to)}.</strong>
                </p>
                <p>Ab dem nächsten Tag verwendet die Website wieder den regulären Wochenplan. Angekündigt wird der Urlaub ab {dayMonth(addDays(from, -14))}.</p>
              </div>
              <ConfirmedBy />
              <div className={s.actions}>
                <Button onClick={publish} busy={busy} busyLabel="Wird veröffentlicht …">
                  {editing ? `Änderung am Urlaub (${range}) veröffentlichen` : `Urlaub vom ${range} veröffentlichen`}
                </Button>
                <Button variant="quiet" onClick={() => setStep(3)}>
                  Zurück
                </Button>
              </div>
            </div>
          ) : null}

          {step === "blocked" && problem ? <Blocked problem={problem} onBack={() => setStep(3)} /> : null}

          {step === "done" && draft && doneResult ? (
            <Success
              title={editing ? "Urlaub geändert" : "Urlaub eingetragen"}
              undoId={doneId}
              actions={
                <>
                  <LinkButton href={`/lab/praxis-cockpit/elternansicht?datum=${from}&zeit=09:00`} variant="primary">
                    Ansicht für Eltern öffnen
                  </LinkButton>
                  <LinkButton href="/lab/praxis-cockpit">Zur Cockpit-Startseite</LinkButton>
                </>
              }
            >
              <div className={s.quote}>
                <p className={s.muted}>Website würde jetzt anzeigen</p>
                <p className={s.quoteStrong}>{doneResult.headline}</p>
                <p>{range}</p>
                <p>
                  Vertretung:{" "}
                  {doneReps.length ? doneReps.map((r) => (doneReps.length > 1 ? `${r.rep.practiceName} (${dateRange(r.from, r.until)})` : r.rep.practiceName)).join(", ") : "keine – Notfall-Hinweise"}
                </p>
              </div>
            </Success>
          ) : null}
        </div>

        {typeof step === "number" && step > 1 ? (
          <aside className={s.summary} aria-label="Ihre Angaben">
            <h2 className={s.h3}>Ihre Angaben</h2>
            <dl>
              <dt>Zeitraum</dt>
              <dd>{range}</dd>
              {step > 2 ? (
                <>
                  <dt>Text für Eltern</dt>
                  <dd>{message}</dd>
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
                            {name(p.practice)} ({dateRange(p.from, p.to)})
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
