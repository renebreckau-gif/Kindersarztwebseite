import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame } from "@/site/chrome";
import { PageIntro } from "@/site/blocks";
import u from "@/site/pages.module.css";
import { resolvePuls } from "@/content/puls";
import { CHAPTERS, chapterView } from "@/content/discovery";

export const metadata: Metadata = {
  title: "Entdecken",
  description: "Entdecken: ein Bereich für Kinder. Erstes Kapitel: Mein Arztbesuch.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Entdecken({ searchParams }: { searchParams: Search }) {
  const q = await searchParams;
  const puls = resolvePuls(q);
  const preview = q.vorschau === "freigabe";
  return (
    <PageFrame current="entdecken" puls={puls} tone="night">
      <PageIntro
        variant="discovery"
        title="Entdecken"
        lede="Ein eigener Bereich für Kinder: neugierig machen, erklären, Unbekanntes vertrauter machen. Für Eltern: Alles hier wird von unseren Ärztinnen geprüft, bevor es erscheint."
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
          {CHAPTERS.map((c, i) => {
            const view = c.slug ? chapterView(c, preview) : null;
            const href = view && view.mode !== "GATED" ? `/entdecken/${c.slug}${view.mode === "PREVIEW" ? "?vorschau=freigabe" : ""}` : null;
            const state = view?.mode === "PUBLIC" ? null : view?.mode === "PREVIEW" ? "Vorschau" : c.state === "COMING_LATER" ? "Bald entdecken" : "In Vorbereitung";
            return (
              <li key={c.id} id={c.id} data-later={c.state === "COMING_LATER" ? "" : undefined}>
                <span className={u.chapterNo}>{i + 1}</span>
                {href ? (
                  <Link href={href} className={u.chapterLink}>
                    {c.title}
                  </Link>
                ) : (
                  <span className={u.chapterName}>{c.title}</span>
                )}
                <span className={u.chapterText}>{c.teaser}</span>
                {state ? <span className={u.chapterState}>{state}</span> : null}
              </li>
            );
          })}
        </ol>
      </section>
    </PageFrame>
  );
}
