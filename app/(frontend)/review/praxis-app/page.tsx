import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "@/design-system/tokens.css";
import "@/design-system/base.css";
import s from "../approval.module.css";
import { isReviewHubEnabled } from "@/lab/review-hub";
import { APP_REVIEW } from "@/content/digital-services";
import { ApprovalSections } from "../approval-sections";

// Staging-only approval / discovery draft (Phase 10.2A): what the project knows about the
// practice app (only that staff mentioned it), what is unconfirmed, and the exact questions.
// Not a parent page — never public, never in the patient navigation or the dock; 404 in
// PRODUCTION; noindex. No app name, no store link, no feature is claimed here.

export const metadata: Metadata = {
  title: "Praxis-App – Freigabeentwurf",
  description: "Interner Freigabeentwurf. Nicht öffentlich.",
  robots: { index: false, follow: false },
};

export default function PraxisAppFreigabe() {
  if (!isReviewHubEnabled()) notFound();
  return (
    <div className="ds-root">
      <main className={s.page}>
        <Link href="/review" className={s.back}>
          Zur Projekt-Review
        </Link>
        <header className={s.head}>
          <p className={s.draft}>Freigabeentwurf · nicht öffentlich</p>
          <h1 className={s.title}>Praxis-App &amp; digitale Services</h1>
          <p className={s.subtitle}>
            Welche Funktionen bietet die Praxis tatsächlich an?
          </p>
          <p className={s.lead}>
            Aus dem Praxisteam kam der Hinweis, die Website solle die App der
            Praxis erwähnen (Oktober 2026). Bestätigt ist dazu noch nichts:
            weder Name noch Anbieter, Plattformen, Funktionen, Zugang oder
            Datenverarbeitung. Auf der Website erscheint nichts davon, bevor die
            Praxis die Fragen beantwortet hat.
          </p>
        </header>

        <ApprovalSections sections={APP_REVIEW} />
      </main>
    </div>
  );
}
