"use client";

import Link from "next/link";
import { useState } from "react";
import s from "../cockpit.module.css";
import { useClock, useCockpit } from "../store";
import { Button, Choice, ConfirmedBy, DateField, FieldError, LinkButton, PageHead, Success, TextField, useBusy } from "../ui";
import { ReplacementPicker, StaleReplacements } from "./replacement";
import { EditLayout, ExistingNotice, LivePreview, ReplacementPreview, Validity } from "./live";
import {
  ROLES,
  checkChange,
  checkReplacementPeriods,
  dateRange,
  dayMonth,
  directoryState,
  entryVerification,
  longDate,
  overlappingVacation,
  replacementSchedule,
  uncoveredDays,
  withClosure,
  type CockpitData,
  type PeriodInput,
} from "../model";
import { addDays, compareDates, isLocalDate, type LocalDate } from "@/domain/time";
import type { Closure } from "@/domain/content-types";

type Mode = "ganz" | "teilen" | "keine";

const DEFAULT_TEXT = "Die Praxis ist in diesem Zeitraum geschlossen.";

/** Editing keeps replacement dates EXPLICIT (periods) so a changed vacation never stretches them silently. */
function fromClosure(c: Closure | undefined) {
  if (!c) return null;
  const extra = (c.publicMessage ?? "").startsWith(DEFAULT_TEXT) ? (c.publicMessage ?? "").slice(DEFAULT_TEXT.length).trim() : (c.publicMessage ?? "");
  return {
    from: c.startDate,
    to: c.endDate,
    extra,
    mode: (c.replacements.length === 0 ? "keine" : "teilen") as Mode,
    periods: c.replacements.map((r) => ({ from: r.from, to: r.until, practice: r.replacementPracticeId })),
  };
}

