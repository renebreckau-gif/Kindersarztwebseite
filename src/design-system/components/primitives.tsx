// Core primitives: actions, links, status marks, PRAXIS PULS forms.
// Server components (no client JS). Content comes from props / demo fixtures.

import type { ReactNode } from "react";
import s from "./primitives.module.css";
import { Icon, type IconName } from "../icons";
import { DEMO_PHONE, type DemoPuls, type Indicator } from "../demo-fixtures";

// ------------------------------------------------------------- actions

export type ActionVariant = "primary" | "secondary" | "quiet" | "emergency";

export function Action({
  href,
  variant = "primary",
  icon,
  children,
  meta,
  forceState,
  size = "md",
}: {
  href: string;
  variant?: ActionVariant;
  icon?: IconName;
  children: ReactNode;
  /** Secondary information inside the action, e.g. the phone number. */
  meta?: string;
  /** Design-system only: render a static hover/focus/press state for documentation. */
  forceState?: "hover" | "focus" | "press";
  size?: "md" | "sm";
}) {
  const cls = [s.action, s[variant], size === "sm" ? s.sm : "", forceState ? s[`is-${forceState}`] : ""].join(" ");
  return (
    <a href={href} className={cls}>
      {icon ? <Icon name={icon} size={20} /> : null}
      <span className={s.actionLabel}>{children}</span>
      {meta ? <span className={s.actionMeta}>{meta}</span> : null}
    </a>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className={s.textLink}>
      {children}
    </a>
  );
}

export function DemoTag({ children = "Demo" }: { children?: ReactNode }) {
  return <span className={s.demoTag}>{children}</span>;
}

// ------------------------------------------------------------- status

/** Status mark: shape carries meaning, colour reinforces. NONE renders nothing. */
export function StatusMark({ indicator, inverse = false }: { indicator: Indicator; inverse?: boolean }) {
  if (indicator === "NONE") return null;
  const map: Record<Exclude<Indicator, "NONE">, string> = {
    OPEN: s.markOpen,
    NEUTRAL: s.markNeutral,
    ATTENTION: s.markAttention,
    CLOSURE: s.markClosure,
  };
  return <span className={`${s.mark} ${map[indicator]} ${inverse ? s.markInverse : ""}`} aria-hidden="true" />;
}

const ACTION_ICON: Record<DemoPuls["action"]["kind"], IconName | undefined> = {
  call: "phone",
  hours: "today",
  replacement: "route",
  details: undefined,
  emergency: "alert",
};

/** Header / utility-line form: one word + one time. */
export function PulsChip({ puls, demo = true }: { puls: DemoPuls; demo?: boolean }) {
  if (puls.indicator === "NONE") {
    return (
      <a href="#sprechzeiten" className={`${s.chip} ${s.chipUnknown}`}>
        Sprechzeiten
      </a>
    );
  }
  return (
    <a href="#heute" className={s.chip}>
      <StatusMark indicator={puls.indicator} />
      <span className={s.chipWord}>{puls.chip}</span>
      {puls.chipTime ? <span className={s.chipTime}>{puls.chipTime}</span> : null}
      {demo ? <DemoTag /> : null}
    </a>
  );
}

/** Inline form on content pages (e.g. Heute, Sprechzeiten). */
export function PulsInline({ puls, headingLevel = 3 }: { puls: DemoPuls; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className={`${s.inline} ${s[`ind-${puls.indicator}`]}`}>
      <p className={s.inlineMeta}>
        <StatusMark indicator={puls.indicator} />
        <span>{puls.indicator === "NONE" ? "Praxis Puls" : "Heute"}</span>
        <DemoTag />
      </p>
      <H className={s.inlineHeadline}>{puls.headline}</H>
      <p className={s.inlineDetail}>{puls.detail}</p>
      {puls.reason ? <p className={s.inlineReason}>{puls.reason}</p> : null}
      <p className={s.inlineActions}>
        <Action
          href="#"
          size="sm"
          variant={puls.action.kind === "emergency" ? "emergency" : puls.indicator === "NONE" ? "secondary" : "primary"}
          icon={ACTION_ICON[puls.action.kind]}
        >
          {puls.action.label}
        </Action>
        {puls.secondary ? (
          <Action href="#" size="sm" variant="quiet" icon={ACTION_ICON[puls.secondary.kind]}>
            {puls.secondary.label}
          </Action>
        ) : null}
      </p>
    </div>
  );
}

/** First-viewport form: the status statement is the typographic hero. */
export function PulsHero({ puls, id = "heute" }: { puls: DemoPuls; id?: string }) {
  const primaryVariant: ActionVariant = puls.action.kind === "emergency" ? "emergency" : puls.indicator === "NONE" ? "secondary" : "primary";
  return (
    <section className={`${s.hero} ${s[`ind-${puls.indicator}`]}`} id={id} aria-labelledby={`${id}-title`}>
      <p className={s.heroMeta}>
        <StatusMark indicator={puls.indicator} />
        <span>{puls.indicator === "NONE" ? "Praxis Puls" : "Heute"}</span>
        <DemoTag>Demo-Daten</DemoTag>
      </p>
      <h2 id={`${id}-title`} className={s.heroHeadline}>
        {puls.headline}
      </h2>
      <p className={s.heroDetail}>{puls.detail}</p>
      {puls.reason ? <p className={s.heroReason}>{puls.reason}</p> : null}
      <p className={s.heroActions}>
        <Action
          href={puls.action.kind === "call" ? DEMO_PHONE.href : "#"}
          variant={primaryVariant}
          icon={ACTION_ICON[puls.action.kind]}
          meta={puls.action.kind === "call" ? DEMO_PHONE.display : undefined}
        >
          {puls.action.label}
        </Action>
        {puls.secondary ? (
          <Action href="#" variant="quiet" icon={ACTION_ICON[puls.secondary.kind]}>
            {puls.secondary.label}
          </Action>
        ) : null}
      </p>
    </section>
  );
}
