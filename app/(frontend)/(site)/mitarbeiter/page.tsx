// /mitarbeiter — stable staff entry from the footer. Never in the main navigation or dock.
// Which cockpit it offers depends on SITE_STAGE and whether this deployment has a backend
// (evaluated per request; no database access here — the public site never depends on it).

import type { Metadata } from "next";
import { connection } from "next/server";
import { loadPublicPage } from "@/site/operational";
import { SITE_STAGE } from "@/content/release";
import { backendConfigured, stagingNote, staffEntryActions } from "@/content/staff-entry";
import { StaffEntry } from "@/site/staff-entry";

export const metadata: Metadata = { title: "Mitarbeiterbereich" };

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Mitarbeiter({ searchParams }: { searchParams: Search }) {
  await connection();
  const actions = staffEntryActions(SITE_STAGE, backendConfigured(process.env));
  return <StaffEntry puls={(await loadPublicPage(await searchParams)).puls} actions={actions} note={stagingNote(SITE_STAGE)} back={{ href: "/", label: "Start" }} />;
}
