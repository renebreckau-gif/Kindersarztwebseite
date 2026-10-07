// Shared building blocks for the page families (utility, editorial, growth, guidance,
// discovery). Server components; all facts come from src/content.

import Link from "next/link";
import type { ReactNode } from "react";
import s from "./blocks.module.css";
import { Icon } from "@/design-system/icons";
import { StatusMark } from "@/design-system/components/primitives";
import { PRACTICE } from "@/content/practice";
import { SOURCES, OFFICIAL_SOURCES_CHECKED, type SourceId } from "@/content/sources";
import { AGES, type AgeRange } from "@/content/site";
import { WEEKDAYS, slotsFor, blocksFor, type DaySlot } from "@/content/schedule";
import type { PulsView } from "@/content/puls";
import type { IsoWeekday } from "@/domain/time.ts";

const deDate = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;

// ---------------------------------------------------------------- page intro

export function PageIntro({
  title,
  lede,
  back,
  variant = "editorial",
  children,
}: {
  title: string;
  lede?: string;
  back?: { href: string; label: string };
  variant?: "utility" | "editorial" | "growth" | "guidance" | "discovery";
  children?: ReactNode;
}) {
  return (
    <header className={`${s.intro} ${s[`intro-${variant}`]}`}>
      <div className={s.introText}>
        {back ? (
          <p className={s.back}>
            <Link href={back.href}>
              <Icon name="back" size={16} />
              {back.label}
            </Link>
          </p>
        ) : null}
        <h1>{title}</h1>
        {lede ? <p className={s.lede}>{lede}</p> : null}
      </div>
      {children ? <div className={s.introAside}>{children}</div> : null}
    </header>
  );
}

