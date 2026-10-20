import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "@/design-system/tokens.css";
import "@/design-system/base.css";
import s from "../approval.module.css";
import { isReviewHubEnabled } from "@/lab/review-hub";
import { PEOPLE_REVIEW, TEAM_TOPICS } from "@/content/team-review";
import { ApprovalSections } from "../approval-sections";
import { TeamReviewCard } from "./team-review-card";

// Staging-only approval draft (Phase 10.5A): the existing working data about doctors and team,
// every open confirmation (current status, exact wording, name consent, photo consent), photo
// options and rights. Review tooling, not publication — never public, never in the patient
// navigation or the dock; 404 in PRODUCTION; noindex. The public team pages keep their consent
// gate unchanged. No photos are shown; portraits are neutral initials.

export const metadata: Metadata = {
  title: "Team & Fotos – Freigabeentwurf",
  description: "Interner Freigabeentwurf. Nicht öffentlich.",
  robots: { index: false, follow: false },
};

export default function TeamFreigabe() {
  if (!isReviewHubEnabled()) notFound();
  return (
    <div className="ds-root">
      <main className={s.page}>
        <Link href="/review" className={s.back}>
          Zur Projekt-Review
        </Link>
        <header className={s.head}>
          <p className={s.draft}>Freigabeentwurf · nicht öffentlich</p>
          <h1 className={s.title}>Team &amp; Fotos</h1>
          <p className={s.subtitle}>Wer soll wie auf der Website erscheinen?</p>
          <p className={s.lead}>
            Hier steht der Arbeitsstand aus der bisherigen Website und den
            Projektunterlagen. Er ist noch nicht zur Veröffentlichung
            freigegeben: Auf der Website erscheint eine Person erst, wenn die
            Praxis ihre Angaben und die Einwilligung bestätigt hat. Fotos werden
            hier bewusst nicht gezeigt.
          </p>
        </header>
        <ol className={s.items}>
          {PEOPLE_REVIEW.map((group, n) => (
            <li key={group.id}>
              <section
                className={s.item}
                aria-labelledby={`abschnitt-${group.id}`}
              >
                <div className={s.itemHead}>
                  <h2 id={`abschnitt-${group.id}`} className={s.itemTitle}>
                    {`${n + 1}. ${group.title}`}
                  </h2>
                </div>
                <p className={s.workingState}>{group.stateLabel}</p>
                <div className={s.peopleList}>
                  {group.people.map((p) => (
                    <TeamReviewCard key={p.id} person={p} />
                  ))}
                </div>
                {group.questions ? (
                  <div className={s.questions}>
                    <h3 className={s.questionsTitle}>Offene Fragen</h3>
                    <ul>
                      {group.questions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {group.notes ? (
                  <div className={s.notes}>
                    {group.notes.map((note) => (
                      <p key={note}>{note}</p>
                    ))}
                  </div>
                ) : null}
              </section>
            </li>
          ))}
        </ol>
        <ApprovalSections
          sections={TEAM_TOPICS}
          startAt={PEOPLE_REVIEW.length + 1}
        />
      </main>
    </div>
  );
}
