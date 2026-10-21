// Neue Vertretungspraxis (Phase 09.5G) — ADMIN only (server-side). Form → preview → POST
// /intern/vertretungen/speichern. The new entry is TO_BE_CONFIRMED until a physician confirms it.

import Link from "next/link";
import { redirect } from "next/navigation";
import { fromSearch, parseReplacement } from "@/cockpit/workflows/form";
import { replacementDraft } from "@/cockpit/workflows/replacement";
import { berlinNow } from "@/cockpit/read-model";
import { normalizeReplacement } from "@/domain/replacement";
import { CockpitFrame } from "../../../cockpit-frame";
import { internSession } from "../../../session";
import { Unavailable } from "../../../unavailable";
import { StatusNotice } from "../../heute/workflow-parts";
import { ChangePreview, ReplacementForm, backToList } from "../directory-parts";

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function NeueVertretung({ searchParams }: { searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  const { staff } = session;
  if (staff.role !== "ADMIN") {
    return (
      <CockpitFrame staff={staff} current="/intern/vertretungen">
        <div className="cp-home cp-workflow">
          {backToList}
          <h1 className="cp-h1">Neue Vertretungspraxis</h1>
          <p className="cp-error" role="alert">
            Vertretungspraxen legt die Verwaltung an. {staff.role === "DOCTOR" ? "Ärztinnen und Ärzte bestätigen die Einträge." : "Sie können die Einträge ansehen."}
          </p>
          <Link href="/intern/vertretungen" className="cp-btn cp-btn-secondary">
            Zur Übersicht der Vertretungspraxen
          </Link>
        </div>
      </CockpitFrame>
    );
  }
  const q = fromSearch(await searchParams);
  const raw = parseReplacement(q);
  const asked = q.get("vorschau") === "1";
  const draft = asked ? replacementDraft(undefined, raw, berlinNow(new Date()).date) : null;

  return (
    <CockpitFrame staff={staff} current="/intern/vertretungen">
      <div className="cp-home cp-workflow">
        <div>
          {backToList}
          <h1 className="cp-h1">Neue Vertretungspraxis</h1>
          <p className="cp-intro">Bitte nur Angaben eintragen, die die Praxis selbst mitgeteilt hat. Vor der Verwendung muss die Vertretung ärztlich bestätigt werden.</p>
        </div>
        <StatusNotice status={q.get("status")} />
        {draft && !draft.ok ? (
          <p className="cp-error" role="alert">
            {draft.message}
          </p>
        ) : null}
        <ReplacementForm action="/intern/vertretungen/neu" values={normalizeReplacement(raw)} problems={draft && !draft.ok ? draft.problems : []} />
        {draft && draft.ok ? <ChangePreview draft={draft} /> : null}
      </div>
    </CockpitFrame>
  );
}
