// Sonderöffnungszeit bearbeiten (Phase 09.5F) — the ACTIVE single-date record of this workflow,
// named by its domain id in the path (re-loaded on the server; the date is never moved here).

import { redirect } from "next/navigation";
import { RECORD_ID } from "@/cockpit/workflows/form";
import { internSession } from "../../../session";
import { Unavailable } from "../../../unavailable";
import { SpecialDayWorkflow } from "../special-day-workflow";

type Params = Promise<{ eintrag: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function SonderzeitBearbeiten({ params, searchParams }: { params: Params; searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  const { eintrag } = await params;
  const id = decodeURIComponent(eintrag);
  return <SpecialDayWorkflow staff={session.staff} raw={await searchParams} recordId={RECORD_ID.test(id) ? id : "-"} />;
}
