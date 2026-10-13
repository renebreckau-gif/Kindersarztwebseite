"use client";

import { useState } from "react";
import s from "../cockpit.module.css";
import { useCockpit } from "../store";
import { Button, ConfirmedBy, DateField, Glyph, PageHead, Success, TextField, useBusy } from "../ui";
import { MOCK_TODAY, ROLES, dayMonth, entryVerification, type CockpitData } from "../model";
import { addDays, compareDates, isLocalDate } from "@/domain/time";
import type { Announcement } from "@/domain/content-types";

type Step = "form" | "preview" | "done";

export function Notice() {
  const { state, apply } = useCockpit();
  const [step, setStep] = useState<Step>("form");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [from, setFrom] = useState(MOCK_TODAY);
  const [until, setUntil] = useState(addDays(MOCK_TODAY, 14));
  const [openEnded, setOpenEnded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<{ data: CockpitData; notice: Announcement }>();
  const [doneId, setDoneId] = useState<string>();
  const { busy, run } = useBusy();

  function validate(unbefristet: boolean) {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Bitte einen Titel eingeben.";
    if (!text.trim()) e.text = "Bitte einen kurzen Hinweis eingeben.";
    if (!isLocalDate(from)) e.from = "Bitte ein Datum wählen.";
    if (!unbefristet) {
      if (!until) e.until = "Bitte ein Enddatum wählen – oder bewusst „Unbefristet veröffentlichen“.";
      else if (isLocalDate(from) && compareDates(until, from) < 0) e.until = "Das Enddatum liegt vor dem Beginn.";
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    const who = ROLES[state.role];
    const notice: Announcement = {
      id: `hinweis-${Date.now().toString(36)}`,
      category: "INFO",
      title: title.trim(),
      shortText: text.trim(),
      validFrom: from,
      validUntil: unbefristet ? "OPEN_ENDED" : until,
      priority: 2,
      homepageHighlight: false,
      published: true,
      verification: entryVerification(who.person, state.role, unbefristet ? addDays(MOCK_TODAY, 30) : until),
    };
    setOpenEnded(unbefristet);
    run(600, () => {
      setDraft({ data: { ...state.data, announcements: [...state.data.announcements, notice] }, notice });
      setStep("preview");
    });
  }

  const publishLabel = openEnded ? "Hinweis unbefristet veröffentlichen" : `Hinweis bis ${dayMonth(until)} veröffentlichen`;

  function publish() {
    if (!draft) return;
    run(600, () => {
      const id = apply(draft.data, {
        title: "Hinweis veröffentlicht",
        detail: `„${draft.notice.title}“`,
        before: "nicht sichtbar",
        after: openEnded ? "sichtbar ohne Enddatum" : `sichtbar bis ${dayMonth(until)}`,
        undoSentence: `Der Hinweis „${draft.notice.title}“ wäre nicht mehr auf der Website.`,
        entityIds: [draft.notice.id],
      });
      setDoneId(id);
      setStep("done");
    });
  }

  const expiry = openEnded ? (
    <p className={s.note}>Dieser Hinweis hat kein Enddatum. Er bleibt sichtbar, bis ihn jemand beendet, und erscheint alle 30 Tage unter „Prüfen“.</p>
  ) : (
    <p className={s.expiry}>Dieser Hinweis verschwindet automatisch nach dem {dayMonth(until)}.</p>
  );

  return (
    <div className={s.flow}>
      <PageHead title="Hinweis veröffentlichen" focusKey={step} intro={step === "form" ? "Kurze Information für Eltern, z. B. geänderte Telefonzeiten." : undefined} />

      {step === "form" ? (
        <form className={s.form} noValidate onSubmit={(e) => (e.preventDefault(), validate(false))}>
          <TextField label="Titel" value={title} onChange={setTitle} max={60} error={errors.title} privacy={false} />
          <TextField label="Kurzer Hinweis" value={text} onChange={setText} max={280} multiline error={errors.text} />
          <div className={s.row2}>
            <DateField label="Gültig ab" value={from} onChange={setFrom} min={MOCK_TODAY} error={errors.from} />
            <DateField label="Gültig bis" value={until} onChange={setUntil} min={from} error={errors.until} hint="Danach verschwindet der Hinweis automatisch." />
          </div>
          {isLocalDate(until) && !errors.until ? <p className={s.expiry}>Dieser Hinweis verschwindet automatisch nach dem {dayMonth(until)}.</p> : null}
          <div className={s.actions}>
            <Button type="submit" busy={busy && !openEnded} busyLabel="Vorschau wird erstellt …">
              Vorschau ansehen
            </Button>
          </div>
          {!until ? (
            <div className={s.inlineBlock}>
              <p className={s.inlineBlockTitle}>Kein Enddatum gewählt</p>
              <p>Ohne Enddatum bleibt der Hinweis sichtbar, bis ihn jemand beendet. Das ist nur sinnvoll für dauerhafte Informationen.</p>
              <Button variant="secondary" onClick={() => validate(true)}>
                Unbefristet veröffentlichen
              </Button>
            </div>
          ) : null}
        </form>
      ) : null}

      {step === "preview" && draft ? (
        <div className={s.stack}>
          <section className={s.preview} aria-label="So sieht es die Website">
            <div className={s.previewHead}>
              <h2 className={s.previewTitle}>So sieht es die Website</h2>
              <p className={s.previewWhen}>Ab {dayMonth(draft.notice.validFrom)} · Seite „Heute“</p>
            </div>
            <div className={`ds-root ${s.previewBody}`}>
              <div className={s.previewNotice}>
                <p className={s.previewSub}>Aktueller Hinweis</p>
                <p className={s.previewNoticeTitle}>{draft.notice.title}</p>
                <p>{draft.notice.shortText}</p>
              </div>
            </div>
          </section>
          {expiry}
          <ConfirmedBy />
          <div className={s.actions}>
            <Button onClick={publish} busy={busy} busyLabel="Wird veröffentlicht …">
              {publishLabel}
            </Button>
            <Button variant="quiet" onClick={() => setStep("form")}>
              Zurück
            </Button>
          </div>
        </div>
      ) : null}

      {step === "done" && draft ? (
        <Success title="Hinweis veröffentlicht" undoId={doneId}>
          <p className={s.successLine}>
            <Glyph name="clock" size={20} />
            {openEnded ? "Ohne Enddatum – erscheint alle 30 Tage unter „Prüfen“." : `Verschwindet automatisch nach dem ${dayMonth(until)}.`}
          </p>
        </Success>
      ) : null}
    </div>
  );
}
