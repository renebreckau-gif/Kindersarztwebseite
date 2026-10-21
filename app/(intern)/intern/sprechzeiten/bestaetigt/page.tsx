// Confirmation after the physician weekly plan (Phase 09.5I). Truthful staging wording; no quick undo —
// a correction is another physician edit; the audit stays append-only.

import config from "@payload-config";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { PayloadPracticeRepository, type PayloadReader } from "@/backend/payload-repository";
import { berlinNow } from "@/cockpit/read-model";
import { PUBLIC_STATIC_NOTE } from "@/cockpit/workflows/weekly-plan";
import { weeklyPlanStatus } from "@/domain/weekly-plan";
import { CockpitFrame } from "../../../cockpit-frame";
import { internSession } from "../../../session";
import { Unavailable } from "../../../unavailable";
import { PlanStatusLine } from "../week-parts";

type Search = Promise<Record<string, string | string[] | undefined>>;
const TAG: Record<string, string> = { erst: "Regelmäßige Sprechzeiten ärztlich bestätigt", erneut: "Wochenplan erneut bestätigt", geaendert: "Regelmäßige Sprechzeiten geändert" };

export default async function SprechzeitenBestaetigt({ searchParams }: { searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  const q = await searchParams;
  let data;
  try {
    data = await new PayloadPracticeRepository((await getPayload({ config })) as unknown as PayloadReader).getPulsData();
  } catch {
    return <Unavailable />;
  }
  const status = weeklyPlanStatus(data.schedule, berlinNow(new Date()).date);
  return (
    <CockpitFrame staff={session.staff} current="/intern">
      <div className="cp-home cp-workflow">
        <section className="cp-panel cp-done" aria-labelledby="done-title">
          <p className="cp-env cp-done-tag">{TAG[String(q.art)] ?? TAG.geaendert}</p>
          <h1 id="done-title" className="cp-h1" tabIndex={-1}>
            Wochenplan in der Testumgebung ärztlich bestätigt.
          </h1>
          <PlanStatusLine status={status} />
          <p className="cp-website-note" role="note">
            {PUBLIC_STATIC_NOTE}
          </p>
          <div className="cp-actions-row">
            <Link href="/intern/sprechzeiten" className="cp-btn cp-btn-primary">
              Zum Wochenplan
            </Link>
            <Link href="/intern/vorschau" className="cp-btn cp-btn-secondary">
              Website-Vorschau öffnen
            </Link>
            <Link href="/intern" className="cp-btn cp-btn-quiet">
              Zur Übersicht
            </Link>
          </div>
        </section>
      </div>
    </CockpitFrame>
  );
}
