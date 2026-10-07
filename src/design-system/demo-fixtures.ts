// DEMO FIXTURES — design-system reference only. NOT practice data.
// Wording mirrors the PRAXIS PULS engine (src/domain/practice-status.ts);
// times, dates, names and numbers are invented for visual testing.

export type DemoPulsState = "open" | "closed" | "special" | "closure" | "unknown";
export type Indicator = "OPEN" | "NEUTRAL" | "ATTENTION" | "CLOSURE" | "NONE";

export interface DemoPuls {
  state: DemoPulsState;
  indicator: Indicator;
  /** Short word for chips/docks; empty for UNKNOWN (never implies a state). */
  chip: string;
  chipTime?: string;
  headline: string;
  detail: string;
  reason?: string;
  action: { label: string; kind: "call" | "hours" | "replacement" | "details" | "emergency" };
  secondary?: { label: string; kind: "call" | "hours" | "emergency" };
}

export const DEMO_PHONE = { display: "0000 123456", href: "tel:+490000123456" };

export const DEMO_PULS: Record<DemoPulsState, DemoPuls> = {
  open: {
    state: "open",
    indicator: "OPEN",
    chip: "Geöffnet",
    chipTime: "bis 12:00",
    headline: "Praxis geöffnet",
    detail: "Heute bis 12:00 Uhr",
    action: { label: "Anrufen", kind: "call" },
    secondary: { label: "Sprechzeiten ansehen", kind: "hours" },
  },
  closed: {
    state: "closed",
    indicator: "NEUTRAL",
    chip: "Geschlossen",
    chipTime: "ab 14:00",
    headline: "Praxis geschlossen",
    detail: "Öffnet heute um 14:00 Uhr",
    action: { label: "Sprechzeiten ansehen", kind: "hours" },
    secondary: { label: "Notfall-Hinweise", kind: "emergency" },
  },
  special: {
    state: "special",
    indicator: "ATTENTION",
    chip: "Geänderte Zeit",
    chipTime: "08:00–10:00",
    headline: "Geänderte Sprechzeit heute",
    detail: "08:00–10:00 Uhr",
    reason: "Grund: Fortbildung des Teams (Demo)",
    action: { label: "Details ansehen", kind: "details" },
    secondary: { label: "Anrufen", kind: "call" },
  },
  closure: {
    state: "closure",
    indicator: "CLOSURE",
    chip: "Praxisurlaub",
    chipTime: "bis 9. Okt.",
    headline: "Praxisurlaub",
    detail: "Bis Freitag, 9. Oktober",
    action: { label: "Vertretung anzeigen", kind: "replacement" },
    secondary: { label: "Notfall-Hinweise", kind: "emergency" },
  },
  unknown: {
    state: "unknown",
    indicator: "NONE",
    chip: "",
    headline: "Aktuelle Sprechzeiten",
    detail: "Bitte aktuelle Informationen prüfen.",
    action: { label: "Sprechzeiten ansehen", kind: "hours" },
    secondary: { label: "Anrufen", kind: "call" },
  },
};

export const PULS_ORDER: DemoPulsState[] = ["open", "closed", "special", "closure", "unknown"];

export const STATE_NAMES: Record<DemoPulsState, string> = {
  open: "Geöffnet",
  closed: "Geschlossen",
  special: "Sonderzeit",
  closure: "Schließung",
  unknown: "Unbekannt",
};

export function parseDemoState(v: string | string[] | undefined): DemoPulsState {
  return typeof v === "string" && (PULS_ORDER as string[]).includes(v) ? (v as DemoPulsState) : "open";
}
