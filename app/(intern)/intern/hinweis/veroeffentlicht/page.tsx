// Confirmation after publishing a notice (Phase 09.5D). Truthful staging wording: the change is in
// the COCKPIT DATABASE; the public website still uses its previous (static) data. Everything shown
// is re-read from the database (the query only names the record and the change set).

import config from "@payload-config";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { activeRole } from "@/backend/access";
import type { PayloadReader } from "@/backend/payload-repository";
import { planFor } from "@/cockpit/history";
import { loadPracticeData } from "@/cockpit/queries";
import { berlinNow } from "@/cockpit/read-model";
import { OPEN_ENDED_NOTE, validityText } from "@/cockpit/workflows/announcement";
import { RECORD_ID } from "@/cockpit/workflows/form";
import { STAGING_PUBLISHED } from "@/cockpit/workflows/wording";
import type { Announcement } from "@/domain/content-types";
import { compareDates } from "@/domain/time";
import { CockpitFrame } from "../../../cockpit-frame";
import { internSession } from "../../../session";
import { Unavailable } from "../../../unavailable";

type Search = Promise<Record<string, string | string[] | undefined>>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function HinweisVeroeffentlicht({ searchParams }: { searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  const q = await searchParams;
  const eintrag = typeof q.eintrag === "string" && RECORD_ID.test(q.eintrag) ? q.eintrag : undefined;
  const vorgang = typeof q.vorgang === "string" && UUID.test(q.vorgang) ? q.vorgang : undefined;
  const edited = q.modus === "bearbeitet";

  const now = new Date();
  const today = berlinNow(now).date;
  let record: Announcement | undefined;
  let undoable = false;
  try {
    const payload = await getPayload({ config });
    const reader = payload as unknown as PayloadReader;
    const practice = await loadPracticeData(reader);
    record = eintrag ? practice.announcements.find((a) => a.id === eintrag) : undefined;
    // Undo is offered only if the server confirms it is currently safe (latest, within 24 h, …).
    if (vorgang) {
      const { user } = await payload.auth({ headers: await headers() });
      undoable = (await planFor(reader, vorgang, practice, now, activeRole(user as never))).ok;
    }
  } catch {
    return <Unavailable />;
  }

  const previewDay = record && compareDates(record.validFrom, today) > 0 ? record.validFrom : today;
  return (
    <CockpitFrame staff={session.staff} current="/intern">
      <div className="cp-home cp-workflow">
        <section className="cp-panel cp-done" aria-labelledby="done-title">
          <p className="cp-env cp-done-tag">Hinweis · {edited ? "bearbeitet" : "neu veröffentlicht"}</p>
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
                <dt>Hinweis</dt>
                <dd>{record.title}</dd>
              </div>
              <div>
                <dt>Text</dt>
                <dd>{record.shortText}</dd>
              </div>
              <div>
                <dt>Zeitraum</dt>
                <dd>{validityText(record)}</dd>
              </div>
              {record.validUntil === "OPEN_ENDED" ? (
                <div>
                  <dt>Prüfung</dt>
                  <dd>{OPEN_ENDED_NOTE}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="cp-muted">Dieser Hinweis ist nicht mehr aktiv (zum Beispiel inzwischen zurückgenommen). Den aktuellen Stand zeigt die Übersicht.</p>
          )}
          <div className="cp-actions-row">
            <Link href={`/intern/vorschau?datum=${previewDay}&zeit=09:00`} className="cp-btn cp-btn-primary">
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
