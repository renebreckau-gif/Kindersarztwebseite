// Signature Growing Mobile geometry (Phase 06, from the approved visual reference):
// a sweeping brass arc hung from a single pivot, four elements on fine threads.
// One pure function drives the WebGL scene, the SVG fallback and DOM positions.
//
// Balance: the arc rotates about its pivot; choosing a path tips it toward that
// element and lifts the element slightly ("groß werden"). Mein Kind turns the
// object into a measuring rod with four age stops.

import type { PathId } from "../fixtures";

export type V2 = [number, number];
export type Shape = "sphere" | "halfdisc" | "ring";

export interface SigPose {
  /** Arc rotation about the pivot (radians, + = counter-clockwise). */
  theta: number;
  /** Yaw around the vertical axis (3D only). */
  yaw: number;
  /** 0 = mobile, 1 = measuring instrument (Mein Kind). */
  inst: number;
  /** Lift (world units) of the selected element. */
  lift: number;
}

export interface SigElement {
  id: PathId;
  shape: Shape;
  /** Point on the arc where the thread is attached. */
  attach: V2;
  /** Element centre (for half-discs: middle of the flat top edge). */
  pos: V2;
  size: number;
}

export const SVIEW = { x: -0.62, y: -1.42, w: 3.2, h: 4.32 };

const C: V2 = [-0.35, 0.1];
const R = 2.3;
const A_PIVOT = 80;
const A_END = 5;
export const PIVOT: V2 = pt(A_PIVOT);
export const CEILING_Y = SVIEW.y + SVIEW.h + 0.1;

function pt(deg: number): V2 {
  const a = (deg * Math.PI) / 180;
  return [C[0] + Math.cos(a) * R, C[1] + Math.sin(a) * R];
}

const SPEC: { id: PathId; shape: Shape; angle: number; thread: number; size: number }[] = [
  { id: "praxis", shape: "sphere", angle: 72, thread: 0.4, size: 0.38 },
  { id: "heute", shape: "halfdisc", angle: 54, thread: 1.08, size: 0.33 },
  { id: "entdecken", shape: "ring", angle: 34, thread: 0.7, size: 0.31 },
  { id: "mein-kind", shape: "halfdisc", angle: 14, thread: 1.24, size: 0.3 },
];

const TILT: Record<PathId, number> = { praxis: 0.012, heute: 0.028, entdecken: -0.035, "mein-kind": -0.055 };

// Measuring instrument (Mein Kind): rod with four age stops; elements grow with age.
export const SROD = { x: 0.78, y0: -1.12, y1: 2.28 };
export const SAGE_STOP_Y = [-0.78, 0.04, 0.86, 1.68];
const AGE_SLOT: Record<PathId, { stop: number; scale: number }> = {
  "mein-kind": { stop: 0, scale: 0.72 },
  entdecken: { stop: 1, scale: 0.84 },
  heute: { stop: 2, scale: 0.94 },
  praxis: { stop: 3, scale: 1.0 },
};

function rotAbout(p: V2, o: V2, t: number): V2 {
  const dx = p[0] - o[0];
  const dy = p[1] - o[1];
  return [o[0] + dx * Math.cos(t) - dy * Math.sin(t), o[1] + dx * Math.sin(t) + dy * Math.cos(t)];
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Arc polyline (pivot → end), rotated by theta. */
export function arcPoints(theta: number, steps = 40): V2[] {
  return Array.from({ length: steps + 1 }, (_, i) => rotAbout(pt(A_PIVOT + ((A_END - A_PIVOT) * i) / steps), PIVOT, theta));
}

export function sigLayout(p: SigPose, selected: PathId | null): { arc: V2[]; elements: SigElement[] } {
  const elements = SPEC.map((sp): SigElement => {
    const attach = rotAbout(pt(sp.angle), PIVOT, p.theta);
    const lift = selected === sp.id ? p.lift : 0;
    const top = sp.shape === "halfdisc" ? 0 : sp.size; // threads end at the top of the element
    const hang: V2 = [attach[0], attach[1] - sp.thread + lift - top];
    const slot = AGE_SLOT[sp.id];
    const scale = lerp(1, slot.scale * 1.08, p.inst);
    const stack: V2 = [SROD.x + 0.42 + sp.size * slot.scale, SAGE_STOP_Y[slot.stop] + (sp.shape === "halfdisc" ? sp.size * 0.45 : 0)];
    return {
      id: sp.id,
      shape: sp.shape,
      attach,
      pos: [lerp(hang[0], stack[0], p.inst), lerp(hang[1], stack[1], p.inst)],
      size: sp.size * scale,
    };
  });
  return { arc: arcPoints(p.theta), elements };
}

export function sigTarget(sel: PathId | null): SigPose {
  return { theta: sel ? TILT[sel] : 0, yaw: 0, inst: sel === "mein-kind" ? 1 : 0, lift: sel ? 0.12 : 0 };
}

/** World → percentage of the stage box. */
export function sPct([x, y]: V2): { left: string; top: string } {
  return {
    left: `${(((x - SVIEW.x) / SVIEW.w) * 100).toFixed(3)}%`,
    top: `${(((SVIEW.y + SVIEW.h - y) / SVIEW.h) * 100).toFixed(3)}%`,
  };
}
