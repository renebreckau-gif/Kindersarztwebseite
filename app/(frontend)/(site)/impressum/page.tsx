import type { Metadata } from "next";
import { LegalPage, ImpressumContent } from "@/site/legal";
import { loadPublicPage } from "@/site/operational";

export const metadata: Metadata = { title: "Impressum", description: "Impressum der Kinderarztpraxis Probst & Böhme in Hettstedt." };

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Impressum({ searchParams }: { searchParams: Search }) {
  return (
    <LegalPage title="Impressum" puls={(await loadPublicPage(await searchParams)).puls}>
      <ImpressumContent />
    </LegalPage>
  );
}
