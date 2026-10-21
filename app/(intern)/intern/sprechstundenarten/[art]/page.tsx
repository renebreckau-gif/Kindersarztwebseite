// One Sprechstundenart (Phase 09.5J). Every role reads; a DOCTOR edits the wording (label + optional
// explanation), sees AKTUELL / NACH DER ÄNDERUNG and confirms explicitly (POST /intern/sprechstundenarten/
// bestaetigen). A missing NON-ACUTE type can be created here — the physician writes the wording, nothing is
// prefilled as a fact. ACUTE → /intern/akutsprechstunde. Works without JavaScript (GET form → preview).

import config from "@payload-config";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { PayloadPracticeRepository, type PayloadReader } from "@/backend/payload-repository";
import { berlinNow } from "@/cockpit/read-model";
import { fromSearch } from "@/cockpit/workflows/form";
import { READ_ONLY_TEXT, TYPE_CHECKBOX, TYPE_SLUG, TYPE_STALE, codeOfSlug, typeDraft, typeItems } from "@/cockpit/workflows/consultation-type";
import { ACUTE_SEPARATE_TEXT, TYPE_EXPLANATION_MAX, TYPE_LABEL_MAX, isRegularTypeCode } from "@/domain/consultation-types";
import { CockpitFrame } from "../../../cockpit-frame";
import { internSession } from "../../../session";
import { Unavailable } from "../../../unavailable";
import { TypeStatusLine, TypeUsage } from "../type-parts";

