// Thin line pictograms for the four paths, drawn from the object's own forms
// (half-disc, ring, sphere, measuring ticks). 32-unit grid, 1.3 stroke.

import type { PathId } from "../fixtures";

export function PathIcon({ id }: { id: PathId }) {
  const p = {
    width: 32,
    height: 32,
    viewBox: "0 0 32 32",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
  };
  switch (id) {
    case "heute": // low sun over a horizon: today
      return (
        <svg {...p}>
          <path d="M8 21a8 8 0 0 1 16 0" />
          <path d="M4 21h24M16 6v3M7.5 10.5l2 2M24.5 10.5l-2 2" />
          <path d="M11 25h10" />
        </svg>
      );
    case "mein-kind": // measuring stick with a rising mark: growing up
      return (
        <svg {...p}>
          <path d="M11 4v24" />
          <path d="M11 8h3M11 12h5M11 16h3M11 20h5M11 24h3" />
          <circle cx="22" cy="12" r="3" />
          <path d="M22 15v9" />
        </svg>
      );
    case "praxis": // arched doorway: the practice
      return (
        <svg {...p}>
          <path d="M8 27V14a8 8 0 0 1 16 0v13" />
          <path d="M4 27h24" />
          <path d="M13 27v-8a3 3 0 0 1 6 0v8" />
        </svg>
      );
    case "entdecken": // ring with an orbiting point: discovery
      return (
        <svg {...p}>
          <circle cx="16" cy="16" r="6" />
          <path d="M5 19c-1.5-4 4-9 11-10.5S28.5 9 28 13" />
          <circle cx="27" cy="16.5" r="1.4" />
        </svg>
      );
  }
}
