"use client";

// Shared building blocks for the Praxis Cockpit prototype (German UI, paper / ink / cobalt).

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import s from "./cockpit.module.css";
import { StatusStatement } from "@/site/blocks";
import { StatusMark } from "@/design-system/components/primitives";
import type { PracticeStatusResult } from "@/domain/practice-status";
import type { PulsView } from "@/content/puls";
import type { Announcement } from "@/domain/content-types";
import { useCockpit } from "./store";
import { MOCK_NOW, MOCK_TODAY, ROLES, cutAt, dayMonth, entryVerification, longDate, plannedSegments, typeLabel, unknownExplanation, type Problem, type Role } from "./model";

// ------------------------------------------------------------------ icons (one stroke family)

type CIcon = "chevron" | "back" | "check" | "attention" | "undo" | "eye" | "clock";

export function Glyph({ name, size = 20 }: { name: CIcon; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, focusable: false };
  switch (name) {
    case "chevron":
      return <svg {...p}><path d="M9 5l7 7-7 7" /></svg>;
    case "back":
      return <svg {...p}><path d="M15 5l-7 7 7 7" /></svg>;
    case "check":
      return <svg {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
    case "attention":
      return <svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5.5M12 16.4v.1" /></svg>;
    case "undo":
      return <svg {...p}><path d="M9 7L5 11l4 4" /><path d="M5 11h9a5 5 0 010 10h-3" /></svg>;
    case "eye":
      return <svg {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></svg>;
    case "clock":
      return <svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>;
  }
}

// ------------------------------------------------------------------ shell

const NAV = [
  { href: "/lab/praxis-cockpit", label: "Start" },
  { href: "/lab/praxis-cockpit/website", label: "Website-Vorschau" },
  { href: "/lab/praxis-cockpit/verlauf", label: "Verlauf" },
];

export const LOGIN_PATH = "/lab/praxis-cockpit/anmelden";
export const PARENT_PATH = "/lab/praxis-cockpit/elternansicht";

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { state, signedIn, signOut } = useCockpit();
  const who = ROLES[state.role];
  const isLogin = path.startsWith(LOGIN_PATH);
  const current = (href: string) => (href === "/lab/praxis-cockpit" ? path === href : path.startsWith(href));

  // Prototype gate only: no real authentication, the session holds just the mock role.
  useEffect(() => {
    if (!isLogin && signedIn === false) router.replace(LOGIN_PATH);
  }, [isLogin, signedIn, router]);

  if (isLogin) return <>{children}</>;
  if (!signedIn) {
    return (
      <div className={s.app}>
        <p className={s.gate} role="status">
          {signedIn === null ? "Wird geladen …" : "Bitte anmelden …"}
        </p>
      </div>
    );
  }

  if (path.startsWith(PARENT_PATH)) {
    return (
      <div className={s.app}>
        <a className="skip-link" href="#inhalt">
          Zum Inhalt
        </a>
        <div className={s.labBar}>
          <p>
            <strong>Elternansicht</strong> · PROTOTYP · Testdaten, so würde die Website aussehen
          </p>
          <Link href="/lab/praxis-cockpit" className={s.btnQuiet}>
            <Glyph name="back" size={18} />
            Zurück zum Cockpit
          </Link>
        </div>
        <main id="inhalt" className={s.parentMain} tabIndex={-1}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className={s.app}>
      <a className="skip-link" href="#inhalt">
        Zum Inhalt
      </a>
      <header className={s.header}>
        <div className={s.headerRow}>
          <Link href="/lab/praxis-cockpit" className={s.wordmark}>
            Praxis Cockpit
          </Link>
          <p className={s.proto}>PROTOTYP · keine echten Daten</p>
          <div className={s.account}>
            <p className={s.user}>
              <span className={s.userName}>{who.person}</span>
              <span className={s.userRole}>{who.label}</span>
            </p>
            <button
              type="button"
              className={s.btnQuiet}
              onClick={() => {
                signOut();
                router.push(LOGIN_PATH);
              }}
            >
              Abmelden
            </button>
          </div>
        </div>
        <nav className={s.nav} aria-label="Cockpit">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={s.navLink} aria-current={current(n.href) ? "page" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main id="inhalt" className={s.main} tabIndex={-1}>
        {children}
      </main>
      <TestPanel />
    </div>
  );
}

/** Lab-only test controls. Not a production feature. */
function TestPanel() {
  const { state, setRole, reset, apply } = useCockpit();
  const [done, setDone] = useState("");
  const seedConflict = () => {
    const segs = cutAt(plannedSegments(state.data, MOCK_TODAY), "15:00");
    apply(
      {
        ...state.data,
        exceptions: [
          ...state.data.exceptions,
          {
            id: "szenario-sonderzeit",
            kind: "SPECIAL_HOURS",
            startDate: MOCK_TODAY,
            endDate: MOCK_TODAY,
            intervals: segs.map((x) => ({ start: x.start, end: x.end, consultationType: x.type })),
            priority: 1,
            verification: entryVerification(ROLES[state.role].person, state.role, MOCK_TODAY),
          },
        ],
      },
      { title: "Heute um 15:00 schließen", detail: "Testszenario: bestehende Sonderzeit", before: "bis 16:00", after: "bis 15:00", undoSentence: "Die Praxis wäre heute wieder bis 16:00 geöffnet.", entityIds: ["szenario-sonderzeit"] },
    );
    setDone("Sonderzeit für heute angelegt. „Heute früher schließen“ zeigt jetzt den Widerspruch.");
  };
  return (
    <footer className={s.footer}>
      <details className={s.test}>
        <summary className={s.testSummary}>Testmodus (nur Labor)</summary>
        <div className={s.testBody}>
          <fieldset className={s.testRoles}>
            <legend>Rolle simulieren</legend>
            {(Object.keys(ROLES) as Role[]).map((r) => (
              <label key={r} className={s.testRole}>
                <input type="radio" name="test-role" checked={state.role === r} onChange={() => setRole(r)} />
                <span>
                  {ROLES[r].label} <span className={s.muted}>({ROLES[r].person})</span>
                </span>
              </label>
            ))}
          </fieldset>
          <p className={s.testRow}>
            <button
              type="button"
              className={s.btnSecondary}
              onClick={() => {
                reset();
                setDone("Zurückgesetzt – Startzustand für die nächste Testperson.");
              }}
            >
              Prototyp zurücksetzen
            </button>
            <button type="button" className={s.btnQuiet} onClick={seedConflict}>
              Szenario: Sonderzeit für heute existiert bereits
            </button>
          </p>
          <p role="status" className={s.muted}>
            {done}
          </p>
          <p className={s.muted}>
            Testzeit: {longDate(MOCK_TODAY)}, {MOCK_NOW} Uhr. Alle Namen, Praxen und Zeiten sind erfunden. Änderungen werden nicht gespeichert.
          </p>
        </div>
      </details>
    </footer>
  );
}

// ------------------------------------------------------------------ page scaffolding

export function useFocusOnChange<T extends HTMLElement>(key: unknown) {
  const ref = useRef<T>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    ref.current?.focus();
  }, [key]);
  return ref;
}

export function PageHead({ title, intro, backHref = "/lab/praxis-cockpit", backLabel = "Startseite", focusKey, step }: { title: string; intro?: ReactNode; backHref?: string; backLabel?: string; focusKey?: unknown; step?: string }) {
  const ref = useFocusOnChange<HTMLHeadingElement>(focusKey);
  return (
    <div className={s.pageHead}>
      <Link href={backHref} className={s.back}>
        <Glyph name="back" size={18} />
        {backLabel}
      </Link>
      {step ? <p className={s.step}>{step}</p> : null}
      <h1 ref={ref} tabIndex={-1} className={s.h1}>
        {title}
      </h1>
      {intro ? <p className={s.intro}>{intro}</p> : null}
    </div>
  );
}

// ------------------------------------------------------------------ buttons

export function Button({ children, onClick, busy, busyLabel, variant = "primary", type = "button", disabled }: { children: ReactNode; onClick?: () => void; busy?: boolean; busyLabel?: string; variant?: "primary" | "secondary" | "quiet"; type?: "button" | "submit"; disabled?: boolean }) {
  const cls = variant === "primary" ? s.btnPrimary : variant === "secondary" ? s.btnSecondary : s.btnQuiet;
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled || busy} aria-busy={busy || undefined}>
      {busy ? busyLabel : children}
    </button>
  );
}

