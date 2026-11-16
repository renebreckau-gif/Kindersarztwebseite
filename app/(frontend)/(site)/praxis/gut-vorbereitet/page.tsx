import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageFrame, InternalNote } from "@/site/chrome";
import { PageIntro, Section, BigLinks } from "@/site/blocks";
import { Icon, type IconName } from "@/design-system/icons";
import p from "@/site/practice-pages.module.css";
import { loadPublicPage } from "@/site/operational";
import { publicFirstVisitItems } from "@/content/first-visit";

export const metadata: Metadata = {
  title: "Gut vorbereitet",
  description: "Was Sie zum Besuch in der Kinderarztpraxis in Hettstedt mitbringen: Gesundheitskarte und Impfpass.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

/** Decorative pictogram per item (the heading carries the meaning). */
const MARK: Record<string, IconName> = {
  gesundheitskarte: "card",
  "impfpass-mitbringen": "booklet",
  "impfung-nur-mit-impfpass": "info",
  "mundschutz-bei-infekt": "mask",
};

export default async function GutVorbereitet({ searchParams }: { searchParams: Search }) {
  const { puls } = await loadPublicPage(await searchParams);
  const items = publicFirstVisitItems(puls.result.evaluatedAt.localDate);
  // No confirmed item → no page (never an empty or "coming soon" page).
  if (items.length === 0) notFound();
  return (
    <PageFrame current="praxis" puls={puls}>
      <PageIntro variant="guidance" title="Gut vorbereitet in die Praxis" back={{ href: "/praxis", label: "Praxis" }} lede="Die wichtigsten Dinge für Ihren Besuch auf einen Blick." />
      <Section id="mitbringen" tone="paper" wide>
        <ul className={p.items}>
          {items.map((it) => (
            <li key={it.id}>
              <article className={p.item} aria-labelledby={`punkt-${it.id}`}>
                <span className={p.mark} aria-hidden="true">
                  <Icon name={MARK[it.id] ?? "info"} />
                </span>
                <div>
                  <h2 id={`punkt-${it.id}`} className={p.itemTitle}>
                    {it.title}
                  </h2>
                  <p className={p.itemText}>{it.text}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
        <InternalNote>
          <p>
            Arbeitsstand: Praxisangabe vom 16.11.2026, übermittelt durch den Projektinhaber (F91–F94). Die namentliche Bestätigung vor dem Livegang steht aus (LB-00; F93 und F94 durch eine Ärztin). Bewusst nicht
            genannt, weil nicht bestätigt: weitere Unterlagen, Folgen einer fehlenden Karte, Altersgrenzen oder Maskenart.
          </p>
        </InternalNote>
      </Section>
      <Section id="weiter" title="Außerdem hilfreich" tone="plaster" wide>
        <BigLinks
          items={[
            { label: "Neu bei uns?", text: "Wie der erste Kontakt mit der Praxis läuft", href: "/praxis/neu-bei-uns" },
            { label: "Impfungen", text: "Allgemeine Informationen und offizielle Empfehlungen", href: "/mein-kind/impfungen" },
          ]}
        />
      </Section>
    </PageFrame>
  );
}
