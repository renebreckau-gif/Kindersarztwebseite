// One person in the "Team & Fotos" approval draft (10.5A): working data plus every open
// confirmation, status in words. The portrait slot is a neutral initial — never a face, never
// an old photo, never AI imagery (media policy); it is decorative and hidden from assistive tech.

import type { PersonReview } from "@/content/team-review";
import s from "../approval.module.css";

const initials = (name: string) =>
  name
    .replace(/^Dr\. med\. /, "")
    .split(" ")
    .map((w) => w[0])
    .join("");

export function TeamReviewCard({ person }: { person: PersonReview }) {
  const headingId = `person-${person.id}`;
  return (
    <article className={s.person} aria-labelledby={headingId}>
      <div className={s.personHead}>
        <span className={s.personInitial} aria-hidden="true">
          {initials(person.name)}
        </span>
        <div className={s.personTitle}>
          <h3 id={headingId} className={s.personName}>
            {person.name}
          </h3>
          <p
            className={s.facts}
          >{`Faktenregister ${person.factIds.join(", ")}`}</p>
        </div>
      </div>
      <dl className={s.meta}>
        {person.workingData.map((d) => (
          <div key={d.label}>
            <dt>{d.label}</dt>
            <dd>{d.value}</dd>
          </div>
        ))}
        <div>
          <dt>Foto</dt>
          <dd>Kein Foto zugeordnet</dd>
        </div>
      </dl>
      <ul
        className={s.checks}
        aria-label={`Offene Bestätigungen für ${person.name}`}
      >
        {person.checks.map((c) => (
          <li key={c.label}>
            <span>{c.label}</span>
            <span className={s.state}>
              <span className={s.stateMark} aria-hidden="true" />
              Noch nicht bestätigt
            </span>
          </li>
        ))}
      </ul>
      {person.questions ? (
        <div className={s.questions}>
          <h4 className={s.questionsTitle}>Offene Fragen</h4>
          <ul>
            {person.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
