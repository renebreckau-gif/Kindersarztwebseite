// Parsing of workflow inputs from query strings / form posts (pure). Only the fields a person
// actually chooses are read — never a date, role, provenance or change-set id.

import type { ClosedTodayInput, EarlyCloseInput, PublicReason } from "./types.ts";

type Get = (name: string) => string | undefined;
type GetAll = (name: string) => string[];

export const fromSearch = (q: Record<string, string | string[] | undefined>): { get: Get; getAll: GetAll } => ({
  get: (n) => (Array.isArray(q[n]) ? (q[n] as string[])[0] : (q[n] as string | undefined)),
  getAll: (n) => (Array.isArray(q[n]) ? (q[n] as string[]) : q[n] ? [q[n] as string] : []),
});

export const fromForm = (f: FormData): { get: Get; getAll: GetAll } => ({
  get: (n) => (typeof f.get(n) === "string" ? (f.get(n) as string) : undefined),
  getAll: (n) => f.getAll(n).filter((v): v is string => typeof v === "string"),
});

const REASONS: PublicReason[] = ["KRANKHEIT", "FORTBILDUNG", "TECHNIK", "KEINER", "SONSTIGES"];

export function parseEarlyClose(src: { get: Get }): EarlyCloseInput {
  return { time: (src.get("zeit") ?? "").trim(), message: src.get("hinweis") ?? undefined };
}

export function parseClosedToday(src: { get: Get; getAll: GetAll }): ClosedTodayInput {
  const reason = src.get("grund") as PublicReason | undefined;
  return {
    mode: src.get("modus") === "uhrzeit" ? "FROM_TIME" : "NOW",
    time: src.get("zeit")?.trim() || undefined,
    reason: reason && REASONS.includes(reason) ? reason : "KEINER",
    otherText: src.get("sonstiges") ?? undefined,
    replacementIds: src.getAll("vertretung"),
  };
}

/** Query string that reproduces an input (for "back to the preview" after a blocked publish). */
export function earlyCloseQuery(i: EarlyCloseInput): string {
  const p = new URLSearchParams({ zeit: i.time });
  if (i.message) p.set("hinweis", i.message);
  return p.toString();
}

export function closedTodayQuery(i: ClosedTodayInput): string {
  const p = new URLSearchParams({ modus: i.mode === "FROM_TIME" ? "uhrzeit" : "sofort", grund: i.reason });
  if (i.time) p.set("zeit", i.time);
  if (i.otherText) p.set("sonstiges", i.otherText);
  for (const id of i.replacementIds) p.append("vertretung", id);
  return p.toString();
}
