// The start page composition (approved Phase 06.2 hero, locked) — shared by the public route `/`
// and the staging-only review view `/review/startseite` (10.0A), so a review screenshot shows the
// REAL page. Data is passed in: the public route gives ONE operational snapshot (static in 09.6B).
//
// Hierarchy (customer decision Variant B, docs/reviews/homepage-feedback-2026-10.md):
//   1. PRAXIS PULS (status)  2. contact — Anrufen, Notfall, then E-Mail as a quiet secondary
//   3. at most ONE current notice (or nothing)  4. everything else lives in the chapters below.

import s from "@/lab/final/signature.module.css";
import { EntryHeader, PulsStatement } from "@/lab/final/entry-chrome";
import { HeroStage } from "@/lab/final/hero-stage";
import { SiteDock, SiteFooter, SiteMenu, PreviewBanner } from "@/site/chrome";
import { MenuButton } from "@/site/mobile-menu";
import { Icon } from "@/design-system/icons";
import { HomeChapters } from "@/site/home";
import { HomepageHighlightCard } from "@/site/homepage-highlight";
import { highlightedAnnouncementIds, type HomepageHighlight } from "@/content/homepage-highlight";
import type { PulsView } from "@/content/puls";
import type { PublicOperationalSnapshot } from "@/data/public-operational";
import { PRIMARY } from "@/content/site";
import { PRACTICE } from "@/content/practice";
import { artworkForDate } from "@/content/artworks";

const ROUTES = { heute: "/heute", "mein-kind": "/mein-kind", praxis: "/praxis", entdecken: "/entdecken" } as const;

/** Secondary contact from the practice master data (F17) — never hard-coded, never pre-filled. */
const EMAIL = { href: `mailto:${PRACTICE.email.value}`, label: "E-Mail schreiben an die Kinderarztpraxis" };

export function StartPage({ puls, snapshot, highlight, tag }: { puls: PulsView; snapshot: PublicOperationalSnapshot; highlight: HomepageHighlight | null; tag?: string | null }) {
  return (
    <div className={s.page}>
      <a className={s.skip} href="#inhalt">
        Zum Inhalt springen
      </a>
      <EntryHeader
        links={[{ id: "start", label: "Start", href: "/", current: true }, ...PRIMARY.map((p) => ({ id: p.id, label: p.label, href: p.href }))]}
        homeHref="/"
        menu={(className) => (
          <MenuButton className={className}>
            <Icon name="menu" size={20} />
          </MenuButton>
        )}
      />
      <SiteDock puls={puls} />
      <main id="inhalt">
        {/* one practice painting per Europe/Berlin day — the engine's date, so server and client agree */}
        <HeroStage initial={null} routes={ROUTES} artwork={artworkForDate(puls.result.evaluatedAt.localDate)}>
          <div className={s.headline}>
            <h1>Gesund groß werden.</h1>
            <p>Alles für heute auf einen Blick. Und Begleitung, die mit Ihrem Kind mitwächst.</p>
          </div>
          <PulsStatement puls={puls.view} hoursHref="/heute/sprechzeiten" emergencyHref="/notfall" tag={tag ?? (puls.mode === "PREVIEW" ? "Vorschau" : null)} email={EMAIL} />
          <HomepageHighlightCard highlight={highlight} />
        </HeroStage>
        <PreviewBanner puls={puls} />
        <HomeChapters puls={puls} snapshot={snapshot} excludeAnnouncementIds={highlightedAnnouncementIds(highlight)} />
      </main>
      <SiteFooter />
      <SiteMenu />
    </div>
  );
}
