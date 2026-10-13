"use client";

import { useState } from "react";
import s from "../cockpit.module.css";
import { useClock, useCockpit } from "../store";
import { Button, ConfirmedBy, DateField, PageHead, Success, TextField, useBusy } from "../ui";
import { EditLayout, LivePreview } from "./live";
import { ROLES, dayMonth, entryVerification, longDate, visibleAnnouncements, type CockpitData } from "../model";
import { addDays, compareDates, isLocalDate } from "@/domain/time";
import type { Announcement } from "@/domain/content-types";

function NoticeCards({ list }: { list: Announcement[] }) {
  return (
    <div className={s.parentSection}>
      <h3 className={s.parentSectionTitle}>Aktuelle Hinweise</h3>
      {list.length ? (
        <ul className={s.repList}>
          {list.map((n) => (
            <li key={n.id} className={s.repCard}>
              <p className={s.repName}>{n.title}</p>
              <p>{n.shortText}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>Derzeit gibt es keine besonderen Hinweise.</p>
      )}
    </div>
  );
}

export function Notice() {
  const { state, apply } = useCockpit();
  const { today } = useClock();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [from, setFrom] = useState(today);
  const [until, setUntil] = useState(addDays(today, 14));
  const [done, setDone] = useState<{ id: string; openEnded: boolean }>();
  const { busy, run } = useBusy();

  const base = state.data;
  const untilError = until && isLocalDate(from) && isLocalDate(until) && compareDates(until, from) < 0 ? "Das Enddatum liegt vor dem Beginn." : undefined;
  const filled = title.trim() && text.trim() && isLocalDate(from);
  const who = ROLES[state.role];
  const make = (openEnded: boolean): Announcement => ({
    id: `hinweis-${from}-${title.trim().slice(0, 12)}`,
    category: "INFO",
    title: title.trim(),
    shortText: text.trim(),
    validFrom: from,
    validUntil: openEnded ? "OPEN_ENDED" : until,
    priority: 2,
    homepageHighlight: false,
    published: true,
    verification: entryVerification(who.person, state.role, openEnded ? addDays(today, 30) : until, today),
  });
  const hasEnd = Boolean(until) && isLocalDate(until) && !untilError;
  const draftNotice = filled ? make(!hasEnd) : null;
  const draft: CockpitData | null = draftNotice ? { ...base, announcements: [...base.announcements, draftNotice] } : null;

  function publish(openEnded: boolean) {
    if (!filled || (!openEnded && !hasEnd)) return;
    const notice = make(openEnded);
    run(600, () => {
      const id = apply(
        { ...base, announcements: [...base.announcements, notice] },
        {
          title: "Hinweis veröffentlicht",
          detail: `„${notice.title}“`,
          before: "nicht sichtbar",
          after: openEnded ? "sichtbar ohne Enddatum" : `sichtbar bis ${dayMonth(until)}`,
          undoSentence: `Der Hinweis „${notice.title}“ wäre nicht mehr auf der Website.`,
          entityIds: [notice.id],
        },
      );
      setDone({ id, openEnded });
    });
  }

  if (done) {
    return (
      <div className={s.flowWide}>
        <PageHead title="Hinweis veröffentlichen" focusKey={done.id} />
        <div className={s.doneLayout}>
          <Success title="Auf der Website veröffentlicht" undoId={done.id}>
            <p>{done.openEnded ? "Ohne Enddatum – erscheint alle 30 Tage unter „Prüfen“." : `Der Hinweis verschwindet nach dem ${dayMonth(until)} automatisch von der Website und bleibt im Verlauf erhalten.`}</p>
          </Success>
          <LivePreview base={state.data} draft={null} moments={[{ label: `Ab ${longDate(from)}`, date: from, time: "09:00", extra: () => <NoticeCards list={visibleAnnouncements(state.data, from)} /> }]} />
        </div>
      </div>
    );
  }

  const shown = (date: string) => () => <NoticeCards list={visibleAnnouncements(draft ?? base, date)} />;
  const afterDate = hasEnd ? addDays(until, 1) : null;

  return (
    <div className={s.flowWide}>
      <PageHead title="Hinweis veröffentlichen" intro="Kurze Information für Eltern, z. B. geänderte Telefonzeiten." />
      <EditLayout
        edit={
          <div className={s.form}>
            <TextField label="Titel" value={title} onChange={setTitle} max={60} privacy={false} />
            <TextField label="Kurzer Hinweis" value={text} onChange={setText} max={280} multiline />
            <div className={s.row2}>
              <DateField label="Gültig ab" value={from} onChange={setFrom} min={today} />
              <DateField label="Gültig bis" value={until} onChange={setUntil} min={from} error={untilError} hint="Danach verschwindet der Hinweis automatisch." />
            </div>
            {hasEnd ? (
              <div className={s.validity}>
                <h3 className={s.h3}>Automatisches Ende</h3>
                <p>Dieser Hinweis verschwindet nach dem {dayMonth(until)} automatisch von der Website. Er bleibt im Verlauf erhalten.</p>
              </div>
            ) : (
              <div className={s.inlineBlock}>
                <p className={s.inlineBlockTitle}>Kein Enddatum gewählt</p>
                <p>Ohne Enddatum bleibt der Hinweis sichtbar, bis ihn jemand beendet. Das ist nur sinnvoll für dauerhafte Informationen.</p>
              </div>
            )}
          </div>
        }
        preview={
          <LivePreview
            base={base}
            draft={draft}
            moments={[
              { label: `Ab ${longDate(isLocalDate(from) ? from : today)}`, date: isLocalDate(from) ? from : today, time: "09:00", extra: shown(isLocalDate(from) ? from : today) },
              ...(afterDate ? [{ label: `Ab ${longDate(afterDate)} (nach dem Ende)`, date: afterDate, time: "09:00", extra: shown(afterDate) }] : []),
            ]}
          />
        }
        actions={
          <>
            <ConfirmedBy />
            <div className={s.actions}>
              {hasEnd ? (
                <Button onClick={() => publish(false)} busy={busy} busyLabel="Wird veröffentlicht …" disabled={!filled}>
                  Hinweis bis {dayMonth(until)} veröffentlichen
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => publish(true)} busy={busy} busyLabel="Wird veröffentlicht …" disabled={!filled}>
                  Unbefristet veröffentlichen
                </Button>
              )}
            </div>
            {!filled ? <p className={s.muted}>Bitte Titel und kurzen Hinweis eingeben.</p> : null}
          </>
        }
      />
    </div>
  );
}
