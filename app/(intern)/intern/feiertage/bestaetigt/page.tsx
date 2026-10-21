// Confirmation after the physician holiday rule (Phase 09.5H). Truthful staging wording; no quick
// undo — a correction is another physician confirmation; the audit stays append-only.

import config from "@payload-config";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { PayloadPracticeRepository, type PayloadReader } from "@/backend/payload-repository";
import { berlinNow } from "@/cockpit/read-model";
import { holidayPolicyStatus, policyStateText } from "@/domain/holiday-policy";
import { formatDayMonth } from "@/domain/time";
import { CockpitFrame } from "../../../cockpit-frame";
import { internSession } from "../../../session";
import { Unavailable } from "../../../unavailable";

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function FeiertagsregelBestaetigt({ searchParams }: { searchParams: Search }) {
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
  const status = holidayPolicyStatus(data.holidayPolicy, berlinNow(new Date()).date);
  return (
    <CockpitFrame staff={session.staff} current="/intern">
      <div className="cp-home cp-workflow">
        <section className="cp-panel cp-done" aria-labelledby="done-title">
          <p className="cp-env cp-done-tag">{q.art === "erst" ? "Feiertagsregel ärztlich bestätigt" : "Feiertagsregel geändert"}</p>
          <h1 id="done-title" className="cp-h1" tabIndex={-1}>
            Feiertagsregel in der Testumgebung ärztlich bestätigt.
          </h1>
          <p className="cp-effect">{policyStateText(status)}</p>
          {status.reviewDue ? <p className="cp-muted">Erneute ärztliche Prüfung bis {formatDayMonth(status.reviewDue, true)}.</p> : null}
          <p className="cp-website-note" role="note">
            Die öffentliche Website verwendet weiterhin die bisherigen Daten.
          </p>
          <div className="cp-actions-row">
            <Link href="/intern/feiertage" className="cp-btn cp-btn-primary">
              Zu den Feiertagen
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
