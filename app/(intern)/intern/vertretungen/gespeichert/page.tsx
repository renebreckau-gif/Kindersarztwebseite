// Confirmation after a directory write (Phase 09.5G). Truthful wording: never "freigegeben" for an
// unconfirmed entry, never "auf der Website" — the public website stays static. No quick undo: a
// correction is a new ADMIN edit (unverified again) or a new physician confirmation.

import config from "@payload-config";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { loadPracticeData } from "@/cockpit/queries";
import { berlinNow } from "@/cockpit/read-model";
import { directoryItem } from "@/cockpit/workflows/replacement";
import { RECORD_ID } from "@/cockpit/workflows/form";
import { formatDayMonth } from "@/domain/time";
import type { PayloadReader } from "@/backend/payload-repository";
import { CockpitFrame } from "../../../cockpit-frame";
import { internSession } from "../../../session";
import { Unavailable } from "../../../unavailable";
import { StatusLine } from "../directory-parts";

type Search = Promise<Record<string, string | string[] | undefined>>;

const TEXT: Record<string, { title: string; note: string }> = {
  neu: { title: "Vertretungspraxis angelegt.", note: "Vor der Verwendung muss sie noch ärztlich bestätigt werden." },
  geaendert: { title: "Angaben der Vertretungspraxis gespeichert.", note: "Sie muss erneut ärztlich bestätigt werden, bevor sie wieder als Vertretung ausgewählt werden kann." },
  bestaetigt: { title: "Vertretungspraxis ärztlich bestätigt.", note: "Sie kann jetzt bei Urlaub oder Schließzeiten als Vertretung ausgewählt werden." },
  zurueckgezogen: { title: "Die Praxis wird nicht mehr als Vertretung angeboten.", note: "Sie kann nicht mehr ausgewählt werden. Der Eintrag und sein Verlauf bleiben erhalten." },
};

export default async function VertretungGespeichert({ searchParams }: { searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  const q = await searchParams;
  const id = typeof q.eintrag === "string" && RECORD_ID.test(q.eintrag) ? q.eintrag : "";
  const text = TEXT[typeof q.art === "string" ? q.art : ""] ?? TEXT.geaendert;
  let data;
  try {
    data = (await loadPracticeData((await getPayload({ config })) as unknown as PayloadReader)).data;
  } catch {
    return <Unavailable />;
  }
  const p = data.replacementPractices.find((x) => x.id === id);
  const item = p ? directoryItem(p, session.staff.role, berlinNow(new Date()).date) : undefined;

  return (
    <CockpitFrame staff={session.staff} current="/intern/vertretungen">
      <div className="cp-home cp-workflow">
        <section className="cp-panel cp-done" aria-labelledby="done-title">
          <p className="cp-env cp-done-tag">Vertretungspraxen · Testumgebung</p>
          <h1 id="done-title" className="cp-h1" tabIndex={-1}>
            {text.title}
          </h1>
          <p className="cp-effect">{text.note}</p>
          {item ? (
            <>
              <h2 className="cp-h2">{item.practiceName}</h2>
              <StatusLine item={item} />
              {q.art === "bestaetigt" && item.reviewDue ? <p className="cp-muted">Erneute ärztliche Prüfung bis {formatDayMonth(item.reviewDue, true)}.</p> : null}
            </>
          ) : null}
          <p className="cp-website-note" role="note">
            Die öffentliche Website verwendet weiterhin die bisherigen Daten.
          </p>
          <div className="cp-actions-row">
            {id ? (
              <Link href={`/intern/vertretungen/${encodeURIComponent(id)}`} className="cp-btn cp-btn-primary">
                Vertretungspraxis ansehen
              </Link>
            ) : null}
            <Link href="/intern/vertretungen" className="cp-btn cp-btn-secondary">
              Alle Vertretungspraxen
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
