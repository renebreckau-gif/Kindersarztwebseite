// Frame of the real (authenticated) cockpit: wordmark, account, role-aware navigation, logout.
// Same visual direction as the prototype at /lab/praxis-cockpit, without any lab code.

import Link from "next/link";
import type { ReactNode } from "react";
import { cockpitNav } from "@/cockpit/navigation";
import { ROLE_LABEL } from "@/domain/governance";
import { signOut } from "./actions";
import type { InternStaff } from "./session";

export function CockpitFrame({ staff, current, children }: { staff: InternStaff; current: string; children: ReactNode }) {
  return (
    <div className="cp-app">
      <a className="cp-skip" href="#inhalt">
        Zum Inhalt springen
      </a>
      <header className="cp-header">
        <div className="cp-header-row">
          <Link href="/intern" className="cp-wordmark">
            Praxis Cockpit
          </Link>
          <span className="cp-env">Testumgebung</span>
          <div className="cp-user">
            <span className="cp-user-name">{staff.name}</span>
            <span className="cp-user-role">{ROLE_LABEL[staff.role]}</span>
          </div>
          <form action={signOut}>
            <button type="submit" className="cp-btn cp-btn-quiet">
              Abmelden
            </button>
          </form>
        </div>
        <nav aria-label="Cockpit" className="cp-nav">
          {cockpitNav(staff.role).map((n) =>
            n.href === "/intern/admin" ? (
              // Payload admin has its own root layout: plain link (full page load).
              <a key={n.href} href={n.href} className="cp-nav-link">
                {n.label}
              </a>
            ) : (
              <Link key={n.href} href={n.href} className="cp-nav-link" aria-current={n.href === current ? "page" : undefined}>
                {n.label}
              </Link>
            ),
          )}
        </nav>
      </header>
      <main id="inhalt" className="cp-main">
        {children}
      </main>
    </div>
  );
}
