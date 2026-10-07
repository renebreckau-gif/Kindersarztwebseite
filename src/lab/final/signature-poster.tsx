// Static rendering of the signature Growing Mobile (Phase 06, approved reference).
// Same geometry as the WebGL scene (./signature-geometry.ts) — first paint, the
// no-WebGL / reduced-motion / low-power state, and (in "shadow" mode) the soft
// sunlit shadow the object casts onto the wall.

import { CEILING_Y, PIVOT, SAGE_STOP_Y, SROD, SVIEW, sigLayout, type SigPose } from "./signature-geometry";
import type { PathId } from "../fixtures";

export const SIGNATURE = {
  brassLight: "#F0D9A8",
  brass: "#B8925A",
  brassDark: "#6E5129",
  coral: "#EE8466",
  coralLight: "#FFC9B4",
  coralDark: "#B9533B",
  yellow: "#EDC85E",
  yellowLight: "#FFF1C4",
  yellowDark: "#B98F2E",
  cobalt: "#2438D0",
  cobaltLight: "#8E9CFF",
  cobaltDeep: "#101A78",
  ring: "#F4F0FA",
  ringEdge: "#CFC6E6",
};

const FILL: Record<PathId, string> = { heute: "coral", "mein-kind": "yellow", praxis: "cobalt", entdecken: "ring" };

