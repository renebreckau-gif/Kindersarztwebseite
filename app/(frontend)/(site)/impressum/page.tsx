import type { Metadata } from "next";
import { LegalPlaceholder } from "@/site/legal";
import { resolvePuls } from "@/content/puls";

export const metadata: Metadata = { title: "Impressum" };

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Impressum({ searchParams }: { searchParams: Search }) {
  return <LegalPlaceholder title="Impressum" puls={resolvePuls(await searchParams)} blockers="Verantwortliche Personen, Rechtsform und Berufsbezeichnungen (F02–F04, LB-02…LB-05) sowie rechtliche Prüfung ausstehend. Bestätigt sind Ärztekammer (F05), KV (F06) und Berufsordnung (F07); sie werden mit dem geprüften Gesamttext veröffentlicht." />;
}
