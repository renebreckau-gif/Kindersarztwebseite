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
    ...(role === "ADMIN" ? [{ href: "/intern/admin", label: "Verwaltung" }] : []),
  ];
}
