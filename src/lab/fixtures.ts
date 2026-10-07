// DEMO FIXTURES — Phase 02.5 experience lab only.
// These states are NOT practice data. They exist so prototypes A, B and C can be
// compared with identical content. Real PRAXIS PULS states may only be derived
// from VERIFIED_CURRENT facts (docs/research/fact-status-register.md).

export type DemoStatus = "open" | "closed" | "unknown";

export type PathId = "heute" | "mein-kind" | "praxis" | "entdecken";

export interface PulsFixture {
  status: DemoStatus;
  /** Short word for chips and docks. Empty for unknown: no implied state. */
  chip: string;
  title: string;
  detail: string;
  /** Detail is a link when the state needs a follow-up (closed / unknown). */
  detailHref?: string;
  action: { label: string; href: string; kind: "call" | "emergency" | "info" };
  /** Demo time span for the open state, used by the B time ruler. */
  span?: { from: number; to: number; now: number };
}

// Phone number is VERIFIED_CURRENT working data (F15); still pending practice sign-off (LB-00).
export const PHONE_DISPLAY = "03476 851157";
export const PHONE_HREF = "tel:+493476851157";

export const PULS_FIXTURES: Record<DemoStatus, PulsFixture> = {
  open: {
    status: "open",
    chip: "Geöffnet",
    title: "Praxis geöffnet",
    detail: "Heute bis 12:00 Uhr",
    action: { label: "Anrufen", href: PHONE_HREF, kind: "call" },
    span: { from: 8, to: 12, now: 9.66 },
  },
  closed: {
    status: "closed",
    chip: "Geschlossen",
    title: "Heute geschlossen",
    detail: "Nächste Sprechzeit ansehen",
    detailHref: "#sprechzeiten",
    action: { label: "Notfall-Hinweise", href: "#notfall", kind: "emergency" },
  },
  unknown: {
    status: "unknown",
    chip: "",
    title: "Aktuelle Sprechzeiten",
    detail: "Informationen ansehen",
    detailHref: "#sprechzeiten",
    action: { label: "Anrufen", href: PHONE_HREF, kind: "call" },
  },
};

export const PATHS: { id: PathId; label: string; preview: string }[] = [
  { id: "heute", label: "Heute", preview: "Sprechzeiten, Telefon und Anfahrt für heute" },
  { id: "mein-kind", label: "Mein Kind", preview: "Vorsorge und Orientierung nach Alter" },
  { id: "praxis", label: "Praxis", preview: "Ärztinnen, Team und erster Besuch" },
  { id: "entdecken", label: "Entdecken", preview: "Für Kinder: So läuft ein Arztbesuch" },
];

export const AGE_RANGES = ["0–2", "3–6", "7–12", "13–17"] as const;

export function parseStatus(v: string | string[] | undefined): DemoStatus {
  return v === "closed" || v === "unknown" ? v : "open";
}

export function parsePath(v: string | string[] | undefined): PathId | null {
  return PATHS.some((p) => p.id === v) ? (v as PathId) : null;
}
