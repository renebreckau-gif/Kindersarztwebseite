// Measurement instruments: age scale (CSS-only radio group) and day ruler.
// Both are graphic orientation devices — they never show clinical measurements.

import s from "./instruments.module.css";

const AGES = [
  { id: "0-2", label: "0–2", span: 3 },
  { id: "3-6", label: "3–6", span: 4 },
  { id: "7-12", label: "7–12", span: 6 },
  { id: "13-17", label: "13–17", span: 5 },
];

/**
 * Age selection as a graduated scale. Segment widths follow the number of years
 * in each range; tick heights grow with age ("groß werden"). Works without JS.
 */
export function AgeScale({ name = "alter", defaultIndex = 1, mode = "light" }: { name?: string; defaultIndex?: number; mode?: "light" | "dark" }) {
  return (
    <fieldset className={`${s.ages} ${mode === "dark" ? s.agesDark : ""}`}>
      <legend className={s.agesLegend}>Alter Ihres Kindes</legend>
      <div className={s.agesTrack} style={{ gridTemplateColumns: AGES.map((a) => `${a.span}fr`).join(" ") }}>
        {AGES.map((a, i) => (
          <label key={a.id} className={s.age} style={{ ["--rise" as string]: `${10 + i * 7}px` }}>
            <input type="radio" name={name} value={a.id} defaultChecked={i === defaultIndex} />
            <span className={s.ageTicks} aria-hidden="true" />
            <span className={s.ageLabel}>
              {a.label}
              <span className={s.ageUnit}> Jahre</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Day ruler: a calm time instrument; renders only verified (here: demo) spans. */
export function DayRuler({ from = 7, to = 19, span, now, caption }: { from?: number; to?: number; span?: [number, number]; now?: number; caption?: string }) {
  const pct = (h: number) => `${((h - from) / (to - from)) * 100}%`;
  const fmt = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
  const label = span ? `Sprechzeit ${fmt(span[0])} bis ${fmt(span[1])} Uhr${now !== undefined ? `, jetzt ${fmt(now)} Uhr` : ""} (Demo)` : "Tageslineal";
  return (
    <figure className={s.ruler} role="img" aria-label={label}>
      <div className={s.rulerTrack} aria-hidden="true">
        {Array.from({ length: to - from + 1 }, (_, i) => (
          <span key={i} className={(from + i) % 2 === 0 ? s.tickMajor : s.tick} style={{ left: pct(from + i) }}>
            {(from + i) % 2 === 0 ? <em>{from + i}</em> : null}
          </span>
        ))}
        {span ? <span className={s.span} style={{ left: pct(span[0]), width: `calc(${pct(span[1])} - ${pct(span[0])})` }} /> : null}
        {now !== undefined ? (
          <span className={s.now} style={{ left: pct(now) }}>
            <em>{fmt(now)}</em>
          </span>
        ) : null}
      </div>
      {caption ? <figcaption className={s.rulerCaption}>{caption}</figcaption> : null}
    </figure>
  );
}
