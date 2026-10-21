// Vertretungspraxis — detail (Phase 09.5G). The stored data, read-only, plus the role's task:
//   ADMIN  → "Daten bearbeiten" (form → AKTUELL / NACH DER ÄNDERUNG → POST /speichern; always unverified after)
//   DOCTOR → "Vertretung bestätigen" (stored data + explicit checkbox → POST /bestaetigen) and
//            "Nicht mehr als Vertretung verwenden"; no structural editing
//   STAFF  → read only
// A record fingerprint travels with every form: nothing is confirmed or changed that was not seen.

import config from "@payload-config";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { loadPracticeData } from "@/cockpit/queries";
import { berlinNow } from "@/cockpit/read-model";
import { fromSearch, parseReplacement, RECORD_ID } from "@/cockpit/workflows/form";
import { NOT_SELECTABLE, REPLACEMENT_STALE, VERIFY_CHECKBOX, VERIFY_INSTRUCTION, WITHDRAW_CHECKBOX, directoryItem, replacementDraft, replacementFingerprint } from "@/cockpit/workflows/replacement";
import { normalizeReplacement } from "@/domain/replacement";
import { formatDayMonth } from "@/domain/time";
import type { PayloadReader } from "@/backend/payload-repository";
import { CockpitFrame } from "../../../cockpit-frame";
import { internSession } from "../../../session";
import { Unavailable } from "../../../unavailable";
import { ChangePreview, ReplacementForm, StatusLine, StoredData, backToList } from "../directory-parts";

