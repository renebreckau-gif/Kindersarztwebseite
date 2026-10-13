import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "@/design-system/tokens.css";
import "@/design-system/base.css";
import s from "./review.module.css";
import { REVIEW_CARDS, REVIEW_TEST_ACCESS, isReviewHubEnabled } from "@/lab/review-hub";

// Review hub: convenience overview on STAGING (SITE_STAGE); 404 in PRODUCTION.

export const metadata: Metadata = {
  title: "Projekt-Review",
  description: "Interne Review-Übersicht. Nicht öffentlich.",
  robots: { index: false, follow: false },
};

export default function ReviewHub() {
  if (!isReviewHubEnabled()) notFound();
  return (
    <div className="ds-root">
      <main className={s.page}>
        <header className={s.head}>
          <p className={s.status}>Nur Vorschau · nicht öffentlich</p>
          <h1 className={s.title}>Projekt-Review</h1>
          <p className={s.lead}>Hier können die aktuellen Bereiche vor der Veröffentlichung geprüft werden.</p>
        </header>
        <ul className={s.cards}>
          {REVIEW_CARDS.map((c) => (
            <li key={c.id} className={s.card}>
              <div className={s.cardHead}>
                <h2 className={s.cardTitle}>{c.title}</h2>
                {c.status ? <p className={s.badge}>{c.status}</p> : null}
              </div>
              <p className={s.text}>{c.text}</p>
              {c.id === "cockpit" ? (
                <div className={s.access}>
                  <p className={s.accessTitle}>Testzugang · nur Testdaten</p>
                  <dl>
                    <div>
                      <dt>E-Mail</dt>
                      <dd>{REVIEW_TEST_ACCESS.email}</dd>
                    </div>
                    <div>
                      <dt>Passwort</dt>
                      <dd>{REVIEW_TEST_ACCESS.password}</dd>
                    </div>
                  </dl>
                </div>
              ) : null}
              {c.id === "discovery" ? <p className={s.fine}>Auf der Website veröffentlicht. Die formalen Freigaben (Praxis, Inhalt, ärztlich, KI-Kind) sind weiterhin offen.</p> : null}
              <Link href={c.href} className={s.action}>
                {c.action}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
