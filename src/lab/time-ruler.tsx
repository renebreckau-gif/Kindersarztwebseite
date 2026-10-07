// Prototype B: a hairline day ruler. Shown only for the OPEN demo state —
// a time instrument must never visualise unverified or unknown hours.

import s from "./proto-b.module.css";
import type { PulsFixture } from "./fixtures";

const FROM = 7;
const TO = 19;

const fmt = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

export function TimeRuler({ puls }: { puls: PulsFixture }) {
  if (puls.status !== "open" || !puls.span) return null;
  const pct = (h: number) => `${((h - FROM) / (TO - FROM)) * 100}%`;
  const { from, to, now } = puls.span;
  return (
    <figure className={s.ruler} aria-label={`Sprechzeit heute ${fmt(from)} bis ${fmt(to)} Uhr. Demo-Zeit ${fmt(now)} Uhr.`} role="img">
      <div className={s.rulerTrack} aria-hidden="true">
        {Array.from({ length: TO - FROM + 1 }, (_, i) => (
          <span key={i} className={i % 2 === 1 ? s.tickMajor : s.tick} style={{ left: pct(FROM + i) }}>
            {i % 2 === 1 ? <em>{FROM + i}</em> : null}
          </span>
        ))}
        <span className={s.span} style={{ left: pct(from), width: `calc(${pct(to)} - ${pct(from)})` }} />
        <span className={s.now} style={{ left: pct(now) }}>
          <em>{fmt(now)}</em>
        </span>
      </div>
    </figure>
  );
}