export function LinkButton({ href, children, variant = "secondary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" | "quiet" }) {
  const cls = variant === "primary" ? s.btnPrimary : variant === "secondary" ? s.btnSecondary : s.btnQuiet;
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

/** Short, honest simulated latency (no endless spinners). */
export function useBusy() {
  const [busy, setBusy] = useState(false);
  const run = (ms: number, then: () => void) => {
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      then();
    }, ms);
  };
  return { busy, run };
}

// ------------------------------------------------------------------ form fields

export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className={s.error}>
      <Glyph name="attention" size={18} />
      <span>{children}</span>
    </p>
  );
}

export function TimeField({ label, value, onChange, error, hint, big }: { label: string; value: string; onChange: (v: string) => void; error?: string; hint?: ReactNode; big?: boolean }) {
  const id = useId();
  return (
    <div className={s.field}>
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className={s.hint}>
          {hint}
        </p>
      ) : null}
      <input
        id={id}
        type="time"
        step={300}
        className={big ? `${s.input} ${s.inputTime}` : s.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint ? `${id}-hint` : "", error ? `${id}-err` : ""].filter(Boolean).join(" ") || undefined}
      />
      <FieldError id={`${id}-err`}>{error}</FieldError>
    </div>
  );
}

export function DateField({ label, value, onChange, error, hint, min, optional }: { label: string; value: string; onChange: (v: string) => void; error?: string; hint?: ReactNode; min?: string; optional?: boolean }) {
  const id = useId();
  return (
    <div className={s.field}>
      <label htmlFor={id} className={s.label}>
        {label}
        {optional ? <span className={s.optional}> (optional)</span> : null}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className={s.hint}>
          {hint}
        </p>
      ) : null}
      <input
        id={id}
        type="date"
        className={s.input}
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint ? `${id}-hint` : "", error ? `${id}-err` : ""].filter(Boolean).join(" ") || undefined}
      />
      <FieldError id={`${id}-err`}>{error}</FieldError>
    </div>
  );
}

