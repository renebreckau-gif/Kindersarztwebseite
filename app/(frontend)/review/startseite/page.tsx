import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "@/design-system/tokens.css";
import "@/design-system/base.css";
import "@/site/site-tokens.css";
import { isReviewHubEnabled } from "@/lab/review-hub";
import { exampleAnnouncements, exampleClosures, HIGHLIGHT_EXAMPLES, type HighlightExample } from "@/lab/homepage-fixtures";
import { StartPage } from "@/site/start-page";
import { resolvePuls } from "@/content/puls";
import { loadPublicOperationalData } from "@/data/public-operational";
import { selectHomepageHighlight } from "@/content/homepage-highlight";
import { zonedParts } from "@/domain/time";

// Staging-only review view (Phase 10.0A): the REAL start page composition with ARTIFICIAL
// highlight data (src/lab/homepage-fixtures.ts) passed through the real engine and the real
// selector. Never touches the public content source; 404 in PRODUCTION; noindex. 09.6B: the base is the
// same static operational snapshot as `/`; only the fixture closures / notices are added for the hero.

export const metadata: Metadata = {
  title: "Prüfansicht Startseite (Testdaten)",
  robots: { index: false, follow: false },
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function StartseitePruefansicht({ searchParams }: { searchParams: Search }) {
  if (!isReviewHubEnabled()) notFound();
  const q = await searchParams;
  const example: HighlightExample = HIGHLIGHT_EXAMPLES.includes(q.beispiel as HighlightExample) ? (q.beispiel as HighlightExample) : "urlaub";
  const today = zonedParts(new Date()).date;
  const snapshot = await loadPublicOperationalData();
  const base = snapshot.puls;
  const puls = resolvePuls({}, new Date(), { ...base, closures: [...base.closures, ...exampleClosures(example, today)] });
  const highlight = selectHomepageHighlight({ result: puls.result, announcements: exampleAnnouncements(example, today), today });
  return (
    <div className="ds-root">
      <StartPage puls={puls} snapshot={snapshot} highlight={highlight} tag="Testdaten" />
    </div>
  );
}
