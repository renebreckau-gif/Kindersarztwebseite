// Confirmation after an undo (Phase 09.5B). Truthful staging wording: only the cockpit database
// changed; the public website still uses its previous (static) data.

import config from "@payload-config";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { resolvePuls } from "@/content/puls";
import { loadPracticeData } from "@/cockpit/queries";
import { STAGING_REVERTED } from "@/cockpit/workflows/wording";
import type { PayloadReader } from "@/backend/payload-repository";
import { StatusStatement } from "@/site/blocks";
import { CockpitFrame } from "../../../cockpit-frame";
import { internSession } from "../../../session";
import { Unavailable } from "../../../unavailable";

export default async function Zurueckgenommen() {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  let practice;
  try {
    practice = await loadPracticeData((await getPayload({ config })) as unknown as PayloadReader);
  } catch {
    return <Unavailable />;
  }
  return (
    <CockpitFrame staff={session.staff} current="/intern">
      <div className="cp-home cp-workflow">
        <section className="cp-panel cp-done" aria-labelledby="done-title">
          <p className="cp-env cp-done-tag">Änderung zurückgenommen</p>
          <h1 id="done-title" className="cp-h1">
            {STAGING_REVERTED.title}
          </h1>
          <p className="cp-website-note" role="note">
            {STAGING_REVERTED.website}
          </p>
          <h2 className="cp-h2">Praxis heute laut Cockpit-Datenbank</h2>
          <StatusStatement puls={resolvePuls({}, new Date(), practice.data)} />
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
