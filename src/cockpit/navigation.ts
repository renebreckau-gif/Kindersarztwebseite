// Role-aware cockpit navigation. Hiding an entry is convenience only — the server-side ADMIN
// rule on /intern/admin (Payload access.admin) stays authoritative.

import type { StaffRole } from "../domain/governance.ts";

export interface CockpitNavItem {
  href: string;
  label: string;
}

export function cockpitNav(role: StaffRole): CockpitNavItem[] {
  return [
    { href: "/intern", label: "Übersicht" },
    { href: "/intern/vorschau", label: "Website-Vorschau" },
    // 09.5G: every role reaches the directory; the actions there are role-specific (server-checked).
    { href: "/intern/vertretungen", label: "Vertretungen" },
    ...(role === "ADMIN" ? [{ href: "/intern/admin", label: "Verwaltung" }] : []),
  ];
}