export function Vacation({ editId }: { editId?: string }) {
  const { state, apply } = useCockpit();
  const { today } = useClock();
  const base = state.data;
  const editing = editId ? base.closures.find((c) => c.id === editId && compareDates(c.endDate, today) >= 0) : undefined;
  const init = fromClosure(editing);
  const [from, setFrom] = useState(init?.from ?? "");
  const [to, setTo] = useState(init?.to ?? "");
  const [extra, setExtra] = useState(init?.extra ?? "");
  const [mode, setMode] = useState<Mode | "">(init?.mode ?? "");
  const [whole, setWhole] = useState("");
  const [periods, setPeriods] = useState<PeriodInput[]>(init?.periods ?? []);
  const [gapOk, setGapOk] = useState(false);
  const [newIntent, setNewIntent] = useState(false);
  const [previewDay, setPreviewDay] = useState("");
  const [done, setDone] = useState<string>();
  const { busy, run } = useBusy();
  const [closureId] = useState(() => editing?.id ?? `urlaub-${Date.now().toString(36)}`);

  const datesOk = isLocalDate(from) && isLocalDate(to) && compareDates(to, from) >= 0;
  const range = datesOk ? dateRange(from, to) : "";
  const message = extra.trim() ? `${DEFAULT_TEXT} ${extra.trim()}` : DEFAULT_TEXT;
  const usable = base.directory.filter((p) => datesOk && directoryState(p, to, today).usable);
  const name = (id: string) => base.directory.find((p) => p.id === id)?.practiceName ?? "";

  // ---- dates
  const e: Record<string, string> = {};
  if (from && !isLocalDate(from)) e.from = "Bitte ein gültiges Datum wählen.";
  else if (isLocalDate(from) && compareDates(from, today) < 0 && !(editing && from === editing.startDate)) e.from = "Der erste Tag liegt in der Vergangenheit.";
  if (isLocalDate(from) && isLocalDate(to) && compareDates(to, from) < 0) e.to = "Der letzte Tag liegt vor dem ersten Tag.";
  // An overlapping existing vacation is most likely the one the user wants to edit → ask first.
  const overlapping = datesOk ? overlappingVacation(base, from, to, today, editing?.id) : undefined;
  const askEdit = Boolean(overlapping && !editing && !newIntent);
  if (overlapping && (editing || newIntent)) e.to = `Der Zeitraum überschneidet sich mit dem bestehenden Urlaub (${dateRange(overlapping.startDate, overlapping.endDate)}). Bitte die Daten anpassen.`;

  // ---- replacements (revalidated on every change of the vacation dates)
  const coverage = mode === "teilen" && datesOk ? checkReplacementPeriods(from, to, periods, editing ? { from: editing.startDate, to: editing.endDate } : undefined) : { issues: [], gaps: [], newGaps: [] };
  const issueFor = (i: number) => coverage.issues.find((x) => x.index === i);
  const otherGaps = coverage.gaps.filter((g) => !coverage.newGaps.some((n) => compareDates(n.from, g.to) <= 0 && compareDates(g.from, n.to) <= 0));
  const periodsComplete = periods.length > 0 && periods.every((p) => isLocalDate(p.from) && isLocalDate(p.to) && p.practice);
  const replacementReady = mode === "keine" || (mode === "ganz" && whole) || (mode === "teilen" && periodsComplete && !coverage.issues.length && (!coverage.gaps.length || gapOk));
  const datesReady = datesOk && !e.from && !e.to && !askEdit;

  const who = ROLES[state.role];
  const replacements =
    mode === "ganz" && whole
      ? [{ replacementPracticeId: whole, from, until: to }]
      : mode === "teilen"
        ? periods
            .filter((p, i) => isLocalDate(p.from) && isLocalDate(p.to) && p.practice && !issueFor(i))
            .sort((a, b) => a.from.localeCompare(b.from))
            .map((p) => ({ replacementPracticeId: p.practice, from: p.from, until: p.to }))
        : [];
  const draft: CockpitData | null = datesReady
    ? withClosure(base, { id: closureId, kind: "VACATION", startDate: from, endDate: to, announceFrom: addDays(from, -14), publicMessage: message, replacements, verification: entryVerification(who.person, state.role, to, today) })
    : null;
  const problem = draft ? checkChange(base, draft, editing && compareDates(editing.startDate, from) < 0 ? editing.startDate : from, editing && compareDates(editing.endDate, to) > 0 ? editing.endDate : to, today) : null;
  const canPublish = Boolean(draft) && !problem && replacementReady;

  function chooseMode(m: Mode) {
    setMode(m);
    if (m === "teilen" && periods.length === 0 && datesOk) {
      const split = compareDates(addDays(from, 2), to) < 0 ? addDays(from, 2) : from;
      setPeriods(split === from ? [{ from, to, practice: "" }] : [{ from, to: split, practice: whole }, { from: addDays(split, 1), to, practice: "" }]);
    }
  }
  const setPeriod = (i: number, patch: Partial<PeriodInput>) => setPeriods(periods.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  function publish() {
    if (!draft || !canPublish) return;
    run(700, () => {
      setDone(
        apply(draft, {
          title: editing ? "Urlaub geändert" : `Urlaub vom ${range} eingetragen`,
          detail: replacements.length ? `Vertretung: ${replacements.map((r) => `${name(r.replacementPracticeId)} (${dateRange(r.from, r.until)})`).join(", ")}` : "ohne Vertretung",
          before: editing ? `geschlossen ${dateRange(editing.startDate, editing.endDate)}` : "normale Sprechzeiten",
          after: `geschlossen ${range}`,
          undoSentence: editing ? `Es gälte wieder die vorherige Version: Urlaub ${dateRange(editing.startDate, editing.endDate)}.` : `Die Praxis wäre vom ${range} wieder mit den normalen Sprechzeiten auf der Website.`,
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
            title={editing ? "Urlaub aktualisiert" : "Urlaub eingetragen"}
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
              {editing ? " Die vorherige Version bleibt im Verlauf." : ""}
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

  // Preview days: first day, split starts, days removed or added by an edit, first day after.
  const firstDay = datesOk ? (compareDates(from, today) < 0 ? today : from) : today;
  const removed = editing && datesOk ? uncoveredDays(editing.startDate, editing.endDate, [{ from, to }]) : [];
  const added = editing && datesOk ? uncoveredDays(from, to, [{ from: editing.startDate, to: editing.endDate }]) : [];
  const chips: { label: string; date: LocalDate }[] = datesOk
    ? [
        { label: `Erster Tag (${dayMonth(firstDay, true)})`, date: firstDay },
        ...replacements.slice(1).map((r) => ({ label: `Ab ${dayMonth(r.from, true)}`, date: r.from })),
        ...removed.filter((r) => compareDates(r.from, today) >= 0).map((r) => ({ label: `Nicht mehr im Urlaub (${dayMonth(r.from, true)})`, date: r.from })),
        ...added.map((r) => ({ label: `Neu im Urlaub (${dayMonth(r.from, true)})`, date: r.from })),
        { label: `Erster Tag danach (${dayMonth(addDays(to, 1), true)})`, date: addDays(to, 1) },
      ]
    : [];
  const day = previewDay && chips.some((c) => c.date === previewDay) ? previewDay : firstDay;
  const existingVacations = editing ? [] : base.closures.filter((c) => c.kind === "VACATION" && compareDates(c.endDate, today) >= 0);

  return (
    <div className={s.flowWide}>
      <PageHead title={editing ? "Urlaub ändern" : "Urlaub eintragen"} />
      {editing ? (
        <ExistingNotice title={`Bestehender Urlaub ${dateRange(editing.startDate, editing.endDate)}`} tag="Bereits veröffentlicht">
          <p className={s.muted}>Sie bearbeiten diesen Urlaub. Die bisherige Version bleibt im Verlauf erhalten.</p>
        </ExistingNotice>
      ) : null}
      {askEdit && overlapping ? (
        <ExistingNotice
          title="Für diesen Zeitraum gibt es bereits einen Urlaub."
          tag="Bereits eingetragen"
          actions={
            <>
              <LinkButton href={`/lab/praxis-cockpit/urlaub?bearbeiten=${encodeURIComponent(overlapping.id)}`} variant="primary">
                Bestehenden Urlaub bearbeiten
              </LinkButton>
              <Button variant="secondary" onClick={() => setNewIntent(true)}>
                Neuen Zeitraum anlegen
              </Button>
            </>
          }
        >
          <p className={s.lead}>Urlaub {dateRange(overlapping.startDate, overlapping.endDate)}</p>
        </ExistingNotice>
      ) : null}
      <EditLayout
        title={editing ? "Urlaub bearbeiten" : "Änderung"}
        edit={
          <div className={s.form}>
            {existingVacations.length && !askEdit ? (
              <p className={s.muted}>
                Bereits eingetragen:{" "}
                {existingVacations.map((c) => (
                  <Link key={c.id} className={s.textLink} href={`/lab/praxis-cockpit/urlaub?bearbeiten=${encodeURIComponent(c.id)}`}>
                    Urlaub {dateRange(c.startDate, c.endDate)} bearbeiten
                  </Link>
                ))}
              </p>
            ) : null}
            <fieldset className={s.section}>
              <legend className={s.h3}>Von wann bis wann bleibt die Praxis geschlossen?</legend>
              <div className={s.row2}>
                <DateField label="Von" value={from} onChange={setFrom} min={editing ? undefined : today} error={e.from} />
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
                  { value: "teilen", label: editing ? "Vertretung mit festen Zeiträumen" : "Zeitraum aufteilen", note: editing ? "Jede Vertretung gilt genau für die eingetragenen Tage" : "Unterschiedliche Praxen für Teilzeiträume" },
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
                  {periods.map((p, i) => {
                    const issue = issueFor(i);
                    return (
                      <fieldset key={i} className={s.period}>
                        <legend className={s.h3}>Vertretungszeitraum {i + 1}</legend>
                        <div className={s.row2}>
                          <DateField label="Von" value={p.from} onChange={(v) => setPeriod(i, { from: v })} />
                          <DateField label="Bis" value={p.to} min={p.from || from} onChange={(v) => setPeriod(i, { to: v })} error={issue?.text} />
                        </div>
                        {issue?.fix ? (
                          <Button variant="secondary" onClick={() => setPeriod(i, { from: issue.fix!.from, to: issue.fix!.to })}>
                            Auf {dateRange(issue.fix.from, issue.fix.to)} anpassen
                          </Button>
                        ) : null}
                        <div className={s.field}>
                          <label className={s.label} htmlFor={`vertretung-${i}`}>
                            Vertretung
                          </label>
                          <select id={`vertretung-${i}`} className={s.input} value={p.practice} onChange={(ev) => setPeriod(i, { practice: ev.target.value })}>
                            <option value="">Bitte wählen</option>
                            {usable.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.practiceName} · {u.city} (bestätigt)
                              </option>
                            ))}
                          </select>
                        </div>
                        {periods.length > 1 || issue?.kind === "outside" ? (
                          <Button variant="quiet" onClick={() => setPeriods(periods.filter((_, j) => j !== i))}>
                            Vertretungszeitraum {i + 1} entfernen
                          </Button>
                        ) : null}
                      </fieldset>
                    );
                  })}
                  {periods.length < 4 ? (
                    <Button variant="secondary" onClick={() => setPeriods([...periods, { from: "", to: "", practice: "" }])}>
                      Weiteren Zeitraum hinzufügen
                    </Button>
                  ) : null}
                  <StaleReplacements until={to || today} />
                  {coverage.newGaps.length ? (
                    <div className={s.inlineBlock} role="note">
                      <p className={s.inlineBlockTitle}>Für den verlängerten Zeitraum ist noch keine Vertretung hinterlegt.</p>
                      <p>Ohne Vertretung: {coverage.newGaps.map((g) => dateRange(g.from, g.to)).join(", ")}. An diesen Tagen zeigt die Website die Notfall-Hinweise.</p>
                      {coverage.newGaps.map((g) => {
                        const before = periods.findIndex((p) => isLocalDate(p.to) && addDays(p.to, 1) === g.from && p.practice);
                        return before >= 0 ? (
                          <Button key={g.from} variant="secondary" onClick={() => setPeriod(before, { to: g.to })}>
                            {name(periods[before].practice)} bis {dayMonth(g.to)} verlängern
                          </Button>
                        ) : null;
                      })}
                    </div>
                  ) : null}
                  {otherGaps.length ? (
                    <div className={s.inlineBlock} role="note">
                      <p className={s.inlineBlockTitle}>Ohne Vertretung: {otherGaps.map((g) => dateRange(g.from, g.to)).join(", ")}</p>
                      <p>An diesen Tagen zeigt die Website die Notfall-Hinweise.</p>
                    </div>
                  ) : null}
                  {coverage.gaps.length ? (
                    <div>
                      <label className={s.check}>
                        <input type="checkbox" checked={gapOk} onChange={(ev) => setGapOk(ev.target.checked)} aria-describedby={!gapOk ? "gap-hint" : undefined} />
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
                {range ? (editing ? `Urlaub aktualisieren: ${range}` : `Urlaub vom ${range} veröffentlichen`) : "Urlaub veröffentlichen"}
              </Button>
            </div>
            {!canPublish && datesReady && !problem ? (
              <p className={s.muted}>{coverage.issues.length ? "Bitte zuerst die Vertretungszeiträume korrigieren." : "Bitte noch die Vertretung festlegen – oder „Keine Vertretung eintragen“."}</p>
            ) : null}
          </>
        }
      />
    </div>
  );
}
