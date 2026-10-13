"use client";

// "Prüfen" screens: unresolved holiday, stale replacement practice, role-only areas.

import { useState } from "react";
import s from "../cockpit.module.css";
import { useCockpit } from "../store";
import { Button, Choice, ConfirmedBy, LinkButton, PageHead, Success, WebsitePreview, useBusy } from "../ui";
import { MOCK_HOLIDAYS, MOCK_TODAY, ROLES, checkChange, dayMonth, directoryState, entryVerification, longDate, statusAt, type CockpitData } from "../model";
import { addDays } from "@/domain/time";

export function Holiday({ date }: { date: string }) {
  const { state, apply } = useCockpit();
  const holiday = MOCK_HOLIDAYS.find((h) => h.date === date);
  const [choice, setChoice] = useState<"geschlossen" | "offen" | "">("");
  const [step, setStep] = useState<"view" | "preview" | "done">("view");
  const [error, setError] = useState<string>();
  const [draft, setDraft] = useState<CockpitData>();
  const [doneId, setDoneId] = useState<string>();
  const { busy, run } = useBusy();

  if (!holiday) return <PageHead title="Feiertag nicht gefunden" />;
  const current = statusAt(state.data, date, "10:00");
  const resolved = current.status !== "UNKNOWN";

  function preview() {
    if (!choice) return setError("Bitte wählen, ob die Praxis an diesem Tag geschlossen ist.");
    if (choice === "offen") return setError("Sonderöffnungszeiten an Feiertagen sind im Prototyp nicht ausgebaut. Bitte „geschlossen“ wählen oder später eintragen.");
    setError(undefined);
    const who = ROLES[state.role];
    const next: CockpitData = {
      ...state.data,
      exceptions: [
        ...state.data.exceptions,
        { id: `feiertag-${date}`, kind: "CLOSED", startDate: date, endDate: date, intervals: [], priority: 1, publicMessage: `${holiday!.name}: Die Praxis ist geschlossen.`, verification: entryVerification(who.person, state.role, date) },
      ],
    };
    run(600, () => {
      if (!checkChange(state.data, next, date)) {
        setDraft(next);
        setStep("preview");
      }
    });
  }

  return (
    <div className={s.flow}>
      <PageHead title={resolved ? `${holiday.name} ist geklärt` : "Feiertag noch nicht geklärt"} focusKey={step} intro={`${longDate(date)} · ${holiday.name}`} />
      {step === "view" ? (
        <div className={s.stack}>
          {!resolved ? <p className={s.lead}>Für diesen Feiertag ist noch nicht bestätigt, ob die Praxis geöffnet oder geschlossen ist.</p> : null}
          <WebsitePreview heading="Das sehen Eltern an diesem Tag" when={`${longDate(date)}, 10:00 Uhr`} result={current} />
          {!resolved ? (
            <form className={s.form} noValidate onSubmit={(e) => (e.preventDefault(), preview())}>
              <Choice
                legend="Was gilt an diesem Tag?"
                name="feiertag"
                value={choice}
                onChange={setChoice}
                error={error}
                options={[
                  { value: "geschlossen", label: "Die Praxis ist geschlossen" },
                  { value: "offen", label: "Die Praxis hat Sonderöffnungszeiten" },
                ]}
              />
              <div className={s.actions}>
                <Button type="submit" busy={busy} busyLabel="Vorschau wird erstellt …">
                  Vorschau ansehen
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}
      {step === "preview" && draft ? (
        <div className={s.stack}>
          <WebsitePreview when={`${longDate(date)}, 10:00 Uhr`} result={statusAt(draft, date, "10:00")} />
          <ConfirmedBy />
          <div className={s.actions}>
            <Button
              busy={busy}
              busyLabel="Wird übernommen …"
              onClick={() =>
                run(600, () => {
                  setDoneId(
                    apply(draft, {
                      title: `${dayMonth(date)} als geschlossen eingetragen`,
                      detail: holiday.name,
                      before: "nicht geklärt",
                      after: "geschlossen",
                      undoSentence: `Für den ${dayMonth(date)} wäre wieder nicht geklärt, ob die Praxis geöffnet ist.`,
                      entityIds: [`feiertag-${date}`],
                    }),
                  );
                  setStep("done");
                })
              }
            >
              {dayMonth(date)} als geschlossen veröffentlichen
            </Button>
            <Button variant="quiet" onClick={() => setStep("view")}>
              Zurück
            </Button>
          </div>
        </div>
      ) : null}
      {step === "done" && draft ? (
        <Success title="Änderung übernommen" undoId={doneId}>
          <WebsitePreview heading="Website würde dann zeigen" headingLevel={3} when={`${longDate(date)}, 10:00 Uhr`} result={statusAt(draft, date, "10:00")} />
        </Success>
      ) : null}
    </div>
  );
}

export function DirectoryCheck({ id }: { id: string }) {
  const { state, apply } = useCockpit();
  const p = state.data.directory.find((x) => x.id === id);
  const [done, setDone] = useState<string>();
  const { busy, run } = useBusy();
  if (!p) return <PageHead title="Vertretung nicht gefunden" />;
  const st = directoryState(p);

  if (state.role === "STAFF") {
    return (
      <div className={s.flow}>
        <PageHead title="Vertretung muss bestätigt werden" intro={p.practiceName} />
        <p className={s.lead}>Diese Vertretung wurde länger nicht geprüft und kann deshalb noch nicht veröffentlicht werden.</p>
        <p className={s.confirmedBy}>Bestätigen kann nur eine Ärztin oder ein Arzt der Praxis, nach einem Anruf bei der Vertretungspraxis.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className={s.flow}>
        <PageHead title={p.practiceName} />
        <Success title="Vertretung bestätigt" undoId={done}>
          <p>Bis zur nächsten Prüfung in sechs Monaten kann das Praxisteam {p.practiceName} wieder auswählen.</p>
        </Success>
      </div>
    );
  }

  return (
    <div className={s.flow}>
      <PageHead title="Vertretung prüfen" intro={`${p.practiceName} · ${p.street}, ${p.postalCode} ${p.city} · ${p.phone}`} />
      <div className={s.stack}>
        <p className={s.lead}>{st.usable ? st.note : "Diese Vertretung wurde länger nicht geprüft und kann deshalb noch nicht veröffentlicht werden."}</p>
        <p>Bitte rufen Sie die Praxis an und klären Sie, ob die Vertretung weiter gilt und Adresse und Telefonnummer stimmen.</p>
        <ConfirmedBy />
        <div className={s.actions}>
          <Button
            busy={busy}
            busyLabel="Wird übernommen …"
            onClick={() =>
              run(600, () => {
                const who = ROLES[state.role];
                const next: CockpitData = {
                  ...state.data,
                  directory: state.data.directory.map((x) => (x.id === p.id ? { ...x, verification: entryVerification(who.person, state.role, addDays(MOCK_TODAY, 182)) } : x)),
                };
                setDone(
                  apply(next, {
                    title: "Vertretung bestätigt",
                    detail: `${p.practiceName} (telefonisch)`,
                    before: "Prüfung abgelaufen",
                    after: `bestätigt bis ${dayMonth(addDays(MOCK_TODAY, 182))}`,
                    undoSentence: `${p.practiceName} wäre wieder nicht auswählbar.`,
                    entityIds: [p.id],
                  }),
                );
              })
            }
          >
            Telefonisch bestätigt – wieder freigeben
          </Button>
          <LinkButton href="/lab/praxis-cockpit" variant="quiet">
            Abbrechen
          </LinkButton>
        </div>
      </div>
    </div>
  );
}

const AREAS: Record<string, { title: string; text: string; roles: string[] }> = {
  sprechzeiten: {
    title: "Sprechzeiten bestätigen",
    text: "Hier bestätigt eine Ärztin oder ein Arzt den Wochenplan und die Akutsprechstunde. Das Praxisteam kann diese Angaben nicht selbst bestätigen.",
    roles: ["DOCTOR", "ADMIN"],
  },
  benutzer: {
    title: "Benutzer & Einstellungen",
    text: "Hier legt die Verwaltung persönliche Konten an, vergibt Rollen und sperrt Zugänge. Es gibt keine Selbstregistrierung und keine gemeinsamen Konten.",
    roles: ["ADMIN"],
  },
};

export function Area({ slug }: { slug: string }) {
  const { state } = useCockpit();
  const a = AREAS[slug];
  if (!a) return <PageHead title="Bereich nicht gefunden" />;
  const allowed = a.roles.includes(state.role);
  return (
    <div className={s.flow}>
      <PageHead title={a.title} intro={allowed ? a.text : "Dieser Bereich ist für Ihre Rolle nicht freigegeben."} />
      <p className={s.note}>Im Prototyp nicht ausgebaut. Der Bereich zeigt nur, wer ihn später sieht.</p>
    </div>
  );
}
