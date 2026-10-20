// Confirmation after the physician acute baseline (Phase 09.5E-1). Truthful staging wording: the
// cockpit database changed; the public website still uses its previous (static) data. No quick
// undo — a physician corrects the baseline by another edit; the audit stays append-only.

import config from "@payload-config";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { loadPracticeData } from "@/cockpit/queries";
import { baselineHistoryText } from "@/cockpit/workflows/acute";
import { acuteBaselineStatus } from "@/domain/acute";
import { berlinNow } from "@/cockpit/read-model";
import type { PayloadReader } from "@/backend/payload-repository";
import { CockpitFrame } from "../../../cockpit-frame";
import { internSession } from "../../../session";
import { Unavailable } from "../../../unavailable";
import { ConfirmedBy, SlotList } from "../acute-parts";

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function AkutBestaetigt({ searchParams }: { searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  const q = await searchParams;
  let data;
  try {
    data = (await loadPracticeData((await getPayload({ config })) as unknown as PayloadReader)).data;
  } catch {
    return <Unavailable />;
  }
  const status = acuteBaselineStatus(data, berlinNow(new Date()).date);

  return (
    <CockpitFrame staff={session.staff} current="/intern">
      <div className="cp-home cp-workflow">
        <section className="cp-panel cp-done" aria-labelledby="done-title">
          <p className="cp-env cp-done-tag">{baselineHistoryText(q.art === "erst")}</p>
          <h1 id="done-title" className="cp-h1" tabIndex={-1}>
            Akutsprechstunde in der Testumgebung ärztlich bestätigt.
          </h1>
          <p className="cp-website-note" role="note">
            Die öffentliche Website verwendet derzeit weiterhin die bisherigen Daten.
          </p>
          <SlotList slots={status.slots} label="Regelmäßige Akutsprechstunde" />
          <ConfirmedBy status={status} />
          <p className="cp-muted">Korrekturen erfolgen durch eine erneute ärztliche Änderung. Der Verlauf bleibt vollständig erhalten.</p>
          <div className="cp-actions-row">
            <Link href="/intern/akutsprechstunde" className="cp-btn cp-btn-primary">
              Akutsprechstunde heute prüfen
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
