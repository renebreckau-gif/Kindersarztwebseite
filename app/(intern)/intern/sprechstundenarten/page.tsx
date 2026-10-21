// Sprechstundenarten (Phase 09.5J) — overview for every role. NON-ACUTE types are maintained and confirmed
// by a DOCTOR on the detail page; ACUTE is shown but managed only in /intern/akutsprechstunde (09.5E).
// Codes the weekly plan references but that are missing are listed ("… fehlt") — nothing is invented.

import config from "@payload-config";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { PayloadPracticeRepository, type PayloadReader } from "@/backend/payload-repository";
import { berlinNow } from "@/cockpit/read-model";
import { READ_ONLY_TEXT, TYPE_INTRO, TYPE_SLUG, creatableCodes, typeItems } from "@/cockpit/workflows/consultation-type";
import { ACUTE_SEPARATE_TEXT } from "@/domain/consultation-types";
import { CockpitFrame } from "../../cockpit-frame";
import { internSession } from "../../session";
import { Unavailable } from "../../unavailable";
import { TypeStatusLine, TypeUsage } from "./type-parts";

export default async function Sprechstundenarten() {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  const { staff } = session;
  let data;
  try {
    data = await new PayloadPracticeRepository((await getPayload({ config })) as unknown as PayloadReader).getPulsData();
  } catch {
    return <Unavailable />;
  }
  const today = berlinNow(new Date()).date;
  const doctor = staff.role === "DOCTOR";
  const items = typeItems(data, today);
  const missing = creatableCodes(data).filter((c) => !items.some((i) => i.code === c));

  return (
    <CockpitFrame staff={staff} current="/intern">
      <div className="cp-home cp-workflow">
        <div>
          <Link href="/intern" className="cp-back">
            Zur Übersicht
          </Link>
          <h1 className="cp-h1">Sprechstundenarten</h1>
          <p className="cp-intro">{TYPE_INTRO}</p>
          {!doctor ? <p className="cp-muted">{READ_ONLY_TEXT}</p> : null}
        </div>

        <ul className="cp-dir-list" aria-label="Sprechstundenarten">
          {items.map((i) => (
            <li key={i.code} className="cp-panel cp-dir-card">
              <h2 className="cp-h3">{i.stored ? i.stored.label : `${i.code} fehlt`}</h2>
              <p className="cp-muted">{`Interner Code: ${i.code}`}</p>
              {i.stored?.explanation ? <p>{i.stored.explanation}</p> : null}
              {i.duplicate ? <p className="cp-dir-status cp-dir-attention">{`Sprechstundenart ${i.code} ist mehrfach vorhanden.`}</p> : <TypeStatusLine status={i.status} />}
              <TypeUsage item={i} />
              {i.acute ? (
                <>
                  <p className="cp-muted">{ACUTE_SEPARATE_TEXT}</p>
                  <Link href="/intern/akutsprechstunde" className="cp-btn cp-btn-secondary">
                    Akutsprechstunde verwalten
                  </Link>
                </>
              ) : (
                <Link href={`/intern/sprechstundenarten/${TYPE_SLUG[i.code]}`} className="cp-btn cp-btn-secondary" aria-label={`${doctor ? (i.stored ? "Prüfen und bestätigen" : "Anlegen") : "Ansehen"}: ${i.stored?.label ?? i.code}`}>
                  {doctor ? (i.stored ? "Prüfen und bestätigen" : "Anlegen") : "Ansehen"}
                </Link>
              )}
            </li>
          ))}
        </ul>

        {doctor && missing.length ? (
          <section className="cp-panel" aria-labelledby="neu-title">
            <h2 id="neu-title" className="cp-h2">
              Weitere Sprechstundenart anlegen
            </h2>
            <p className="cp-muted">Nur die fest vorgesehenen Arten. Die Bezeichnung legen Sie fest und bestätigen sie ärztlich.</p>
            <ul className="cp-practice-links">
              {missing.map((c) => (
                <li key={c}>
                  <Link href={`/intern/sprechstundenarten/${TYPE_SLUG[c]}`} className="cp-text-link">
                    {`Sprechstundenart ${c} anlegen`}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </CockpitFrame>
  );
}
