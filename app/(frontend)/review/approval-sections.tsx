// Shared rendering of the staging approval drafts (10.2A Praxis-App, 10.3A Rezepte): numbered
// topic sections, each with Bekannt / Unbestätigt / Offene Fragen, plus optional "missing"
// markers, unselected candidates, "zu klären" items, a channel matrix and boundary notes.
// Statuses are always in words; nothing here is a form control.

import type { ApprovalRisk, ApprovalSection } from "@/content/approval-review";
import s from "./approval.module.css";

const RISK_LABEL: Record<ApprovalRisk, string> = {
  MEDIUM: "Risiko mittel",
  HIGH: "Risiko hoch",
};

export function ApprovalSections({
  sections,
}: {
  sections: ApprovalSection[];
}) {
  return (
    <ol className={s.items}>
      {sections.map((section, n) => {
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

                {section.channels ? (
                  <div className={s.group}>
                    <h3 className={s.groupTitle}>Kanäle</h3>
                    <ul className={s.channels}>
                      {section.channels.map((c) => (
                        <li key={c.id} className={s.channel}>
                          <div className={s.channelHead}>
                            <span className={s.channelName}>{c.label}</span>
                            <span className={s.state}>
                              <span
                                className={s.stateMark}
                                aria-hidden="true"
                              />
                              Noch nicht bestätigt
                            </span>
                          </div>
                          <p className={s.channelQuestion}>{c.question}</p>
                          {c.related ? (
                            <p className={s.facts}>{c.related}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

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
                      aria-label="Mögliche Optionen – keine ist bestätigt"
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
                  {section.toClarify ? (
                    <ul className={s.clarify} aria-label="Zu klären">
                      {section.toClarify.map((c) => (
                        <li key={c}>
                          {c}{" "}
                          <span className={s.candidateState}>– zu klären</span>
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
  );
}
