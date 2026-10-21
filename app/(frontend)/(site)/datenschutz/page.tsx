import type { Metadata } from "next";
import { LegalPlaceholder } from "@/site/legal";
import { loadPublicPage } from "@/site/operational";

export const metadata: Metadata = { title: "Datenschutz" };

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Datenschutz({ searchParams }: { searchParams: Search }) {
  return <LegalPlaceholder title="Datenschutz" puls={(await loadPublicPage(await searchParams)).puls} blockers="Verantwortliche Stelle, Datenschutzbeauftragte und Auftragsverarbeiter (F10) sowie rechtliche Prüfung ausstehend. Der alte Datenschutzabsatz (F09) ist veraltet und wird nicht übernommen." />;
}
