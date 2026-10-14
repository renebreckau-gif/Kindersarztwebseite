// Confirmation after a real cockpit publish (Phase 09.5A). Truthful staging wording: the change is
// in the COCKPIT DATABASE; the public website still uses its previous (static) data.

import config from "@payload-config";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { resolvePuls } from "@/content/puls";
import { loadPracticeData } from "@/cockpit/queries";
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
  const what = q.art === "geschlossen" ? "Heute geschlossen" : "Heute früher schließen";
  const edited = q.modus === "bearbeitet";

  let practice;
  try {
    practice = await loadPracticeData((await getPayload({ config })) as unknown as PayloadReader);
  } catch {
    return <Unavailable />;
  }
  const puls = resolvePuls({}, new Date(), practice.data);

  return (
    <CockpitFrame staff={session.staff} current="/intern">
      <div className="cp-home cp-workflow">
        <section className="cp-panel cp-done" aria-labelledby="done-title">
          <p className="cp-env cp-done-tag">{what}{edited ? " · bearbeitet" : ""}</p>
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
          </div>
        </section>
      </div>
    </CockpitFrame>
  );
}