/** Free text with counter and the quiet patient-data reminder. */
export function TextField({ label, value, onChange, max, error, multiline, optional, privacy = true, placeholder }: { label: string; value: string; onChange: (v: string) => void; max: number; error?: string; multiline?: boolean; optional?: boolean; privacy?: boolean; placeholder?: string }) {
  const id = useId();
  const left = max - value.length;
  const describedBy = [privacy ? `${id}-hint` : "", `${id}-count`, error ? `${id}-err` : ""].filter(Boolean).join(" ");
  const props = {
    id,
    className: multiline ? `${s.input} ${s.textarea}` : s.input,
    value,
    maxLength: max,
    placeholder,
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  };
  return (
    <div className={s.field}>
      <label htmlFor={id} className={s.label}>
        {label}
        {optional ? <span className={s.optional}> (optional)</span> : null}
      </label>
      {privacy ? (
        <p id={`${id}-hint`} className={s.hint}>
          Keine Patientendaten eingeben.
        </p>
      ) : null}
      {multiline ? <textarea rows={3} {...props} /> : <input type="text" {...props} />}
      <p id={`${id}-count`} className={s.counter} aria-live="polite">
        {left <= 20 ? `Noch ${left} Zeichen` : `${value.length} / ${max} Zeichen`}
      </p>
      <FieldError id={`${id}-err`}>{error}</FieldError>
    </div>
  );
}

export interface ChoiceOption<T extends string> {
  value: T;
  label: ReactNode;
  note?: ReactNode;
  disabled?: boolean;
}

