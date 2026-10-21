// Sonderöffnungszeiten / Feiertag klären — new entry (Phase 09.5F). See special-day-workflow.tsx.
// Optional ?datum=YYYY-MM-DD (deep link from "Prüfen" → "Feiertag klären").

import { redirect } from "next/navigation";
import { internSession } from "../../session";
import { Unavailable } from "../../unavailable";
import { SpecialDayWorkflow } from "./special-day-workflow";

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Sonderzeiten({ searchParams }: { searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  return <SpecialDayWorkflow staff={session.staff} raw={await searchParams} />;
}
