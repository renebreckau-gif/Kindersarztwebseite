// PRAXIS PULS for the public site: the domain engine, gated by release state.
// No independent status logic — this only chooses the input and maps the output
// to the approved hero component's view model.

import { getPracticeStatus, type PracticeStatusResult } from "../domain/practice-status.ts";
import { zonedToInstant } from "../domain/time.ts";
import type { DemoPuls } from "../design-system/demo-fixtures.ts";
import { PULS_DATA, CONSULTATION_TYPES } from "./schedule.ts";
import { RELEASE } from "./release.ts";
import { UNCONFIRMED } from "./practice.ts";

export type PulsMode = "LIVE" | "PREVIEW";

export interface PulsView {
  mode: PulsMode;
  result: PracticeStatusResult;
  /** View model for the approved hero/PULS components. */
  view: DemoPuls;
}

const ACTION_KIND: Record<string, DemoPuls["action"]["kind"]> = {
  CALL: "call",
  HOURS: "hours",
  EMERGENCY: "emergency",
  REPLACEMENT: "replacement",
  DETAILS: "details",
};

/** Parse a review time "YYYY-MM-DDTHH:MM" (Europe/Berlin). Invalid → now. */
function reviewInstant(zeit: string): Date {
  const m = zeit.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/);
  return m ? zonedToInstant(m[1], m[2]) : new Date();
}

/** `now` is injectable for tests only; pages never pass it (live = real time). */
export function resolvePuls(params: { vorschau?: string | string[]; zeit?: string | string[] } = {}, now: Date = new Date()): PulsView {
  const preview = params.vorschau === "freigabe";
  const at = preview && typeof params.zeit === "string" ? reviewInstant(params.zeit) : now;
  // Until LB-00 the schedule may be displayed but not used for a live state: the engine
  // receives it as unconfirmed and resolves to UNKNOWN by its own rules.
  const usable = RELEASE.pulsPracticeSignOff || preview;
  const data = usable ? PULS_DATA : { ...PULS_DATA, schedule: { ...PULS_DATA.schedule!, verification: UNCONFIRMED } };
  const result = getPracticeStatus(at, data);
  const [secondary] = result.secondaryActions;
  // Current consultation type (verified data, e.g. F41 "bitte nur gesunde Kinder") — the engine
  // reports it; we only put it into words. No new status logic.
  const iv = result.currentInterval;
  const typeLabel = iv && iv.consultationType !== "GENERAL" ? CONSULTATION_TYPES.find((t) => t.code === iv.consultationType)?.label : undefined;
  const view: DemoPuls = {
    state: result.indicator === "OPEN" ? "open" : result.indicator === "NONE" ? "unknown" : result.indicator === "CLOSURE" ? "closure" : result.indicator === "ATTENTION" ? "special" : "closed",
    indicator: result.indicator,
    chip: result.indicator === "NONE" ? "" : result.headline,
    headline: result.headline,
    detail: result.detail,
    reason: typeLabel && iv ? `Jetzt bis ${iv.end} Uhr: ${typeLabel}` : undefined,
    action: { label: result.primaryAction.label, kind: ACTION_KIND[result.primaryAction.id] ?? "hours" },
    secondary: secondary ? { label: secondary.label, kind: (ACTION_KIND[secondary.id] ?? "hours") as "call" | "hours" | "emergency" } : undefined,
  };
  return { mode: preview ? "PREVIEW" : "LIVE", result, view };
}
