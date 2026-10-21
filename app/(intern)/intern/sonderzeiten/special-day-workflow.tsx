// Sonderöffnungszeiten / Feiertag klären — REAL workflow against the cockpit database (Phase 09.5F).
// One future date: "Was gilt an diesem Tag?" → geschlossen or geänderte Sprechzeiten (the COMPLETE
// opening of that day). Works without JavaScript: the GET form rebuilds draft + preview; the single
// write is the POST to /intern/sonderzeiten/veroeffentlichen (revalidated inside a transaction).

import config from "@payload-config";
import Link from "next/link";
import { getPayload } from "payload";
import { resolvePuls } from "@/content/puls";
import { PayloadPracticeRepository, type PayloadReader } from "@/backend/payload-repository";
import { datasetFingerprint } from "@/cockpit/workflows/snapshot";
import { buildDraft } from "@/cockpit/workflows/publish";
import {
  HOLIDAY_RESOLVED_TEXT,
  HOLIDAY_UNRESOLVED_TEXT,
  MAX_SPECIAL_ROWS,
  MAX_SPECIAL_TEXT,
  PRIVACY_TEXT,
  holidayUnresolved,
  isSpecialDayRecord,
  regularTemplate,
  specialDayMoments,
  typeOptions,
  validateIntervals,
  type SpecialDayInput,
} from "@/cockpit/workflows/special-day";
import { fromSearch, parseSpecialDay } from "@/cockpit/workflows/form";
import { berlinNow } from "@/cockpit/read-model";
import { STAGING_PUBLISHED } from "@/cockpit/workflows/wording";
import { addDays, formatGermanDate, isLocalDate, zonedToInstant } from "@/domain/time";
import type { OpeningHourException } from "@/domain/content-types";
import { StatusStatement } from "@/site/blocks";
import { CockpitFrame } from "../../cockpit-frame";
import type { InternStaff } from "../../session";
import { Unavailable } from "../../unavailable";
import { StatusNotice } from "../heute/workflow-parts";
import { statusWord } from "../akutsprechstunde/acute-parts";

type Raw = Record<string, string | string[] | undefined>;

const fromRecord = (x: OpeningHourException): SpecialDayInput => ({
  recordId: x.id,
  date: x.startDate,
  mode: x.kind === "CLOSED" ? "CLOSED" : "SPECIAL",
  rows: x.intervals.map((i) => ({ start: i.start, end: i.end, type: i.consultationType })),
  message: x.publicMessage,
});

