// POST /intern/sonderzeiten/veroeffentlichen — the ONLY write entry of Sonderöffnungszeiten /
// Feiertag klären (Phase 09.5F). Same-origin form post; the session account comes from the server;
// the draft is rebuilt and revalidated inside one transaction (publishWorkflow). Only the fields a
// person chooses are read — never a record id for new records, marker, priority, provenance or role.

import config from "@payload-config";
import { getPayload } from "payload";
import { NextResponse, type NextRequest } from "next/server";
import { fromForm, parseSpecialDay, specialDayQuery } from "@/cockpit/workflows/form";
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
  const input = parseSpecialDay(form);
  const result = await publishWorkflow(payload, user as never, { kind: "SPECIAL_DAY", input }, form.get("fingerprint") ?? "");
  if (result.ok) return to(req, `/intern/sonderzeiten/veroeffentlicht?modus=${result.mode === "EDIT" ? "bearbeitet" : "neu"}&vorgang=${result.changeSetId}&datum=${encodeURIComponent(input.date)}`);
  if (result.code === "UNAUTHENTICATED") return to(req, "/intern/anmelden");
  const status = result.code === "STALE" ? "veraltet" : result.code === "BLOCKED" ? "blockiert" : "fehlgeschlagen";
  const back = input.recordId ? `/intern/sonderzeiten/${encodeURIComponent(input.recordId)}` : "/intern/sonderzeiten";
  return to(req, `${back}?${specialDayQuery(input)}&status=${status}`);
}
