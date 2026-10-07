import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, InternalNote } from "@/site/chrome";
import { Story } from "@/site/discovery/story";
import u from "@/site/pages.module.css";
import d from "@/site/discovery/chapter.module.css";
import { resolvePuls } from "@/content/puls";
import { MEIN_ARZTBESUCH, chapterView } from "@/content/discovery";
import { RELEASE } from "@/content/release";

type Search = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: Search }): Promise<Metadata> {
  const v = chapterView(MEIN_ARZTBESUCH, (await searchParams).vorschau === "freigabe");
  return {
    title: "Mein Arztbesuch",
    description: "Für Kinder erklärt: was bei einem Arztbesuch passieren kann.",
    // unpublished states are never indexed
    ...(v.mode === "PUBLIC" ? {} : { robots: { index: false, follow: false } }),
  };
}

export default async function MeinArztbesuch({ searchParams }: { searchParams: Search }) {
  const q = await searchParams;
  const puls = resolvePuls(q);
  const view = chapterView(MEIN_ARZTBESUCH, q.vorschau === "freigabe");
  const c = view.chapter;

  return (
    <PageFrame current="entdecken" puls={puls} tone="night">
      <div className={d.chapter}>
        <header className={d.head}>
          <p className={d.back}>
            <Link href={view.mode === "PREVIEW" ? "/entdecken?vorschau=freigabe" : "/entdecken"}>Übersicht Entdecken</Link>
          </p>
          <h1 className={d.title}>{c.title}</h1>
          {view.mode === "GATED" ? null : <p className={d.intro}>{c.parentIntro}</p>}
          {view.mode === "PREVIEW" ? (
            <p className={d.previewFlag} role="note">
              <strong>Vorschau</strong> – noch nicht freigegeben. Ablauf, Texte und ärztliche Erklärungen werden von der Praxis geprüft. Die Bilder sind Platzhalter.
            </p>
          ) : null}
        </header>

        {view.mode === "GATED" ? (
          <section className={d.gated} aria-labelledby="gated-t">
            <h2 id="gated-t" className={d.gatedTitle}>
              In Vorbereitung
            </h2>
            <p>{c.teaser} Dieses Kapitel erscheint, sobald unsere Ärztinnen es geprüft haben.</p>
            <p>
              <Link href="/entdecken">Zurück zu Entdecken</Link>
            </p>
            <InternalNote>
              <p>
                Freigabe-Gate: RELEASE.meinArztbesuchApproved = {String(RELEASE.meinArztbesuchApproved)}; jede Szene braucht Inhalts-, Praxis- und (bei Messen/Abhören/Ohren) ärztliche Freigabe
                sowie finale D1-Bilder. Review: ?vorschau=freigabe
              </p>
            </InternalNote>
          </section>
        ) : (
          <Story scenes={view.chapter.scenes} preview={view.mode === "PREVIEW"} />
        )}
      </div>
    </PageFrame>
  );
}
