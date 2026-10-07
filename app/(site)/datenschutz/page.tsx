import type { Metadata } from "next";
import { LegalPlaceholder } from "@/site/legal";
import { resolvePuls } from "@/content/puls";

export const metadata: Metadata = { title: "Datenschutz" };

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Datenschutz({ searchParams }: { searchParams: Search }) {
  return <LegalPlaceholder title="Datenschutz" puls={resolvePuls(await searchParams)} blockers="Verantwortliche Stelle, Datenschutzbeauftragte und Auftragsverarbeiter (F10) sowie rechtliche Prüfung ausstehend. Der alte Datenschutzabsatz (F09) ist veraltet und wird nicht übernommen." />;
}
