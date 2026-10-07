import type { Metadata } from "next";
import { PageFrame } from "@/site/chrome";
import { PageIntro } from "@/site/blocks";
import u from "@/site/pages.module.css";
import { resolvePuls } from "@/content/puls";

export const metadata: Metadata = {
  title: "Entdecken",
  description: "Entdecken: ein Bereich für Kinder. Erstes Kapitel: Mein Arztbesuch – in Vorbereitung.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Entdecken({ searchParams }: { searchParams: Search }) {
  const puls = resolvePuls(await searchParams);
  return (
    <PageFrame current="entdecken" puls={puls} tone="night">
      <PageIntro
        variant="discovery"
        title="Entdecken"
        lede="Ein eigener Bereich für Kinder: neugierig machen, erklären, die Angst vor dem Unbekannten kleiner machen. Für Eltern: Alles hier wird von unseren Ärztinnen geprüft, bevor es erscheint."
      >
        <div className={u.nightOrbs} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </PageIntro>
      <section className={u.chapters} aria-labelledby="kapitel-t">
        <h2 id="kapitel-t" className={u.chaptersTitle}>
          Kapitel
        </h2>
        <ol>
          <li id="mein-arztbesuch">
            <span className={u.chapterNo}>1</span>
            <span className={u.chapterName}>Mein Arztbesuch</span>
            <span className={u.chapterText}>Was passiert beim Arztbesuch? Schritt für Schritt für Kinder erklärt.</span>
            <span className={u.chapterState}>In Vorbereitung</span>
          </li>
        </ol>
      </section>
    </PageFrame>
  );
}