type Params = Promise<{ art: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Sprechstundenart({ params, searchParams }: { params: Params; searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  const { staff } = session;
  const code = codeOfSlug((await params).art);
  let data;
  try {
    data = await new PayloadPracticeRepository((await getPayload({ config })) as unknown as PayloadReader).getPulsData();
  } catch {
    return <Unavailable />;
  }
  const today = berlinNow(new Date()).date;
  const q = fromSearch(await searchParams);
  const doctor = staff.role === "DOCTOR";
  const item = code ? typeItems(data, today).find((i) => i.code === code) : undefined;
  const stored = item?.stored;
  const back = (
    <Link href="/intern/sprechstundenarten" className="cp-back">
      Zu den Sprechstundenarten
    </Link>
  );

  if (!code || code === "ACUTE" || (!stored && !(doctor && isRegularTypeCode(code)) && !item)) {
    return (
      <CockpitFrame staff={staff} current="/intern">
        <div className="cp-home cp-workflow">
          {back}
          <h1 className="cp-h1">Sprechstundenart</h1>
          {code === "ACUTE" ? (
            <>
              <p>{ACUTE_SEPARATE_TEXT}</p>
              <Link href="/intern/akutsprechstunde" className="cp-btn cp-btn-secondary">
                Akutsprechstunde verwalten
              </Link>
            </>
          ) : (
            <p className="cp-error" role="alert">
              Diese Sprechstundenart gibt es nicht.
            </p>
          )}
        </div>
      </CockpitFrame>
    );
  }

  const submitted = q.get("vorschau") === "1";
  const input = submitted ? { label: q.get("bezeichnung") ?? "", explanation: q.get("erklaerung") ?? "" } : { label: stored?.label ?? "", explanation: stored?.explanation ?? "" };
  const draft = doctor && submitted ? typeDraft(data, code, input, today) : null;
  const err = (f: "label" | "explanation") => (draft && !draft.ok ? draft.problems.find((p) => p.field === f)?.message : undefined);
  const notice = q.get("status");
  const renew = doctor && stored && item?.status && item.status.state !== "CURRENT";
  const renewHref = stored ? `/intern/sprechstundenarten/${TYPE_SLUG[code]}?${new URLSearchParams({ bezeichnung: stored.label, erklaerung: stored.explanation ?? "", vorschau: "1" })}#vorschau` : "";

  return (
    <CockpitFrame staff={staff} current="/intern">
      <div className="cp-home cp-workflow">
        <div>
          {back}
          <h1 className="cp-h1">{stored ? stored.label : `Sprechstundenart ${code} anlegen`}</h1>
          <p className="cp-muted">{`Interner Code: ${code}`}</p>
        </div>

        {notice === "veraltet" ? (
          <p className="cp-error" role="alert">
            {TYPE_STALE}
          </p>
        ) : notice === "blockiert" || notice === "fehlgeschlagen" ? (
          <p className="cp-error" role="alert">
            {notice === "blockiert" ? "Bitte prüfen Sie die Angaben und bestätigen Sie sie ausdrücklich." : "Die Sprechstundenart konnte nicht gespeichert werden. Es wurde nichts verändert."}
          </p>
        ) : null}

        <section className="cp-panel" aria-labelledby="stand-title">
          <h2 id="stand-title" className="cp-h2">
            Aktueller Stand
          </h2>
          {item?.duplicate ? <p className="cp-dir-status cp-dir-attention">{`Sprechstundenart ${code} ist mehrfach vorhanden.`}</p> : <TypeStatusLine status={item?.status} />}
          {stored ? (
            <dl className="cp-dir-data">
              <div>
                <dt>Bezeichnung</dt>
                <dd>{stored.label}</dd>
              </div>
              <div>
                <dt>Erklärung</dt>
                <dd>{stored.explanation ?? "–"}</dd>
              </div>
            </dl>
          ) : (
            <p>Diese Sprechstundenart ist noch nicht angelegt.</p>
          )}
          {item ? <TypeUsage item={item} /> : null}
          {!doctor ? <p className="cp-muted">{READ_ONLY_TEXT}</p> : null}
          {renew ? (
            <Link href={renewHref} className="cp-btn cp-btn-secondary">
              {item?.status?.state === "UNCONFIRMED" ? "Unveränderte Angaben ärztlich bestätigen" : "Unveränderte Angaben erneut bestätigen"}
            </Link>
          ) : null}
        </section>

        {doctor ? (
          <form method="get" action={`/intern/sprechstundenarten/${TYPE_SLUG[code]}#vorschau`} className="cp-panel cp-form">
            <input type="hidden" name="vorschau" value="1" />
            <h2 className="cp-h2">{stored ? "Bezeichnung und Erklärung" : "Neue Sprechstundenart"}</h2>
            <p className="cp-help">Sie bestätigen nur die Bezeichnung und die Erklärung – nicht die Sprechzeiten, die Wochentage, die Akutsprechstunde oder das Verhalten an Feiertagen.</p>
            <div className="cp-field">
              <label htmlFor="bezeichnung" className="cp-label">
                Bezeichnung
              </label>
              <input id="bezeichnung" name="bezeichnung" type="text" maxLength={TYPE_LABEL_MAX} required className="cp-input" defaultValue={input.label} aria-invalid={err("label") ? true : undefined} aria-describedby={err("label") ? "bezeichnung-fehler bezeichnung-hilfe" : "bezeichnung-hilfe"} />
              <p id="bezeichnung-hilfe" className="cp-help">
                {`So steht es auf der Website. Höchstens ${TYPE_LABEL_MAX} Zeichen.`}
              </p>
              {err("label") ? (
                <p id="bezeichnung-fehler" className="cp-field-error">
                  {err("label")}
                </p>
              ) : null}
            </div>
            <div className="cp-field">
              <label htmlFor="erklaerung" className="cp-label">
                Erklärung <span className="cp-optional">(optional)</span>
              </label>
              <textarea id="erklaerung" name="erklaerung" maxLength={TYPE_EXPLANATION_MAX} rows={3} className="cp-input cp-textarea" defaultValue={input.explanation} aria-invalid={err("explanation") ? true : undefined} aria-describedby={err("explanation") ? "erklaerung-fehler erklaerung-hilfe" : "erklaerung-hilfe"} />
              <p id="erklaerung-hilfe" className="cp-help">
                {`Höchstens ${TYPE_EXPLANATION_MAX} Zeichen. Wird derzeit nicht auf der Website angezeigt.`}
              </p>
              {err("explanation") ? (
                <p id="erklaerung-fehler" className="cp-field-error">
                  {err("explanation")}
                </p>
              ) : null}
            </div>
            <button type="submit" className="cp-btn cp-btn-secondary">
              Vorschau anzeigen
            </button>
          </form>
        ) : null}

        {draft && !draft.ok ? (
          <div id="vorschau" className={draft.reason === "NO_CHANGE" ? "cp-note" : "cp-error"} role={draft.reason === "NO_CHANGE" ? "status" : "alert"}>
            <p className="cp-alert-text">{draft.message}</p>
          </div>
        ) : null}

        {draft && draft.ok ? (
          <>
            <section id="vorschau" className="cp-panel" aria-labelledby="vergleich-title">
              <h2 id="vergleich-title" className="cp-h2">
                {draft.before ? "Änderung prüfen" : "Neue Sprechstundenart prüfen"}
              </h2>
              <table className="cp-changes cp-dir-changes">
                <caption className="cp-sr">{draft.before ? "Angaben aktuell und nach der Änderung" : "Angaben der neuen Sprechstundenart"}</caption>
                <thead>
                  <tr>
                    <th scope="col">Angabe</th>
                    {draft.before ? <th scope="col">Aktuell</th> : null}
                    <th scope="col">{draft.before ? "Nach der Änderung" : "Neu"}</th>
                  </tr>
                </thead>
                <tbody>
                  {(["label", "explanation"] as const).map((f) => (
                    <tr key={f} className={draft.before && draft.changed[f] ? "cp-dir-changed" : undefined}>
                      <th scope="row">
                        {f === "label" ? "Bezeichnung" : "Erklärung"}
                        {draft.before && draft.changed[f] ? <span className="cp-badge">geändert</span> : null}
                      </th>
                      {draft.before ? <td>{draft.before[f] || "–"}</td> : null}
                      <td>{draft.next[f] || "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="cp-muted">Auf der Website würde künftig stehen:</p>
              <p className="cp-effect">{draft.next.label}</p>
              {item?.usedByWeeklyRules && item.weeklyUsage.length ? <p className="cp-muted">{`Betroffene regelmäßige Zeiten: ${item.weeklyUsage.join("; ")}`}</p> : null}
              <p className="cp-muted">Die öffentliche Website verwendet derzeit weiterhin die bisherigen Daten.</p>
            </section>
            <form method="post" action="/intern/sprechstundenarten/bestaetigen" className="cp-panel cp-publish">
              <p className="cp-effect">{draft.effect}</p>
              <input type="hidden" name="art" value={TYPE_SLUG[code]} />
              <input type="hidden" name="bezeichnung" value={draft.next.label} />
              <input type="hidden" name="erklaerung" value={draft.next.explanation ?? ""} />
              <input type="hidden" name="fingerprint" value={draft.fingerprint} />
              <label className="cp-choice" htmlFor="bestaetigt">
                <input id="bestaetigt" name="bestaetigt" type="checkbox" value="1" required />
                <span>{TYPE_CHECKBOX}</span>
              </label>
              <p className="cp-muted">Die Angaben werden in der Cockpit-Datenbank gespeichert und gelten rund sechs Monate bis zur erneuten Prüfung.</p>
              <button type="submit" className="cp-btn cp-btn-primary">
                {draft.actionLabel}
              </button>
            </form>
          </>
        ) : null}
      </div>
    </CockpitFrame>
  );
}
