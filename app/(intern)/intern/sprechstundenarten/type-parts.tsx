// Shared parts of the Sprechstundenarten pages (Phase 09.5J). Status always in words (never colour only);
// the internal code is secondary technical context — parents only ever see the label.

import type { TypeItem } from "@/cockpit/workflows/consultation-type";
import { TYPE_STATE_TEXT, type TypeStatus } from "@/domain/consultation-types";
import { formatDayMonth } from "@/domain/time";

export function TypeStatusLine({ status }: { status?: TypeStatus }) {
  if (!status) return <p className="cp-dir-status cp-dir-attention">Nicht angelegt</p>;
  const ok = status.state === "CURRENT";
  const text = ok && status.reviewDue ? `Bestätigt bis ${formatDayMonth(status.reviewDue, true)}` : TYPE_STATE_TEXT[status.state];
  return (
    <>
      <p className={ok ? "cp-ok cp-dir-status" : "cp-dir-status cp-dir-attention"}>{text}</p>
      {status.lastVerified && status.state !== "UNCONFIRMED" ? (
        <p className="cp-muted">
          {`Zuletzt ärztlich bestätigt${status.verifiedBy ? ` von ${status.verifiedBy.split(",")[0]}` : ""} am ${formatDayMonth(status.lastVerified, true)}`}
          {status.reviewDue && !ok ? ` · erneut prüfen bis ${formatDayMonth(status.reviewDue, true)}` : ""}
        </p>
      ) : null}
    </>
  );
}

export function TypeUsage({ item }: { item: TypeItem }) {
  if (!item.usedByWeeklyRules && !item.usedBySpecialHours) return <p className="cp-muted">Derzeit nicht im Wochenplan verwendet.</p>;
  return (
    <>
      {item.usedByWeeklyRules ? (
        <p className="cp-muted">{item.weeklyUsage.length ? `Im Wochenplan: ${item.weeklyUsage.join("; ")}` : "Im Wochenplan verwendet."}</p>
      ) : null}
      {item.usedBySpecialHours ? <p className="cp-muted">Wird in Sonderöffnungszeiten verwendet.</p> : null}
    </>
  );
}