export function SignaturePoster({
  pose,
  selected = null,
  shadow = false,
  className,
}: {
  pose: SigPose;
  selected?: PathId | null;
  shadow?: boolean;
  className?: string;
}) {
  const L = sigLayout(pose, selected);
  const s = shadow;
  const id = s ? "ssh" : "ssg";
  const brass = s ? "currentColor" : `url(#${id}-brass)`;
  // straight vertical/horizontal lines have a zero-width bounding box, so an
  // objectBoundingBox gradient would not paint them: use a solid brass tone
  const wire = s ? "currentColor" : SIGNATURE.brass;
  const struct = 1 - pose.inst;
  const arcD = L.arc.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(4)} ${y.toFixed(4)}`).join(" ");
  const end = L.arc[L.arc.length - 1];

  return (
    <svg className={className} viewBox={`${SVIEW.x} ${-(SVIEW.y + SVIEW.h)} ${SVIEW.w} ${SVIEW.h}`} aria-hidden="true" focusable="false">
      {!s ? (
        <defs>
          <linearGradient id={`${id}-brass`} x1="0" y1="0" x2="1" y2="0.4">
            <stop offset="0" stopColor={SIGNATURE.brassLight} />
            <stop offset="0.45" stopColor={SIGNATURE.brass} />
            <stop offset="1" stopColor={SIGNATURE.brassDark} />
          </linearGradient>
          <radialGradient id={`${id}-coral`} cx="30%" cy="22%" r="95%">
            <stop offset="0" stopColor={SIGNATURE.coralLight} />
            <stop offset="0.45" stopColor={SIGNATURE.coral} />
            <stop offset="1" stopColor={SIGNATURE.coralDark} />
          </radialGradient>
          <radialGradient id={`${id}-yellow`} cx="30%" cy="22%" r="95%">
            <stop offset="0" stopColor={SIGNATURE.yellowLight} />
            <stop offset="0.45" stopColor={SIGNATURE.yellow} />
            <stop offset="1" stopColor={SIGNATURE.yellowDark} />
          </radialGradient>
          {/* cobalt glass: bright core, deep rim, warm bounce at the bottom */}
          <radialGradient id={`${id}-cobalt`} cx="38%" cy="34%" r="72%">
            <stop offset="0" stopColor={SIGNATURE.cobaltLight} />
            <stop offset="0.38" stopColor={SIGNATURE.cobalt} />
            <stop offset="0.86" stopColor={SIGNATURE.cobaltDeep} />
            <stop offset="1" stopColor="#3B2E7A" />
          </radialGradient>
          <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="0.55" stopColor={SIGNATURE.ring} />
            <stop offset="1" stopColor={SIGNATURE.ringEdge} />
          </linearGradient>
        </defs>
      ) : null}
      <g transform="scale(1,-1)" strokeLinecap="round" fill={s ? "currentColor" : undefined} stroke={s ? "currentColor" : undefined}>
        {/* ceiling line and the single pivot */}
        <g opacity={struct}>
          <line x1={PIVOT[0]} y1={CEILING_Y} x2={PIVOT[0]} y2={PIVOT[1] + 0.05} stroke={wire} strokeWidth={0.008} />
          <circle cx={PIVOT[0]} cy={PIVOT[1]} r={0.045} fill="none" stroke={brass} strokeWidth={0.012} />
        </g>

        {/* measuring rod (Mein Kind instrument) */}
        <g opacity={pose.inst}>
          <line x1={SROD.x} y1={SROD.y0} x2={SROD.x} y2={SROD.y1} stroke={wire} strokeWidth={0.03} />
          {Array.from({ length: 21 }, (_, i) => {
            const y = SROD.y0 + 0.16 + (i * (SROD.y1 - SROD.y0 - 0.32)) / 20;
            const major = i % 5 === 0;
            return <line key={i} x1={SROD.x - (major ? 0.15 : 0.07)} y1={y} x2={SROD.x} y2={y} stroke={wire} strokeWidth={0.01} />;
          })}
          {SAGE_STOP_Y.map((y) => (
            <circle key={y} cx={SROD.x} cy={y} r={0.036} fill={brass} stroke="none" />
          ))}
        </g>

        {/* the brass arc, threads and end weight */}
        <g opacity={struct} fill="none">
          <path d={arcD} stroke={brass} strokeWidth={0.04} />
          {!s ? <path d={arcD} stroke="#FFF6E2" strokeOpacity={0.55} strokeWidth={0.008} transform="translate(-0.006 0.01)" /> : null}
          <circle cx={end[0]} cy={end[1]} r={0.04} fill={brass} stroke="none" />
          {L.elements.map((e) => {
            const top = e.shape === "halfdisc" ? e.pos[1] : e.pos[1] + e.size;
            return (
              <g key={`t-${e.id}`}>
                <line x1={e.attach[0]} y1={e.attach[1]} x2={e.pos[0]} y2={top + 0.03} stroke={wire} strokeWidth={0.006} />
                <circle cx={e.attach[0]} cy={e.attach[1]} r={0.022} fill={brass} stroke="none" />
              </g>
            );
          })}
        </g>

        {/* elements */}
        {L.elements.map((e) => {
          const [x, y] = e.pos;
          const r = e.size;
          const fill = s ? "currentColor" : `url(#${id}-${FILL[e.id]})`;
          if (e.shape === "sphere")
            return (
              <g key={e.id}>
                <circle cx={x} cy={y} r={r} fill={fill} stroke="none" />
                {!s ? (
                  <>
                    <ellipse cx={x - r * 0.34} cy={y + r * 0.42} rx={r * 0.26} ry={r * 0.16} fill="#FFFFFF" fillOpacity={0.62} transform={`rotate(-28 ${x - r * 0.34} ${y + r * 0.42})`} />
                    <path d={`M ${x + r * 0.55} ${y - r * 0.62} A ${r * 0.9} ${r * 0.9} 0 0 1 ${x + r * 0.86} ${y - r * 0.1}`} fill="none" stroke="#FFD9B8" strokeOpacity={0.55} strokeWidth={r * 0.06} />
                  </>
                ) : null}
                <rect x={x - r * 0.16} y={y + r * 0.92} width={r * 0.32} height={r * 0.16} rx={r * 0.05} fill={brass} stroke="none" />
              </g>
            );
          if (e.shape === "halfdisc")
            return (
              <g key={e.id}>
                <path d={`M ${x - r} ${y} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`} fill={fill} stroke="none" />
                {!s ? <line x1={x - r * 0.96} y1={y - 0.004} x2={x + r * 0.96} y2={y - 0.004} stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={0.012} /> : null}
                <rect x={x - r * 0.12} y={y - 0.005} width={r * 0.24} height={0.05} rx={0.012} fill={brass} stroke="none" />
              </g>
            );
          return (
            <g key={e.id}>
              <circle cx={x} cy={y} r={r * 0.8} fill="none" stroke={fill} strokeWidth={r * 0.3} strokeOpacity={s ? 1 : 0.88} />
              {!s ? (
                <path d={`M ${x - r * 0.66} ${y + r * 0.42} A ${r * 0.8} ${r * 0.8} 0 0 0 ${x + r * 0.2} ${y + r * 0.78}`} fill="none" stroke="#FFFFFF" strokeOpacity={0.95} strokeWidth={r * 0.06} />
              ) : null}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
