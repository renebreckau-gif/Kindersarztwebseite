// 7.1 Heute früher schließen — REAL workflow against the cockpit database (Phase 09.5A).
// Input → server draft → Website-Vorschau (engine) → publish (POST, revalidated on the server).

import config from "@payload-config";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { blocks, findDaySpecialHours } from "@/domain/operations";
import { buildDraft, previewWorkflow } from "@/cockpit/workflows/publish";
import { datasetFingerprint } from "@/cockpit/workflows/snapshot";
import { defaultEarlyCloseTime } from "@/cockpit/workflows/today";
import { fromSearch, parseEarlyClose } from "@/cockpit/workflows/form";
import { MAX_PUBLIC_TEXT } from "@/cockpit/workflows/types";
import { PRIVACY_HINT } from "@/cockpit/workflows/wording";
import { berlinNow } from "@/cockpit/read-model";
import { CockpitFrame } from "../../../cockpit-frame";
import { internSession } from "../../../session";
import { Unavailable } from "../../../unavailable";
import { BlockedMessage, PreviewPair, PublishForm, StatusNotice } from "../workflow-parts";

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function FrueherSchliessen({ searchParams }: { searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");

  const q = fromSearch(await searchParams);
  const now = new Date();
  const input = parseEarlyClose(q);
  let data;
  try {
    data = (await previewWorkflow(await getPayload({ config }), { kind: "EARLY_CLOSE", input }, now)).data;
  } catch {
    return <Unavailable />;
  }
  // Default: the next sensible half hour — only if it really shortens today; never silently outside.
  const time = input.time || defaultEarlyCloseTime(data, now) || "";
  const message = input.message ?? "";
  const replace = input.replaceExisting === true;
  const draft = time ? buildDraft({ kind: "EARLY_CLOSE", input: { time, message, replaceExisting: replace } }, data, now, datasetFingerprint(data)) : null;
  const today = berlinNow(now).date;
  const existing = findDaySpecialHours(data.exceptions, today);

  return (
    <CockpitFrame staff={session.staff} current="/intern">
      <div className="cp-home cp-workflow">
        <div>
          <Link href="/intern" className="cp-back">
            Zur Übersicht
          </Link>
          <h1 className="cp-h1">Heute früher schließen</h1>
          {existing ? (
            <p className="cp-intro">
              <strong>Bereits geändert:</strong> heute {blocks(existing.intervals.map((i) => ({ start: i.start, end: i.end, type: i.consultationType }))).map((b) => `${b.start}–${b.end}`).join(" und ")} Uhr. Sie bearbeiten diese Änderung – es entsteht kein zweiter Eintrag.
            </p>
          ) : (
            <p className="cp-intro">Die Änderung gilt nur für heute und endet automatisch.</p>
          )}
        </div>

        <StatusNotice status={q.get("status")} />

        <form method="get" action="/intern/heute/frueher-schliessen" className="cp-panel cp-form">
          <div className="cp-field">
            <label htmlFor="zeit" className="cp-label">
              Bis wann ist heute geöffnet?
            </label>
            <input id="zeit" name="zeit" type="time" step={300} className="cp-input cp-input-time" defaultValue={time} required />
          </div>
          <div className="cp-field">
            <label htmlFor="hinweis" className="cp-label">
              Kurzer Hinweis für die Website <span className="cp-optional">(optional)</span>
            </label>
            <input id="hinweis" name="hinweis" type="text" maxLength={MAX_PUBLIC_TEXT} className="cp-input" defaultValue={message} aria-describedby="hinweis-hilfe" />
            <p id="hinweis-hilfe" className="cp-help">
              Höchstens {MAX_PUBLIC_TEXT} Zeichen. {PRIVACY_HINT}
            </p>
          </div>
          {replace ? <input type="hidden" name="ersetzen" value="1" /> : null}
          <button type="submit" className="cp-btn cp-btn-secondary">
            Vorschau aktualisieren
          </button>
        </form>

        {draft ? (
          <>
            <BlockedMessage draft={draft} />
            <PreviewPair data={data} draft={draft} now={now} existingLabel={existing ? "Aktuell geändert" : undefined} />
            <PublishForm
              draft={draft}
              hidden={
                <>
                  <input type="hidden" name="workflow" value="EARLY_CLOSE" />
                  <input type="hidden" name="zeit" value={time} />
                  <input type="hidden" name="hinweis" value={message} />
                  {replace ? <input type="hidden" name="ersetzen" value="1" /> : null}
                </>
              }
            />
          </>
        ) : (
          <p className="cp-muted" role="status">
            Für heute gibt es keine Sprechzeit mehr, die verkürzt werden kann. Wenn die Praxis heute nicht öffnet: <Link href="/intern/heute/geschlossen">Heute geschlossen</Link>.
          </p>
        )}
      </div>
    </CockpitFrame>
  );
}
