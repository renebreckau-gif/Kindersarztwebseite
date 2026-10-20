// Confirmation after a real cockpit publish (Phase 09.5A). Truthful staging wording: the change is
// in the COCKPIT DATABASE; the public website still uses its previous (static) data.

import config from "@payload-config";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { resolvePuls } from "@/content/puls";
import { headers } from "next/headers";
import { loadPracticeData } from "@/cockpit/queries";
import { planFor } from "@/cockpit/history";
import { activeRole } from "@/backend/access";
import { STAGING_PUBLISHED } from "@/cockpit/workflows/wording";
import type { PayloadReader } from "@/backend/payload-repository";
import { StatusStatement } from "@/site/blocks";
import { CockpitFrame } from "../../../cockpit-frame";
import { internSession } from "../../../session";
import { Unavailable } from "../../../unavailable";

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Veroeffentlicht({ searchParams }: { searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  const q = await searchParams;
  const what = q.art === "geschlossen" ? "Heute geschlossen" : q.art === "akut" ? "Akutsprechstunde heute" : "Heute früher schließen";
  const edited = q.modus === "bearbeitet";
  const replaced = q.modus === "ersetzt";
  const vorgang = typeof q.vorgang === "string" && /^[0-9a-f-]{36}$/.test(q.vorgang) ? q.vorgang : undefined;

  let practice;
  let undoable = false;
  try {
    const payload = await getPayload({ config });
    practice = await loadPracticeData(payload as unknown as PayloadReader);
    // Undo is offered only if the server confirms it is currently safe (latest, within 24 h, …).
    if (vorgang) {
      const { user } = await payload.auth({ headers: await headers() });
      undoable = (await planFor(payload as unknown as PayloadReader, vorgang, practice.data, new Date(), activeRole(user as never))).ok;
    }
  } catch {
    return <Unavailable />;
  }
  const puls = resolvePuls({}, new Date(), practice.data);

  return (
    <CockpitFrame staff={session.staff} current="/intern">
      <div className="cp-home cp-workflow">
        <section className="cp-panel cp-done" aria-labelledby="done-title">
          <p className="cp-env cp-done-tag">{what}{edited ? " · bearbeitet" : replaced ? " · bestehende Änderung ersetzt" : ""}</p>
          <h1 id="done-title" className="cp-h1" tabIndex={-1}>
            {STAGING_PUBLISHED.title}
          </h1>
          <p className="cp-effect">{STAGING_PUBLISHED.database}</p>
          <p className="cp-website-note" role="note">
            {STAGING_PUBLISHED.website}
          </p>
          <h2 className="cp-h2">Praxis heute laut Cockpit-Datenbank</h2>
          <StatusStatement puls={puls} />
          <div className="cp-actions-row">
            <Link href="/intern/vorschau" className="cp-btn cp-btn-primary">
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
