import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "@/design-system/tokens.css";
import "@/design-system/base.css";
import s from "../approval.module.css";
import { isReviewHubEnabled } from "@/lab/review-hub";
import { APP_REVIEW, type AppRisk } from "@/content/digital-services";

// Staging-only approval / discovery draft (Phase 10.2A): what the project knows about the
// practice app (only that staff mentioned it), what is unconfirmed, and the exact questions.
// Not a parent page — never public, never in the patient navigation or the dock; 404 in
// PRODUCTION; noindex. No app name, no store link, no feature is claimed here.

export const metadata: Metadata = {
  title: "Praxis-App – Freigabeentwurf",
  description: "Interner Freigabeentwurf. Nicht öffentlich.",
  robots: { index: false, follow: false },
};

const RISK_LABEL: Record<AppRisk, string> = {
  MEDIUM: "Risiko mittel",
  HIGH: "Risiko hoch",
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

        <ol className={s.items}>
          {APP_REVIEW.map((section, n) => {
            const headingId = `abschnitt-${section.id}`;
            return (
              <li key={section.id}>
                <section className={s.item} aria-labelledby={headingId}>
                  <div className={s.itemHead}>
                    <h2 id={headingId} className={s.itemTitle}>
                      {`${n + 1}. ${section.title}`}
                    </h2>
                    <p className={s.state}>
                      <span className={s.stateMark} aria-hidden="true" />
                      Noch nicht bestätigt
                    </p>
                  </div>
                  {section.factIds.length ? (
                    <p className={s.facts}>
                      {`Faktenregister ${section.factIds.join(", ")}`}
                      {section.risk ? ` · ${RISK_LABEL[section.risk]}` : ""}
                    </p>
                  ) : null}

                  <div className={s.groups}>
                    <div className={s.group}>
                      <h3 className={s.groupTitle}>Bekannt</h3>
                      <ul>
                        {section.known.map((k) => (
                          <li key={k}>{k}</li>
                        ))}
                      </ul>
                    </div>
                    <div className={s.group}>
                      <h3 className={s.groupTitle}>Unbestätigt</h3>
                      <ul>
                        {section.unconfirmed.map((u) => (
                          <li key={u}>{u}</li>
                        ))}
                      </ul>
                      {section.missing ? (
                        <ul className={s.missing} aria-label="Fehlende Angaben">
                          {section.missing.map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <div className={s.questions}>
                      <h3 className={s.questionsTitle}>Offene Fragen</h3>
                      <ul>
                        {section.questions.map((q) => (
                          <li key={q}>{q}</li>
                        ))}
                      </ul>
                      {section.candidates ? (
                        <ul
                          className={s.checklist}
                          aria-label="Mögliche Funktionen – keine ist bestätigt"
                        >
                          {section.candidates.map((c) => (
                            <li key={c}>
                              <span className={s.box} aria-hidden="true" />
                              <span>
                                {c}{" "}
                                <span className={s.candidateState}>
                                  – nicht bestätigt
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    {section.notes ? (
                      <div className={s.notes}>
                        {section.notes.map((note) => (
                          <p key={note}>{note}</p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </section>
              </li>
            );
          })}
        </ol>
      </main>
    </div>
  );
}
