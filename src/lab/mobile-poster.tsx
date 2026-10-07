// Static, designed rendering of the Growing Mobile (SVG).
// Used as first paint, as no-WebGL / reduced-motion / low-power state,
// and as the visual the WebGL canvas fades in over — same geometry, no jump.

import { AGE_STOP_Y, layout, ROD, VIEW, type Pose } from "./mobile-geometry";
import type { PathId } from "./fixtures";

export type Palette = "color" | "ink";

export const ELEMENT_COLORS: Record<Palette, Record<PathId, string>> = {
  color: { heute: "#F28B74", "mein-kind": "#F1CF68", praxis: "#4A5CFF", entdecken: "#D8CFF1" },
  ink: { heute: "#171A1D", "mein-kind": "#171A1D", praxis: "#171A1D", entdecken: "#171A1D" },
};
export const LINE = "#171A1D";
export const HIGHLIGHT = "#4A5CFF";

export function MobilePoster({
  pose,
  palette,
  highlight,
  className,
}: {
  pose: Pose;
  palette: Palette;
  highlight?: PathId | null;
  className?: string;
}) {
  const L = layout(pose);
  const lineOpacity = 1 - pose.inst;
  const colors = ELEMENT_COLORS[palette];
  const fill = (id: PathId) => (highlight === id && palette === "ink" ? HIGHLIGHT : colors[id]);

  return (
    <svg
      className={className}
      viewBox={`${VIEW.x} ${-(VIEW.y + VIEW.h)} ${VIEW.w} ${VIEW.h}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="shade" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.12" />
        </radialGradient>
      </defs>
      {/* y-up world → SVG y-down */}
      <g transform="scale(1,-1)" strokeLinecap="round">
        {/* measuring rod (instrument mode) */}
        <g opacity={pose.inst} stroke={LINE}>
          <line x1={ROD.x} y1={ROD.y0} x2={ROD.x} y2={ROD.y1} strokeWidth={0.035} />
          {Array.from({ length: 18 }, (_, i) => {
            const y = ROD.y0 + 0.2 + (i * (ROD.y1 - ROD.y0 - 0.4)) / 17;
            const major = [0, 3, 7, 13].includes(i);
            return <line key={i} x1={ROD.x - (major ? 0.16 : 0.08)} y1={y} x2={ROD.x} y2={y} strokeWidth={0.012} />;
          })}
          {AGE_STOP_Y.map((y) => (
            <circle key={y} cx={ROD.x} cy={y} r={0.035} fill={LINE} stroke="none" />
          ))}
        </g>

        {/* hanging structure */}
        <g opacity={lineOpacity} stroke={LINE} fill="none">
          {L.wires.map(([a, b], i) => (
            <line key={`w${i}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={0.012} />
          ))}
          {L.beams.map(([a, b], i) => (
            <line key={`b${i}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={0.03} />
          ))}
          {/* graduation on the main beam: the mobile is also a scale */}
          {Array.from({ length: 11 }, (_, i) => {
            const [a, b] = L.beams[0];
            const t = 0.08 + i * 0.084;
            const x = a[0] + (b[0] - a[0]) * t;
            const y = a[1] + (b[1] - a[1]) * t;
            return <line key={`t${i}`} x1={x} y1={y} x2={x} y2={y - (i % 5 === 0 ? 0.11 : 0.06)} strokeWidth={0.01} />;
          })}
          {L.pivots.map((p, i) => (
            <circle key={`p${i}`} cx={p[0]} cy={p[1]} r={0.04} fill={LINE} stroke="none" />
          ))}
          <circle cx={L.hook[0]} cy={L.hook[1]} r={0.06} strokeWidth={0.02} />
        </g>

        {/* elements */}
        {L.elements.map((e) => {
          const c = fill(e.id);
          const [x, y] = e.pos;
          const r = e.size;
          switch (e.shape) {
            case "disc":
              return (
                <g key={e.id}>
                  <circle cx={x} cy={y} r={r} fill={c} />
                  <circle cx={x} cy={y} r={r * 0.62} fill="none" stroke={LINE} strokeOpacity={0.35} strokeWidth={0.01} />
                </g>
              );
            case "sphere":
              return (
                <g key={e.id}>
                  <circle cx={x} cy={y} r={r} fill={c} />
                  <circle cx={x} cy={y} r={r} fill="url(#shade)" />
                </g>
              );
            case "capsule":
              return <rect key={e.id} x={x - r * 0.55} y={y - r * 1.1} width={r * 1.1} height={r * 2.2} rx={r * 0.55} fill={c} />;
            case "ring":
              return (
                <circle key={e.id} cx={x} cy={y} r={r * 0.78} fill="none" stroke={c} strokeWidth={r * 0.44} />
              );
          }
        })}
      </g>
    </svg>
  );
}
