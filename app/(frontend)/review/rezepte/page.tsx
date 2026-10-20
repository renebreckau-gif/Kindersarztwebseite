import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "@/design-system/tokens.css";
import "@/design-system/base.css";
import s from "../approval.module.css";
import { isReviewHubEnabled } from "@/lab/review-hub";
import { PRESCRIPTION_REVIEW } from "@/content/prescription-process";
import { ApprovalSections } from "../approval-sections";

// Staging-only approval draft (Phase 10.3A): what the project knows about the practice's
// prescription process (only that staff mentioned it), what is unconfirmed, the channel matrix
// (all unconfirmed) and the exact questions. Not a parent page — never public, never in the
// patient navigation or the dock; 404 in PRODUCTION; noindex. No form, no e-mail CTA, no app
// link, no time, no card rule is stated here.

export const metadata: Metadata = {
  title: "Rezepte & E-Rezept – Freigabeentwurf",
  description: "Interner Freigabeentwurf. Nicht öffentlich.",
  robots: { index: false, follow: false },
};

export default function RezepteFreigabe() {
  if (!isReviewHubEnabled()) notFound();
  return (
    <div className="ds-root">
      <main className={s.page}>
        <Link href="/review" className={s.back}>
          Zur Projekt-Review
        </Link>
        <header className={s.head}>
          <p className={s.draft}>Freigabeentwurf · nicht öffentlich</p>
          <h1 className={s.title}>Rezepte &amp; E-Rezept</h1>
          <p className={s.subtitle}>Vorschlag zur Klärung des Praxisablaufs</p>
          <p className={s.lead}>
            Aus dem Praxisteam kam der Hinweis, dass Familien regelmäßig nach
            Rezepten und E-Rezepten fragen (Oktober 2026). Den genauen Ablauf
            der Praxis kennt das Projekt nicht. Er wird auch nicht aus
            allgemeinen E-Rezept-Abläufen abgeleitet. Auf der Website erscheint
            nichts davon, bevor die Praxis die Fragen beantwortet hat.
          </p>
        </header>
        <ApprovalSections sections={PRESCRIPTION_REVIEW} />
      </main>
    </div>
  );
}
