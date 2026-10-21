// Confirmation after Sonderöffnungszeiten / Feiertag klären (Phase 09.5F). Truthful staging wording:
// the cockpit database changed; the public website still uses its previous (static) data.

import config from "@payload-config";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { loadPracticeData } from "@/cockpit/queries";
import { planFor } from "@/cockpit/history";
import { activeRole } from "@/backend/access";
import { resolvePuls } from "@/content/puls";
import { formatGermanDate, isLocalDate, zonedToInstant } from "@/domain/time";
import type { PayloadReader } from "@/backend/payload-repository";
import { StatusStatement } from "@/site/blocks";
import { CockpitFrame } from "../../../cockpit-frame";
import { internSession } from "../../../session";
import { Unavailable } from "../../../unavailable";

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function SonderzeitVeroeffentlicht({ searchParams }: { searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  const q = await searchParams;
  const vorgang = typeof q.vorgang === "string" && /^[0-9a-f-]{36}$/.test(q.vorgang) ? q.vorgang : undefined;
  const datum = typeof q.datum === "string" && isLocalDate(q.datum) ? q.datum : undefined;

  let data;
  let undoable = false;
  try {
    const payload = await getPayload({ config });
    data = (await loadPracticeData(payload as unknown as PayloadReader)).data;
    if (vorgang) {
      const { user } = await payload.auth({ headers: await headers() });
      undoable = (await planFor(payload as unknown as PayloadReader, vorgang, data, new Date(), activeRole(user as never))).ok;
    }
  } catch {
    return <Unavailable />;
  }

  return (
    <CockpitFrame staff={session.staff} current="/intern">
      <div className="cp-home cp-workflow">
        <section className="cp-panel cp-done" aria-labelledby="done-title">
          <p className="cp-env cp-done-tag">
            Sonderöffnungszeiten{q.modus === "bearbeitet" ? " · bearbeitet" : ""}
          </p>
          <h1 id="done-title" className="cp-h1" tabIndex={-1}>
            In der Testumgebung veröffentlicht.
          </h1>
          <p className="cp-website-note" role="note">
            Die öffentliche Website verwendet weiterhin die bisherigen Daten.
          </p>
          {datum ? (
            <>
              <h2 className="cp-h2">{formatGermanDate(datum)} laut Cockpit-Datenbank</h2>
              <StatusStatement puls={resolvePuls({}, zonedToInstant(datum, "10:00"), data)} />
            </>
          ) : null}
          <div className="cp-actions-row">
            <Link href={datum ? `/intern/vorschau?datum=${datum}&zeit=10:00` : "/intern/vorschau"} className="cp-btn cp-btn-primary">
              Website-Vorschau öffnen
            </Link>
            <Link href="/intern" className="cp-btn cp-btn-secondary">
              Zur Übersicht
            </Link>
            {undoable ? (
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
