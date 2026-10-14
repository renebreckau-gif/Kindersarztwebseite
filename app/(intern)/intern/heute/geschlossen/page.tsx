// 7.2 Heute geschlossen — REAL workflow against the cockpit database (Phase 09.5A).
// "Ab sofort" = whole-day SHORT_NOTICE closure. "Ab einer Uhrzeit" = the 7.1 early-close
// workflow (one representation, no second record type).

import config from "@payload-config";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { previewWorkflow } from "@/cockpit/workflows/publish";
import { publicReasonText, replacementOptions } from "@/cockpit/workflows/today";
import { earlyCloseQuery, fromSearch, parseClosedToday } from "@/cockpit/workflows/form";
import { MAX_PUBLIC_TEXT } from "@/cockpit/workflows/types";
import { PRIVACY_HINT, REASON_LABEL } from "@/cockpit/workflows/wording";
import { berlinNow } from "@/cockpit/read-model";
import { CockpitFrame } from "../../../cockpit-frame";
import { internSession } from "../../../session";
import { Unavailable } from "../../../unavailable";
import { BlockedMessage, PreviewPair, PublishForm, StatusNotice } from "../workflow-parts";

type Search = Promise<Record<string, string | string[] | undefined>>;
const REASONS = ["KEINER", "KRANKHEIT", "FORTBILDUNG", "TECHNIK", "SONSTIGES"] as const;

export default async function Geschlossen({ searchParams }: { searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");

  const raw = await searchParams;
  const q = fromSearch(raw);
  const input = parseClosedToday(q);
  const submitted = q.get("modus") !== undefined;

  // "Ab einer Uhrzeit" → the early-close workflow (same representation, same publish path).
  if (input.mode === "FROM_TIME" && input.time) {
    redirect(`/intern/heute/frueher-schliessen?${earlyCloseQuery({ time: input.time, message: publicReasonText(input.reason, input.otherText).value })}`);
  }

  const now = new Date();
  let view;
  try {
    const payload = await getPayload({ config });
    view = await previewWorkflow(payload, { kind: "CLOSED_TODAY", input: { ...input, mode: "NOW" } }, now);
  } catch {
    return <Unavailable />;
  }
  const { data, draft } = view;
  const options = replacementOptions(data, berlinNow(now).date);

  return (
    <CockpitFrame staff={session.staff} current="/intern">
      <div className="cp-home cp-workflow">
        <div>
          <Link href="/intern" className="cp-back">
            Zur Übersicht
          </Link>
          <h1 className="cp-h1">Heute geschlossen</h1>
          <p className="cp-intro">Die Meldung gilt nur für heute und endet automatisch.</p>
        </div>

        <StatusNotice status={q.get("status")} />

        <form method="get" action="/intern/heute/geschlossen" className="cp-panel cp-form">
          <fieldset className="cp-fieldset">
            <legend className="cp-label">Ab wann ist die Praxis heute geschlossen?</legend>
            <label className="cp-choice">
              <input type="radio" name="modus" value="sofort" defaultChecked={input.mode === "NOW"} />
              Ab sofort
            </label>
            <label className="cp-choice">
              <input type="radio" name="modus" value="uhrzeit" defaultChecked={input.mode === "FROM_TIME"} />
              Ab einer Uhrzeit
            </label>
            <div className="cp-field cp-indent">
              <label htmlFor="zeit" className="cp-label">
                Uhrzeit <span className="cp-optional">(nur bei „Ab einer Uhrzeit“)</span>
              </label>
              <input id="zeit" name="zeit" type="time" step={300} className="cp-input cp-input-time" defaultValue={input.time ?? ""} />
            </div>
          </fieldset>

          <fieldset className="cp-fieldset">
            <legend className="cp-label">
              Grund auf der Website <span className="cp-optional">(optional)</span>
            </legend>
            {REASONS.map((r) => (
              <label key={r} className="cp-choice">
                <input type="radio" name="grund" value={r} defaultChecked={input.reason === r} />
                {REASON_LABEL[r]}
              </label>
            ))}
            <div className="cp-field cp-indent">
              <label htmlFor="sonstiges" className="cp-label">
                Eigener Text <span className="cp-optional">(nur bei „Sonstiges“)</span>
              </label>
              <input id="sonstiges" name="sonstiges" type="text" maxLength={MAX_PUBLIC_TEXT} className="cp-input" defaultValue={input.otherText ?? ""} aria-describedby="sonstiges-hilfe" />
              <p id="sonstiges-hilfe" className="cp-help">
                Höchstens {MAX_PUBLIC_TEXT} Zeichen. {PRIVACY_HINT}
              </p>
            </div>
          </fieldset>

          <fieldset className="cp-fieldset">
            <legend className="cp-label">
              Vertretung <span className="cp-optional">(optional)</span>
            </legend>
            {options.length ? (
              options.map((o) => (
                <label key={o.id} className={`cp-choice${o.usable ? "" : " cp-choice-disabled"}`}>
                  <input type="checkbox" name="vertretung" value={o.id} disabled={!o.usable} defaultChecked={o.usable && input.replacementIds.includes(o.id)} />
                  {o.name}
                  {o.note ? <span className="cp-optional"> – nicht auswählbar: {o.note}</span> : null}
                </label>
              ))
            ) : (
              <p className="cp-muted">Es sind keine Vertretungspraxen hinterlegt.</p>
            )}
            <p className="cp-help">Ohne Vertretung zeigt die Website Telefon und Notfall-Hinweise.</p>
          </fieldset>

          {input.replaceExisting ? <input type="hidden" name="ersetzen" value="1" /> : null}
          <button type="submit" className="cp-btn cp-btn-secondary">
            Vorschau aktualisieren
          </button>
        </form>

        {input.mode === "FROM_TIME" && !input.time ? (
          <p className="cp-error" role="alert">
            Bitte eine Uhrzeit angeben.
          </p>
        ) : (
          <>
            <BlockedMessage draft={draft} />
            <PreviewPair data={data} draft={draft} now={now} />
            {submitted || draft.ok ? (
              <PublishForm
                draft={draft}
                hidden={
                  <>
                    <input type="hidden" name="workflow" value="CLOSED_TODAY" />
                    <input type="hidden" name="modus" value="sofort" />
                    <input type="hidden" name="grund" value={input.reason} />
                    <input type="hidden" name="sonstiges" value={input.otherText ?? ""} />
                    {input.replacementIds.map((id) => (
                      <input key={id} type="hidden" name="vertretung" value={id} />
                    ))}
                    {input.replaceExisting ? <input type="hidden" name="ersetzen" value="1" /> : null}
                  </>
                }
              />
            ) : null}
          </>
        )}
      </div>
    </CockpitFrame>
  );
}
