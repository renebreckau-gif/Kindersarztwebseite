"use client";

import Link from "next/link";
import { useState } from "react";
import s from "../cockpit.module.css";
import { canUndo, useCockpit } from "../store";
import { Button, Glyph, LinkButton, PageHead, WebsitePreview, useBusy, useFocusOnChange } from "../ui";
import { MOCK_NOW, MOCK_TODAY, ROLES, dayMonth, statusAt, type AuditEntry } from "../model";
import { addDays } from "@/domain/time";

const dayLabel = (d: string) => (d === MOCK_TODAY ? "Heute" : d === addDays(MOCK_TODAY, -1) ? "Gestern" : dayMonth(d, true));

export function History() {
  const { state } = useCockpit();
  return (
    <div className={s.flow}>
      <PageHead title="Verlauf" intro="Jede Änderung mit Person und Uhrzeit. Nichts wird gelöscht – Rücknahmen erscheinen als eigener Eintrag." />
      <ol className={s.history}>
        {state.audit.map((e) => (
          <li key={e.id} className={s.historyItem}>
            <p className={s.historyMeta}>
              {dayLabel(e.date)} · {e.time} Uhr · {e.actor} <span className={s.muted}>({ROLES[e.role].label})</span>
            </p>
            <h2 className={s.h3}>{e.title}</h2>
            {e.detail ? <p>{e.detail}</p> : null}
            {e.before || e.after ? (
              <p className={s.beforeAfter}>
                <span>{e.before ?? "–"}</span>
                <Glyph name="chevron" size={16} />
                <span className="visually-hidden">geändert zu</span>
                <span>{e.after ?? "–"}</span>
              </p>
            ) : null}
            {e.revertedBy ? <p className={s.tag}>Zurückgenommen</p> : null}
            <Link href={`/lab/praxis-cockpit/verlauf/${e.id}`} className={s.textLink}>
              Änderung ansehen<span className="visually-hidden">: {e.title}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function HistoryDetail({ id, entity, startUndo }: { id: string; entity?: string; startUndo?: boolean }) {
  const { state, revert } = useCockpit();
  const entry: AuditEntry | undefined = id === "eintrag" && entity ? state.audit.find((e) => e.entityIds.includes(entity)) : state.audit.find((e) => e.id === id);
  const [mode, setMode] = useState<"view" | "confirm" | "done">(startUndo ? "confirm" : "view");
  const { busy, run } = useBusy();
  const ref = useFocusOnChange<HTMLHeadingElement>(mode);

  if (!entry) {
    return (
      <div className={s.flow}>
        <PageHead title="Änderung nicht gefunden" backHref="/lab/praxis-cockpit/verlauf" backLabel="Verlauf" intro="Im Prototyp gibt es nur die Einträge dieser Testsitzung." />
      </div>
    );
  }

  const check = canUndo(state, entry.id);
  const revertedBy = entry.revertedBy ? state.audit.find((e) => e.id === entry.revertedBy) : undefined;

  return (
    <div className={s.flow}>
      <PageHead title="Änderung" backHref="/lab/praxis-cockpit/verlauf" backLabel="Verlauf" />
      <section className={s.panel} aria-labelledby="aenderung">
        <h2 id="aenderung" className={s.h2}>
          {entry.title}
        </h2>
        <p className={s.historyMeta}>
          {dayLabel(entry.date)} · {entry.time} Uhr · {entry.actor} ({ROLES[entry.role].label})
        </p>
        {entry.detail ? <p>{entry.detail}</p> : null}
        <dl className={s.compare}>
          <div>
            <dt>Vorher</dt>
            <dd>{entry.before ?? "–"}</dd>
          </div>
          <div>
            <dt>Danach</dt>
            <dd>{entry.after ?? "–"}</dd>
          </div>
        </dl>
        <p className={s.muted}>{revertedBy ? `Zurückgenommen von ${revertedBy.actor} um ${revertedBy.time} Uhr.` : entry.revertOf ? "Diese Rücknahme ist auf der Website." : "Diese Änderung ist auf der Website."}</p>
      </section>

      {mode === "view" ? (
        check.ok ? (
          <div className={s.actions}>
            <Button variant="secondary" onClick={() => setMode("confirm")}>
              <Glyph name="undo" size={18} />
              Änderung zurücknehmen
            </Button>
          </div>
        ) : (
          <p className={s.note}>{check.reason}</p>
        )
      ) : null}

      {mode === "confirm" && check.ok && entry.snapshot ? (
        <section className={s.stack} aria-labelledby="ruecknahme">
          <h2 id="ruecknahme" ref={ref} tabIndex={-1} className={s.h2}>
            Änderung zurücknehmen?
          </h2>
          <p className={s.lead}>{entry.undoSentence}</p>
          <WebsitePreview heading="Website nach der Rücknahme" headingLevel={3} when={`Heute, ${MOCK_NOW} Uhr`} result={statusAt(entry.snapshot, MOCK_TODAY, MOCK_NOW)} />
          <div className={s.actions}>
            <Button busy={busy} busyLabel="Wird zurückgenommen …" onClick={() => run(600, () => (revert(entry.id), setMode("done")))}>
              Rücknahme bestätigen
            </Button>
            <Button variant="quiet" onClick={() => setMode("view")}>
              Abbrechen
            </Button>
          </div>
        </section>
      ) : null}
      {mode === "confirm" && !check.ok ? <p className={s.note}>{check.reason}</p> : null}

      {mode === "done" ? (
        <section className={s.success} aria-labelledby="zurueck-ok">
          <h2 id="zurueck-ok" ref={ref} tabIndex={-1} className={s.successTitle}>
            <span className={s.successMark}>
              <Glyph name="check" size={22} />
            </span>
            Änderung zurückgenommen
          </h2>
          <WebsitePreview heading="Website würde jetzt zeigen" headingLevel={3} when={`Heute, ${MOCK_NOW} Uhr`} result={statusAt(state.data, MOCK_TODAY, MOCK_NOW)} />
          <p className={s.muted}>Die Rücknahme steht als eigener Eintrag im Verlauf.</p>
          <div className={s.actions}>
            <LinkButton href="/lab/praxis-cockpit" variant="primary">
              Zur Startseite
            </LinkButton>
            <LinkButton href="/lab/praxis-cockpit/verlauf" variant="quiet">
              Zum Verlauf
            </LinkButton>
          </div>
        </section>
      ) : null}
    </div>
  );
}
