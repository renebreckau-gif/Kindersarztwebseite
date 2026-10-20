// Akutsprechstunde — stable cockpit entry (Phase 09.5E). State-aware:
//   no READY physician baseline → explanation for everyone; DOCTOR additionally gets the setup.
//   READY → today's acute change for STAFF / DOCTOR / ADMIN; DOCTOR can change the baseline.
// Reads the cockpit DATABASE only; the public website stays static.

import config from "@payload-config";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { loadPracticeData } from "@/cockpit/queries";
import { NOT_CONFIRMED_TEXT, acuteTodayContext } from "@/cockpit/workflows/acute";
import type { PayloadReader } from "@/backend/payload-repository";
import { CockpitFrame } from "../../cockpit-frame";
import { internSession } from "../../session";
import { Unavailable } from "../../unavailable";
import { ConfirmedBy, SlotList } from "./acute-parts";

const span = (list: { start: string; end: string }[]) => list.map((b) => `${b.start}–${b.end}`).join(" und ");

export default async function Akutsprechstunde() {
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
  const ctx = acuteTodayContext(data, new Date());
  const status = ctx.baseline;
  const ready = status.state === "READY";
  const doctor = staff.role === "DOCTOR";

  return (
    <CockpitFrame staff={staff} current="/intern">
      <div className="cp-home cp-workflow">
        <div>
          <Link href="/intern" className="cp-back">
            Zur Übersicht
          </Link>
          <h1 className="cp-h1">Akutsprechstunde</h1>
          <p className="cp-intro">Die regelmäßige Akutsprechstunde bestätigt eine Ärztin oder ein Arzt. Änderungen für heute kann danach das ganze Praxisteam eintragen.</p>
        </div>

        <section className="cp-panel" aria-labelledby="grundlage-title">
          <h2 id="grundlage-title" className="cp-h2">
            Ärztlich bestätigte Akutsprechstunde
          </h2>
          {ready ? (
            <>
              <SlotList slots={status.slots} label="Regelmäßige Akutsprechstunde" />
              <ConfirmedBy status={status} />
            </>
          ) : (
            <>
              <p className="cp-alert-text" role="status">
                {NOT_CONFIRMED_TEXT}
              </p>
              {status.reasons.length ? (
                <ul className="cp-check-list" aria-label="Gründe">
                  {status.reasons.map((r) => (
                    <li key={r} className="cp-muted">
                      {r}
                    </li>
                  ))}
                </ul>
              ) : null}
              {!doctor ? <p className="cp-muted">Bestätigen kann nur eine Ärztin oder ein Arzt. Bis dahin ist keine Änderung der Akutsprechstunde möglich.</p> : null}
            </>
          )}
          {doctor ? (
            <Link href="/intern/akutsprechstunde/einrichten" className={ready ? "cp-btn cp-btn-secondary" : "cp-btn cp-btn-primary"}>
              {ready ? "Regelmäßige Akutsprechstunde ändern" : "Akutsprechstunde ärztlich bestätigen"}
            </Link>
          ) : null}
        </section>

        {ready ? (
          <section className="cp-panel" aria-labelledby="heute-title">
            <h2 id="heute-title" className="cp-h2">
              Heute
            </h2>
            <p>
              {ctx.current.length ? `Akutsprechstunde heute: ${span(ctx.current)} Uhr` : "Heute ist keine Akutsprechstunde eingetragen."}
              {ctx.existing ? " (für heute geändert)" : ctx.current.length ? " (regelmäßig)" : ""}
            </p>
            <div className="cp-actions-row">
              <Link href="/intern/akutsprechstunde/heute" className="cp-btn cp-btn-primary">
                {ctx.current.length ? "Akutsprechstunde heute ändern" : "Akutsprechstunde heute eintragen"}
              </Link>
              {ctx.current.length ? (
                <Link href="/intern/akutsprechstunde/heute?modus=entfaellt" className="cp-btn cp-btn-secondary">
                  Heute entfällt
                </Link>
              ) : null}
            </div>
            <p className="cp-muted">Die Änderung gilt nur für heute. Die öffentliche Website verwendet weiterhin die bisherigen Daten.</p>
          </section>
        ) : null}
      </div>
    </CockpitFrame>
  );
}
