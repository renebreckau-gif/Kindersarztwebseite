import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "@/design-system/tokens.css";
import "@/design-system/base.css";
import s from "../approval.module.css";
import { isReviewHubEnabled } from "@/lab/review-hub";
import { PRICING_REVIEW } from "@/content/pricing-review";
import { ApprovalSections } from "../approval-sections";

// Staging-only approval draft (Phase 10.4A): what the project knows about prices and payment
// (only that staff mentioned them), what is unconfirmed, the payment-method matrix (all
// unconfirmed) and the exact questions. Not a parent page — never public, never in the patient
// navigation or the dock; 404 in PRODUCTION; noindex. No amount, no accepted payment method, no
// logo, no billing / insurance statement, no form.

export const metadata: Metadata = {
  title: "Kosten & Zahlungsarten – Freigabeentwurf",
  description: "Interner Freigabeentwurf. Nicht öffentlich.",
  robots: { index: false, follow: false },
};

export default function KostenFreigabe() {
  if (!isReviewHubEnabled()) notFound();
  return (
    <div className="ds-root">
      <main className={s.page}>
        <Link href="/review" className={s.back}>
          Zur Projekt-Review
        </Link>
        <header className={s.head}>
          <p className={s.draft}>Freigabeentwurf · nicht öffentlich</p>
          <h1 className={s.title}>Kosten &amp; Zahlungsarten</h1>
          <p className={s.subtitle}>Vorschlag zur Klärung der Praxisangaben</p>
          <p className={s.lead}>
            Aus dem Praxisteam kam der Vorschlag, Preise für ausgewählte
            Leistungen und die Zahlungsarten auf der Website zu nennen (Oktober
            2026). Eine aktuelle Preisliste liegt dem Projekt nicht vor, und
            keine Zahlungsart ist bestätigt. Auf der Website erscheint nichts
            davon, bevor die Praxis die Fragen beantwortet hat.
          </p>
        </header>
        <ApprovalSections sections={PRICING_REVIEW} />
      </main>
    </div>
  );
}
