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
import { isWorkingInput } from "@/content/practice";

// Staging-only approval workspace (10.1A, updated 10.1B): the "Gut vorbereitet" items with their
// provenance. Since 10.1B they are published on STAGING (/praxis/gut-vorbereitet) from the practice
// input of 2026-11-16 as WORKING data; the named confirmation before PRODUCTION (LB-00) is still open.
// Not a parent page — never in the patient navigation or the dock; 404 in PRODUCTION; noindex.

export const metadata: Metadata = {
  title: "Gut vorbereitet – Freigabestand",
  description: "Interner Freigabeentwurf. Nicht öffentlich.",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<string, string> = {
  TO_BE_CONFIRMED: "Noch nicht freigegeben",
  VERIFIED_CURRENT: "Bestätigt",
  WORKING: "Arbeitsstand – formale Freigabe offen",
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
          <p className={s.draft}>Freigabestand · interne Ansicht</p>
          <h1 className={s.title}>Gut vorbereitet</h1>
          <p className={s.subtitle}>Arbeitsstand und offene Freigabe</p>
          <p className={s.lead}>
            Die Punkte beruhen auf der Praxisangabe vom 16.11.2026,
            übermittelt durch den Projektinhaber. Sie stehen in der
            Testumgebung auf der Seite „Gut vorbereitet“. Vor dem Livegang
            fehlt noch die namentliche Bestätigung durch die Praxis bzw. eine
            Ärztin.
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
                      {STATUS_LABEL[isWorkingInput(item.verification) ? "WORKING" : item.verification.status]}
                    </p>
                  </div>

                  <figure className={s.proposal}>
                    <figcaption className={s.proposalLabel}>
                      Text auf der Website (Arbeitsstand)
                    </figcaption>
                    <blockquote className={s.proposalText}>
                      <p>{item.text}</p>
                    </blockquote>
                  </figure>

                  {approval ? (
                    <>
                      <dl className={s.meta}>
                        <div>
                          <dt>Formale Freigabe durch</dt>
                          <dd>{APPROVER_LABEL[approval.approver]}</dd>
                        </div>
                        <div>
                          <dt>Vor dem Livegang</dt>
                          <dd>{approval.finalApproval}</dd>
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
                      {approval.openQuestions.length > 0 ? (
                        <div className={s.questions}>
                          <h3 className={s.questionsTitle}>Offene Fragen</h3>
                          <ul>
                            {approval.openQuestions.map((q) => (
                              <li key={q}>{q}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>

        <section className={s.next} aria-labelledby="weiter-title">
          <h2 id="weiter-title" className={s.nextTitle}>
            Stand der Veröffentlichung
          </h2>
          <p>
            Testumgebung: veröffentlicht unter /praxis/gut-vorbereitet, verlinkt
            aus der Praxis-Übersicht und „Neu bei uns?“. Livegang: erst nach
            der namentlichen Bestätigung (LB-00). Die Startseite bleibt
            unverändert.
          </p>
        </section>
      </main>
    </div>
  );
}
