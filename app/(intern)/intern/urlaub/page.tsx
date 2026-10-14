// 7.5 Urlaub / Schließzeit eintragen — REAL workflow (Phase 09.5C). See planned-workflow.tsx.

import { redirect } from "next/navigation";
import { internSession } from "../../session";
import { Unavailable } from "../../unavailable";
import { PlannedWorkflow } from "./planned-workflow";

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function UrlaubEintragen({ searchParams }: { searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  return <PlannedWorkflow staff={session.staff} raw={await searchParams} />;
}
