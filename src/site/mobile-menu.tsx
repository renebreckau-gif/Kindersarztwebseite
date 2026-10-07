"use client";

// Hauptmenü overlay (Phase 07.1.1) — one shared implementation for every public page.
// Triggers (dock "Menü", hero-header button) are real <button>s that open the same
// dialog via a tiny store. The overlay is portalled to <body>; while open, the rest of
// the page is `inert` (not focusable, not clickable, hidden from assistive tech), the
// scroll position is frozen in place and restored exactly on close.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import s from "./mobile-menu.module.css";
import { Icon } from "@/design-system/icons";

export const MENU_ID = "hauptmenue";

// ---------------------------------------------------------------- store

let open = false;
let trigger: HTMLElement | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
function setOpen(next: boolean, from?: HTMLElement | null) {
  if (next && from) trigger = from;
  open = next;
  emit();
}
const useMenuOpen = () => useSyncExternalStore(subscribe, () => open, () => false);

// ---------------------------------------------------------------- trigger

export function MenuButton({ className, children, label = "Menü öffnen" }: { className?: string; children: ReactNode; label?: string }) {
  const isOpen = useMenuOpen();
  return (
    <button
      type="button"
      className={className}
      aria-expanded={isOpen}
      aria-controls={MENU_ID}
      aria-label={label}
      onClick={(e) => setOpen(true, e.currentTarget)}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- overlay

const PRIMARY = [
  { label: "Start", href: "/" },
  { label: "Heute", href: "/heute" },
  { label: "Mein Kind", href: "/mein-kind" },
  { label: "Praxis", href: "/praxis" },
  { label: "Entdecken", href: "/entdecken" },
];

export function MobileMenu({ phone }: { phone: { display: string; href: string } }) {
  const isOpen = useMenuOpen();
  const pathname = usePathname();
  const panel = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  // scroll lock + inert background + focus in / focus back
  useEffect(() => {
    if (!isOpen) return;
    const y = window.scrollY;
    const body = document.body;
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    const portalRoot = panel.current?.closest("[data-menu-root]");
    const others = [...body.children].filter((el) => el !== portalRoot) as HTMLElement[];
    const wasInert = others.map((el) => el.inert);
    others.forEach((el) => (el.inert = true));
    const first = panel.current?.querySelector<HTMLElement>("[data-autofocus]");
    first?.focus({ preventScroll: true });

    return () => {
      others.forEach((el, i) => (el.inert = wasInert[i]));
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      // instant, not the site's smooth scrolling: the page must be exactly where it was
      window.scrollTo({ top: y, behavior: "instant" });
      trigger?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  // Escape closes; Tab stays inside the dialog
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  // a completed navigation closes the menu
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div data-menu-root="">
      <div ref={panel} id={MENU_ID} className={s.overlay} role="dialog" aria-modal="true" aria-label="Menü">
        <div className={s.top}>
          <p className={s.identity}>
            Kinderarztpraxis
            <br />
            Probst &amp; Böhme
          </p>
          <button type="button" className={s.close} onClick={close} data-autofocus="">
            <Icon name="close" size={20} />
            <span>Schließen</span>
          </button>
        </div>

        <nav aria-label="Hauptmenü" className={s.primary}>
          <ul>
            {PRIMARY.map((p) => {
              const current = p.href === "/" ? pathname === "/" : pathname === p.href || pathname.startsWith(`${p.href}/`);
              return (
                <li key={p.href}>
                  <Link href={p.href} className={s.primaryLink} aria-current={current ? "page" : undefined} onClick={close}>
                    {p.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <ul className={s.utilities} aria-label="Schnellzugriff">
          <li>
            <Link href="/heute/sprechzeiten" className={s.utility} onClick={close}>
              <Icon name="today" size={20} />
              <span>Sprechzeiten</span>
            </Link>
          </li>
          <li>
            <Link href="/notfall" className={`${s.utility} ${s.emergency}`} onClick={close}>
              <Icon name="alert" size={20} />
              <span>Notfall</span>
            </Link>
          </li>
          <li>
            <a href={phone.href} className={s.utility}>
              <Icon name="phone" size={20} />
              <span>
                Anrufen <span className={s.num}>{phone.display}</span>
              </span>
            </a>
          </li>
        </ul>
      </div>
    </div>,
    document.body,
  );
}