export async function SpecialDayWorkflow({ staff, raw, recordId }: { staff: InternStaff; raw: Raw; recordId?: string }) {
  const q = fromSearch(raw);
  const now = new Date();
  const today = berlinNow(now).date;
  const action = recordId ? `/intern/sonderzeiten/${encodeURIComponent(recordId)}` : "/intern/sonderzeiten";

  let data;
  try {
    data = await new PayloadPracticeRepository((await getPayload({ config })) as unknown as PayloadReader).getPulsData();
  } catch {
    return <Unavailable />;
  }
  const editing = recordId ? data.exceptions.find((x) => x.id === recordId && isSpecialDayRecord(x)) : undefined;
  if (recordId && !editing) {
    return (
      <CockpitFrame staff={staff} current="/intern">
        <div className="cp-home cp-workflow">
          <Link href="/intern" className="cp-back">
            Zur Übersicht
          </Link>
          <h1 className="cp-h1">Sonderöffnungszeit bearbeiten</h1>
          <p className="cp-error" role="alert">
            Dieser Eintrag ist nicht (mehr) aktiv oder kann hier nicht bearbeitet werden.
          </p>
        </div>
      </CockpitFrame>
    );
  }

  const submitted = q.get("art") !== undefined;
  const parsed = parseSpecialDay(q);
  // The record id comes from the PATH only; on the edit page the date is the record's own.
  let input: SpecialDayInput = submitted ? parsed : editing ? fromRecord(editing) : { date: parsed.date, rows: [] };
  if (editing) input = { ...input, recordId: editing.id, date: editing.startDate };
  else input = (({ recordId: _r, ...rest }) => rest)(input);
  const date = input.date;
  const validDate = isLocalDate(date);
  const options = validDate ? typeOptions(data, date, today) : [];
  // Explicit convenience only: copy the confirmed weekly plan of this weekday INTO THE EDITOR.
  if (validDate && q.get("vorlage") === "regulaer") {
    input = { ...input, mode: "SPECIAL", rows: regularTemplate(data, date, options).map((s) => ({ start: s.start, end: s.end, type: s.type })) };
  }
  const rowsShown = Math.min(MAX_SPECIAL_ROWS, Math.max(input.rows.length + 1, 2));
  const rowProblems = input.mode === "SPECIAL" && submitted ? validateIntervals(input.rows, options).problems : [];
  const asked = validDate && (submitted || Boolean(editing) || q.get("vorlage") === "regulaer");
  const draft = asked ? buildDraft({ kind: "SPECIAL_DAY", input }, data, now, datasetFingerprint(data)) : null;
  const holiday = validDate && data.publicHolidays.includes(date);
  const unresolved = validDate && holidayUnresolved(data, date);
  const moments = draft ? specialDayMoments(data, draft) : [];
  const record = draft && draft.ok ? (draft.record.value as OpeningHourException) : undefined;
  const at = record ? zonedToInstant(date, record.kind === "CLOSED" ? "10:00" : moments.find((m) => m.label.startsWith("während"))?.time ?? "12:00") : null;
  const changed = draft && draft.ok ? { ...data, exceptions: [...data.exceptions.filter((x) => x.id !== record!.id), record!] } : null;
  const minDate = addDays(today, 1);

  return (
    <CockpitFrame staff={staff} current="/intern">
      <div className="cp-home cp-workflow">
        <div>
          <Link href="/intern" className="cp-back">
            Zur Übersicht
          </Link>
          <h1 className="cp-h1">{editing ? "Sonderöffnungszeit bearbeiten" : holiday ? "Feiertag klären" : "Sonderöffnungszeiten"}</h1>
          <p className="cp-intro">
            {holiday && unresolved
              ? "Für diesen Feiertag ist noch nicht bestätigt, ob die Praxis geöffnet oder geschlossen ist."
              : "Für diesen Tag können Sie abweichende Sprechzeiten eintragen. Die Änderung gilt nur für dieses eine Datum."}
          </p>
        </div>

        <StatusNotice status={q.get("status")} />

        <form method="get" action={action} className="cp-panel cp-form">
          <div className="cp-field">
            <label htmlFor="datum" className="cp-label">
              Datum
            </label>
            {editing ? (
              <>
                <input id="datum" type="date" className="cp-input cp-input-date" value={date} readOnly aria-describedby="datum-hilfe" />
                <p id="datum-hilfe" className="cp-help">
                  Das Datum eines bestehenden Eintrags wird nicht verschoben.
                </p>
              </>
            ) : (
              <>
                <input id="datum" name="datum" type="date" className="cp-input cp-input-date" defaultValue={date} min={minDate} required aria-describedby="datum-hilfe" />
                <p id="datum-hilfe" className="cp-help">
                  Ab morgen. {"Änderungen für heute nehmen Sie bitte über die Schnellaktionen vor."}
                </p>
              </>
            )}
          </div>

          <fieldset className="cp-fieldset">
            <legend className="cp-h2">Was gilt an diesem Tag?</legend>
            <div className="cp-choices-row">
              <label className="cp-choice">
                <input type="radio" name="art" value="geschlossen" defaultChecked={input.mode === "CLOSED"} />
                <span>Die Praxis ist geschlossen</span>
              </label>
              <label className="cp-choice">
                <input type="radio" name="art" value="geaendert" defaultChecked={input.mode === "SPECIAL"} />
                <span>Die Praxis hat geänderte Sprechzeiten</span>
              </label>
            </div>
          </fieldset>

          <fieldset className="cp-fieldset">
            <legend className="cp-h2">Sprechzeiten an diesem Tag</legend>
            <p className="cp-help" id="zeiten-hilfe">
              Nur bei „geänderte Sprechzeiten“. Die Zeilen ersetzen den ganzen Tag: Was hier fehlt, ist an diesem Tag geschlossen.
            </p>
            {validDate && !editing ? (
              <p>
                <Link href={`${action}?${new URLSearchParams({ datum: date, art: "geaendert", vorlage: "regulaer" })}`} className="cp-text-link">
                  {holiday ? "Reguläre Sprechzeiten dieses Wochentags übernehmen" : "Reguläre Sprechzeit dieses Tages übernehmen"}
                </Link>
              </p>
            ) : null}
            {Array.from({ length: rowsShown }, (_, i) => {
              const r = input.rows[i] ?? { start: "", end: "", type: "" };
              const p = rowProblems.find((x) => x.index === i);
              const err = p ? `zeile-${i}-fehler` : undefined;
              return (
                <fieldset key={i} className="cp-period cp-acute-row" aria-describedby={err}>
                  <legend className="cp-label">{`Sprechzeit ${i + 1}`}</legend>
                  <div className="cp-acute-fields cp-special-fields">
                    <div className="cp-field">
                      <label htmlFor={`z${i}_von`} className="cp-label">
                        Von
                      </label>
                      <input id={`z${i}_von`} name={`z${i}_von`} type="time" step={300} className="cp-input cp-input-time" defaultValue={r.start} aria-invalid={p ? true : undefined} aria-describedby={err} />
                    </div>
                    <div className="cp-field">
                      <label htmlFor={`z${i}_bis`} className="cp-label">
                        Bis
                      </label>
                      <input id={`z${i}_bis`} name={`z${i}_bis`} type="time" step={300} className="cp-input cp-input-time" defaultValue={r.end} aria-invalid={p ? true : undefined} aria-describedby={err} />
                    </div>
                    <div className="cp-field">
                      <label htmlFor={`z${i}_art`} className="cp-label">
                        Sprechstundenart
                      </label>
                      <select id={`z${i}_art`} name={`z${i}_art`} className="cp-input cp-select" defaultValue={r.type} aria-invalid={p ? true : undefined} aria-describedby={err}>
                        <option value="">–</option>
                        {options.map((o) => (
                          <option key={o.code} value={o.code} disabled={!o.usable}>
                            {o.usable ? o.label : `${o.label} (${o.note})`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {p ? (
                    <p id={err} className="cp-field-error">
                      {p.message}
                    </p>
                  ) : null}
                </fieldset>
              );
            })}
          </fieldset>

          <div className="cp-field">
            <label htmlFor="hinweis" className="cp-label">
              Kurzer Hinweis für die Website <span className="cp-optional">(optional)</span>
            </label>
            <input id="hinweis" name="hinweis" type="text" maxLength={MAX_SPECIAL_TEXT} className="cp-input" defaultValue={input.message ?? ""} aria-describedby="hinweis-hilfe" />
            <p id="hinweis-hilfe" className="cp-help">
              Höchstens {MAX_SPECIAL_TEXT} Zeichen. {PRIVACY_TEXT}
            </p>
          </div>
          <button type="submit" className="cp-btn cp-btn-secondary">
            Vorschau aktualisieren
          </button>
        </form>

        {draft && !draft.ok ? (
          <div className="cp-error" role="alert">
            <p className="cp-alert-text">{draft.blocked.message}</p>
            {draft.blocked.suggestion ? (
              <Link href={draft.blocked.suggestion.href} className="cp-btn cp-btn-secondary">
                {draft.blocked.suggestion.label}
              </Link>
            ) : null}
          </div>
        ) : null}

        {draft && draft.ok && at && changed ? (
          <>
            {unresolved ? (
              <p className="cp-note" role="note">
                {HOLIDAY_UNRESOLVED_TEXT} {draft.after.status !== "UNKNOWN" ? HOLIDAY_RESOLVED_TEXT : null}
              </p>
            ) : null}
            <div className="cp-grid cp-grid-preview" aria-live="polite">
              <section className="cp-panel" aria-labelledby="vorher-title">
                <h2 id="vorher-title" className="cp-h2">
                  Aktuell in der Cockpit-Datenbank
                </h2>
                <p className="cp-muted">{formatGermanDate(date)}</p>
                <StatusStatement puls={resolvePuls({}, at, data)} />
              </section>
              <section className="cp-panel cp-panel-after" aria-labelledby="nachher-title">
                <h2 id="nachher-title" className="cp-h2">
                  Mit dieser Änderung
                </h2>
                <p className="cp-muted">{formatGermanDate(date)}</p>
                <StatusStatement puls={resolvePuls({}, at, changed)} />
              </section>
            </div>
            <section className="cp-panel" aria-labelledby="momente-title">
              <h2 id="momente-title" className="cp-h2">
                Prüfung mit der Statuslogik
              </h2>
              <dl className="cp-acute-points">
                {moments.map((m) => (
                  <div key={m.label}>
                    <dt>
                      {m.label} ({m.time} Uhr)
                    </dt>
                    <dd>
                      bisher {statusWord(m.before.status)} · neu {statusWord(m.after.status)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
            <form method="post" action="/intern/sonderzeiten/veroeffentlichen" className="cp-panel cp-publish">
              <p className="cp-effect">{draft.effect}</p>
              <p className="cp-muted">{STAGING_PUBLISHED.storedNote}</p>
              {editing ? <input type="hidden" name="eintrag" value={editing.id} /> : null}
              <input type="hidden" name="datum" value={date} />
              <input type="hidden" name="art" value={input.mode === "CLOSED" ? "geschlossen" : "geaendert"} />
              {input.mode === "SPECIAL"
                ? record!.intervals.map((iv, i) => (
                    <span key={i} hidden>
                      <input type="hidden" name={`z${i}_von`} value={iv.start} />
                      <input type="hidden" name={`z${i}_bis`} value={iv.end} />
                      <input type="hidden" name={`z${i}_art`} value={iv.consultationType} />
                    </span>
                  ))
                : null}
              <input type="hidden" name="hinweis" value={input.message ?? ""} />
              <input type="hidden" name="fingerprint" value={draft.fingerprint} />
              <button type="submit" className="cp-btn cp-btn-primary">
                {draft.actionLabel}
              </button>
            </form>
          </>
        ) : null}
      </div>
    </CockpitFrame>
  );
}
