// 7.5 Urlaub / Schließzeit — REAL workflow against the cockpit database (Phase 09.5C).
// One server-rendered page per step of thinking: Zeitraum → Ankündigen ab → Vertretung → Hinweis
// → Website-Vorschau → Veröffentlichen. Works without JavaScript: the GET form only rebuilds the
// draft and the preview (also "Zeitraum teilen" / "entfernen" / "anpassen"); the single write is
// the POST to /intern/urlaub/veroeffentlichen, which revalidates everything inside a transaction.

import config from "@payload-config";
import Link from "next/link";
import type { ReactNode } from "react";
import { getPayload } from "payload";
import { resolvePuls } from "@/content/puls";
import { PayloadPracticeRepository, type PayloadReader } from "@/backend/payload-repository";
import { datasetFingerprint } from "@/cockpit/workflows/snapshot";
import { applyPeriodAction, inputFromClosure, isEditablePlanned, KIND_CHOICE, KIND_TITLE, plannedClosureDraft, PREVIEW_TIME, prepareFormInput, type DirectoryOption, type PlannedResult } from "@/cockpit/workflows/planned";
import { fromSearch, KIND_SLUG, MODE_SLUG, parsePeriodAction, parsePlannedClosure, plannedQuery } from "@/cockpit/workflows/form";
import { MAX_PERIODS, MAX_PLANNED_TEXT, PLANNED_KINDS, type PlannedClosureInput, type PlannedSection } from "@/cockpit/workflows/types";
import { NO_REPLACEMENT_EFFECT, PRIVACY_HINT, shortRange, STAGING_PUBLISHED } from "@/cockpit/workflows/wording";
import { zonedToInstant } from "@/domain/time";
import { StatusStatement } from "@/site/blocks";
import { CockpitFrame } from "../../cockpit-frame";
import type { InternStaff } from "../../session";
import { Unavailable } from "../../unavailable";
import { ChangeRows, PublicDayInfo } from "../facts-parts";
import { StatusNotice } from "../heute/workflow-parts";

type Raw = Record<string, string | string[] | undefined>;
const EMPTY: PlannedClosureInput = { kind: "VACATION", from: "", to: "", announceFrom: "", periods: [], gapsAccepted: false };

const SECTION_TITLE: Record<PlannedSection, string> = {
  art: "Art der Schließung",
  zeitraum: "Zeitraum",
  ankuendigung: "Ankündigen ab",
  vertretung: "Vertretung",
  hinweis: "Hinweis für die Website",
};

