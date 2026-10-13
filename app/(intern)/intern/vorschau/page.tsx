// Website-Vorschau: what the website WOULD show if the database were already the public source,
// for any Berlin date/time — plus a staging comparison with the current (static) website.
// Authenticated only. Same engine and the same public presentation component (StatusStatement).

import config from "@payload-config";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { resolvePuls } from "@/content/puls";
import { staticPulsData } from "@/data/static-repository";
import { loadPreview } from "@/cockpit/queries";
import { previewInstant } from "@/cockpit/preview";
import { dateRange } from "@/cockpit/read-model";
import { formatGermanDate } from "@/domain/time";
import type { PayloadReader } from "@/backend/payload-repository";
import { StatusStatement } from "@/site/blocks";
import { CockpitFrame } from "../../cockpit-frame";
import { internSession } from "../../session";
import { Unavailable } from "../../unavailable";

type Search = Promise<Record<string, string | string[] | undefined>>;

const CONFIDENCE = { VERIFIED: "bestätigt", REVIEW_DUE: "Prüfung fällig", UNKNOWN: "unsicher – die Website zeigt keinen festen Status" } as const;

export default async function Vorschau({ searchParams }: { searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  const { staff } = session;

  const q = await searchParams;
  const when = previewInstant(q.datum, q.zeit, new Date());
  let preview;
  try {
    preview = await loadPreview((await getPayload({ config })) as unknown as PayloadReader, staticPulsData(), when.at);
  } catch {
    return <Unavailable />;
  }
  const { comparison, databaseData } = preview;
  const r = comparison.database;
  const puls = resolvePuls({}, when.at, databaseData);

  return (
    <CockpitFrame staff={staff} current="/intern/vorschau">
      <div className="cp-home">
        <div>
          <h1 className="cp-h1">Website-Vorschau</h1>
          <p className="cp-intro">So würde die Website den Praxis-Status anzeigen, wenn sie bereits die Daten aus dem Cockpit verwendet.</p>
        </div>

        <form className="cp-panel cp-when" method="get" action="/intern/vorschau">
          <div className="cp-field">
            <label htmlFor="datum" className="cp-label">
              Datum
            </label>
            <input id="datum" name="datum" type="date" className="cp-input" defaultValue={when.date} required />
          </div>
          <div className="cp-field">
            <label htmlFor="zeit" className="cp-label">
              Uhrzeit
            </label>
            <input id="zeit" name="zeit" type="time" className="cp-input" defaultValue={when.time} required />
          </div>
          <button type="submit" className="cp-btn cp-btn-primary">
            Anzeigen
          </button>
          <p className="cp-muted cp-when-note">Zeitzone Europe/Berlin. Auch zukünftige Tage sind möglich.</p>
          {when.corrected ? (
            <p className="cp-error" role="status">
              Die Eingabe war ungültig. Gezeigt wird die aktuelle Zeit.
            </p>
          ) : null}
        </form>

        <div className="cp-grid cp-grid-preview">
          <section className="cp-panel" aria-labelledby="website-title">
            <h2 id="website-title" className="cp-h2">
              {formatGermanDate(when.date)}, {when.time} Uhr
            </h2>
            <StatusStatement puls={puls} />
            <dl className="cp-facts">
              <div>
                <dt>Aktuelle Sprechzeit</dt>
                <dd>{r.currentInterval ? `${r.currentInterval.start}–${r.currentInterval.end} Uhr` : "keine"}</dd>
              </div>
              <div>
                <dt>Nächste Sprechzeit</dt>
                <dd>{r.nextOpening ? r.nextOpening.label : r.nextOpening === null ? "nicht sicher bestimmbar" : "–"}</dd>
              </div>
              {r.activeClosure ?? r.upcomingClosure ? (
                <div>
                  <dt>{r.activeClosure ? "Schließung" : "Angekündigte Schließung"}</dt>
                  <dd>{dateRange((r.activeClosure ?? r.upcomingClosure)!.startDate, (r.activeClosure ?? r.upcomingClosure)!.endDate)}</dd>
                </div>
              ) : null}
              {r.activeClosure ? (
                <div>
                  <dt>Vertretung</dt>
                  <dd>{r.replacementPractices.length ? r.replacementPractices.map((p) => `${p.practiceName}, ${p.phone}`).join(" · ") : "keine bestätigte Vertretung – die Website zeigt die Notfall-Hinweise"}</dd>
                </div>
              ) : null}
              <div>
                <dt>Datenlage</dt>
                <dd>{CONFIDENCE[r.dataConfidence]}</dd>
              </div>
            </dl>
          </section>

          <section className="cp-panel" aria-labelledby="vergleich-title">
            <h2 id="vergleich-title" className="cp-h2">
              Vergleich mit der aktuellen Website
            </h2>
            {comparison.equal ? (
              <p className="cp-ok" role="status">
                Stimmt mit der aktuellen Website überein.
              </p>
            ) : (
              <>
                <p className="cp-diff" role="status">
                  Abweichung zur aktuellen Website
                </p>
                <ul className="cp-diff-list">
                  {comparison.differences.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </>
            )}
            <p className="cp-muted">Die öffentliche Website verwendet noch die bisherigen, fest hinterlegten Daten. Dieser Vergleich dient nur der Prüfung in der Testumgebung.</p>
          </section>
        </div>
      </div>
    </CockpitFrame>
  );
}