export function Choice<T extends string>({ legend, options, value, onChange, name, error, hint }: { legend: string; options: ChoiceOption<T>[]; value: T | ""; onChange: (v: T) => void; name: string; error?: string; hint?: ReactNode }) {
  const id = useId();
  return (
    <fieldset className={s.fieldset} aria-describedby={[hint ? `${id}-hint` : "", error ? `${id}-err` : ""].filter(Boolean).join(" ") || undefined}>
      <legend className={s.label}>{legend}</legend>
      {hint ? (
        <p id={`${id}-hint`} className={s.hint}>
          {hint}
        </p>
      ) : null}
      <div className={s.choices}>
        {options.map((o) => (
          <label key={o.value} className={`${s.choice} ${o.disabled ? s.choiceDisabled : ""}`}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} disabled={o.disabled} onChange={() => onChange(o.value)} />
            <span className={s.choiceText}>
              <span className={s.choiceLabel}>{o.label}</span>
              {o.note ? <span className={s.choiceNote}>{o.note}</span> : null}
            </span>
          </label>
        ))}
      </div>
      <FieldError id={`${id}-err`}>{error}</FieldError>
    </fieldset>
  );
}

// ------------------------------------------------------------------ website preview

/** Minimal view model for the public StatusStatement (same mapping idea as src/content/puls.ts). */
export function toPulsView(result: PracticeStatusResult): PulsView {
  const iv = result.currentInterval;
  // Same reason line as src/content/puls.ts (display only; status comes from the engine).
  const reason =
    [result.status === "SPECIAL_HOURS" ? "Geänderte Sprechzeit heute" : "", iv && iv.consultationType !== "GENERAL" ? `Jetzt bis ${iv.end} Uhr: ${typeLabel(iv.consultationType)}` : ""].filter(Boolean).join(" · ") ||
    undefined;
  return {
    mode: "PREVIEW",
    result,
    view: {
      state: result.indicator === "OPEN" ? "open" : result.indicator === "NONE" ? "unknown" : result.indicator === "CLOSURE" ? "closure" : result.indicator === "ATTENTION" ? "special" : "closed",
      indicator: result.indicator,
      chip: result.indicator === "NONE" ? "" : result.headline,
      headline: result.headline,
      detail: result.detail,
      reason,
      action: { label: result.primaryAction.label, kind: "hours" },
    },
  };
}

export function WebsitePreview({ result, when, announcements = [], heading = "So sieht es die Website", headingLevel = 2, explain = true }: { result: PracticeStatusResult; when: string; announcements?: Announcement[]; heading?: string; headingLevel?: 2 | 3; explain?: boolean }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  const note = explain ? unknownExplanation(result) : null;
  const message = result.activeClosure?.message ?? result.activeException?.message;
  return (
    <section className={s.preview} aria-label={`${heading}: ${when}`}>
      <div className={s.previewHead}>
        <H className={s.previewTitle}>{heading}</H>
        <p className={s.previewWhen}>{when}</p>
      </div>
      <div className={`ds-root ${s.previewBody}`}>
        <StatusStatement puls={toPulsView(result)} />
        {message ? <p className={s.previewMessage}>{message}</p> : null}
        {result.upcomingClosure && !result.activeClosure ? (
          <p className={s.previewMessage}>
            Hinweis auf der Website: Praxis geschlossen vom {dayMonth(result.upcomingClosure.startDate)} bis {dayMonth(result.upcomingClosure.endDate)}.
          </p>
        ) : null}
        {result.replacementPractices.length ? (
          <div className={s.previewReplacement}>
            <p className={s.previewSub}>Vertretung</p>
            {result.replacementPractices.map((r) => (
              <p key={`${r.id}-${r.from}`}>
                <strong>{r.practiceName}</strong> · {r.address} · {r.phone}
                <span className={s.muted}> ({dayMonth(r.from)} bis {dayMonth(r.until)})</span>
              </p>
            ))}
          </div>
        ) : result.activeClosure && result.replacementFallback ? (
          <p className={s.previewMessage}>Ohne Vertretung zeigt die Website die Notfall-Hinweise und die Telefonnummer.</p>
        ) : null}
        {announcements.map((a) => (
          <div key={a.id} className={s.previewNotice}>
            <p className={s.previewSub}>Aktueller Hinweis</p>
            <p className={s.previewNoticeTitle}>{a.title}</p>
            <p>{a.shortText}</p>
          </div>
        ))}
      </div>
      {note ? (
        <p className={s.previewExplain}>
          <Glyph name="attention" size={18} />
          <span>{note}</span>
        </p>
      ) : null}
    </section>
  );
}

