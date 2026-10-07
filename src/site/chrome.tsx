// Public site chrome: header, mobile dock, footer, page frame, review/internal notes.
// Server components. Critical utility (phone, Notfall, status) works without JavaScript.

import Link from "next/link";
import type { ReactNode } from "react";
import s from "./chrome.module.css";
import { Icon } from "@/design-system/icons";
import { StatusMark } from "@/design-system/components/primitives";
import { PRACTICE, publicAddress } from "@/content/practice";
import { LEGAL, PRIMARY, SITEMAP, type PathKey } from "@/content/site";
import { RELEASE } from "@/content/release";
import type { PulsView } from "@/content/puls";

export function SkipLink() {
  return (
    <a className={s.skip} href="#inhalt">
      Zum Inhalt springen
    </a>
  );
}

/** Compact status for header and dock: one word + mark; UNKNOWN shows no mark. */
export function StatusChip({ puls }: { puls: PulsView }) {
  const v = puls.view;
  return (
    <Link href="/heute" className={s.chip}>
      {v.indicator === "NONE" ? null : <StatusMark indicator={v.indicator} />}
      <span>{v.indicator === "NONE" ? "Sprechzeiten" : v.headline}</span>
    </Link>
  );
}

export function SiteHeader({ current, puls }: { current?: PathKey; puls: PulsView }) {
  return (
    <header className={s.header}>
      <Link className={s.wordmark} href="/">
        <span>Kinderarztpraxis</span>
        <span>Probst &amp; Böhme</span>
      </Link>
      <nav aria-label="Hauptnavigation" className={s.nav}>
        <ul>
          {PRIMARY.map((p) => (
            <li key={p.id}>
              <Link href={p.href} aria-current={current === p.id ? "page" : undefined}>
                {p.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className={s.utilities}>
        <StatusChip puls={puls} />
        <a className={s.call} href={PRACTICE.phone.value.href}>
          <Icon name="phone" size={18} />
          <span>
            Anrufen <span className={s.num}>{PRACTICE.phone.value.display}</span>
          </span>
        </a>
        <Link className={s.emergency} href="/notfall">
          <Icon name="alert" size={18} />
          <span>Notfall</span>
        </Link>
      </div>
    </header>
  );
}

/** Mobile dock: Anrufen · Heute · Notfall · Menü (order fixed). */
export function SiteDock({ puls }: { puls: PulsView }) {
  return (
    <nav aria-label="Schnellzugriff" className={s.dock}>
      <a href={PRACTICE.phone.value.href} className={s.dockCell}>
        <Icon name="phone" />
        <span>Anrufen</span>
      </a>
      <Link href="/heute" className={s.dockCell}>
        <span className={s.dockToday}>
          <Icon name="today" />
          <span className={s.dockMark}>
            <StatusMark indicator={puls.view.indicator} inverse />
          </span>
        </span>
        <span>Heute</span>
      </Link>
      <Link href="/notfall" className={`${s.dockCell} ${s.dockEmergency}`}>
        <Icon name="alert" />
        <span>Notfall</span>
      </Link>
      <a href="#menue" className={s.dockCell}>
        <Icon name="menu" />
        <span>Menü</span>
      </a>
    </nav>
  );
}

export function SiteFooter() {
  const addr = publicAddress();
  return (
    <footer className={s.footer} id="menue">
      <div className={s.footerInner}>
        <div className={s.footerContact}>
          <p className={s.footerName}>
            Kinderarztpraxis
            <br />
            Probst &amp; Böhme
          </p>
          <p>
            {addr.street ? (
              <>
                {addr.street}
                <br />
              </>
            ) : null}
            {addr.cityLine}
          </p>
          <p>
            <a href={PRACTICE.phone.value.href} className={s.footerPhone}>
              {PRACTICE.phone.value.display}
            </a>
          </p>
          <p className={s.footer112}>
            Bei Lebensgefahr: <a href="tel:112">112</a>
          </p>
        </div>
        <nav aria-label="Seitenübersicht" className={s.footerNav}>
          <h2 className={s.footerHeading}>Menü</h2>
          <div className={s.footerCols}>
            {SITEMAP.map((g) => (
              <div key={g.href}>
                <Link href={g.href} className={s.footerGroup}>
                  {g.label}
                </Link>
                <ul>
                  {g.children.map((c) => (
                    <li key={c.href}>
                      <Link href={c.href}>{c.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>
      </div>
      <p className={s.footerLegal}>
        {LEGAL.map((l) => (
          <Link key={l.href} href={l.href}>
            {l.label}
          </Link>
        ))}
      </p>
    </footer>
  );
}

/** Internal, pre-launch note: what is withheld and why. Visually unmistakable, never a fact. */
export function InternalNote({ children }: { children: ReactNode }) {
  if (!RELEASE.showInternalNotes) return null;
  return (
    <aside className={s.internal} aria-label="Interner Hinweis">
      <span className={s.internalTag}>Intern · Freigabe ausstehend</span>
      <div>{children}</div>
    </aside>
  );
}

export function PreviewBanner({ puls }: { puls: PulsView }) {
  if (puls.mode !== "PREVIEW") return null;
  return (
    <p className={s.preview} role="note">
      Vorschau: Praxisfreigabe simuliert. Status und Personen werden zur Prüfung angezeigt und sind keine veröffentlichten Angaben.
    </p>
  );
}

/** Standard frame for every page except the start page (which keeps the approved hero chrome). */
export function PageFrame({ current, puls, children, tone = "paper" }: { current?: PathKey; puls: PulsView; children: ReactNode; tone?: "paper" | "night" }) {
  return (
    <div className={`${s.page} ${tone === "night" ? s.night : ""}`}>
      <SkipLink />
      <PreviewBanner puls={puls} />
      <SiteHeader current={current} puls={puls} />
      <SiteDock puls={puls} />
      <main id="inhalt" className={s.main}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
