// Shared geometry of the Growing Mobile.
// One pure function drives the WebGL scene, the static SVG poster and the
// positions of the DOM labels, so all three always agree.

import type { PathId } from "./fixtures";

export interface Pose {
  /** Beam tilts (radians, counter-clockwise positive = left end down). */
  t1: number;
  t2: number;
  t3: number;
  /** Yaw around the hanging wire (radians). Only the 3D scene uses it. */
  yaw: number;
  /** 0 = hanging mobile, 1 = measuring instrument (Mein Kind). */
  inst: number;
}

export type V2 = [number, number];

export interface Element {
  id: PathId;
  shape: "disc" | "sphere" | "capsule" | "ring";
  pos: V2;
  /** Point where the element's wire attaches to its beam. */
  hang: V2;
  size: number;
}

export interface Layout {
  hook: V2;
  pivots: V2[];
  beams: [V2, V2][];
  wires: [V2, V2][];
  elements: Element[];
  rod: { x: number; y0: number; y1: number };
}

// World-space view box (y up). The stage uses the same aspect ratio.
export const VIEW = { x: -2.4, y: -2.1, w: 4.8, h: 4.6 };

const HOOK: V2 = [-0.55, 2.3];
const P1: V2 = [-0.55, 1.75];
const B1 = { l: 1.35, r: 1.25 };
const B2 = { l: 0.85, r: 0.75 };
const B3 = { l: 0.7, r: 0.55 };

// Instrument: measuring rod with the four age stops, elements grow with age.
export const ROD = { x: 0.35, y0: -1.75, y1: 1.95 };
const AGE_STOPS: Record<PathId, { y: number; scale: number }> = {
  "mein-kind": { y: -1.25, scale: 0.62 },
  entdecken: { y: -0.35, scale: 0.78 },
  praxis: { y: 0.55, scale: 0.9 },
  heute: { y: 1.45, scale: 0.86 },
};
// Age-range label order bottom → top matches AGE_RANGES.
export const AGE_STOP_Y = [-1.25, -0.35, 0.55, 1.45];

const SIZE: Record<PathId, number> = { heute: 0.4, "mein-kind": 0.33, praxis: 0.3, entdecken: 0.3 };

function rot(c: V2, len: number, a: number): V2 {
  return [c[0] + Math.cos(a) * len, c[1] + Math.sin(a) * len];
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function layout(p: Pose): Layout {
  const e1L = rot(P1, -B1.l, p.t1);
  const e1R = rot(P1, B1.r, p.t1);
  const p2: V2 = [e1R[0], e1R[1] - 0.5];
  const e2L = rot(p2, -B2.l, p.t2);
  const e2R = rot(p2, B2.r, p.t2);
  const p3: V2 = [e2R[0], e2R[1] - 0.45];
  const e3L = rot(p3, -B3.l, p.t3);
  const e3R = rot(p3, B3.r, p.t3);

  const hanging: Record<PathId, { hang: V2; pos: V2 }> = {
    heute: { hang: e1L, pos: [e1L[0], e1L[1] - 1.6] },
    "mein-kind": { hang: e2L, pos: [e2L[0], e2L[1] - 1.55] },
    praxis: { hang: e3L, pos: [e3L[0], e3L[1] - 1.5] },
    entdecken: { hang: e3R, pos: [e3R[0], e3R[1] - 1.9] },
  };

  const shapes: Record<PathId, Element["shape"]> = {
    heute: "disc",
    "mein-kind": "sphere",
    praxis: "capsule",
    entdecken: "ring",
  };

  const elements: Element[] = (Object.keys(hanging) as PathId[]).map((id) => {
    const h = hanging[id];
    const stop = AGE_STOPS[id];
    const pos: V2 = [lerp(h.pos[0], ROD.x + 0.62 * stop.scale, p.inst), lerp(h.pos[1], stop.y, p.inst)];
    return { id, shape: shapes[id], pos, hang: h.hang, size: SIZE[id] * lerp(1, stop.scale * 1.15, p.inst) };
  });

  return {
    hook: HOOK,
    pivots: [P1, p2, p3],
    beams: [
      [e1L, e1R],
      [e2L, e2R],
      [e3L, e3R],
    ],
    wires: [
      [HOOK, P1],
      [e1R, p2],
      [e2R, p3],
      ...elements.map((e) => [e.hang, [e.hang[0], e.pos[1] + e.size] as V2] as [V2, V2]),
    ],
    elements,
    rod: ROD,
  };
}

/** Target balance for a selected path: the chosen element gains "weight". */
export function targetPose(sel: PathId | null): Pose {
  const base: Pose = { t1: 0, t2: 0, t3: 0, yaw: 0, inst: 0 };
  switch (sel) {
    case "heute":
      return { ...base, t1: 0.075 };
    case "mein-kind":
      return { ...base, t1: -0.04, t2: 0.08, inst: 1 };
    case "praxis":
      return { ...base, t1: -0.04, t2: -0.05, t3: 0.08 };
    case "entdecken":
      return { ...base, t1: -0.04, t2: -0.05, t3: -0.09 };
    default:
      return base;
  }
}

/** World → percentage of the stage box (for absolutely positioned DOM labels). */
export function toPct([x, y]: V2): { left: string; top: string } {
  return {
    left: `${(((x - VIEW.x) / VIEW.w) * 100).toFixed(3)}%`,
    top: `${(((VIEW.y + VIEW.h - y) / VIEW.h) * 100).toFixed(3)}%`,
  };
}