// ------------------------------------------------------------------ status word for staff

const WORD: Record<string, string> = {
  OPEN: "Geöffnet",
  ACUTE_CONSULTATION: "Akutsprechstunde",
  OPENING_SOON: "Öffnet gleich",
  CLOSING_SOON: "Schließt gleich",
  CLOSED: "Geschlossen",
  SPECIAL_HOURS: "Geänderte Sprechzeit",
  VACATION: "Urlaub",
  TEMPORARILY_CLOSED: "Heute geschlossen",
  UNKNOWN: "Kein eindeutiger Status",
};

export function StatusWord({ result }: { result: PracticeStatusResult }) {
  return (
    <p className={s.statusWord}>
      {result.indicator === "NONE" ? <Glyph name="attention" size={22} /> : <StatusMark indicator={result.indicator} />}
      <span>{WORD[result.status] ?? result.headline}</span>
    </p>
  );
}

// ------------------------------------------------------------------ outcome panels

export function Blocked({ problem, onBack }: { problem: Problem; onBack: () => void }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const related = problem.relatedIds[0];
  return (
    <section className={s.blocked} aria-labelledby="blocked-title">
      <h2 id="blocked-title" ref={ref} tabIndex={-1} className={s.blockedTitle}>
        <Glyph name="attention" size={24} />
        {problem.title}
      </h2>
      <p>{problem.text}</p>
      <p className={s.muted}>Die Änderung wurde nicht übernommen. Die Website zeigt weiter den bisherigen Stand.</p>
      <div className={s.actions}>
        {related ? <LinkButton href={`/lab/praxis-cockpit/verlauf/eintrag?objekt=${encodeURIComponent(related)}`}>Bestehende Änderung ansehen</LinkButton> : null}
        <Button variant="quiet" onClick={onBack}>
          Zurück
        </Button>
      </div>
    </section>
  );
}

export function Success({ title, children, undoId, actions }: { title: string; children?: ReactNode; undoId?: string; actions?: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <section className={s.success} aria-labelledby="success-title">
      <h2 id="success-title" ref={ref} tabIndex={-1} className={s.successTitle}>
        <span className={s.successMark}>
          <Glyph name="check" size={22} />
        </span>
        {title}
      </h2>
      {children}
      <p className={s.muted}>Im echten Cockpit wird die Änderung danach automatisch protokolliert.</p>
      <div className={s.actions}>
        {actions ?? (
          <LinkButton href="/lab/praxis-cockpit" variant="primary">
            Zur Startseite
          </LinkButton>
        )}
        {undoId ? (
          <LinkButton href={`/lab/praxis-cockpit/verlauf/${undoId}?ruecknahme=1`} variant="quiet">
            <Glyph name="undo" size={18} />
            Änderung zurücknehmen
          </LinkButton>
        ) : null}
      </div>
    </section>
  );
}

/** Governance line: who confirms this operational entry (no free-typed names). */
export function ConfirmedBy({ medical }: { medical?: boolean }) {
  const { state } = useCockpit();
  const who = ROLES[state.role];
  return (
    <p className={s.confirmedBy}>
      {medical
        ? "Ärztliche oder medizinische Angaben kann das Praxisteam nicht selbst bestätigen."
        : `Wird als Angabe der Praxis übernommen: ${who.person} · ${who.label}.`}
    </p>
  );
}
