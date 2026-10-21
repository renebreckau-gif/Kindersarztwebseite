// Shared parts of the Vertretungspraxen pages (Phase 09.5G): status line, the ADMIN form with its
// AKTUELL / NACH DER ÄNDERUNG preview. Status always in words. No contact-person names are shown.

import Link from "next/link";
import type { ReplacementPractice } from "@/domain/content-types";
import { FIELD_LABEL, REPLACEMENT_LIMITS, safeWebsite, type FieldProblem, type ReplacementInput } from "@/domain/replacement";
import type { ReplacementDirectoryItem, ReplacementDraft } from "@/cockpit/workflows/replacement";
import { formatDayMonth } from "@/domain/time";

const FIELDS: { key: keyof ReplacementInput; param: string; type?: string; optional?: boolean; autoComplete?: string }[] = [
  { key: "practiceName", param: "name", autoComplete: "organization" },
  { key: "street", param: "strasse", autoComplete: "street-address" },
  { key: "postalCode", param: "plz", autoComplete: "postal-code" },
  { key: "city", param: "ort", autoComplete: "address-level2" },
  { key: "phone", param: "telefon", type: "tel", autoComplete: "tel" },
  { key: "email", param: "email", type: "email", optional: true, autoComplete: "email" },
  { key: "website", param: "webseite", type: "url", optional: true, autoComplete: "url" },
  { key: "publicNote", param: "hinweis", optional: true },
];

export function StatusLine({ item }: { item: ReplacementDirectoryItem }) {
  return (
    <p className={item.usable ? "cp-ok cp-dir-status" : "cp-dir-status cp-dir-attention"}>
      <span>{item.statusLabel}</span>
      {item.lastVerified && !item.usable && item.freshness === "REVIEW_EXPIRED" ? <span className="cp-muted"> · zuletzt bestätigt am {formatDayMonth(item.lastVerified, true)}</span> : null}
    </p>
  );
}

/** The stored data, read-only (what a physician confirms). */
export function StoredData({ p }: { p: ReplacementPractice }) {
  const web = safeWebsite(p.website);
  return (
    <dl className="cp-facts cp-dir-data">
      <div>
        <dt>Praxisname</dt>
        <dd>{p.practiceName}</dd>
      </div>
      <div>
        <dt>Adresse</dt>
        <dd>
          {p.street}, {p.postalCode} {p.city}
        </dd>
      </div>
      <div>
        <dt>Telefon</dt>
        <dd>
          <a href={`tel:${p.phone.replace(/[^0-9+]/g, "")}`} className="cp-text-link">
            {p.phone}
          </a>
        </dd>
      </div>
      {p.email ? (
        <div>
          <dt>E-Mail</dt>
          <dd>{p.email}</dd>
        </div>
      ) : null}
      {p.website ? (
        <div>
          <dt>Webseite</dt>
          <dd>
            {web ? (
              <a href={web} className="cp-text-link" rel="noopener noreferrer" target="_blank">
                {p.website}
                <span className="cp-sr"> (öffnet in neuem Fenster)</span>
              </a>
            ) : (
              p.website
            )}
          </dd>
        </div>
      ) : null}
      {p.publicNote ? (
        <div>
          <dt>Öffentlicher Hinweis</dt>
          <dd>{p.publicNote}</dd>
        </div>
      ) : null}
    </dl>
  );
}

