// Akutsprechstunde ärztlich bestätigen (Phase 09.5E-1) — DOCTOR only.
// Rows (Wochentag · von · bis) → server draft → current vs. proposed baseline + engine checks
// (28 days) → POST /intern/akutsprechstunde/bestaetigen (revalidated in one transaction).
// Nothing is prefilled except acute times already stored in the cockpit database.

import config from "@payload-config";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { loadPracticeData } from "@/cockpit/queries";
import { acuteBaselineDraft } from "@/cockpit/workflows/acute";
import { datasetFingerprint } from "@/cockpit/workflows/snapshot";
import { MAX_ACUTE_ROWS, fromSearch, parseAcuteBaseline } from "@/cockpit/workflows/form";
import { berlinNow } from "@/cockpit/read-model";
import { WEEKDAY_NAME, acuteBaselineStatus } from "@/domain/acute";
import type { PayloadReader } from "@/backend/payload-repository";
import { CockpitFrame } from "../../../cockpit-frame";
import { internSession } from "../../../session";
import { Unavailable } from "../../../unavailable";
import { ConfirmedBy, SlotChecks, SlotList } from "../acute-parts";

type Search = Promise<Record<string, string | string[] | undefined>>;
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

export default async function AkutEinrichten({ searchParams }: { searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  const { staff } = session;

  // Server-side role rule (not a hidden button): only a physician confirms the acute baseline.
  if (staff.role !== "DOCTOR") {
    return (
      <CockpitFrame staff={staff} current="/intern">
        <div className="cp-home cp-workflow">
          <div>
            <Link href="/intern/akutsprechstunde" className="cp-back">
              Zur Akutsprechstunde
            </Link>
            <h1 className="cp-h1">Akutsprechstunde ärztlich bestätigen</h1>
          </div>
          <p className="cp-error" role="alert">
            Die Akutsprechstunde kann nur eine Ärztin oder ein Arzt bestätigen. Ihr Konto ({staff.role === "ADMIN" ? "Verwaltung" : "Praxisteam"}) kann sie ansehen, aber nicht bestätigen oder ändern.
          </p>
        </div>
      </CockpitFrame>
    );
  }

  const q = fromSearch(await searchParams);
  const now = new Date();
  let data;
  try {
    data = (await loadPracticeData((await getPayload({ config })) as unknown as PayloadReader)).data;
  } catch {
    return <Unavailable />;
  }
  const today = berlinNow(now).date;
  const current = acuteBaselineStatus(data, today);
  const parsed = parseAcuteBaseline(q);
  const submitted = parsed.rows.length > 0;
  // Only values already stored in the cockpit database are prefilled — never example times.
  const rows = submitted ? parsed.rows : current.slots.map((s) => ({ weekday: String(s.weekday), start: s.start, end: s.end }));
  const shown = Math.min(MAX_ACUTE_ROWS, Math.max(rows.length + 2, 3));
  const draft = rows.length ? acuteBaselineDraft(data, now, { confirmed: false, rows }, datasetFingerprint(data)) : null;
  const problemOf = (i: number) => (draft && !draft.ok ? draft.problems.find((p) => p.index === i) : undefined);
  const status = q.get("status");

  return (
    <CockpitFrame staff={staff} current="/intern">
      <div className="cp-home cp-workflow">
        <div>
          <Link href="/intern/akutsprechstunde" className="cp-back">
            Zur Akutsprechstunde
          </Link>
          <h1 className="cp-h1">Akutsprechstunde ärztlich bestätigen</h1>
          <p className="cp-intro">Tragen Sie die regelmäßigen Zeiten der Akutsprechstunde ein. Jede Zeit muss vollständig innerhalb der bestätigten Sprechzeit liegen. Die übrigen Sprechzeiten werden hier nicht verändert.</p>
        </div>

        {status === "veraltet" ? (
          <p className="cp-error" role="alert">
            Inzwischen wurde etwas geändert. Bitte prüfen Sie die Vorschau erneut.
          </p>
        ) : status === "blockiert" || status === "fehlgeschlagen" ? (
          <p className="cp-error" role="alert">
            {status === "blockiert" ? "Die Akutsprechstunde konnte so nicht bestätigt werden. Bitte die Angaben unten prüfen." : "Die Akutsprechstunde konnte nicht gespeichert werden. Es wurde nichts verändert."}
          </p>
        ) : null}

        <form method="get" action="/intern/akutsprechstunde/einrichten" className="cp-panel cp-form">
          <fieldset className="cp-fieldset">
            <legend className="cp-h2">Regelmäßige Zeiten</legend>
            <p className="cp-help" id="zeilen-hilfe">
              Eine Zeile je Zeitraum. Mehrere Zeilen am selben Wochentag sind möglich. Leere Zeilen werden ignoriert.
            </p>
            {Array.from({ length: shown }, (_, i) => {
              const r = rows[i] ?? { weekday: "", start: "", end: "" };
              const p = problemOf(i);
              const err = p ? `zeile-${i}-fehler` : undefined;
              return (
                <fieldset key={i} className="cp-period cp-acute-row" aria-describedby={err}>
                  <legend className="cp-label">{`Zeitraum ${i + 1}`}</legend>
                  <div className="cp-acute-fields">
                    <div className="cp-field">
                      <label htmlFor={`z${i}_tag`} className="cp-label">
                        Wochentag
                      </label>
                      <select id={`z${i}_tag`} name={`z${i}_tag`} className="cp-input cp-select" defaultValue={r.weekday} aria-invalid={p ? true : undefined} aria-describedby={err}>
                        <option value="">–</option>
                        {WEEKDAYS.map((d) => (
                          <option key={d} value={String(d)}>
                            {WEEKDAY_NAME[d]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="cp-field">
                      <label htmlFor={`z${i}_von`} className="cp-label">
                        Von
                      </label>
                      <input id={`z${i}_von`} name={`z${i}_von`} type="time" step={300} className="cp-input cp-input-time" defaultValue={r.start} aria-invalid={p ? true : undefined} aria-describedby={err} />
                    </div>
                    <div className="cp-field">
                      <label htmlFor={`z${i}_bis`} className="cp-label">
                        Bis
                      </label>
                      <input id={`z${i}_bis`} name={`z${i}_bis`} type="time" step={300} className="cp-input cp-input-time" defaultValue={r.end} aria-invalid={p ? true : undefined} aria-describedby={err} />
                    </div>
                  </div>
                  {p ? (
                    <p id={err} className="cp-field-error">
                      {p.message}
                    </p>
                  ) : null}
                </fieldset>
              );
            })}
          </fieldset>
          <button type="submit" className="cp-btn cp-btn-secondary">
            Vorschau aktualisieren
          </button>
        </form>

        {draft && !draft.ok ? (
          <div className="cp-error" role="alert">
            <p className="cp-alert-text">{draft.message}</p>
          </div>
        ) : null}

        {draft && draft.ok ? (
          <>
            <div className="cp-grid cp-grid-preview">
              <section className="cp-panel" aria-labelledby="bisher-title">
                <h2 id="bisher-title" className="cp-h2">
                  Aktuell in der Cockpit-Datenbank
                </h2>
                {current.state === "READY" ? <SlotList slots={current.slots} label="Bisher bestätigt" /> : <p className="cp-muted">Noch keine ärztlich bestätigte Akutsprechstunde.</p>}
                <ConfirmedBy status={current} />
              </section>
              <section className="cp-panel cp-panel-after" aria-labelledby="neu-title">
                <h2 id="neu-title" className="cp-h2">
                  Ärztlich bestätigt nach dem Speichern
                </h2>
                <SlotList slots={draft.slots} label="Neu" />
              </section>
            </div>
            <section className="cp-panel" aria-labelledby="pruefung-title">
              <h2 id="pruefung-title" className="cp-h2">
                Prüfung mit der Statuslogik
              </h2>
              <p className="cp-muted">Die nächsten 28 Tage wurden geprüft: Die Akutsprechstunde erzeugt keine widersprüchlichen Angaben.</p>
              <SlotChecks checks={draft.checks} />
            </section>
            <form method="post" action="/intern/akutsprechstunde/bestaetigen" className="cp-panel cp-publish">
              <p className="cp-effect">{draft.effect}</p>
              {draft.slots.map((s, i) => (
                <span key={i} hidden>
                  <input type="hidden" name={`z${i}_tag`} value={String(s.weekday)} />
                  <input type="hidden" name={`z${i}_von`} value={s.start} />
                  <input type="hidden" name={`z${i}_bis`} value={s.end} />
                </span>
              ))}
              <input type="hidden" name="fingerprint" value={draft.fingerprint} />
              <label className="cp-choice" htmlFor="bestaetigt">
                <input id="bestaetigt" name="bestaetigt" type="checkbox" value="1" required />
                <span>Ich bestätige als Ärztin bzw. Arzt: Die Praxis hat eine regelmäßige Akutsprechstunde zu diesen Zeiten.</span>
              </label>
              <p className="cp-muted">Die Bestätigung wird in der Cockpit-Datenbank gespeichert. Die öffentliche Website verwendet weiterhin die bisherigen Daten.</p>
              <button type="submit" className="cp-btn cp-btn-primary">
                {draft.actionLabel}
              </button>
            </form>
          </>
        ) : null}
      </div>
    </CockpitFrame>
  );
}
