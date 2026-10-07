import type { Metadata } from "next";
import { LegalPlaceholder } from "@/site/legal";
import { resolvePuls } from "@/content/puls";

export const metadata: Metadata = { title: "Barrierefreiheit" };

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Barrierefreiheit({ searchParams }: { searchParams: Search }) {
  return <LegalPlaceholder title="Barrierefreiheit" puls={resolvePuls(await searchParams)} blockers="Erklärung zur Barrierefreiheit nach Prüfung der fertigen Website; rechtliche Notwendigkeit bewertet die rechtliche Prüfung (IA §10)." />;
}