/** ADMIN form (GET → preview). Values come from the query or the stored record. */
export function ReplacementForm({ action, values, problems }: { action: string; values: Partial<ReplacementInput>; problems: FieldProblem[] }) {
  return (
    <form method="get" action={action} className="cp-panel cp-form" noValidate>
      <input type="hidden" name="vorschau" value="1" />
      {FIELDS.map((f) => {
        const p = problems.find((x) => x.field === f.key);
        const err = p ? `${f.param}-fehler` : undefined;
        const limit = (REPLACEMENT_LIMITS as Record<string, number>)[f.key];
        return (
          <div key={f.key} className="cp-field">
            <label htmlFor={f.param} className="cp-label">
              {FIELD_LABEL[f.key]}
              {f.optional ? <span className="cp-optional"> (optional)</span> : null}
            </label>
            <input
              id={f.param}
              name={f.param}
              type={f.type ?? "text"}
              className="cp-input"
              defaultValue={values[f.key] ?? ""}
              maxLength={limit}
              autoComplete={f.autoComplete}
              aria-invalid={p ? true : undefined}
              aria-describedby={[err, f.key === "publicNote" ? "hinweis-hilfe" : undefined].filter(Boolean).join(" ") || undefined}
            />
            {f.key === "publicNote" ? (
              <p id="hinweis-hilfe" className="cp-help">
                Höchstens {REPLACEMENT_LIMITS.publicNote} Zeichen, zum Beispiel eine Bitte zur Kontaktaufnahme. Keine Patientendaten.
              </p>
            ) : null}
            {p ? (
              <p id={err} className="cp-field-error">
                {p.message}
              </p>
            ) : null}
          </div>
        );
      })}
      <button type="submit" className="cp-btn cp-btn-secondary">
        Vorschau anzeigen
      </button>
    </form>
  );
}

/** AKTUELL vs NACH DER ÄNDERUNG + the POST (ADMIN). */
export function ChangePreview({ draft, current, recordId, fingerprint }: { draft: Extract<ReplacementDraft, { ok: true }>; current?: ReplacementPractice; recordId?: string; fingerprint?: string }) {
  const changed = new Set(draft.changes.map((c) => c.field));
  return (
    <>
      <section className="cp-panel" aria-labelledby="vergleich-title">
        <h2 id="vergleich-title" className="cp-h2">
          {current ? "Änderung prüfen" : "Neue Vertretungspraxis prüfen"}
        </h2>
        <table className="cp-changes cp-dir-changes">
          <caption className="cp-sr">Angaben {current ? "aktuell und nach der Änderung" : "der neuen Vertretungspraxis"}</caption>
          <thead>
            <tr>
              <th scope="col">Angabe</th>
              {current ? <th scope="col">Aktuell</th> : null}
              <th scope="col">{current ? "Nach der Änderung" : "Neu"}</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(FIELD_LABEL) as (keyof ReplacementInput)[]).map((f) =>
              current || draft.input[f] ? (
                <tr key={f} className={changed.has(f) && current ? "cp-dir-changed" : undefined}>
                  <th scope="row">
                    {FIELD_LABEL[f]}
                    {changed.has(f) && current ? <span className="cp-badge">geändert</span> : null}
                  </th>
                  {current ? <td>{(current[f] as string | undefined) || "–"}</td> : null}
                  <td>{draft.input[f] || "–"}</td>
                </tr>
              ) : null,
            )}
          </tbody>
        </table>
      </section>
      <form method="post" action="/intern/vertretungen/speichern" className="cp-panel cp-publish">
        <p className="cp-effect">
          {current
            ? draft.invalidates
              ? "Nach dieser Änderung muss die Vertretungspraxis erneut ärztlich bestätigt werden."
              : "Die Vertretungspraxis muss vor der Verwendung ärztlich bestätigt werden."
            : "Vor der Verwendung muss die Vertretungspraxis ärztlich bestätigt werden."}
        </p>
        {recordId ? <input type="hidden" name="eintrag" value={recordId} /> : null}
        {fingerprint ? <input type="hidden" name="fingerprint" value={fingerprint} /> : null}
        {FIELDS.map((f) => (
          <input key={f.key} type="hidden" name={f.param} value={draft.input[f.key] ?? ""} />
        ))}
        <button type="submit" className="cp-btn cp-btn-primary">
          {current ? "Änderung speichern" : "Vertretungspraxis anlegen"}
        </button>
      </form>
    </>
  );
}

export const backToList = (
  <Link href="/intern/vertretungen" className="cp-back">
    Zu den Vertretungspraxen
  </Link>
);
