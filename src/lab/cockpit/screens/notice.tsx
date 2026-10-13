"use client";

import { useState } from "react";
import s from "../cockpit.module.css";
import { useClock, useCockpit } from "../store";
import { Button, ConfirmedBy, DateField, LinkButton, PageHead, Success, TextField, useBusy } from "../ui";
import { EditLayout, ExistingNotice, LivePreview } from "./live";
import { ROLES, dayMonth, editableAnnouncements, entryVerification, longDate, visibleAnnouncements, withAnnouncement, type CockpitData } from "../model";
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

const untilText = (a: Announcement) => (a.validUntil === "OPEN_ENDED" ? "ohne Enddatum" : `sichtbar bis ${dayMonth(a.validUntil)}`);

export function Notice({ editId }: { editId?: string }) {
  const { state, apply } = useCockpit();
  const { today } = useClock();
  const base = state.data;
  // Only current or upcoming announcements can be edited; expired ones belong to the history.
  const current = editableAnnouncements(base, today);
  const editing = editId ? current.find((a) => a.id === editId) : undefined;
  const [title, setTitle] = useState(editing?.title ?? "");
  const [text, setText] = useState(editing?.shortText ?? "");
  const [from, setFrom] = useState(editing?.validFrom ?? today);
  const [until, setUntil] = useState(editing ? (editing.validUntil === "OPEN_ENDED" ? "" : editing.validUntil) : addDays(today, 14));
  const [done, setDone] = useState<{ id: string; openEnded: boolean }>();
  const { busy, run } = useBusy();

  const untilError = until && isLocalDate(from) && isLocalDate(until) && compareDates(until, from) < 0 ? "Das Enddatum liegt vor dem Beginn." : undefined;
  const filled = title.trim() && text.trim() && isLocalDate(from);
  const who = ROLES[state.role];
  const id = editing?.id ?? `hinweis-${from}-${title.trim().slice(0, 12)}`;
  const make = (openEnded: boolean): Announcement => ({
    id,
    category: editing?.category ?? "INFO",
    title: title.trim(),
    shortText: text.trim(),
    validFrom: from,
    validUntil: openEnded ? "OPEN_ENDED" : until,
    priority: editing?.priority ?? 2,
    homepageHighlight: editing?.homepageHighlight ?? false,
    published: true,
    verification: entryVerification(who.person, state.role, openEnded ? addDays(today, 30) : until, today),
  });
  const hasEnd = Boolean(until) && isLocalDate(until) && !untilError;
  const draftNotice = filled ? make(!hasEnd) : null;
  const draft: CockpitData | null = draftNotice ? withAnnouncement(base, draftNotice) : null;
  const oldUntil = editing && editing.validUntil !== "OPEN_ENDED" ? editing.validUntil : undefined;
  const unchanged = Boolean(editing && draftNotice && editing.title === draftNotice.title && editing.shortText === draftNotice.shortText && editing.validFrom === draftNotice.validFrom && editing.validUntil === draftNotice.validUntil);

  function publish(openEnded: boolean) {
    if (!filled || (!openEnded && !hasEnd) || unchanged) return;
    const notice = make(openEnded);
    run(600, () => {
      const entry = apply(withAnnouncement(base, notice), {
        title: editing ? "Hinweis geändert" : "Hinweis veröffentlicht",
        detail: `„${notice.title}“`,
        before: editing ? untilText(editing) : "nicht sichtbar",
        after: untilText(notice),
        undoSentence: editing ? `Es gälte wieder die vorherige Version des Hinweises (${untilText(editing)}).` : `Der Hinweis „${notice.title}“ wäre nicht mehr auf der Website.`,
        entityIds: [notice.id],
      });
      setDone({ id: entry, openEnded });
    });
  }

  if (done) {
    return (
      <div className={s.flowWide}>
        <PageHead title={editing ? "Hinweis bearbeiten" : "Hinweis veröffentlichen"} focusKey={done.id} />
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
  const start = isLocalDate(from) ? (compareDates(from, today) < 0 ? today : from) : today;
  const afterDate = hasEnd ? addDays(until, 1) : null;
  const others = current.filter((a) => a.id !== editing?.id);

  return (
    <div className={s.flowWide}>
      <PageHead title={editing ? "Hinweis bearbeiten" : "Hinweis veröffentlichen"} intro={editing ? undefined : "Kurze Information für Eltern, z. B. geänderte Telefonzeiten."} />
      {editing ? (
        <ExistingNotice title={`„${editing.title}“ ist veröffentlicht – ${untilText(editing)}.`} tag="Bereits veröffentlicht">
          <p className={s.muted}>Sie bearbeiten diesen Hinweis. Die bisherige Version bleibt im Verlauf erhalten.</p>
        </ExistingNotice>
      ) : others.length ? (
        <ExistingNotice title="Aktuelle Hinweise auf der Website" tag="Bereits veröffentlicht">
          <ul className={s.existingList}>
            {others.map((a) => (
              <li key={a.id}>
                <span>
                  <strong>{a.title}</strong> · {untilText(a)}
                </span>
                <LinkButton href={`/lab/praxis-cockpit/hinweis?bearbeiten=${encodeURIComponent(a.id)}`}>Hinweis bearbeiten</LinkButton>
              </li>
            ))}
          </ul>
        </ExistingNotice>
      ) : null}
      <EditLayout
        title={editing ? "Hinweis bearbeiten" : "Änderung"}
        edit={
          <div className={s.form}>
            <TextField label="Titel" value={title} onChange={setTitle} max={60} privacy={false} />
            <TextField label="Kurzer Hinweis" value={text} onChange={setText} max={280} multiline />
            <div className={s.row2}>
              <DateField label="Gültig ab" value={from} onChange={setFrom} min={editing ? undefined : today} />
              <DateField label="Gültig bis" value={until} onChange={setUntil} min={from} error={untilError} hint="Danach verschwindet der Hinweis automatisch." />
            </div>
            {hasEnd ? (
              <div className={s.validity}>
                <h3 className={s.h3}>Automatisches Ende</h3>
                {oldUntil && oldUntil !== until ? (
                  <p>
                    {compareDates(until, oldUntil) > 0 ? "Neues automatisches Ende" : "Früheres automatisches Ende"}: nach dem <strong>{longDate(until)}</strong> (bisher nach dem {longDate(oldUntil)}).
                  </p>
                ) : (
                  <p>Dieser Hinweis verschwindet nach dem {longDate(until)} automatisch von der Website.</p>
                )}
                <p className={s.muted}>Er bleibt im Verlauf erhalten.</p>
              </div>
            ) : (
              <div className={s.inlineBlock}>
                <p className={s.inlineBlockTitle}>Kein Enddatum gewählt</p>
                <p>Ohne Enddatum bleibt der Hinweis sichtbar, bis ihn jemand beendet. Das ist nur sinnvoll für dauerhafte Informationen.</p>
              </div>
            )}
            {unchanged ? <p className={s.note}>Das entspricht der bereits veröffentlichten Version.</p> : null}
          </div>
        }
        preview={
          <LivePreview
            base={base}
            draft={unchanged ? null : draft}
            moments={[
              { label: `Ab ${longDate(start)}`, date: start, time: "09:00", extra: shown(start) },
              ...(afterDate ? [{ label: `Ab ${longDate(afterDate)} (nach dem Ende)`, date: afterDate, time: "09:00", extra: shown(afterDate) }] : []),
            ]}
          />
        }
        actions={
          <>
            <ConfirmedBy />
            <div className={s.actions}>
              {hasEnd ? (
                <Button onClick={() => publish(false)} busy={busy} busyLabel="Wird veröffentlicht …" disabled={!filled || unchanged}>
                  {editing ? `Hinweis aktualisieren – sichtbar bis ${dayMonth(until)}` : `Hinweis bis ${dayMonth(until)} veröffentlichen`}
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => publish(true)} busy={busy} busyLabel="Wird veröffentlicht …" disabled={!filled || unchanged}>
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
