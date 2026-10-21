import type { Metadata } from "next";
import { LegalPlaceholder } from "@/site/legal";
import { loadPublicPage } from "@/site/operational";

export const metadata: Metadata = { title: "Barrierefreiheit" };

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Barrierefreiheit({ searchParams }: { searchParams: Search }) {
  return <LegalPlaceholder title="Barrierefreiheit" puls={(await loadPublicPage(await searchParams)).puls} blockers="Erklärung zur Barrierefreiheit nach Prüfung der fertigen Website; rechtliche Notwendigkeit bewertet die rechtliche Prüfung (IA §10)." />;
}
