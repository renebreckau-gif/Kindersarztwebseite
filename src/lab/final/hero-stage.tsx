"use client";

// Signature hero (Phase 06.2) — the approved master reference translated into layers.
//
//   room plate     derived from the approved master (mobile and child removed)
//   mobile         cut out of the master; hangs and settles with a heavy spring
//   child          cut out of the master; static (no pointer-follow in this phase)
//   overlays       contact shadow, selection mark, Mein Kind measuring rod (SVG)
//
// Every layer is placed in the master's own coordinate frame (2688 × 1520), so the
// composition is the reference's at every size. The frame covers the stage like
// `object-fit: cover`, anchored by a focal point. INTERNAL PROTOTYPE ASSETS —
// AI_CONCEPTUAL, not approved for public production (docs/design/hero-reference).

import { useEffect, useRef, useState, type ReactNode } from "react";
import s from "./signature.module.css";
import { PathIcon } from "./path-icons";
import { AGE_RANGES, PATHS, type PathId } from "../fixtures";

const W = 2688;
const H = 1520;
const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;

/** Layer boxes in master pixels. */
const MOBILE = { x: 1560, y: 0, w: 830, h: 730 };
const CHILD = { x: 1430, y: 790, w: 570, h: 660 };

/** Each path's element on the mobile (centre + radius, in mobile-cutout pixels). */
const ELEMENT: Record<PathId, { x: number; y: number; r: number; tilt: number }> = {
  praxis: { x: 100, y: 222, r: 78, tilt: 0.5 }, // cobalt glass sphere
  heute: { x: 725, y: 345, r: 64, tilt: -0.45 }, // coral sphere
  "mein-kind": { x: 585, y: 505, r: 66, tilt: -0.3 }, // muted yellow sphere
  entdecken: { x: 390, y: 340, r: 118, tilt: 0.15 }, // pale translucent disc
};

/** Mein Kind measuring rod beside the child (master pixels): floor → above the head. */
const ROD = { x: 1336, yFloor: 1418, yTop: 760 };
const AGE_Y = [1300, 1150, 990, 830];

const AGE_SLUGS = ["0-2-jahre", "3-6-jahre", "7-12-jahre", "13-17-jahre"];

const PATH_TEXT: Record<PathId, string> = {
  heute: "Sprechzeiten, Telefon und Anfahrt",
  "mein-kind": "Vorsorge und Orientierung nach Alter",
  praxis: "Ärztinnen, Team und erster Besuch",
  entdecken: "Für Kinder: So läuft ein Arztbesuch",
};

/** Heavy, well-damped spring for the mobile's sway (degrees). Settles to rest. */
function useSway(target: number, pointer: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const state = useRef({ a: 0.9, v: 0, pointer: 0, raf: 0, target });
  state.current.target = target;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const st = state.current;
    if (reduced) {
      st.a = st.target;
      el.style.setProperty("--sway", `${st.a}deg`);
      return;
    }
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const goal = st.target + st.pointer;
      st.v += (6 * (goal - st.a) - 2.6 * st.v) * dt;
      st.a += st.v * dt;
      el.style.setProperty("--sway", `${st.a.toFixed(4)}deg`);
      if (Math.abs(st.v) + Math.abs(goal - st.a) > 0.002) st.raf = requestAnimationFrame(tick);
      else st.raf = 0;
    };
    const kick = () => {
      if (!st.raf) {
        last = performance.now();
        st.raf = requestAnimationFrame(tick);
      }
    };
    kick();
    const fine = window.matchMedia("(pointer: fine)").matches;
    const onMove = (e: PointerEvent) => {
      if (!pointer || !fine || e.pointerType !== "mouse") return;
      st.pointer = ((e.clientX / window.innerWidth) * 2 - 1) * -0.35;
      kick();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(st.raf);
      st.raf = 0;
    };
  }, [target, pointer]);

  return ref;
}

