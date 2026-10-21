// Vertretungspraxen — directory overview (Phase 09.5G). Every role reads; actions are role-specific
// (ADMIN: structural data · DOCTOR: confirmation · STAFF: read). Server checks stay authoritative.

import config from "@payload-config";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { loadPracticeData } from "@/cockpit/queries";
import { berlinNow } from "@/cockpit/read-model";
import { NOT_SELECTABLE, directoryItems } from "@/cockpit/workflows/replacement";
import type { PayloadReader } from "@/backend/payload-repository";
import { CockpitFrame } from "../../cockpit-frame";
import { internSession } from "../../session";
import { Unavailable } from "../../unavailable";
import { StatusLine } from "./directory-parts";

const ACTION_LABEL = { EDIT: "Daten bearbeiten", VERIFY: "Vertretung bestätigen", REVERIFY: "Erneut bestätigen", VIEW: "Ansehen" } as const;

export default async function Vertretungen() {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  const { staff } = session;
  let data;
  try {
    data = (await loadPracticeData((await getPayload({ config })) as unknown as PayloadReader)).data;
  } catch {
    return <Unavailable />;
  }
  const items = directoryItems(data.replacementPractices, staff.role, berlinNow(new Date()).date);

  return (
    <CockpitFrame staff={staff} current="/intern/vertretungen">
      <div className="cp-home cp-workflow">
        <div>
          <h1 className="cp-h1">Vertretungspraxen</h1>
          <p className="cp-intro">Diese Praxen können bei Urlaub oder Schließzeiten als Vertretung ausgewählt werden.</p>
          <p className="cp-muted">Auswählbar ist eine Praxis nur, solange sie ärztlich bestätigt ist. Die Bestätigung wird nach rund sechs Monaten erneut geprüft.</p>
        </div>
        {staff.role === "ADMIN" ? (
          <p>
            <Link href="/intern/vertretungen/neu" className="cp-btn cp-btn-primary">
              Neue Vertretungspraxis
            </Link>
          </p>
        ) : null}
        {items.length ? (
          <ul className="cp-dir-list" aria-label="Vertretungspraxen">
            {items.map((i) => (
              <li key={i.id} className="cp-panel cp-dir-card">
                <h2 className="cp-h2">{i.practiceName}</h2>
                <StatusLine item={i} />
                <p className="cp-dir-meta">
                  {i.city} ·{" "}
                  <a href={`tel:${i.phone.replace(/[^0-9+]/g, "")}`} className="cp-text-link">
                    {i.phone}
                  </a>
                </p>
                {!i.usable && staff.role === "STAFF" ? <p className="cp-muted">{NOT_SELECTABLE}</p> : null}
                {!i.usable && staff.role === "ADMIN" ? <p className="cp-muted">Ärztliche Bestätigung erforderlich</p> : null}
                <Link href={`/intern/vertretungen/${encodeURIComponent(i.id)}`} className={i.action === "VERIFY" || i.action === "REVERIFY" ? "cp-btn cp-btn-primary" : "cp-btn cp-btn-secondary"} aria-label={`${ACTION_LABEL[i.action]}: ${i.practiceName}`}>
                  {ACTION_LABEL[i.action]}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="cp-muted" role="status">
            Noch keine Vertretungspraxis eingetragen.{staff.role === "ADMIN" ? "" : " Neue Einträge legt die Verwaltung an."}
          </p>
        )}
      </div>
    </CockpitFrame>
  );
}
