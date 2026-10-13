"use client";

import { useState } from "react";
import s from "../cockpit.module.css";
import { useClock, useCockpit } from "../store";
import { Button, Choice, ConfirmedBy, DateField, FieldError, LinkButton, PageHead, Success, TextField, useBusy } from "../ui";
import { ReplacementPicker, StaleReplacements } from "./replacement";
import { EditLayout, LivePreview, ReplacementPreview, Validity } from "./live";
import { ROLES, checkChange, dateRange, dayMonth, directoryState, entryVerification, longDate, replacementSchedule, type CockpitData } from "../model";
import { addDays, compareDates, isLocalDate, type LocalDate } from "@/domain/time";
import type { Closure } from "@/domain/content-types";

type Mode = "ganz" | "teilen" | "keine";
interface Period {
  from: string;
  to: string;
  practice: string;
}

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
  const { today } = useClock();
  const editing = editId ? state.data.closures.find((c) => c.id === editId) : undefined;
  const init = fromClosure(editing);
  const [from, setFrom] = useState(init?.from ?? "");
  const [to, setTo] = useState(init?.to ?? "");
  const [extra, setExtra] = useState(init?.extra ?? "");
  const [mode, setMode] = useState<Mode | "">(init?.mode ?? "");
  const [whole, setWhole] = useState(init?.whole ?? "");
  const [periods, setPeriods] = useState<Period[]>(init?.periods ?? []);
  const [gapOk, setGapOk] = useState(false);
  const [previewDay, setPreviewDay] = useState("");
  const [done, setDone] = useState<string>();
  const { busy, run } = useBusy();
  const [closureId] = useState(() => editId ?? `urlaub-${Date.now().toString(36)}`);

  const base = state.data;
  const datesOk = isLocalDate(from) && isLocalDate(to) && compareDates(to, from) >= 0;
  const range = datesOk ? dateRange(from, to) : "";
  const message = extra.trim() ? `${DEFAULT_TEXT} ${extra.trim()}` : DEFAULT_TEXT;
  const usable = base.directory.filter((p) => datesOk && directoryState(p, to, today).usable);
  const name = (id: string) => base.directory.find((p) => p.id === id)?.practiceName ?? "";

  // ---- live validation (plain German, field-level; nothing blocks typing)
  const e: Record<string, string> = {};
  if (from && !isLocalDate(from)) e.from = "Bitte ein gültiges Datum wählen.";
  else if (isLocalDate(from) && compareDates(from, today) < 0) e.from = "Der erste Tag liegt in der Vergangenheit.";
  if (isLocalDate(from) && isLocalDate(to) && compareDates(to, from) < 0) e.to = "Der letzte Tag liegt vor dem ersten Tag.";
  const other = datesOk ? base.closures.find((c) => c.id !== editId && compareDates(c.endDate, today) >= 0 && overlapsRange({ from, to }, { from: c.startDate, to: c.endDate })) : undefined;
  if (other) e.to = `In diesem Zeitraum ist bereits eine Schließung eingetragen (${dateRange(other.startDate, other.endDate)}).`;
  const gaps = mode === "teilen" && datesOk ? uncovered(from, to, periods) : [];
  if (mode === "teilen") {
    periods.forEach((p, i) => {
      if (!p.from || !p.to) return;
      if (!isLocalDate(p.from) || !isLocalDate(p.to) || compareDates(p.to, p.from) < 0) e[`p${i}`] = "Bitte einen gültigen Zeitraum wählen.";
      else if (datesOk && (compareDates(p.from, from) < 0 || compareDates(p.to, to) > 0)) e[`p${i}`] = `Dieser Zeitraum liegt außerhalb des Urlaubs (${range}).`;
      else if (periods.some((q, j) => j !== i && isLocalDate(q.from) && isLocalDate(q.to) && overlapsRange(p, q))) e[`p${i}`] = "Dieser Zeitraum überschneidet sich mit einer anderen Vertretung.";
    });
  }
  const periodsComplete = periods.every((p) => isLocalDate(p.from) && isLocalDate(p.to) && p.practice);
  const replacementReady = mode === "keine" || (mode === "ganz" && whole) || (mode === "teilen" && periodsComplete && (!gaps.length || gapOk));
  const datesReady = datesOk && !e.from && !e.to;

  const who = ROLES[state.role];
  // Preview draft: as soon as the dates are valid; replacements are added as far as they are complete.
  const replacements =
    mode === "ganz" && whole
      ? [{ replacementPracticeId: whole, from, until: to }]
      : mode === "teilen"
        ? [...periods]
            .filter((p, i) => isLocalDate(p.from) && isLocalDate(p.to) && p.practice && !e[`p${i}`])
            .sort((a, b) => a.from.localeCompare(b.from))
            .map((p) => ({ replacementPracticeId: p.practice, from: p.from, until: p.to }))
        : [];
  const draft: CockpitData | null = datesReady
    ? {
        ...base,
        closures: [
          ...base.closures.filter((c) => c.id !== editId),
          { id: closureId, kind: "VACATION", startDate: from, endDate: to, announceFrom: addDays(from, -14), publicMessage: message, replacements, verification: entryVerification(who.person, state.role, to, today) },
        ],
      }
    : null;
  const problem = draft ? checkChange(base, draft, from, to, today) : null;
  const canPublish = Boolean(draft) && !problem && replacementReady && !Object.keys(e).some((k) => k.startsWith("p"));

  function chooseMode(m: Mode) {
    setMode(m);
    if (m === "teilen" && periods.length === 0 && datesOk) {
      const split = compareDates(addDays(from, 2), to) < 0 ? addDays(from, 2) : from;
      setPeriods(split === from ? [{ from, to, practice: "" }] : [{ from, to: split, practice: whole }, { from: addDays(split, 1), to, practice: "" }]);
    }
  }

  function publish() {
    if (!draft || !canPublish) return;
    run(700, () => {
      setDone(
        apply(draft, {
          title: editing ? `Urlaub vom ${range} geändert` : `Urlaub vom ${range} eingetragen`,
          detail: replacements.length ? `Vertretung: ${replacements.map((r) => `${name(r.replacementPracticeId)} (${dateRange(r.from, r.until)})`).join(", ")}` : "ohne Vertretung",
          before: editing ? dateRange(editing.startDate, editing.endDate) : "normale Sprechzeiten",
          after: `geschlossen ${range}`,
          undoSentence: editing ? "Der Urlaub wäre wieder wie vor der Änderung eingetragen." : `Die Praxis wäre vom ${range} wieder mit den normalen Sprechzeiten auf der Website.`,
          entityIds: [closureId],
        }),
      );
    });
  }

  if (done) {
    return (
      <div className={s.flowWide}>
        <PageHead title={editing ? "Urlaub ändern" : "Urlaub eintragen"} focusKey={done} />
        <div className={s.doneLayout}>
          <Success
            title={editing ? "Urlaub geändert" : "Urlaub eingetragen"}
            undoId={done}
            actions={
              <>
                <LinkButton href={`/lab/praxis-cockpit/elternansicht?datum=${from}&zeit=09:00`} variant="primary">
                  Ansicht auf der Website öffnen
                </LinkButton>
                <LinkButton href="/lab/praxis-cockpit">Zur Cockpit-Startseite</LinkButton>
              </>
            }
          >
            <p>
              Auf der Website veröffentlicht: Praxisurlaub {range}. Er endet am {longDate(to)} automatisch – danach gelten wieder die regulären Sprechzeiten, ohne dass jemand etwas ausschalten muss.
            </p>
          </Success>
          <LivePreview
            base={state.data}
            draft={null}
            moments={[{ label: `${longDate(from)}, 09:00 Uhr`, date: from, time: "09:00", extra: () => <ReplacementPreview periods={replacementSchedule(state.data, closureId, from)} /> }]}
          />
        </div>
      </div>
    );
  }

  // Preview day: chosen chip, else first vacation day (or today if the vacation already runs).
  const firstDay = datesOk ? (compareDates(from, today) < 0 ? today : from) : today;
  const day = previewDay && datesOk && compareDates(previewDay, addDays(to, 1)) <= 0 ? previewDay : firstDay;
  const chips: { label: string; date: LocalDate }[] = datesOk
    ? [
        { label: `Erster Tag (${dayMonth(firstDay, true)})`, date: firstDay },
        ...(mode === "teilen" ? replacements.slice(1).map((r) => ({ label: `Ab ${dayMonth(r.from, true)}`, date: r.from })) : []),
        { label: `Erster Tag danach (${dayMonth(addDays(to, 1), true)})`, date: addDays(to, 1) },
      ]
    : [];

  return (
    <div className={s.flowWide}>
      <PageHead title={editing ? "Urlaub ändern" : "Urlaub eintragen"} />
      <EditLayout
        edit={
          <div className={s.form}>
            <fieldset className={s.section}>
              <legend className={s.h3}>Von wann bis wann bleibt die Praxis geschlossen?</legend>
              <div className={s.row2}>
                <DateField label="Von" value={from} onChange={setFrom} min={today} error={e.from} />
                <DateField label="Bis" value={to} onChange={setTo} min={from || today} error={e.to} />
              </div>
              {datesOk ? (
                <p className={s.lead}>
                  {longDate(from)} bis {longDate(to)}
                </p>
              ) : null}
            </fieldset>

            <fieldset className={s.section}>
              <legend className={s.h3}>Text auf der Website</legend>
              <div className={s.quote}>
                <p>{DEFAULT_TEXT}</p>
              </div>
              <TextField label="Zusätzlicher Hinweis" optional value={extra} onChange={setExtra} max={140} placeholder="z. B. Rezepte bitte vorher abholen." />
            </fieldset>

            <fieldset className={s.section}>
              <legend className={s.h3}>Wer übernimmt die Vertretung?</legend>
              <Choice
                legend={range ? `Vertretung für ${range}` : "Vertretung"}
                name="vertretung-art"
                value={mode}
                onChange={chooseMode}
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
              {mode === "ganz" ? <ReplacementPicker name="vertretung-ganz" value={whole} onChange={setWhole} until={to || today} allowNone={false} legend="Welche Praxis vertritt?" /> : null}
              {mode === "teilen" ? (
                <div className={s.stack}>
                  {periods.map((p, i) => (
                    <fieldset key={i} className={s.period}>
                      <legend className={s.h3}>Teilzeitraum {i + 1}</legend>
                      <div className={s.row2}>
                        <DateField label="Von" value={p.from} min={from} onChange={(v) => setPeriods(periods.map((q, j) => (j === i ? { ...q, from: v } : q)))} />
                        <DateField label="Bis" value={p.to} min={p.from || from} onChange={(v) => setPeriods(periods.map((q, j) => (j === i ? { ...q, to: v } : q)))} error={e[`p${i}`]} />
                      </div>
                      <div className={s.field}>
                        <label className={s.label} htmlFor={`vertretung-${i}`}>
                          Vertretung
                        </label>
                        <select id={`vertretung-${i}`} className={s.input} value={p.practice} onChange={(ev) => setPeriods(periods.map((q, j) => (j === i ? { ...q, practice: ev.target.value } : q)))}>
                          <option value="">Bitte wählen</option>
                          {usable.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.practiceName} · {u.city} (bestätigt)
                            </option>
                          ))}
                        </select>
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
                  <StaleReplacements until={to || today} />
                  {gaps.length ? (
                    <div className={s.inlineBlock} role="note">
                      <p className={s.inlineBlockTitle}>Ohne Vertretung: {gaps.map((g) => dateRange(g.from, g.to)).join(", ")}</p>
                      <p>An diesen Tagen zeigt die Website die Notfall-Hinweise.</p>
                      <label className={s.check}>
                        <input type="checkbox" checked={gapOk} onChange={(ev) => setGapOk(ev.target.checked)} />
                        <span>Diese Tage bewusst ohne Vertretung lassen</span>
                      </label>
                      {!gapOk ? <FieldError id="gap-hint">Bitte die Lücke schließen oder bewusst ohne Vertretung lassen.</FieldError> : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </fieldset>

            {datesReady ? <Validity data={draft} from={from} to={to} noun="Dieser Urlaub" /> : null}
          </div>
        }
        preview={
          datesReady ? (
            <LivePreview
              base={base}
              draft={draft}
              problem={problem}
              moments={[
                {
                  label: `${longDate(day)}, 09:00 Uhr`,
                  date: day,
                  time: "09:00",
                  compare: true,
                  extra: (r) => (draft && r.activeClosure ? <ReplacementPreview periods={replacementSchedule(draft, closureId, day)} /> : null),
                },
              ]}
              footer={
                <div className={s.chips} role="group" aria-label="Tag der Vorschau">
                  {chips.map((c) => (
                    <button key={c.label} type="button" className={s.chipBtn} aria-pressed={day === c.date} onClick={() => setPreviewDay(c.date)}>
                      {c.label}
                    </button>
                  ))}
                </div>
              }
            />
          ) : (
            <LivePreview base={base} draft={null} moments={[{ label: `Heute · ${longDate(today)}`, date: today, time: "09:00" }]} footer={<p className={s.muted}>Sobald der Zeitraum eingetragen ist, zeigt die Vorschau den Urlaub.</p>} />
          )
        }
        actions={
          <>
            <ConfirmedBy />
            <div className={s.actions}>
              <Button onClick={publish} busy={busy} busyLabel="Wird veröffentlicht …" disabled={!canPublish}>
                {range ? (editing ? `Änderung am Urlaub (${range}) veröffentlichen` : `Urlaub vom ${range} veröffentlichen`) : "Urlaub veröffentlichen"}
              </Button>
            </div>
            {!canPublish && datesReady && !problem ? <p className={s.muted}>Bitte noch die Vertretung festlegen – oder „Keine Vertretung eintragen“.</p> : null}
          </>
        }
      />
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