export async function PlannedWorkflow({ staff, raw, recordId }: { staff: InternStaff; raw: Raw; recordId?: string }) {
  const q = fromSearch(raw);
  const submitted = q.get("von") !== undefined || q.get("aktion") !== undefined;
  const base = recordId ? `/intern/urlaub/${encodeURIComponent(recordId)}` : "/intern/urlaub";
  const now = new Date();

  let result: PlannedResult;
  let existing: { id: string; label: string }[] = [];
  let announceChosen = false;
  try {
    const payload = await getPayload({ config });
    const data = await new PayloadPracticeRepository(payload as unknown as PayloadReader).getPulsData();
    const editing = recordId ? data.closures.find((c) => c.id === recordId) : undefined;
    let input: PlannedClosureInput = submitted ? parsePlannedClosure(q) : editing ? inputFromClosure(editing) : EMPTY;
    // The record id comes from the PATH only (edit page); the new page never edits.
    input = recordId ? { ...input, recordId } : (({ recordId: _r, ...rest }) => rest)(input);
    // An unchanged proposal follows changed dates (only a deliberately chosen date stays fixed).
    if (submitted && input.announceFrom && input.announceFrom === q.get("ankuendigen_vorschlag")) input = { ...input, announceFrom: "" };
    const action = parsePeriodAction(q);
    input = prepareFormInput(action ? applyPeriodAction(input, action) : input);
    announceChosen = Boolean(input.announceFrom);
    result = plannedClosureDraft(data, now, input, datasetFingerprint(data));
    const today = result.details.today;
    existing = recordId ? [] : data.closures.filter((c) => isEditablePlanned(c, today)).map((c) => ({ id: c.id, label: `${KIND_TITLE[c.kind]} ${shortRange(c.startDate, c.endDate)}` }));
  } catch {
    return <Unavailable />;
  }

  const { draft, details } = result;
  const { input, editing } = details;
  const notEditable = !draft.ok && draft.blocked.code === "NOT_EDITABLE";
  // On first load nothing was entered yet: no error list. NO_CHANGE is only news after a submit.
  const problems = submitted ? details.problems : details.problems.filter((p) => p.code !== "NO_CHANGE" && p.code !== "INVALID_INPUT" && p.code !== "GAP_NOT_CONFIRMED");
  const bySection = (s: PlannedSection) => problems.filter((p) => p.section === s);
  const title = editing ? `${KIND_TITLE[editing.kind]} bearbeiten` : "Urlaub oder Schließzeit eintragen";

  return (
    <CockpitFrame staff={staff} current="/intern">
      <div className="cp-home cp-workflow cp-planned">
        <div>
          <Link href="/intern" className="cp-back">
            Zur Übersicht
          </Link>
          <h1 className="cp-h1">{title}</h1>
          <p className="cp-intro">{editing ? `Sie bearbeiten den bestehenden Eintrag „${KIND_TITLE[editing.kind]} ${shortRange(editing.startDate, editing.endDate)}“. Die bisherige Fassung bleibt im Verlauf erhalten.` : "Geplante Schließung mit Vertretung. Sie endet automatisch am letzten Tag."}</p>
        </div>

        <StatusNotice status={q.get("status")} />

        {notEditable ? (
          <div className="cp-error" role="alert">
            <p className="cp-alert-text">{draft.ok ? "" : draft.blocked.message}</p>
            <Link href="/intern" className="cp-btn cp-btn-secondary">
              Zur Übersicht
            </Link>
          </div>
        ) : (
          <>
            {existing.length ? (
              <p className="cp-muted cp-existing">
                Bereits eingetragen:{" "}
                {existing.map((e, i) => (
                  <span key={e.id}>
                    {i ? " · " : ""}
                    <Link href={`/intern/urlaub/${encodeURIComponent(e.id)}`} className="cp-text-link">
                      {e.label} bearbeiten
                    </Link>
                  </span>
                ))}
              </p>
            ) : null}

            {problems.length ? (
              <div className="cp-error cp-summary" role="alert" aria-labelledby="probleme-title">
                <p id="probleme-title" className="cp-alert-text">
                  {problems.length === 1 ? "Bitte prüfen:" : `Bitte prüfen (${problems.length}):`}
                </p>
                <ul>
                  {problems.map((p, i) => (
                    <li key={i}>
                      {p.section ? (
                        <a href={`#abschnitt-${p.section}`} className="cp-text-link">
                          {SECTION_TITLE[p.section]}
                        </a>
                      ) : null}
                      {p.section ? ": " : ""}
                      {p.message}
                      {p.suggestion ? (
                        <>
                          {" "}
                          <Link href={p.suggestion.href} className="cp-text-link">
                            {p.suggestion.label}
                          </Link>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <PlannedForm action={base} input={input} details={details} errors={bySection} proposal={announceChosen ? undefined : input.announceFrom || undefined} />

            <Preview result={result} />

            {draft.ok ? (
              <form method="post" action="/intern/urlaub/veroeffentlichen" className="cp-panel cp-publish" aria-labelledby="veroeffentlichen-title">
                <h2 id="veroeffentlichen-title" className="cp-h2 cp-step">
                  <span className="cp-step-no" aria-hidden="true">6</span> Veröffentlichen
                </h2>
                <p className="cp-effect">{draft.effect}</p>
                <p className="cp-muted">{STAGING_PUBLISHED.storedNote}</p>
                {[...new URLSearchParams(plannedQuery(input))].map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
                {editing ? <input type="hidden" name="eintrag" value={editing.id} /> : null}
                <input type="hidden" name="fingerprint" value={draft.fingerprint} />
                <button type="submit" className="cp-btn cp-btn-primary">
                  {draft.actionLabel}
                </button>
              </form>
            ) : submitted ? (
              <section className="cp-panel" aria-labelledby="veroeffentlichen-title">
                <h2 id="veroeffentlichen-title" className="cp-h2 cp-step">
                  <span className="cp-step-no" aria-hidden="true">6</span> Veröffentlichen
                </h2>
                <p className="cp-muted">Noch nicht möglich – bitte zuerst die Hinweise oben klären und die Vorschau aktualisieren.</p>
              </section>
            ) : null}
          </>
        )}
      </div>
    </CockpitFrame>
  );
}

// ---------------------------------------------------------------- the GET form (draft + preview only)

function Section({ id, no, title, errors, children, describedBy }: { id: PlannedSection; no: number; title: string; errors: string[]; children: ReactNode; describedBy?: string }) {
  return (
    <fieldset id={`abschnitt-${id}`} className="cp-fieldset cp-section" aria-describedby={[errors.length ? `fehler-${id}` : "", describedBy ?? ""].filter(Boolean).join(" ") || undefined}>
      <legend className="cp-h2 cp-step">
        <span className="cp-step-no" aria-hidden="true">
          {no}
        </span>{" "}
        {title}
      </legend>
      {errors.length ? (
        <div id={`fehler-${id}`} className="cp-field-error">
          {errors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      ) : null}
      {children}
    </fieldset>
  );
}

function PracticeSelect({ id, name, value, options, invalid, describedBy }: { id: string; name: string; value: string; options: DirectoryOption[]; invalid?: boolean; describedBy?: string }) {
  return (
    <select id={id} name={name} className="cp-input cp-select" defaultValue={value} aria-invalid={invalid || undefined} aria-describedby={describedBy}>
      <option value="">Bitte wählen</option>
      {options.map((o) => (
        <option key={o.id} value={o.id} disabled={!o.usable}>
          {o.name} · {o.city} ({o.note})
        </option>
      ))}
    </select>
  );
}

function PlannedForm({ action, input, details, errors, proposal }: { action: string; input: PlannedClosureInput; details: PlannedResult["details"]; errors: (s: PlannedSection) => { message: string }[]; proposal?: string }) {
  const msgs = (s: PlannedSection) => errors(s).map((e) => e.message);
  const today = details.today;
  const mode = input.mode;
  const dateErr = msgs("zeitraum").length > 0;
  return (
    <form method="get" action={action} className="cp-panel cp-form">
      <Section id="art" no={1} title="Art und Zeitraum" errors={[...msgs("art"), ...msgs("zeitraum")]}>
        <div className="cp-choices-row" role="radiogroup" aria-label="Art der Schließung">
          {PLANNED_KINDS.map((k) => (
            <label key={k} className="cp-choice">
              <input type="radio" name="art" value={KIND_SLUG[k]} defaultChecked={(input.kind ?? "VACATION") === k} />
              {KIND_CHOICE[k]}
            </label>
          ))}
        </div>
        <div className="cp-row2" id="abschnitt-zeitraum">
          <div className="cp-field">
            <label htmlFor="von" className="cp-label">
              Von
            </label>
            <input id="von" name="von" type="date" className="cp-input" defaultValue={input.from} min={details.editing ? undefined : today} aria-invalid={dateErr || undefined} aria-describedby={dateErr ? "fehler-art" : undefined} />
          </div>
          <div className="cp-field">
            <label htmlFor="bis" className="cp-label">
              Bis
            </label>
            <input id="bis" name="bis" type="date" className="cp-input" defaultValue={input.to} min={input.from || today} aria-invalid={dateErr || undefined} aria-describedby={dateErr ? "fehler-art" : undefined} />
          </div>
        </div>
        <p className="cp-help">Beide Tage zählen mit (Europe/Berlin). Der Eintrag endet automatisch nach dem letzten Tag.</p>
      </Section>

      <Section id="ankuendigung" no={2} title="Auf der Website ankündigen ab" errors={msgs("ankuendigung")} describedBy="ankuendigen-hilfe">
        <div className="cp-field">
          <label htmlFor="ankuendigen" className="cp-label">
            Ankündigen ab
          </label>
          <input id="ankuendigen" name="ankuendigen" type="date" className="cp-input cp-input-date" defaultValue={input.announceFrom} aria-invalid={msgs("ankuendigung").length > 0 || undefined} aria-describedby="ankuendigen-hilfe" />
          {proposal ? <input type="hidden" name="ankuendigen_vorschlag" value={proposal} /> : null}
          <p id="ankuendigen-hilfe" className="cp-help">
            Ab diesem Tag sehen Eltern einen Hinweis auf die bevorstehende Schließung. Vorschlag: 14 Tage vor Beginn (oder heute, wenn das schon vorbei ist) – jedes Datum bis zum letzten Tag ist möglich.
          </p>
        </div>
      </Section>

      <Section id="vertretung" no={3} title="Vertretung" errors={msgs("vertretung")}>
        <div role="radiogroup" aria-label="Vertretung">
          <label className="cp-choice">
            <input type="radio" name="vertretung" value={MODE_SLUG.GANZ} defaultChecked={mode === "GANZ"} />
            Eine Vertretung für den ganzen Zeitraum
          </label>
          <label className="cp-choice">
            <input type="radio" name="vertretung" value={MODE_SLUG.TEILEN} defaultChecked={mode === "TEILEN"} />
            Zeitraum aufteilen (verschiedene Praxen oder Tage ohne Vertretung)
          </label>
          <label className="cp-choice">
            <input type="radio" name="vertretung" value={MODE_SLUG.KEINE} defaultChecked={mode === "KEINE"} />
            Keine Vertretung eintragen
          </label>
        </div>

        {mode !== "TEILEN" ? (
          <div className="cp-field cp-indent">
            <label htmlFor="praxis" className="cp-label">
              Vertretungspraxis <span className="cp-optional">(bei „Eine Vertretung für den ganzen Zeitraum“)</span>
            </label>
            <PracticeSelect id="praxis" name="praxis" value={input.practice ?? ""} options={details.options} />
          </div>
        ) : null}

        {mode === "TEILEN"
          ? input.periods.map((p, i) => {
              const problem = details.periodProblems[i];
              const errId = `zeitraum-${i}-fehler`;
              return (
                <fieldset key={i} className="cp-period">
                  <legend className="cp-label">{`Vertretungszeitraum ${i + 1}`}</legend>
                  <div className="cp-row2">
                    <div className="cp-field">
                      <label htmlFor={`z${i}_von`} className="cp-label">
                        Von
                      </label>
                      <input id={`z${i}_von`} name={`z${i}_von`} type="date" className="cp-input" defaultValue={p.from} aria-invalid={problem ? true : undefined} aria-describedby={problem ? errId : undefined} />
                    </div>
                    <div className="cp-field">
                      <label htmlFor={`z${i}_bis`} className="cp-label">
                        Bis
                      </label>
                      <input id={`z${i}_bis`} name={`z${i}_bis`} type="date" className="cp-input" defaultValue={p.to} aria-invalid={problem ? true : undefined} aria-describedby={problem ? errId : undefined} />
                    </div>
                  </div>
                  <div className="cp-field">
                    <label htmlFor={`z${i}_praxis`} className="cp-label">
                      Vertretungspraxis
                    </label>
                    <PracticeSelect id={`z${i}_praxis`} name={`z${i}_praxis`} value={p.practice} options={details.options} invalid={Boolean(problem)} describedBy={problem ? errId : undefined} />
                  </div>
                  {problem ? (
                    <p id={errId} className="cp-field-error">
                      {problem.message}
                    </p>
                  ) : null}
                  <div className="cp-actions-row">
                    {problem?.fix ? (
                      <button type="submit" name="aktion" value={`anpassen-${i}`} className="cp-btn cp-btn-secondary">
                        {`Auf ${shortRange(problem.fix.from, problem.fix.to)} anpassen`}
                      </button>
                    ) : null}
                    <button type="submit" name="aktion" value={`entfernen-${i}`} className="cp-btn cp-btn-quiet">
                      {`Vertretungszeitraum ${i + 1} entfernen`}
                    </button>
                  </div>
                </fieldset>
              );
            })
          : null}

        {mode === "GANZ" || mode === "TEILEN" ? (
          input.periods.length < MAX_PERIODS ? (
            <button type="submit" name="aktion" value="teilen" className="cp-btn cp-btn-secondary cp-split">
              Zeitraum teilen
            </button>
          ) : null
        ) : null}

        {details.newGaps.length ? (
          <div className="cp-note" role="note">
            <p className="cp-note-title">Für die neuen Tage ist noch keine Vertretung eingetragen.</p>
            <p>Ohne Vertretung: {details.newGaps.map((g) => shortRange(g.from, g.to)).join(", ")}. Vorhandene Vertretungen werden nicht automatisch verlängert.</p>
          </div>
        ) : null}
        {details.gaps.length ? (
          <div className="cp-note" role="note">
            <p className="cp-note-title">Ohne Vertretung: {details.gaps.map((g) => shortRange(g.from, g.to)).join(", ")}</p>
            <p>{NO_REPLACEMENT_EFFECT}</p>
            <label className="cp-choice">
              <input type="checkbox" name="luecke" value="1" defaultChecked={input.gapsAccepted} />
              Diese Tage bewusst ohne Vertretung lassen
            </label>
          </div>
        ) : null}
        {mode === "KEINE" ? <p className="cp-help">Ohne Vertretung zeigt die Website während der Schließung Telefon und Notfall-Hinweise.</p> : null}
        <p className="cp-help">Auswählbar sind nur ärztlich bestätigte Praxen aus dem Vertretungsverzeichnis. Neue Praxen oder eine erneute Bestätigung werden dort gepflegt, nicht hier.</p>
      </Section>

      <Section id="hinweis" no={4} title="Hinweis für die Website" errors={msgs("hinweis")} describedBy="hinweis-hilfe">
        <div className="cp-field">
          <label htmlFor="hinweis" className="cp-label">
            Hinweis <span className="cp-optional">(optional)</span>
          </label>
          <textarea id="hinweis" name="hinweis" rows={3} maxLength={MAX_PLANNED_TEXT} className="cp-input cp-textarea" defaultValue={input.message ?? ""} aria-describedby="hinweis-hilfe" aria-invalid={msgs("hinweis").length > 0 || undefined} />
          <p id="hinweis-hilfe" className="cp-help">
            Höchstens {MAX_PLANNED_TEXT} Zeichen, z. B. „Rezepte bitte vorher abholen.“ {PRIVACY_HINT}
          </p>
        </div>
      </Section>

      <button type="submit" className="cp-btn cp-btn-secondary">
        Vorschau aktualisieren
      </button>
    </form>
  );
}

// ---------------------------------------------------------------- 5. Website-Vorschau (engine at several dates)

function Preview({ result }: { result: PlannedResult }) {
  const { details } = result;
  return (
    <section className="cp-panel" aria-labelledby="vorschau-title">
      <h2 id="vorschau-title" className="cp-h2 cp-step">
        <span className="cp-step-no" aria-hidden="true">
          5
        </span>{" "}
        Website-Vorschau
      </h2>
      {details.moments.length && details.after ? (
        <>
          <p className="cp-muted">So würde die Website an diesen Tagen um {PREVIEW_TIME} Uhr aussehen, wenn sie bereits die Cockpit-Daten verwendet.</p>
          <ul className="cp-moments" aria-live="polite">
            {details.moments.map((m) => (
              <li key={m.date} className="cp-moment">
                <h3 className="cp-h3">{m.label}</h3>
                <StatusStatement puls={resolvePuls({}, zonedToInstant(m.date, PREVIEW_TIME), details.after!)} />
                <PublicDayInfo result={m.after} />
                <ChangeRows rows={m.changes} caption="Gegenüber dem jetzigen Stand" />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="cp-muted">Sobald Zeitraum und Ankündigung gültig sind, zeigt die Vorschau die Website am Tag der Ankündigung, am ersten Tag, in jedem Vertretungszeitraum, an Tagen ohne Vertretung und am ersten Tag danach.</p>
      )}
    </section>
  );
}
