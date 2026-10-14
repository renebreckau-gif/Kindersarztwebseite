// Shared parts of the real today workflows: preview pair, block message, publish form.
// Both preview sides come from the same engine via the public mapping (resolvePuls) — no status
// logic here.

import Link from "next/link";
import type { ReactNode } from "react";
import { resolvePuls } from "@/content/puls";
import { applyChangeSet } from "@/domain/operations";
import type { PulsData } from "@/domain/practice-status";
import type { Draft } from "@/cockpit/workflows/types";
import { STAGING_PUBLISHED } from "@/cockpit/workflows/wording";
import { STALE_MESSAGE } from "@/cockpit/workflows/publish";
import { StatusStatement } from "@/site/blocks";

export function StatusNotice({ status }: { status?: string }) {
  if (status === "veraltet") {
    return (
      <p className="cp-error" role="alert">
        {STALE_MESSAGE} Unten sehen Sie den aktuellen Stand.
      </p>
    );
  }
  if (status === "fehlgeschlagen") {
    return (
      <p className="cp-error" role="alert">
        Die Änderung konnte nicht gespeichert werden. Es wurde nichts verändert.
      </p>
    );
  }
  return null;
}

export function PreviewPair({ data, draft, now, existingLabel }: { data: PulsData; draft: Draft; now: Date; existingLabel?: string }) {
  const before = resolvePuls({}, now, data);
  const after = draft.ok ? resolvePuls({}, now, applyChangeSet(data, draft.changeSet)) : null;
  return (
    <div className="cp-grid cp-grid-preview" aria-live="polite">
      <section className="cp-panel" aria-labelledby="vorher-title">
        <h2 id="vorher-title" className="cp-h2">
          {existingLabel ?? "Aktuell in der Cockpit-Datenbank"}
        </h2>
        <StatusStatement puls={before} />
      </section>
      <section className="cp-panel cp-panel-after" aria-labelledby="nachher-title">
        <h2 id="nachher-title" className="cp-h2">
          Mit dieser Änderung
        </h2>
        {after ? <StatusStatement puls={after} /> : <p className="cp-muted">Keine Änderung – siehe Hinweis oben.</p>}
      </section>
    </div>
  );
}

export function BlockedMessage({ draft }: { draft: Draft }) {
  if (draft.ok) return null;
  return (
    <div className="cp-error" role="alert">
      <p className="cp-alert-text">{draft.blocked.message}</p>
      {draft.blocked.suggestion ? (
        <Link href={draft.blocked.suggestion.href} className="cp-btn cp-btn-secondary">
          {draft.blocked.suggestion.label}
        </Link>
      ) : null}
    </div>
  );
}

export function PublishForm({ draft, hidden }: { draft: Draft; hidden: ReactNode }) {
  if (!draft.ok) return null;
  return (
    <form method="post" action="/intern/heute/veroeffentlichen" className="cp-panel cp-publish">
      {draft.mode === "SUPERSEDE" && draft.supersedes?.length ? (
        <dl className="cp-replace">
          <div>
            <dt>Bestehend</dt>
            <dd>
              {draft.supersedes.map((s) => s.label).join(", ")} – wird archiviert, nicht gelöscht; im Verlauf bleibt sie erhalten
            </dd>
          </div>
          <div>
            <dt>Neu</dt>
            <dd>{draft.kind === "CLOSED_TODAY" ? "Heute geschlossen" : "Verkürzte Sprechzeit für heute"}</dd>
          </div>
        </dl>
      ) : null}
      <p className="cp-effect">{draft.effect}</p>
      <p className="cp-muted">{STAGING_PUBLISHED.storedNote}</p>
      {hidden}
      <input type="hidden" name="fingerprint" value={draft.fingerprint} />
      <button type="submit" className="cp-btn cp-btn-primary">
        {draft.actionLabel}
      </button>
    </form>
  );
}