export function Section({ title, id, children, tone, wide }: { title?: string; id?: string; children: ReactNode; tone?: "plaster" | "paper" | "sun"; wide?: boolean }) {
  return (
    <section id={id} className={`${s.section} ${tone ? s[`tone-${tone}`] : ""} ${wide ? s.wide : ""}`} aria-labelledby={title && id ? `${id}-t` : undefined}>
      <div className={s.sectionInner}>
        {title ? (
          <h2 id={id ? `${id}-t` : undefined} className={s.h2}>
            {title}
          </h2>
        ) : null}
        {children}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- utility

export function CallAction({ label = "Anrufen" }: { label?: string }) {
  return (
    <a className={s.call} href={PRACTICE.phone.value.href}>
      <Icon name="phone" size={20} />
      <span>
        {label} <span className={s.num}>{PRACTICE.phone.value.display}</span>
      </span>
    </a>
  );
}

export function EmergencyLink() {
  return (
    <Link className={s.emergencyLink} href="/notfall">
      <Icon name="alert" size={20} />
      <span>Notfall</span>
    </Link>
  );
}

/** Large status statement (Heute page): the engine's words, mark + text, never colour alone. */
export function StatusStatement({ puls }: { puls: PulsView }) {
  const r = puls.result;
  return (
    <div className={s.statement} data-indicator={r.indicator}>
      <p className={s.statementState}>
        {r.indicator === "NONE" ? null : (
          <span className={s.statementMark}>
            <StatusMark indicator={r.indicator} />
          </span>
        )}
        <span>{r.headline}</span>
      </p>
      <p className={s.statementDetail}>{r.detail}</p>
      {puls.view.reason ? <p className={s.statementNext}>{puls.view.reason}</p> : null}
      {r.nextOpening && !r.detail.includes(r.nextOpening.label.replace(/^(heute|morgen|am) /, "")) ? <p className={s.statementNext}>Nächste Sprechzeit {r.nextOpening.label}</p> : null}
    </div>
  );
}

const TYPE_CLASS: Record<string, string> = { GENERAL: s.slotGeneral, HEALTHY_ONLY: s.slotHealthy, APPOINTMENT: s.slotAppointment };
const AXIS = { from: 7, to: 18 };
const pos = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (((h + m / 60 - AXIS.from) / (AXIS.to - AXIS.from)) * 100).toFixed(2);
};

/** Day ruler: one weekday's verified hours on a 07–18 measuring axis, plus readable text. */
export function DayRuler({ weekday, caption, nowMinutes }: { weekday: IsoWeekday; caption?: string; nowMinutes?: number }) {
  const slots = slotsFor(weekday);
  return (
    <figure className={s.ruler}>
      {caption ? <figcaption className={s.rulerCaption}>{caption}</figcaption> : null}
      <div className={s.rulerTrack} aria-hidden="true">
        {Array.from({ length: (AXIS.to - AXIS.from) * 2 + 1 }, (_, i) => (
          <span key={i} className={i % 2 === 0 ? s.tickMajor : s.tick} style={{ left: `${(i / ((AXIS.to - AXIS.from) * 2)) * 100}%` }}>
            {i % 4 === 0 ? <span className={s.tickLabel}>{AXIS.from + i / 2}</span> : null}
          </span>
        ))}
        {slots.map((x) => (
          <span key={x.start} className={`${s.slot} ${TYPE_CLASS[x.type] ?? ""}`} style={{ left: `${pos(x.start)}%`, width: `${Number(pos(x.end)) - Number(pos(x.start))}%` }} />
        ))}
        {nowMinutes !== undefined && nowMinutes >= AXIS.from * 60 && nowMinutes <= AXIS.to * 60 ? (
          <span className={s.now} style={{ left: `${(((nowMinutes / 60 - AXIS.from) / (AXIS.to - AXIS.from)) * 100).toFixed(2)}%` }} />
        ) : null}
      </div>
      <SlotList slots={slots} />
    </figure>
  );
}

function SlotList({ slots }: { slots: DaySlot[] }) {
  return (
    <ul className={s.slotList}>
      {slots.map((x) => (
        <li key={x.start}>
          <span className={s.time}>
            {x.start}–{x.end}
          </span>
          {x.type !== "GENERAL" ? <span className={`${s.typeTag} ${TYPE_CLASS[x.type] ?? ""}`}>{x.label}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/** Week view: verified Monday–Friday hours. Days without verified data are not listed (absence is not a claim). */
export function WeekHours({ today }: { today?: IsoWeekday }) {
  return (
    <div className={s.week}>
      {WEEKDAYS.map((d) => (
        <div key={d.id} className={s.weekRow} data-today={today === d.id ? "" : undefined}>
          <p className={s.weekDay}>
            {d.name}
            {today === d.id ? <span className={s.todayTag}>heute</span> : null}
          </p>
          <p className={s.weekBlocks}>
            {blocksFor(d.id).map((b) => (
              <span key={b.start} className={s.time}>
                {b.start}–{b.end}
              </span>
            ))}
          </p>
          <ul className={s.weekNotes}>
            {slotsFor(d.id)
              .filter((x) => x.type !== "GENERAL")
              .map((x) => (
                <li key={x.start}>
                  <span className={`${s.typeTag} ${TYPE_CLASS[x.type] ?? ""}`}>{x.label}</span> {x.start}–{x.end}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- growth

export function GrowthScale({ ages = AGES, compact = false, current }: { ages?: AgeRange[]; compact?: boolean; current?: string }) {
  return (
    <ol className={`${s.growth} ${compact ? s.growthCompact : ""}`}>
      {ages.map((a) => (
        <li key={a.id} style={{ ["--h" as string]: a.scale }}>
          <Link href={`/mein-kind/${a.slug}`} className={s.growthLink} aria-current={current === a.id ? "page" : undefined}>
            <span className={s.growthBar} aria-hidden="true" />
            <span className={s.growthNum}>{a.label}</span>
            <span className={s.growthUnit}>Jahre</span>
            <span className={s.growthName}>{a.name}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------- lists

export function BigLinks({ items, numbered = false }: { items: { label: string; text?: string; href: string }[]; numbered?: boolean }) {
  return (
    <ul className={s.bigLinks}>
      {items.map((it, i) => (
        <li key={it.href + it.label}>
          <Link href={it.href} className={s.bigLink}>
            {numbered ? <span className={s.bigIndex}>{String(i + 1).padStart(2, "0")}</span> : null}
            <span className={s.bigLabel}>{it.label}</span>
            {it.text ? <span className={s.bigText}>{it.text}</span> : null}
            <span className={s.bigArrow} aria-hidden="true">
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Steps({ steps }: { steps: { title: string; body: ReactNode }[] }) {
  return (
    <ol className={s.steps}>
      {steps.map((st, i) => (
        <li key={st.title}>
          <span className={s.stepDot} aria-hidden="true">
            {i + 1}
          </span>
          <h3>{st.title}</h3>
          <div className={s.stepBody}>{st.body}</div>
        </li>
      ))}
    </ol>
  );
}

export function SourceList({ ids, title = "Offizielle Quellen" }: { ids: SourceId[]; title?: string }) {
  return (
    <div className={s.sources}>
      <h2 className={s.sourcesTitle}>{title}</h2>
      <ul>
        {ids.map((id) => {
          const src = SOURCES[id];
          return (
            <li key={id}>
              <a href={"url" in src ? src.url : undefined} rel="noopener" className={s.sourceLink}>
                <span className={s.sourceTitle}>{src.title}</span>
                <span className={s.sourcePublisher}>{src.publisher}</span>
              </a>
            </li>
          );
        })}
      </ul>
      <p className={s.stand}>Quellen geprüft am {deDate(OFFICIAL_SOURCES_CHECKED)}. Externe Seiten öffnen die Angebote der genannten Institutionen.</p>
    </div>
  );
}

/** Intentional placeholder: "real approved media goes here later". Never a fake photo. */
export function PlaceholderFrame({ label, shape = "arch" }: { label: string; shape?: "arch" | "portrait" }) {
  return (
    <figure className={`${s.placeholder} ${shape === "portrait" ? s.placeholderPortrait : ""}`}>
      <span className={s.placeholderGlyph} aria-hidden="true" />
      <figcaption>
        <span className={s.placeholderBadge}>Platzhalter</span>
        {label}
      </figcaption>
    </figure>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className={s.prose}>{children}</div>;
}
