// POST /intern/urlaub/veroeffentlichen — the ONLY write entry of 7.5 Urlaub / Schließzeit (09.5C).
// Same architecture as the today workflows: plain form post, same-origin check, Payload session,
// then publishWorkflow (fingerprint + full revalidation + one transaction with provenance + audit
// + server-generated changeSetId). Only person-chosen fields are read (parsePlannedClosure).

import config from "@payload-config";
import { getPayload } from "payload";
import { NextResponse, type NextRequest } from "next/server";
import { fromForm, parsePlannedClosure, plannedQuery } from "@/cockpit/workflows/form";
import { publishWorkflow } from "@/cockpit/workflows/publish";
import { sameOrigin } from "../../../same-origin";

const to = (req: NextRequest, path: string) => NextResponse.redirect(new URL(path, req.url), 303);

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Nicht erlaubt", { status: 403 });

  let payload;
  try {
    payload = await getPayload({ config });
  } catch {
    return to(req, "/intern");
  }
  const { user } = await payload.auth({ headers: req.headers });
  if (!user) return to(req, "/intern/anmelden");

  const form = fromForm(await req.formData());
  const input = parsePlannedClosure(form);
  const back = `${input.recordId ? `/intern/urlaub/${encodeURIComponent(input.recordId)}` : "/intern/urlaub"}?${plannedQuery(input)}`;
  if (input.recordId === "") return to(req, "/intern");

  const result = await publishWorkflow(payload, user as never, { kind: "PLANNED_CLOSURE", input }, form.get("fingerprint") ?? "");
  if (result.ok) {
    // vorgang = the server-generated change-set id (used only to look up undo eligibility again on the server).
    return to(req, `/intern/urlaub/veroeffentlicht?eintrag=${encodeURIComponent(result.recordId)}&modus=${result.mode === "EDIT" ? "bearbeitet" : "neu"}&vorgang=${result.changeSetId}`);
  }
  if (result.code === "UNAUTHENTICATED") return to(req, "/intern/anmelden");
  const status = result.code === "STALE" ? "veraltet" : result.code === "BLOCKED" ? "blockiert" : "fehlgeschlagen";
  return to(req, `${back}&status=${status}`);
}
