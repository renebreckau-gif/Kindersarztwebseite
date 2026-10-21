// Confirmation after a physician consultation-type write (Phase 09.5J). Truthful staging wording; no quick
// undo — a correction is another physician edit; the audit stays append-only.

import config from "@payload-config";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { PayloadPracticeRepository, type PayloadReader } from "@/backend/payload-repository";
import { berlinNow } from "@/cockpit/read-model";
import { TYPE_SLUG, codeOfSlug, typeItems } from "@/cockpit/workflows/consultation-type";
import { CockpitFrame } from "../../../cockpit-frame";
import { internSession } from "../../../session";
import { Unavailable } from "../../../unavailable";
import { TypeStatusLine } from "../type-parts";

type Search = Promise<Record<string, string | string[] | undefined>>;
const TAG: Record<string, string> = { erst: "ärztlich bestätigt", erneut: "erneut bestätigt", geaendert: "geändert und ärztlich bestätigt" };

export default async function SprechstundenartBestaetigt({ searchParams }: { searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  const q = await searchParams;
  const code = codeOfSlug(typeof q.art === "string" ? q.art : undefined);
  let data;
  try {
    data = await new PayloadPracticeRepository((await getPayload({ config })) as unknown as PayloadReader).getPulsData();
  } catch {
    return <Unavailable />;
  }
  const item = code ? typeItems(data, berlinNow(new Date()).date).find((i) => i.code === code) : undefined;
  const label = item?.stored?.label ?? "Sprechstundenart";
  return (
    <CockpitFrame staff={session.staff} current="/intern">
      <div className="cp-home cp-workflow">
        <section className="cp-panel cp-done" aria-labelledby="done-title">
          <p className="cp-env cp-done-tag">{`„${label}“ ${TAG[String(q.vorgang)] ?? TAG.erst}`}</p>
          <h1 id="done-title" className="cp-h1" tabIndex={-1}>
            Sprechstundenart in der Testumgebung ärztlich bestätigt.
          </h1>
          <TypeStatusLine status={item?.status} />
          <p className="cp-website-note" role="note">
            Die öffentliche Website verwendet weiterhin die bisherigen Daten.
          </p>
          <div className="cp-actions-row">
            <Link href={code ? `/intern/sprechstundenarten/${TYPE_SLUG[code]}` : "/intern/sprechstundenarten"} className="cp-btn cp-btn-primary">
              Zur Sprechstundenart
            </Link>
            <Link href="/intern/sprechzeiten" className="cp-btn cp-btn-secondary">
              Regelmäßige Sprechzeiten
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
