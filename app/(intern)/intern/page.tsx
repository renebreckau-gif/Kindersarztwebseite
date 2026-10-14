// Real Praxis Cockpit — Übersicht (READ ONLY, Phase 09.4).
// Every number and status comes from PostgreSQL → Payload → PayloadPracticeRepository → engine.
// Operational changes are not connected yet; the prototype shows how they will work.

import config from "@payload-config";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { resolvePuls } from "@/content/puls";
import { loadPracticeData } from "@/cockpit/queries";
import { cockpitHome } from "@/cockpit/read-model";
import { formatGermanDate, parseTime } from "@/domain/time";
import type { PayloadReader } from "@/backend/payload-repository";
import { StatusStatement } from "@/site/blocks";
import { CockpitFrame } from "../cockpit-frame";
import { internSession } from "../session";
import { Unavailable } from "../unavailable";

// Phase 09.5A: the two today workflows write to the cockpit database; the others remain prototype-only.
const REAL_ACTIONS = [
  { href: "/intern/heute/frueher-schliessen", label: "Heute früher schließen" },
  { href: "/intern/heute/geschlossen", label: "Heute geschlossen" },
];
const PROTOTYPE_ACTIONS = [
  { href: "/lab/praxis-cockpit/urlaub", label: "Urlaub eintragen" },
  { href: "/lab/praxis-cockpit/hinweis", label: "Hinweis veröffentlichen" },
];

export default async function Intern() {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  const { staff } = session;

  let practice;
  try {
    practice = await loadPracticeData((await getPayload({ config })) as unknown as PayloadReader);
  } catch {
    return <Unavailable />;
  }
  const now = new Date();
  const { today, upcoming, review } = cockpitHome({ ...practice, now });
  // Same mapping as the public Heute page (resolvePuls) — only the data source differs: database.
  const dbPuls = resolvePuls({}, now, practice.data);
  const minutes = parseTime(today.time);
  const greeting = minutes < parseTime("11:00") ? "Guten Morgen" : minutes < parseTime("18:00") ? "Guten Tag" : "Guten Abend";
  const firstName = staff.name.split(/[\s(]/)[0];

  return (
    <CockpitFrame staff={staff} current="/intern">
      <div className="cp-home">
        <div>
          <h1 className="cp-h1">
            {greeting}, {firstName}
          </h1>
          <p className="cp-intro">{formatGermanDate(today.date)}</p>
        </div>

        <div className="cp-grid">
          <section className="cp-panel cp-today" aria-labelledby="heute-title">
            <h2 id="heute-title" className="cp-h2">
              Praxis heute
            </h2>
            <StatusStatement puls={dbPuls} />
            {today.hours.length ? (
              <ul className="cp-hours" aria-label="Sprechzeiten heute">
                {today.hours.map((b) => (
                  <li key={b.start}>
                    {b.start}–{b.end}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="cp-source">Aus der Datenbank berechnet · Stand {today.time} Uhr</p>
            <Link href="/intern/vorschau" className="cp-btn cp-btn-secondary">
              Website-Vorschau
            </Link>
          </section>

          <section className="cp-panel cp-quick" aria-labelledby="quick-title">
            <h2 id="quick-title" className="cp-h2">
              Schnellaktionen
            </h2>
            <ul className="cp-quick-list">
              {REAL_ACTIONS.map((q) => (
                <li key={q.href}>
                  <Link href={q.href} className="cp-quick-link cp-quick-real">
                    <span>{q.label}</span>
                    <span className="cp-quick-tag">Testumgebung · Cockpit-Datenbank</span>
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="cp-h3 cp-quick-later">Später verfügbar</h3>
            <p className="cp-muted">Diese Abläufe zeigt bis dahin der Prototyp mit Testdaten.</p>
            <ul className="cp-quick-list">
              {PROTOTYPE_ACTIONS.map((q) => (
                <li key={q.href}>
                  <Link href={q.href} className="cp-quick-link">
                    <span>{q.label}</span>
                    <span className="cp-quick-tag">nur im Prototyp ansehen</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="cp-panel cp-upcoming" aria-labelledby="termine-title">
            <h2 id="termine-title" className="cp-h2">
              Nächste Termine
            </h2>
            {upcoming.length ? (
              <ul className="cp-dates">
                {upcoming.map((i) => (
                  <li key={`${i.kind}-${i.id}`} className="cp-date-row">
                    <span className="cp-date-label">{i.when}</span>
                    <span className="cp-date-title">
                      {i.title}
                      {i.active ? <span className="cp-badge">läuft</span> : null}
                    </span>
                    {i.detail ? <span className="cp-date-note">{i.detail}</span> : null}
                    {i.unconfirmed ? <span className="cp-date-note">Nicht bestätigt · erscheint nicht auf der Website</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cp-muted">In den nächsten Wochen ist nichts Besonderes eingetragen.</p>
            )}
          </section>

          <section className="cp-panel cp-checks" aria-labelledby="pruefen-title">
            <h2 id="pruefen-title" className="cp-h2">
              Prüfen
            </h2>
            {review.length ? (
              <>
                <p className="cp-check-count">
                  <span className="cp-count">{review.length}</span>
                  {review.length === 1 ? "Angabe braucht Aufmerksamkeit" : "Angaben brauchen Aufmerksamkeit"}
                </p>
                <ul className="cp-check-list">
                  {review.map((c) => (
                    <li key={c.id} className="cp-check-item">
                      <h3 className="cp-h3">{c.title}</h3>
                      <p>{c.text}</p>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="cp-muted">Alles geklärt.</p>
            )}
          </section>
        </div>
      </div>
    </CockpitFrame>
  );
}
