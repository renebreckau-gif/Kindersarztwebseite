// Public presentation of announcement cards ("Aktuelle Hinweise") — ONE renderer for /heute,
// /heute/aktuelles and the cockpit Website-Vorschau. The list it receives is already filtered by
// selectPublicAnnouncements; this component decides nothing about visibility.

import type { Announcement } from "@/domain/content-types";
import u from "./pages.module.css";

const deDate = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;

export function NoticeList({ notices, showValidity = false }: { notices: Announcement[]; showValidity?: boolean }) {
  return (
    <ul className={u.notices}>
      {notices.map((n) => (
        <li key={n.id}>
          <strong>{n.title}</strong>
          <span>{n.shortText}</span>
          {showValidity && n.validUntil !== "OPEN_ENDED" ? <span className={u.fine}>Gültig bis {deDate(n.validUntil)}</span> : null}
        </li>
      ))}
    </ul>
  );
}
