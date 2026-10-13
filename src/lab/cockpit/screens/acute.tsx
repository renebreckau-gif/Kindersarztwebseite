"use client";

import { useState } from "react";
import s from "../cockpit.module.css";
import { useClock, useCockpit } from "../store";
import { Button, Choice, ConfirmedBy, Glyph, PageHead, Success, TimeField, useBusy } from "../ui";
import { EditLayout, LivePreview, Validity } from "./live";
import { ROLES, checkChange, entryVerification, plannedSegments, type CockpitData, type Segment } from "../model";
import { formatMinutes, parseTime } from "@/domain/time";

/** Rebuild today's plan with a new (or no) acute window inside the opening hours (change set only). */
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

type Mode = "aendern" | "entfaellt";

export function Acute() {
  const { state, apply } = useCockpit();
  const { today } = useClock();
  const base = state.data;
  const planned = plannedSegments(base, today);
  const current = planned.find((x) => x.type === "ACUTE");
  const [mode, setMode] = useState<Mode | "">("");
  const [start, setStart] = useState(current?.start ?? "10:00");
  const [end, setEnd] = useState(current?.end ?? "11:00");
  const [done, setDone] = useState<string>();
  const { busy, run } = useBusy();

  const valid = /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end);
  const segs = mode === "entfaellt" ? withAcute(planned, null) : mode === "aendern" && valid ? withAcute(planned, { start, end }) : null;
  const error = mode === "aendern" && valid && !segs ? "Die Akutsprechstunde muss innerhalb der Sprechzeit liegen, und das Ende muss nach dem Beginn liegen." : undefined;
  const who = ROLES[state.role];
  const draft: CockpitData | null = segs
    ? {
        ...base,
        exceptions: [
          ...base.exceptions,
          {
            id: `akut-heute-${today}-${mode === "entfaellt" ? "entfaellt" : start}`,
            kind: "SPECIAL_HOURS",
            startDate: today,
            endDate: today,
            intervals: segs.map((x) => ({ start: x.start, end: x.end, consultationType: x.type })),
            priority: 1,
            verification: entryVerification(who.person, state.role, today, today),
          },
        ],
      }
    : null;
  const problem = draft ? checkChange(base, draft, today, today, today) : null;
  const label = mode === "entfaellt" ? "Akutsprechstunde heute absagen" : `Akutsprechstunde heute auf ${start}–${end} Uhr ändern`;
  const sample = mode === "aendern" && valid ? formatMinutes(parseTime(start) + 10) : current ? formatMinutes(parseTime(current.start) + 10) : "10:10";

  function publish() {
    if (!draft || problem) return;
    run(600, () => {
      setDone(
        apply(draft, {
          title: mode === "entfaellt" ? "Akutsprechstunde heute abgesagt" : `Akutsprechstunde heute ${start}–${end} Uhr`,
          detail: "Akutsprechstunde heute geändert",
          before: current ? `${current.start}–${current.end}` : "keine",
          after: mode === "entfaellt" ? "entfällt" : `${start}–${end}`,
          undoSentence: current ? `Die Akutsprechstunde wäre heute wieder ${current.start}–${current.end} Uhr.` : "Der bisherige Stand wäre wiederhergestellt.",
          entityIds: [draft.exceptions.at(-1)!.id],
        }),
      );
    });
  }

  const warn = (
    <div className={s.protoWarn} role="note">
      <Glyph name="attention" size={20} />
      <p>
        <strong>Prototyp-Hinweis:</strong> Diese Regel muss vor der ersten Veröffentlichung ärztlich bestätigt werden. Die Zeiten hier sind Testdaten.
      </p>
    </div>
  );

  if (done) {
    return (
      <div className={s.flowWide}>
        <PageHead title="Akutsprechstunde ändern" focusKey={done} />
        <div className={s.doneLayout}>
          <Success title="Auf der Website veröffentlicht" undoId={done}>
            <p>Die Änderung gilt nur heute. Morgen gilt automatisch wieder die reguläre Akutsprechstunde.</p>
          </Success>
          <LivePreview base={state.data} draft={null} moments={[{ label: `Heute · ${sample} Uhr`, date: today, time: sample }]} />
        </div>
      </div>
    );
  }

  return (
    <div className={s.flowWide}>
      <PageHead title="Akutsprechstunde ändern" intro={`Heute: ${current ? `${current.start}–${current.end} Uhr` : "keine Akutsprechstunde"} · Regel: montags bis freitags 10:00–11:00 Uhr (Testdaten)`} />
      {warn}
      <EditLayout
        edit={
          <div className={s.form}>
            <Choice
              legend="Was ändert sich heute?"
              name="akut"
              value={mode}
              onChange={setMode}
              options={[
                { value: "aendern", label: "Heute ändern", note: "Andere Uhrzeit nur für heute" },
                ...(current ? [{ value: "entfaellt" as const, label: "Heute entfällt" }] : []),
              ]}
            />
            {mode === "aendern" ? (
              <div className={s.row2}>
                <TimeField label="Heute von" value={start} onChange={setStart} />
                <TimeField label="bis" value={end} onChange={setEnd} error={error} />
              </div>
            ) : null}
            {mode ? <Validity data={draft} from={today} to={today} noun="Diese Änderung" /> : null}
            <p className={s.confirmedBy}>
              {state.role === "STAFF"
                ? "Die Regel dauerhaft ändern oder zum ersten Mal bestätigen kann nur eine Ärztin oder ein Arzt."
                : "Dauerhafte Änderung und erste ärztliche Bestätigung: im Prototyp nicht ausgebaut."}
            </p>
          </div>
        }
        preview={<LivePreview base={base} draft={draft} problem={problem} moments={[{ label: `Heute · ${sample} Uhr`, date: today, time: sample, compare: true }]} />}
        actions={
          <>
            <ConfirmedBy />
            <div className={s.actions}>
              <Button onClick={publish} busy={busy} busyLabel="Wird veröffentlicht …" disabled={!draft || Boolean(problem)}>
                {mode ? label : "Akutsprechstunde heute ändern"}
              </Button>
            </div>
          </>
        }
      />
    </div>
  );
}