type Params = Promise<{ eintrag: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Vertretung({ params, searchParams }: { params: Params; searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  const { staff } = session;
  const id = decodeURIComponent((await params).eintrag);
  let data;
  try {
    data = (await loadPracticeData((await getPayload({ config })) as unknown as PayloadReader)).data;
  } catch {
    return <Unavailable />;
  }
  const p = RECORD_ID.test(id) ? data.replacementPractices.find((x) => x.id === id) : undefined;
  const today = berlinNow(new Date()).date;
  if (!p) {
    return (
      <CockpitFrame staff={staff} current="/intern/vertretungen">
        <div className="cp-home cp-workflow">
          {backToList}
          <h1 className="cp-h1">Vertretungspraxis</h1>
          <p className="cp-error" role="alert">
            Diese Vertretungspraxis wurde nicht gefunden.
          </p>
        </div>
      </CockpitFrame>
    );
  }
  const item = directoryItem(p, staff.role, today);
  const fingerprint = replacementFingerprint(p);
  const q = fromSearch(await searchParams);
  const status = q.get("status");
  const asked = staff.role === "ADMIN" && q.get("vorschau") === "1";
  const raw = parseReplacement(q);
  const draft = asked ? replacementDraft(p, raw, today) : null;
  const physicianTask = staff.role === "DOCTOR" && (item.action === "VERIFY" || item.action === "REVERIFY");

  return (
    <CockpitFrame staff={staff} current="/intern/vertretungen">
      <div className="cp-home cp-workflow">
        <div>
          {backToList}
          <h1 className="cp-h1">{p.practiceName}</h1>
          <StatusLine item={item} />
          {item.lastVerified && item.usable ? <p className="cp-muted">Zuletzt ärztlich bestätigt am {formatDayMonth(item.lastVerified, true)}</p> : null}
        </div>

        {status === "veraltet" ? (
          <p className="cp-error" role="alert">
            {REPLACEMENT_STALE}
          </p>
        ) : status === "blockiert" || status === "fehlgeschlagen" ? (
          <p className="cp-error" role="alert">
            {status === "blockiert" ? "Das konnte so nicht gespeichert werden. Bitte die Angaben unten prüfen." : "Es konnte nichts gespeichert werden. Es wurde nichts verändert."}
          </p>
        ) : null}

        <section className="cp-panel" aria-labelledby="angaben-title">
          <h2 id="angaben-title" className="cp-h2">
            Gespeicherte Angaben
          </h2>
          <StoredData p={p} />
          {!item.usable && staff.role !== "DOCTOR" ? <p className="cp-muted">{staff.role === "ADMIN" ? "Ärztliche Bestätigung erforderlich. " : ""}{NOT_SELECTABLE}</p> : null}
        </section>

        {physicianTask ? (
          <form method="post" action="/intern/vertretungen/bestaetigen" className="cp-panel cp-publish" aria-labelledby="bestaetigen-title">
            <h2 id="bestaetigen-title" className="cp-h2">
              {item.action === "REVERIFY" ? "Vertretung erneut bestätigen" : "Vertretung bestätigen"}
            </h2>
            <p>{VERIFY_INSTRUCTION}</p>
            {item.freshness === "REVIEW_EXPIRED" && item.lastVerified ? <p className="cp-muted">Bestätigung abgelaufen – zuletzt bestätigt am {formatDayMonth(item.lastVerified, true)}.</p> : null}
            <input type="hidden" name="eintrag" value={p.id} />
            <input type="hidden" name="aktion" value="bestaetigen" />
            <input type="hidden" name="fingerprint" value={fingerprint} />
            <label className="cp-choice" htmlFor="bestaetigt">
              <input id="bestaetigt" name="bestaetigt" type="checkbox" value="1" required />
              <span>{VERIFY_CHECKBOX}</span>
            </label>
            <p className="cp-muted">Die Bestätigung gilt rund sechs Monate. Die öffentliche Website verwendet weiterhin die bisherigen Daten.</p>
            <button type="submit" className="cp-btn cp-btn-primary">
              Vertretung bestätigen
            </button>
          </form>
        ) : null}
        {staff.role === "DOCTOR" && !physicianTask && item.usable ? <p className="cp-muted">Eine erneute Bestätigung ist ab 30 Tagen vor Ablauf möglich.</p> : null}

        {staff.role === "DOCTOR" && item.freshness !== "OUTDATED" ? (
          <form method="post" action="/intern/vertretungen/bestaetigen" className="cp-panel" aria-labelledby="zurueck-title">
            <h2 id="zurueck-title" className="cp-h2">
              Nicht mehr als Vertretung verwenden
            </h2>
            <p className="cp-muted">Zum Beispiel, wenn die Praxis die Vertretung nicht mehr übernimmt. Der Eintrag bleibt erhalten; die Verwaltung kann ihn korrigieren, danach ist eine neue ärztliche Bestätigung nötig.</p>
            <input type="hidden" name="eintrag" value={p.id} />
            <input type="hidden" name="aktion" value="zurueckziehen" />
            <input type="hidden" name="fingerprint" value={fingerprint} />
            <label className="cp-choice" htmlFor="zurueckziehen">
              <input id="zurueckziehen" name="bestaetigt" type="checkbox" value="1" required />
              <span>{WITHDRAW_CHECKBOX}</span>
            </label>
            <button type="submit" className="cp-btn cp-btn-secondary">
              Nicht mehr als Vertretung verwenden
            </button>
          </form>
        ) : null}

        {staff.role === "ADMIN" ? (
          <section aria-labelledby="bearbeiten-title" className="cp-workflow">
            <h2 id="bearbeiten-title" className="cp-h2">
              Daten bearbeiten
            </h2>
            <p className="cp-muted">Jede Änderung macht eine erneute ärztliche Bestätigung nötig.</p>
            {draft && !draft.ok ? (
              <p className="cp-error" role="alert">
                {draft.message}
              </p>
            ) : null}
            <ReplacementForm action={`/intern/vertretungen/${encodeURIComponent(p.id)}`} values={asked ? normalizeReplacement(raw) : p} problems={draft && !draft.ok ? draft.problems : []} />
            {draft && draft.ok ? <ChangePreview draft={draft} current={p} recordId={p.id} fingerprint={fingerprint} /> : null}
          </section>
        ) : null}

        {staff.role === "STAFF" ? (
          <p className="cp-muted">
            Ändern kann die Verwaltung, bestätigen eine Ärztin oder ein Arzt. <Link href="/intern/urlaub" className="cp-text-link">Zu Urlaub eintragen</Link>
          </p>
        ) : null}
      </div>
    </CockpitFrame>
  );
}
