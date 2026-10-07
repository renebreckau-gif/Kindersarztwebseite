// Explicit Europe/Berlin calendar arithmetic without dependencies.
// The server's own timezone is never used: every conversion names the zone.

export const PRACTICE_TIME_ZONE = "Europe/Berlin";

/** Calendar date in the practice's zone, "YYYY-MM-DD". */
export type LocalDate = string;
/** Wall-clock time in the practice's zone, "HH:MM" (24h). */
export type LocalTime = string;
/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface ZonedParts {
  date: LocalDate;
  weekday: IsoWeekday;
  /** Minutes since local midnight. */
  minutes: number;
}

const WEEKDAYS: Record<string, IsoWeekday> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    formatters.set(tz, f);
  }
  return f;
}

function rawParts(instant: Date, tz: string) {
  const out: Record<string, string> = {};
  for (const p of formatter(tz).formatToParts(instant)) out[p.type] = p.value;
  return out;
}

export function zonedParts(instant: Date, tz: string = PRACTICE_TIME_ZONE): ZonedParts {
  if (Number.isNaN(instant.getTime())) throw new RangeError("Invalid instant");
  const p = rawParts(instant, tz);
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    weekday: WEEKDAYS[p.weekday],
    minutes: Number(p.hour) * 60 + Number(p.minute),
  };
}

/** Offset of `tz` from UTC at `instant`, in milliseconds. */
function offsetMs(instant: Date, tz: string): number {
  const p = rawParts(instant, tz);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Converts a local wall-clock time on a local date to the absolute instant.
 * DST-aware. Times inside a spring-forward gap resolve to the later offset.
 */
export function zonedToInstant(date: LocalDate, time: LocalTime, tz: string = PRACTICE_TIME_ZONE): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let result = guess - offsetMs(new Date(guess), tz);
  const second = guess - offsetMs(new Date(result), tz);
  if (second !== result) result = second;
  return new Date(result);
}

export function parseTime(t: LocalTime): number {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(t);
  if (!m) throw new RangeError(`Invalid time ${t}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

export function formatMinutes(min: number): LocalTime {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function isLocalDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

/** Pure calendar arithmetic (no timezone involved). */
export function addDays(date: LocalDate, days: number): LocalDate {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function compareDates(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function weekdayOf(date: LocalDate): IsoWeekday {
  const [y, m, d] = date.split("-").map(Number);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return (js === 0 ? 7 : js) as IsoWeekday;
}

export function daysBetween(a: LocalDate, b: LocalDate): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

const DE_DATE = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** "Montag, 30. März" — formatting of a local calendar date. */
export function formatGermanDate(date: LocalDate): string {
  return DE_DATE.format(new Date(`${date}T00:00:00Z`));
}

export function inRange(date: LocalDate, from?: LocalDate, until?: LocalDate): boolean {
  return (!from || compareDates(date, from) >= 0) && (!until || compareDates(date, until) <= 0);
}
