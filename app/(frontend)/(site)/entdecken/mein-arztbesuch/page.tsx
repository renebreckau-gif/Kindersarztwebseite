import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, InternalNote } from "@/site/chrome";
import { Story } from "@/site/discovery/story";
import { PageBackNav } from "@/site/blocks";
import u from "@/site/pages.module.css";
import d from "@/site/discovery/chapter.module.css";
import { resolvePuls } from "@/content/puls";
import { MEIN_ARZTBESUCH, chapterView, discoveryReviewMode } from "@/content/discovery";
import { RELEASE } from "@/content/release";

type Search = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: Search }): Promise<Metadata> {
  const v = chapterView(MEIN_ARZTBESUCH, discoveryReviewMode((await searchParams).vorschau) !== null);
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
  const mode = discoveryReviewMode(q.vorschau);
  const view = chapterView(MEIN_ARZTBESUCH, mode !== null);
  const c = view.chapter;

  return (
    <PageFrame current="entdecken" puls={puls} tone="night">
      <div className={d.chapter}>
        {/* page hierarchy back — separate from the story's own "Schließen – zur Übersicht" */}
        <PageBackNav href={mode === "QUERY" && view.mode === "PREVIEW" ? "/entdecken?vorschau=freigabe" : "/entdecken"} label="Entdecken" tone="night" />
        <header className={d.head}>
          <h1 className={d.title}>{c.title}</h1>
          {view.mode === "GATED" ? null : <p className={d.intro}>{c.parentIntro}</p>}
          {view.mode === "PREVIEW" ? (
            <p className={d.previewFlag} role="note">
              <strong>Vorschau</strong> – noch nicht öffentlich. {RELEASE.meinArztbesuchApproved ? "" : "Das Kapitel ist für die Veröffentlichung noch nicht freigeschaltet."}
            </p>
          ) : null}
        </header>

        {view.mode === "GATED" ? (
          <section className={d.gated} aria-labelledby="gated-t">
            <h2 id="gated-t" className={d.gatedTitle}>
              In Vorbereitung
            </h2>
            <p>{c.teaser} Dieses Kapitel erscheint in Kürze.</p>
            <p>
              <Link href="/entdecken">Zurück zu Entdecken</Link>
            </p>
            <InternalNote>
              <p>
                Freigabe-Gate: RELEASE.meinArztbesuchApproved = {String(RELEASE.meinArztbesuchApproved)}; jede Szene braucht Inhalts-, Praxis- und (bei Messen/Abhören/Ohren) ärztliche Freigabe
                sowie finale D1-Bilder. Staging-Review: ?vorschau=freigabe
              </p>
            </InternalNote>
          </section>
        ) : (
          <Story scenes={view.chapter.scenes} preview={view.mode === "PREVIEW" && mode === "QUERY"} />
        )}
      </div>
    </PageFrame>
  );
}
