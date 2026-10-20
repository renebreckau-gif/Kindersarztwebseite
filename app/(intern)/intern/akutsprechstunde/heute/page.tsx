// Akutsprechstunde heute ändern / entfällt / eintragen (Phase 09.5E-2) — STAFF, DOCTOR, ADMIN, only
// on a READY physician baseline. One SPECIAL_HOURS exception that holds the COMPLETE day.
// Input → server draft → preview (engine, before / during / after) → POST /intern/heute/veroeffentlichen.

import config from "@payload-config";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { buildDraft, previewWorkflow } from "@/cockpit/workflows/publish";
import { datasetFingerprint } from "@/cockpit/workflows/snapshot";
import { acuteTodayContext, todayPoints } from "@/cockpit/workflows/acute";
import { fromSearch, parseAcuteToday } from "@/cockpit/workflows/form";
import type { Draft } from "@/cockpit/workflows/types";
import { CockpitFrame } from "../../../cockpit-frame";
import { internSession } from "../../../session";
import { Unavailable } from "../../../unavailable";
import { BlockedMessage, PreviewPair, PublishForm, StatusNotice } from "../../heute/workflow-parts";
import { statusWord } from "../acute-parts";

type Search = Promise<Record<string, string | string[] | undefined>>;
const span = (list: { start: string; end: string }[]) => list.map((b) => `${b.start}–${b.end}`).join(" und ");

export default async function AkutHeute({ searchParams }: { searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");

  const q = fromSearch(await searchParams);
  const now = new Date();
  const input = parseAcuteToday(q);
  let data;
  try {
    data = (await previewWorkflow(await getPayload({ config }), { kind: "ACUTE_TODAY", input }, now)).data;
  } catch {
    return <Unavailable />;
  }
  const ctx = acuteTodayContext(data, now);
  const cancel = input.mode === "CANCEL";
  // The current acute interval is the starting point of the form — never an invented default.
  const start = input.start || ctx.current[0]?.start || "";
  const end = input.end || ctx.current[0]?.end || "";
  const asked = cancel || (input.start !== "" && input.start !== undefined) || (input.end !== "" && input.end !== undefined);
  const draft: Draft | null = asked ? buildDraft({ kind: "ACUTE_TODAY", input: cancel ? input : { mode: "CHANGE", start, end } }, data, now, datasetFingerprint(data)) : null;
  const notReady = ctx.baseline.state !== "READY";
  const points = draft ? todayPoints(data, draft) : [];

  return (
    <CockpitFrame staff={session.staff} current="/intern">
      <div className="cp-home cp-workflow">
        <div>
          <Link href="/intern/akutsprechstunde" className="cp-back">
            Zur Akutsprechstunde
          </Link>
          <h1 className="cp-h1">{cancel ? "Akutsprechstunde heute entfällt" : ctx.current.length ? "Akutsprechstunde heute ändern" : "Akutsprechstunde heute eintragen"}</h1>
          <p className="cp-intro">
            {ctx.current.length ? `Heute: ${span(ctx.current)} Uhr${ctx.existing ? " (bereits für heute geändert – Sie bearbeiten diese Änderung)" : " (regelmäßig)"}.` : "Heute ist keine Akutsprechstunde eingetragen."} Die Änderung gilt nur für heute.
          </p>
        </div>

        <StatusNotice status={q.get("status")} />

        {notReady ? (
          <p className="cp-error" role="alert">
            Die Akutsprechstunde ist noch nicht ärztlich bestätigt und wird auf der Website nicht angezeigt. Änderungen für heute sind erst danach möglich.
          </p>
        ) : (
          <>
            {cancel ? null : (
              <form method="get" action="/intern/akutsprechstunde/heute" className="cp-panel cp-form">
                <input type="hidden" name="modus" value="aendern" />
                <div className="cp-row2">
                  <div className="cp-field">
                    <label htmlFor="von" className="cp-label">
                      Von
                    </label>
                    <input id="von" name="von" type="time" step={300} className="cp-input cp-input-time" defaultValue={start} required aria-describedby="zeit-hilfe" />
                  </div>
                  <div className="cp-field">
                    <label htmlFor="bis" className="cp-label">
                      Bis
                    </label>
                    <input id="bis" name="bis" type="time" step={300} className="cp-input cp-input-time" defaultValue={end} required aria-describedby="zeit-hilfe" />
                  </div>
                </div>
                <p id="zeit-hilfe" className="cp-help">
                  Innerhalb der heutigen Sprechzeit. Das Ende muss in der Zukunft liegen.
                </p>
                <button type="submit" className="cp-btn cp-btn-secondary">
                  Vorschau aktualisieren
                </button>
              </form>
            )}

            {draft ? (
              <>
                <BlockedMessage draft={draft} />
                <PreviewPair data={data} draft={draft} now={now} existingLabel={ctx.existing ? "Aktuell für heute geändert" : undefined} />
                {points.length ? (
                  <section className="cp-panel" aria-labelledby="punkte-title">
                    <h2 id="punkte-title" className="cp-h2">
                      Prüfung mit der Statuslogik
                    </h2>
                    <dl className="cp-acute-points">
                      {points.map((p) => (
                        <div key={p.label}>
                          <dt>
                            {p.label} ({p.time} Uhr)
                          </dt>
                          <dd>
                            bisher {statusWord(p.before.status)} · neu {statusWord(p.after.status)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ) : null}
                <PublishForm
                  draft={draft}
                  hidden={
                    <>
                      <input type="hidden" name="workflow" value="ACUTE_TODAY" />
                      <input type="hidden" name="modus" value={cancel ? "entfaellt" : "aendern"} />
                      {cancel ? null : (
                        <>
                          <input type="hidden" name="von" value={start} />
                          <input type="hidden" name="bis" value={end} />
                        </>
                      )}
                    </>
                  }
                />
              </>
            ) : (
              <p className="cp-muted" role="status">
                Bitte Beginn und Ende eintragen und die Vorschau aktualisieren.
              </p>
            )}
          </>
        )}
      </div>
    </CockpitFrame>
  );
}
