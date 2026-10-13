"use client";

import { useState } from "react";
import s from "../cockpit.module.css";
import { useCockpit } from "../store";
import { Button, Glyph, LinkButton, PageHead, Success, useBusy, useFocusOnChange } from "../ui";
import { dateRange, dayMonth, directoryState, type CockpitData } from "../model";

export function VacationDetail({ id }: { id: string }) {
  const { state, apply } = useCockpit();
  const c = state.data.closures.find((x) => x.id === id);
  const [mode, setMode] = useState<"view" | "confirm" | "done">("view");
  const [doneId, setDoneId] = useState<string>();
  const { busy, run } = useBusy();
  const ref = useFocusOnChange<HTMLHeadingElement>(mode);

  if (mode === "done") {
    return (
      <div className={s.flow}>
        <PageHead title="Urlaub zurückgenommen" />
        <Success title="Urlaub zurückgenommen" undoId={doneId}>
          <p>Die Website zeigt für diesen Zeitraum wieder die regulären Sprechzeiten.</p>
        </Success>
      </div>
    );
  }
  if (!c) {
    return (
      <div className={s.flow}>
        <PageHead title="Urlaub nicht gefunden" intro="Im Prototyp gibt es nur Einträge aus dieser Testsitzung." />
      </div>
    );
  }

  const range = dateRange(c.startDate, c.endDate);
  const name = (rid: string) => state.data.directory.find((p) => p.id === rid);

  function withdraw() {
    if (!c) return;
    const next: CockpitData = { ...state.data, closures: state.data.closures.filter((x) => x.id !== c.id) };
    run(600, () => {
      setDoneId(
        apply(next, {
          title: `Urlaub vom ${range} zurückgenommen`,
          before: `geschlossen ${range}`,
          after: "normale Sprechzeiten",
          undoSentence: `Der Urlaub vom ${range} wäre wieder auf der Website.`,
          entityIds: [c.id],
        }),
      );
      setMode("done");
    });
  }

  return (
    <div className={s.flow}>
      <PageHead title={`Urlaub ${range}`} />
      <section className={s.panel} aria-label="Urlaub">
        <dl className={s.facts}>
          <div>
            <dt>Status</dt>
            <dd className={s.published}>
              <Glyph name="check" size={18} />
              Veröffentlicht
            </dd>
          </div>
          <div>
            <dt>Website-Text</dt>
            <dd>{c.publicMessage}</dd>
          </div>
          <div>
            <dt>Vertretung</dt>
            <dd>
              {c.replacements.length
                ? c.replacements.map((r) => {
                    const p = name(r.replacementPracticeId);
                    const ok = p ? directoryState(p, r.until).usable : false;
                    return (
                      <span key={`${r.replacementPracticeId}-${r.from}`} className={s.block}>
                        {dateRange(r.from, r.until)}: {p?.practiceName ?? "unbekannt"}
                        {ok ? "" : " (Bestätigung abgelaufen – auf der Website ausgeblendet)"}
                      </span>
                    );
                  })
                : "Keine – Eltern sehen die Notfall-Hinweise."}
            </dd>
          </div>
          <div>
            <dt>Angekündigt ab</dt>
            <dd>{c.announceFrom ? dayMonth(c.announceFrom) : "–"}</dd>
          </div>
          <div>
            <dt>Automatisches Ende</dt>
            <dd>{dayMonth(c.endDate)}</dd>
          </div>
        </dl>
      </section>

      {mode === "view" ? (
        <div className={s.actions}>
          <LinkButton href={`/lab/praxis-cockpit/elternansicht?datum=${c.startDate}&zeit=09:00`} variant="primary">
            Vorschau
          </LinkButton>
          <LinkButton href={`/lab/praxis-cockpit/urlaub?bearbeiten=${encodeURIComponent(c.id)}`}>Urlaub ändern</LinkButton>
          <Button variant="quiet" onClick={() => setMode("confirm")}>
            Urlaub zurücknehmen
          </Button>
        </div>
      ) : (
        <section className={s.blocked} aria-labelledby="zuruecknehmen">
          <h2 id="zuruecknehmen" ref={ref} tabIndex={-1} className={s.blockedTitle}>
            Urlaub zurücknehmen?
          </h2>
          <p>Der Urlaub vom {range} wäre nicht mehr auf der Website. Eltern sähen wieder die regulären Sprechzeiten.</p>
          <div className={s.actions}>
            <Button onClick={withdraw} busy={busy} busyLabel="Wird zurückgenommen …">
              Urlaub vom {range} zurücknehmen
            </Button>
            <Button variant="quiet" onClick={() => setMode("view")}>
              Abbrechen
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