/**
 * `routes` (public start page): path links point to real pages without JavaScript; with
 * JavaScript a choice previews on the mobile first and offers an explicit "Zu …" link
 * (docs/ux/navigation-model.md §12). Without `routes` the lab keeps `?pfad=` previews.
 */
export function HeroStage({ initial, children, routes }: { initial: PathId | null; children: ReactNode; routes?: Record<PathId, string> }) {
  const [selected, setSelected] = useState<PathId | null>(initial);
  const [age, setAge] = useState<number | null>(null);
  const inst = selected === "mein-kind";
  const current = PATHS.find((p) => p.id === selected);
  const sway = useSway(selected ? ELEMENT[selected].tilt : 0, true);
  const el = selected ? ELEMENT[selected] : null;

  const ageRef = useRef<HTMLFieldSetElement>(null);
  const focusAges = useRef(false);
  useEffect(() => {
    if (inst && focusAges.current) ageRef.current?.focus({ preventScroll: false });
    focusAges.current = false;
  }, [inst]);

  const select = (id: PathId | null) => {
    focusAges.current = id === "mein-kind";
    setSelected(id);
    setAge(null);
  };

  return (
    <div className={s.hero} data-selected={selected ?? ""}>
      <div className={s.stageArea}>
        <div className={s.scene} aria-hidden="true">
          <div className={s.frame}>
            <picture>
              <source type="image/avif" srcSet="/hero/room-960.avif 960w, /hero/room-1600.avif 1600w, /hero/room-2400.avif 2400w" sizes="(max-width: 63.99em) 200vw, max(100vw, 177svh)" />
              <img
                className={s.plate}
                src="/hero/room-1600.webp"
                srcSet="/hero/room-960.webp 960w, /hero/room-1600.webp 1600w, /hero/room-2400.webp 2400w"
                sizes="(max-width: 63.99em) 200vw, max(100vw, 177svh)"
                width={W}
                height={H}
                alt=""
                fetchPriority="high"
                decoding="async"
              />
            </picture>

            {/* soft contact shadow where the child sits (removed with the plate) */}
            <span className={s.contact} style={{ left: pct(1500, W), top: pct(1365, H), width: pct(470, W), height: pct(90, H) }} />

            {/* the mobile, hanging from the ceiling; pivots at its top */}
            <div
              ref={sway}
              className={s.mobile}
              data-lift={inst ? "" : undefined}
              style={{ left: pct(MOBILE.x, W), top: pct(MOBILE.y, H), width: pct(MOBILE.w, W) }}
            >
              <picture>
                <source type="image/avif" srcSet="/hero/mobile-420.avif 420w, /hero/mobile-830.avif 830w" sizes="(max-width: 63.99em) 62vw, 32vw" />
                <img src="/hero/mobile-830.webp" srcSet="/hero/mobile-420.webp 420w, /hero/mobile-830.webp 830w" sizes="(max-width: 63.99em) 62vw, 32vw" width={MOBILE.w} height={MOBILE.h} alt="" decoding="async" />
              </picture>
              {el ? (
                <span
                  className={s.mark}
                  style={{ left: pct(el.x, MOBILE.w), top: pct(el.y, MOBILE.h), width: pct(el.r * 2.5, MOBILE.w) }}
                />
              ) : null}
            </div>

            {/* the child, seated low, looking up at the mobile */}
            <picture>
              <source type="image/avif" srcSet="/hero/child-300.avif 300w, /hero/child-570.avif 570w" sizes="(max-width: 63.99em) 43vw, 22vw" />
              <img
                className={s.child}
                src="/hero/child-570.webp"
                srcSet="/hero/child-300.webp 300w, /hero/child-570.webp 570w"
                sizes="(max-width: 63.99em) 43vw, 22vw"
                width={CHILD.w}
                height={CHILD.h}
                alt=""
                decoding="async"
                style={{ left: pct(CHILD.x, W), top: pct(CHILD.y, H), width: pct(CHILD.w, W) }}
              />
            </picture>

            {/* Mein Kind: a brass measuring rod rises beside the child */}
            <svg className={s.rod} data-on={inst ? "" : undefined} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" focusable="false">
              <defs>
                <linearGradient id="hero-brass" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#F3DCA4" />
                  <stop offset="0.5" stopColor="#C9A25E" />
                  <stop offset="1" stopColor="#8A6631" />
                </linearGradient>
              </defs>
              <g className={s.rodBody}>
                <rect x={ROD.x - 5} y={ROD.yTop} width={10} height={ROD.yFloor - ROD.yTop} rx={5} fill="url(#hero-brass)" />
                {Array.from({ length: 23 }, (_, i) => {
                  const y = ROD.yFloor - 20 - i * ((ROD.yFloor - ROD.yTop - 40) / 22);
                  return <rect key={i} x={ROD.x - (i % 5 === 0 ? 34 : 18)} y={y - 1.5} width={i % 5 === 0 ? 34 : 18} height={3} fill="#A9834A" />;
                })}
                {AGE_Y.map((y, i) => (
                  <g key={y}>
                    <circle cx={ROD.x} cy={y} r={11} fill={age === i ? "#3446E8" : "#B8925A"} />
                    <text x={ROD.x - 48} y={y + 12} textAnchor="end" className={s.rodText} data-active={age === i ? "" : undefined}>
                      {AGE_RANGES[i]}
                    </text>
                  </g>
                ))}
              </g>
            </svg>
          </div>
        </div>
        <div className={s.content}>
          {children}
          {inst ? (
            <div className={s.ageRail}>
              {/* appears in the text column (not the ledge) so the scene never shifts;
                  focus moves here when Mein Kind is chosen */}
              <fieldset ref={ageRef} tabIndex={-1}>
                <legend>Alter Ihres Kindes</legend>
                <div className={s.ageOptions}>
                  {AGE_RANGES.map((r, i) => (
                    <label key={r}>
                      <input type="radio" name="alter" checked={age === i} onChange={() => setAge(i)} />
                      <span>{r} Jahre</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <button type="button" className={s.back} onClick={() => select(null)}>
                Zurück zur Übersicht
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className={s.ledge} id="pfade">
        <nav aria-label="Bereiche">
          <ul className={s.paths}>
            {PATHS.map((p) => (
              <li key={p.id}>
                <a
                  href={routes ? routes[p.id] : `?pfad=${p.id}#pfade`}
                  className={s.path}
                  aria-current={selected === p.id ? "true" : undefined}
                  onClick={(ev) => {
                    ev.preventDefault();
                    select(selected === p.id ? null : p.id);
                  }}
                >
                  <span className={s.pathIcon}>
                    <PathIcon id={p.id} />
                  </span>
                  <span className={s.pathTitle}>{p.label}</span>
                  <span className={s.pathText}>{PATH_TEXT[p.id]}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <p className={s.preview} aria-live="polite">
          {inst
            ? age !== null
              ? routes
                ? `${AGE_RANGES[age]} Jahre gewählt. `
                : `${AGE_RANGES[age]} Jahre gewählt. Inhalte folgen in einer späteren Phase.`
              : "Mein Kind: Der Messstab zeigt die Altersstufen. Wählen Sie ein Alter."
            : current
              ? routes
                ? `${current.label}: ${PATH_TEXT[current.id]}. `
                : `${current.label}: Inhalte folgen in einer späteren Phase.`
              : ""}
          {current && routes ? (
            <a className={s.previewLink} href={inst && age !== null ? `${routes["mein-kind"]}/${AGE_SLUGS[age]}` : routes[current.id]}>
              {inst && age !== null ? `Zu ${AGE_RANGES[age]} Jahre` : `Zu ${current.label}`}
            </a>
          ) : null}
        </p>
      </div>
    </div>
  );
}
