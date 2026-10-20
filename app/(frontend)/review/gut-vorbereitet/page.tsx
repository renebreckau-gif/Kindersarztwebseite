import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "@/design-system/tokens.css";
import "@/design-system/base.css";
import s from "../approval.module.css";
import { isReviewHubEnabled } from "@/lab/review-hub";
import {
  APPROVER_LABEL,
  FIRST_VISIT_APPROVALS,
  FIRST_VISIT_ITEMS,
} from "@/content/first-visit";

// Staging-only approval draft (Phase 10.1A): the "Gut vorbereitet" proposals with their open
// questions, for the practice to confirm. Not a parent page — never public, never in the patient
// navigation or the dock; 404 in PRODUCTION; noindex. Nothing here is a practice rule yet.

export const metadata: Metadata = {
  title: "Gut vorbereitet – Freigabeentwurf",
  description: "Interner Freigabeentwurf. Nicht öffentlich.",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<string, string> = {
  TO_BE_CONFIRMED: "Noch nicht freigegeben",
  VERIFIED_CURRENT: "Bestätigt",
  OUTDATED_DO_NOT_PUBLISH: "Veraltet – nicht veröffentlichen",
};

export default function GutVorbereitetFreigabe() {
  if (!isReviewHubEnabled()) notFound();
  const items = [...FIRST_VISIT_ITEMS].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
  return (
    <div className="ds-root">
      <main className={s.page}>
        <Link href="/review" className={s.back}>
          Zur Projekt-Review
        </Link>
        <header className={s.head}>
          <p className={s.draft}>Freigabeentwurf · nicht öffentlich</p>
          <h1 className={s.title}>Gut vorbereitet</h1>
          <p className={s.subtitle}>Vorschlag zur inhaltlichen Freigabe</p>
          <p className={s.lead}>
            Die Vorschläge stammen aus einem Hinweis des Praxisteams (Oktober
            2026). Auf der Website erscheint nichts davon, bevor die Praxis die
            offenen Fragen beantwortet und den Text bestätigt hat.
          </p>
        </header>

        <ul className={s.items}>
          {items.map((item) => {
            const approval = FIRST_VISIT_APPROVALS.find(
              (a) => a.itemId === item.id,
            );
            const headingId = `vorschlag-${item.id}`;
            return (
              <li key={item.id}>
                <article className={s.item} aria-labelledby={headingId}>
                  <div className={s.itemHead}>
                    <h2 id={headingId} className={s.itemTitle}>
                      {item.title}
                    </h2>
                    <p className={s.state}>
                      <span className={s.stateMark} aria-hidden="true" />
                      {STATUS_LABEL[item.verification.status]}
                    </p>
                  </div>

                  <figure className={s.proposal}>
                    <figcaption className={s.proposalLabel}>
                      Textvorschlag
                    </figcaption>
                    <blockquote className={s.proposalText}>
                      <p>{item.text}</p>
                    </blockquote>
                  </figure>

                  {approval ? (
                    <>
                      <dl className={s.meta}>
                        <div>
                          <dt>Freigabe durch</dt>
                          <dd>{APPROVER_LABEL[approval.approver]}</dd>
                        </div>
                        <div>
                          <dt>Herkunft des Textes</dt>
                          <dd>{approval.wordingSource}</dd>
                        </div>
                        <div>
                          <dt>Faktenregister</dt>
                          <dd>
                            {approval.factId}
                            {approval.related ? ` · ${approval.related}` : ""}
                          </dd>
                        </div>
                      </dl>
                      <div className={s.questions}>
                        <h3 className={s.questionsTitle}>Offene Fragen</h3>
                        <ul>
                          {approval.openQuestions.map((q) => (
                            <li key={q}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>

        <section className={s.next} aria-labelledby="weiter-title">
          <h2 id="weiter-title" className={s.nextTitle}>
            Nach der Freigabe
          </h2>
          <p>
            Bestätigte Punkte erscheinen später auf einer eigenen Seite „Gut
            vorbereitet“ im Bereich Praxis, verlinkt aus „Neu bei uns?“ – als
            kurze Karten mit einer Zeile Text. Nicht bestätigte Punkte bleiben
            unveröffentlicht. Die Startseite bleibt unverändert.
          </p>
        </section>
      </main>
    </div>
  );
}
