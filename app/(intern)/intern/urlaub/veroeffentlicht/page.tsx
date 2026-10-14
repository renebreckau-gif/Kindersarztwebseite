// Confirmation after publishing a planned closure (Phase 09.5C). Truthful staging wording: the
// change is in the COCKPIT DATABASE; the public website still uses its previous (static) data.
// Everything shown is re-read from the database (the query only names the record and change set).

import config from "@payload-config";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { activeRole } from "@/backend/access";
import { PayloadPracticeRepository, type PayloadReader } from "@/backend/payload-repository";
import { planFor } from "@/cockpit/history";
import { berlinNow, closureReplacementText } from "@/cockpit/read-model";
import { KIND_TITLE } from "@/cockpit/workflows/planned";
import { RECORD_ID } from "@/cockpit/workflows/form";
import { dayMonth, shortRange, STAGING_PUBLISHED } from "@/cockpit/workflows/wording";
import type { Closure } from "@/domain/content-types";
import { compareDates } from "@/domain/time";
import { CockpitFrame } from "../../../cockpit-frame";
import { internSession } from "../../../session";
import { Unavailable } from "../../../unavailable";

type Search = Promise<Record<string, string | string[] | undefined>>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function UrlaubVeroeffentlicht({ searchParams }: { searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  const q = await searchParams;
  const eintrag = typeof q.eintrag === "string" && RECORD_ID.test(q.eintrag) ? q.eintrag : undefined;
  const vorgang = typeof q.vorgang === "string" && UUID.test(q.vorgang) ? q.vorgang : undefined;
  const edited = q.modus === "bearbeitet";

  const now = new Date();
  const today = berlinNow(now).date;
  let record: Closure | undefined;
  let names: (id: string) => string = () => "";
  let undoable = false;
  try {
    const payload = await getPayload({ config });
    const reader = payload as unknown as PayloadReader;
    const data = await new PayloadPracticeRepository(reader).getPulsData();
    record = eintrag ? data.closures.find((c) => c.id === eintrag) : undefined;
    names = (id) => data.replacementPractices.find((p) => p.id === id)?.practiceName ?? "unbekannte Praxis";
    // Undo is offered only if the server confirms it is currently safe (latest, within 24 h, …).
    if (vorgang) {
      const { user } = await payload.auth({ headers: await headers() });
      undoable = (await planFor(reader, vorgang, data, now, activeRole(user as never))).ok;
    }
  } catch {
    return <Unavailable />;
  }

  const firstDay = record ? (compareDates(record.startDate, today) < 0 ? today : record.startDate) : today;
  return (
    <CockpitFrame staff={session.staff} current="/intern">
      <div className="cp-home cp-workflow">
        <section className="cp-panel cp-done" aria-labelledby="done-title">
          {record ? (
            <p className="cp-env cp-done-tag">
              {KIND_TITLE[record.kind]} · {edited ? "bearbeitet" : "neu eingetragen"}
            </p>
          ) : null}
          <h1 id="done-title" className="cp-h1" tabIndex={-1}>
            {STAGING_PUBLISHED.title}
          </h1>
          <p className="cp-effect">{STAGING_PUBLISHED.database}</p>
          <p className="cp-website-note" role="note">
            {STAGING_PUBLISHED.website}
          </p>
          {record ? (
            <dl className="cp-facts">
              <div>
                <dt>Art</dt>
                <dd>{KIND_TITLE[record.kind]}</dd>
              </div>
              <div>
                <dt>Zeitraum</dt>
                <dd>{shortRange(record.startDate, record.endDate)}</dd>
              </div>
              <div>
                <dt>Angekündigt ab</dt>
                <dd>{record.announceFrom ? dayMonth(record.announceFrom) : "keine Ankündigung"}</dd>
              </div>
              <div>
                <dt>Vertretung</dt>
                <dd>{closureReplacementText(record, names).replace(/^Vertretung: /, "")}</dd>
              </div>
              {record.publicMessage ? (
                <div>
                  <dt>Hinweis</dt>
                  <dd>{record.publicMessage}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="cp-muted">Dieser Eintrag ist nicht mehr aktiv (zum Beispiel inzwischen zurückgenommen). Den aktuellen Stand zeigt die Übersicht.</p>
          )}
          <div className="cp-actions-row">
            <Link href={`/intern/vorschau?datum=${firstDay}&zeit=09:00`} className="cp-btn cp-btn-primary">
              Website-Vorschau öffnen
            </Link>
            <Link href="/intern" className="cp-btn cp-btn-secondary">
              Zur Übersicht
            </Link>
            {undoable && vorgang ? (
              <Link href={`/intern/verlauf/${vorgang}/zuruecknehmen`} className="cp-btn cp-btn-quiet">
                Änderung zurücknehmen
              </Link>
            ) : null}
          </div>
        </section>
      </div>
    </CockpitFrame>
  );
}
