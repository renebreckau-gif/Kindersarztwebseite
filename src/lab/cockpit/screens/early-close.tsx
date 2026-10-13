"use client";

import Link from "next/link";
import { useState } from "react";
import s from "../cockpit.module.css";
import { useClock, useCockpit } from "../store";
import { Button, ConfirmedBy, LinkButton, PageHead, Success, TextField, TimeField, useBusy } from "../ui";
import { EditLayout, ExistingNotice, LivePreview, Validity } from "./live";
import {
  ROLES,
  blocks,
  checkChange,
  earlyCloseDraft,
  earlyCloseLabel,
  existingTodayChange,
  existingTodayClosure,
  lastEnd,
  plannedSegments,
  rulesSegments,
  type EarlyCloseEffect,
} from "../model";
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

export function EarlyClose({ startEdit = false }: { startEdit?: boolean }) {
  const { state, apply } = useCockpit();
  const { today, now } = useClock();
  const base = state.data;
  const existing = existingTodayChange(base, today);
  const closedToday = existingTodayClosure(base, today);
  const existingBlocks = existing ? blocks(existing.intervals.map((i) => ({ start: i.start, end: i.end, type: i.consultationType }))) : [];
  const [editing, setEditing] = useState(startEdit);
  const [time, setTime] = useState(existing ? (lastEnd(existing.intervals.map((i) => ({ start: i.start, end: i.end, type: i.consultationType }))) ?? "13:00") : "13:00");
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [done, setDone] = useState<string>();
  const { busy, run } = useBusy();

  const regular = rulesSegments(today);
  const planned = existing ? regular : plannedSegments(base, today);
  const end = lastEnd(planned);
  const valid = /^\d{2}:\d{2}$/.test(time);
  const who = ROLES[state.role];
  const { effect, draft } = valid ? earlyCloseDraft(base, today, time, { existing: editing ? existing : undefined, message, person: who.person, role: state.role }) : { effect: undefined, draft: null };
  const unchanged = Boolean(existing && editing && effect && range(blocks(effect.segments)) === range(existingBlocks) && (message === undefined || message === (existing.publicMessage ?? "")));

  const error = !valid
    ? "Bitte eine Uhrzeit wählen."
    : parseTime(time) <= parseTime(now)
      ? `Die Uhrzeit liegt vor jetzt (${now} Uhr). Wenn die Praxis sofort schließt, nutzen Sie „Heute geschlossen“.`
      : effect?.kind === "TOO_LATE"
        ? existing && editing
          ? `Bis ${end} Uhr entspricht den regulären Sprechzeiten. Um die Änderung aufzuheben, nutzen Sie „Änderung zurücknehmen“ im Verlauf.`
          : end
            ? `Heute ist ohnehin nur bis ${end} Uhr geöffnet.`
            : "Heute ist ohnehin keine Sprechzeit geplant."
        : effect?.kind === "TOO_EARLY"
          ? "Zu dieser Uhrzeit hat die Praxis heute noch nicht geöffnet. Bitte „Heute geschlossen“ nutzen."
          : undefined;

  const usable = !error && draft && !unchanged ? draft : null;
  const problem = usable ? checkChange(base, usable, today, today, today) : null;
  const label = !effect || error ? "Heute früher schließen" : effect.kind === "GAP" ? earlyCloseLabel(effect, time) : existing && editing ? `Bestehende Änderung aktualisieren: heute bis ${time} Uhr` : earlyCloseLabel(effect, time);

  function publish() {
    if (!usable || !effect || problem) return;
    const edit = Boolean(existing && editing);
    run(600, () => {
      setDone(
        apply(usable, {
          title: edit ? "Sonderzeit geändert" : label,
          detail: edit
            ? `Bestehende Änderung aktualisiert${effect.kind === "GAP" ? ` · gewählt: ${time} Uhr (regulär bereits geschlossen)` : ""}`
            : effect.kind === "GAP"
              ? `Gewählt: ${time} Uhr (regulär bereits geschlossen)`
              : "Öffnungszeit heute geändert",
          before: edit ? range(existingBlocks) : range(blocks(planned)),
          after: range(blocks(effect.segments)),
          undoSentence: edit ? `Es gälte wieder die vorherige Version: heute ${range(existingBlocks)} Uhr.` : `Die Praxis wäre heute wieder bis ${end} geöffnet.`,
          entityIds: [usable.exceptions.find((x) => x.startDate === today && x.kind === "SPECIAL_HOURS")!.id],
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
            <p>Die Änderung gilt nur heute. Morgen gelten automatisch wieder die regulären Sprechzeiten. Die vorherige Version bleibt im Verlauf.</p>
          </Success>
          <LivePreview base={state.data} draft={null} moments={[{ label: `Jetzt · ${now} Uhr`, date: today, time: now }]} />
        </div>
      </div>
    );
  }

  // Closed for the whole day: editing hours makes no sense — point to the closure instead.
  if (closedToday) {
    return (
      <div className={s.flowWide}>
        <PageHead title="Heute früher schließen" />
        <ExistingNotice
          title="Die Praxis ist heute bereits geschlossen"
          tag="Bereits eingetragen"
          actions={<LinkButton href="/lab/praxis-cockpit/geschlossen?bearbeiten=1" variant="primary">Bestehende Schließung bearbeiten</LinkButton>}
        >
          <p>Für heute ist „Heute geschlossen“ veröffentlicht. Eine geänderte Sprechzeit würde dem widersprechen.</p>
        </ExistingNotice>
        <LivePreview base={base} draft={null} moments={[{ label: `Jetzt · ${now} Uhr`, date: today, time: now }]} />
      </div>
    );
  }

  const notice = existing ? (
    <ExistingNotice
      title="Für heute ist bereits eine geänderte Sprechzeit veröffentlicht."
      actions={
        editing ? undefined : (
          <>
            <Button onClick={() => setEditing(true)}>Bestehende Änderung anpassen</Button>
            <Link className={s.textLink} href={`/lab/praxis-cockpit/verlauf/eintrag?objekt=${encodeURIComponent(existing.id)}`}>
              Änderung ansehen
            </Link>
          </>
        )
      }
    >
      <p className={s.lead}>Heute: {range(existingBlocks)} Uhr</p>
      {editing ? <p className={s.muted}>Sie passen diese Änderung an. Die bisherige Version bleibt im Verlauf erhalten.</p> : null}
    </ExistingNotice>
  ) : null;

  if (existing && !editing) {
    return (
      <div className={s.flowWide}>
        <PageHead title="Heute früher schließen" />
        {notice}
        <LivePreview base={base} draft={null} moments={[{ label: `Jetzt · ${now} Uhr`, date: today, time: now }]} />
      </div>
    );
  }

  const after = effect?.lastEnd ? formatMinutes(parseTime(effect.lastEnd) + 1) : undefined;

  return (
    <div className={s.flowWide}>
      <PageHead title="Heute früher schließen" intro={`Reguläre Sprechzeit heute: ${range(blocks(regular)) || "keine Sprechzeit"}${regular.length ? " Uhr" : ""}`} />
      {notice}
      <EditLayout
        title={existing ? "Bestehende Änderung anpassen" : "Änderung"}
        edit={
          <div className={s.form}>
            <TimeField label="Bis wann ist heute geöffnet?" value={time} onChange={setTime} error={error} big />
            {effect && !error && effect.kind === "GAP" ? <GapExplanation effect={effect} time={time} /> : null}
            {effect && !error && effect.kind === "INSIDE" ? <p className={s.note}>Danach gilt heute: {range(blocks(effect.segments))} Uhr.</p> : null}
            {unchanged ? <p className={s.note}>Das entspricht der bereits veröffentlichten Version.</p> : null}
            <TextField label="Hinweis für die Website" optional value={message ?? existing?.publicMessage ?? ""} onChange={setMessage} max={140} placeholder="Heute schließen wir früher." />
            <Validity data={usable} from={today} to={today} noun="Diese Änderung" />
          </div>
        }
        preview={
          <LivePreview
            base={base}
            draft={usable}
            problem={problem}
            moments={[
              { label: `Jetzt · ${now} Uhr`, date: today, time: now, compare: true },
              ...(usable && after ? [{ label: `Ab ${effect!.lastEnd} Uhr`, date: today, time: after, compare: Boolean(existing) }] : []),
            ]}
          />
        }
        actions={
          <>
            <ConfirmedBy />
            <div className={s.actions}>
              <Button onClick={publish} busy={busy} busyLabel="Wird veröffentlicht …" disabled={!usable || Boolean(problem)}>
                {label}
              </Button>
            </div>
          </>
        }
      />
    </div>
  );
}
