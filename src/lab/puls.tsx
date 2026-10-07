// Inline PRAXIS PULS statement: one status, one detail, one primary action.
// Server component. Variants only change typography, never the content.

import s from "./puls.module.css";
import { StatusDot, Icon } from "./chrome";
import { PHONE_DISPLAY, type PulsFixture } from "./fixtures";

export function PulsStatement({ puls, variant }: { puls: PulsFixture; variant: "a" | "b" | "c" }) {
  const isUnknown = puls.status === "unknown";
  return (
    <section id="heute" className={`${s.puls} ${s[variant]}`} aria-labelledby="puls-title" data-status={puls.status}>
      <p className={s.meta}>
        <StatusDot status={puls.status} />
        <span>{isUnknown ? "Praxis Puls" : "Heute"}</span>
        <span className={s.demo}>Demo-Daten</span>
      </p>
      <h1 id="puls-title" className={s.title}>
        {puls.title}
      </h1>
      <p className={s.detail}>
        {puls.detailHref ? <a href={puls.detailHref}>{puls.detail}</a> : puls.detail}
      </p>
      <p className={s.actions}>
        <a
          href={puls.action.href}
          className={`${s.action} ${puls.action.kind === "emergency" ? s.actionEmergency : ""}`}
        >
          {puls.action.kind === "call" ? <Icon name="phone" /> : null}
          {puls.action.kind === "emergency" ? <Icon name="alert" /> : null}
          <span>{puls.action.label}</span>
          {puls.action.kind === "call" ? <span className={s.num}>{PHONE_DISPLAY}</span> : null}
        </a>
      </p>
    </section>
  );
}
