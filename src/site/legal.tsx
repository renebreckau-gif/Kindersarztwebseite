// Legal pages (LegalText architecture, content-model.md): one shared shell; the Impressum carries only
// verified facts (Phase 10.0C), the other legal pages stay controlled placeholders.
// No legal text is copied from the old site (F08/F09 are OUTDATED); nothing here claims compliance.

import type { ReactNode } from "react";
import { PageFrame, InternalNote } from "./chrome";
import { PageIntro, Section } from "./blocks";
import u from "./pages.module.css";
import l from "./legal.module.css";
import type { PulsView } from "@/content/puls";
import { PRACTICE, publicAddress } from "@/content/practice";
import { IMPRESSUM_REVIEW_NOTE, PROFESSIONAL_BODIES, PROFESSIONAL_CODE, impressumNumber } from "@/content/impressum";

/** Shared legal shell: legal pages have no hierarchy of their own — one level up is Start. */
export function LegalPage({ title, puls, children }: { title: string; puls: PulsView; children: ReactNode }) {
  return (
    <PageFrame puls={puls}>
      <PageIntro variant="utility" title={title} back={{ href: "/", label: "Start" }} />
      {children}
    </PageFrame>
  );
}

export function LegalPlaceholder({ title, puls, blockers }: { title: string; puls: PulsView; blockers: string }) {
  return (
    <LegalPage title={title} puls={puls}>
      <Section id="text" tone="paper">
        <p className={u.lead}>Dieser Text wird derzeit fachlich geprüft und erscheint hier nach der Freigabe.</p>
        <InternalNote>
          <p>{blockers}</p>
        </InternalNote>
      </Section>
    </LegalPage>
  );
}

/** External link to an official institution: named, keyboard-reachable, no opener / referrer leak. */
function OfficialLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className={l.external} href={href} rel="noopener noreferrer">
      {children}
      <span className={l.host}>{new URL(href).hostname.replace(/^www\./, "")}</span>
    </a>
  );
}

export function ImpressumContent() {
  const addr = publicAddress();
  return (
    <>
      <Section id="praxis" title="Praxis" tone="paper" wide>
        <p className={l.address}>
          {PRACTICE.name.value}
          <br />
          {addr.street ? (
            <>
              {addr.street}
              <br />
            </>
          ) : null}
          {addr.cityLine}
        </p>
        <dl className={l.facts}>
          <div>
            <dt>Telefon</dt>
            <dd>
              <a href={PRACTICE.phone.value.href}>{impressumNumber(PRACTICE.phone.value.display)}</a>
            </dd>
          </div>
          <div>
            <dt>Fax</dt>
            <dd>{impressumNumber(PRACTICE.fax.value)}</dd>
          </div>
          <div>
            <dt>E-Mail</dt>
            <dd>
              <a href={`mailto:${PRACTICE.email.value}`}>{PRACTICE.email.value}</a>
            </dd>
          </div>
        </dl>
      </Section>
      <Section id="berufsrecht" title="Berufsrechtliche Angaben" tone="plaster" wide>
        <dl className={l.facts}>
          {PROFESSIONAL_BODIES.map((b) => (
            <div key={b.fact}>
              <dt>{b.label}</dt>
              <dd>
                <span className={l.body}>{b.name}</span>
                <br />
                {b.street}
                <br />
                {b.cityLine}
                <br />
                <OfficialLink href={b.link.href}>{b.link.text}</OfficialLink>
              </dd>
            </div>
          ))}
          <div>
            <dt>Berufsrechtliche Regelung</dt>
            <dd>
              <span className={l.body}>{PROFESSIONAL_CODE.name}</span>
              <br />
              <OfficialLink href={PROFESSIONAL_CODE.link.href}>{PROFESSIONAL_CODE.link.text}</OfficialLink>
            </dd>
          </div>
        </dl>
        <InternalNote>
          <p>{IMPRESSUM_REVIEW_NOTE}</p>
          <p>
            Offen: F02 Rechtsform/Anbieter, F03 verantwortliche Person(en), F04 gesetzliche Berufsbezeichnungen samt Verleihungsstaat (F23 offen), ob eine zusätzliche Verantwortlichenangabe nach dem
            Medienstaatsvertrag nötig ist, F10 Datenschutz. Nicht übernommen: veraltete Rechtsgrundlagen der alten Seite (F08), alter Datenschutzabsatz (F09), alter Haftungsausschluss. Kein
            Rechtsfreigabe-Status – siehe docs/reviews/impressum-legal-review-2026-11.md.
          </p>
        </InternalNote>
      </Section>
    </>
  );
}
