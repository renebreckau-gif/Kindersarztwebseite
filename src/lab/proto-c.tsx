"use client";

// Prototype C — "Messlatte": a height chart on the practice wall. Four pendulum
// objects hang from it; editorial type and measurement lines carry the identity.
// No WebGL: DOM + CSS transforms + a tiny spring loop that sleeps when at rest.

import { useEffect, useRef, useState } from "react";
import s from "./proto-c.module.css";
import { AGE_RANGES, PATHS, type PathId } from "./fixtures";
import { usePrefersReducedMotion } from "./use-enhancement";

const SHAPE: Record<PathId, string> = {
  heute: s.shDisc,
  "mein-kind": s.shSphere,
  praxis: s.shBar,
  entdecken: s.shRing,
};

// Arm geometry (desktop): vertical position on the wall and arm reach, in %.
const ARM: Record<PathId, { y: number; reach: number; drop: number }> = {
  heute: { y: 12, reach: 70, drop: 22 },
  "mein-kind": { y: 30, reach: 54, drop: 26 },
  praxis: { y: 49, reach: 38, drop: 18 },
  entdecken: { y: 67, reach: 22, drop: 15 },
};

export function ProtoCWall({ initial }: { initial: PathId | null }) {
  const [selected, setSelected] = useState<PathId | null>(initial);
  const [age, setAge] = useState<number | null>(null);
  const reduced = usePrefersReducedMotion();
  const wall = useRef<HTMLDivElement>(null);
  const angle = useRef<Record<PathId, number>>({ heute: 0, "mein-kind": 0, praxis: 0, entdecken: 0 });
  const vel = useRef<Record<PathId, number>>({ heute: 2.6, "mein-kind": -3.4, praxis: 2.2, entdecken: -2.8 });
  const raf = useRef<number | null>(null);
  const inst = selected === "mein-kind";

  // Spring loop: runs only while something is swinging.
  const kick = () => {
    if (reduced || raf.current !== null) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      let energy = 0;
      for (const p of PATHS) {
        const a = angle.current[p.id];
        const v = vel.current[p.id] + (-26 * a - 1.5 * vel.current[p.id]) * dt;
        vel.current[p.id] = v;
        angle.current[p.id] = a + v * dt * 10;
        energy += Math.abs(v) + Math.abs(a);
      }
      const el = wall.current;
      if (el) {
        for (const p of PATHS) el.style.setProperty(`--a-${p.id}`, `${angle.current[p.id].toFixed(3)}deg`);
      }
      if (energy > 0.01) raf.current = requestAnimationFrame(step);
      else raf.current = null;
    };
    raf.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    if (reduced) return;
    const el = wall.current;
    if (!el) return;
    kick(); // one gentle entry swing
    let lx: number | null = null;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      // depth: light follows the pointer, layers shift a few pixels
      el.style.setProperty("--px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      el.style.setProperty("--py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
      if (lx !== null) {
        const vx = e.clientX - lx;
        for (const p of PATHS) {
          const node = el.querySelector<HTMLElement>(`[data-bob="${p.id}"]`);
          if (!node) continue;
          const b = node.getBoundingClientRect();
          const near = Math.abs(e.clientY - (b.top + b.height / 2)) < b.height * 1.4 && Math.abs(e.clientX - (b.left + b.width / 2)) < b.width * 2.2;
          if (near) vel.current[p.id] += vx * 0.05;
        }
        kick();
      }
      lx = e.clientX;
    };
    const onLeave = () => (lx = null);
    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  const select = (id: PathId) => {
    const next = selected === id ? null : id;
    setSelected(next);
    setAge(null);
    vel.current[id] += 4;
    kick();
  };

  return (
    <div className={s.wallCol}>
      <div ref={wall} className={`${s.wall} ${inst ? s.inst : ""}`} data-selected={selected ?? ""}>
        {/* the height chart */}
        <div className={s.ruler} aria-hidden="true">
          <div className={s.scaleCm}>
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} style={{ ["--i" as string]: i }}>
                {170 - i * 10}
              </span>
            ))}
          </div>
          <div className={s.scaleAge}>
            {AGE_RANGES.map((r, i) => (
              <span key={r} style={{ ["--i" as string]: i }} />
            ))}
          </div>
        </div>

        {/* measurement lines across the wall */}
        <div className={s.lines} aria-hidden="true" />

        <ul className={s.arms} aria-label="Bereiche">
          {PATHS.map((p) => {
            const g = ARM[p.id];
            const lift = selected === p.id ? 3.5 : 0;
            return (
              <li
                key={p.id}
                className={`${s.arm} ${selected === p.id ? s.armActive : ""}`}
                style={{
                  ["--y" as string]: `${g.y - lift}%`,
                  ["--reach" as string]: `${g.reach}%`,
                  ["--drop" as string]: `${g.drop}cqh`,
                  ["--a" as string]: `var(--a-${p.id}, 0deg)`,
                }}
              >
                <span className={s.armLine} aria-hidden="true" />
                <a
                  className={s.armLabel}
                  href={`?pfad=${p.id}`}
                  aria-current={selected === p.id ? "true" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    select(p.id);
                  }}
                >
                  {p.label}
                </a>
                <span className={s.pendulum} data-bob={p.id} aria-hidden="true" onClick={() => select(p.id)}>
                  <span className={s.string} />
                  <span className={`${s.bob} ${SHAPE[p.id]}`} />
                </span>
              </li>
            );
          })}
        </ul>

        {inst ? (
          <fieldset className={s.ages}>
            <legend className="visually-hidden">Mein Kind: Alter wählen</legend>
            <p className={s.agesTitle} aria-hidden="true">
              Mein Kind: Alter wählen
            </p>
            {AGE_RANGES.map((r, i) => (
              <label key={r} style={{ ["--i" as string]: i }}>
                <input type="radio" name="alter-c" checked={age === i} onChange={() => setAge(i)} />
                <span>{r} Jahre</span>
              </label>
            ))}
            <button type="button" onClick={() => setSelected(null)}>
              Zurück
            </button>
          </fieldset>
        ) : null}
      </div>
      <p className={s.live} aria-live="polite">
        {inst
          ? age !== null
            ? `${AGE_RANGES[age]} Jahre gewählt. Inhalte folgen in einer späteren Phase.`
            : "Die Messlatte zeigt jetzt Altersstufen."
          : selected
            ? `${PATHS.find((p) => p.id === selected)!.label}: ${PATHS.find((p) => p.id === selected)!.preview}`
            : ""}
      </p>
    </div>
  );
}
