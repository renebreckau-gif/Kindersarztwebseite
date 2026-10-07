# 3D Language — Growing Mobile Material Direction

Phase: 05 (material only; geometry is Phase 06)
Date: 2026-10-07
Demonstrated: `/design-system` §12 (current placeholder geometry with the `material` palette in [`src/lab/mobile-scene.tsx`](../../src/lab/mobile-scene.tsx) / [`mobile-poster.tsx`](../../src/lab/mobile-poster.tsx)).

The final object sits between **scientific instrument, premium toy, measuring device, kinetic sculpture and industrial design object** — never a baby mobile, rocket, cartoon, medical device, mascot or floating balls without reason. The current spheres/disc/capsule/ring are **placeholder geometry**.

## 1. Materials

| Material | Colour | Surface | Role |
|---|---|---|---|
| Warm ceramic | #EEE9DF | Matte-satin, roughness ≈ 0.38, light clearcoat | Calm mass; closest to the paper canvas |
| Dark anodized structure | #202327 | Satin metal, metalness ≈ 0.7, roughness ≈ 0.42 | Beams, wires, pivots, the "instrument" |
| Cobalt enamel / polymer | #4A5CFF | Glossy, clearcoat 1.0, roughness ≈ 0.22 | The one active, selectable highlight |
| Coral soft-touch | #F28B74 | Velvety, roughness ≈ 0.78, sheen | Human, tactile element |
| Discovery yellow | #F1CF68 | Satin, roughness ≈ 0.5 | Growth / child-facing element |
| Translucent detail | — | Only if Phase 06 can justify it (e.g. a lens) | Not used now |

Colour use mirrors the 2D system: structure is ink-dark, one cobalt element at most carries selection, accents are single moments.

## 2. Lighting

Soft key light from upper left (paper-studio feel), weak fill from lower right, generous ambient so nothing turns black on the warm canvas. No coloured lights, no rim-glow, no environment HDR reflections that read as "tech demo". In ENTDECKEN mode: same key, lower ambient, one warm glow source.

## 3. Edges and form language (guidance for Phase 06)

Precise, machined edges with small radii (like instrument parts), clear joints and pivots, visible graduation marks on the main beam. Forms reference measuring tools (rod, scale, gauge) and balance — not toys' rounded blobs.

## 4. Shadows and depth

No drop shadows under the floating object on the page (it is not "placed on" the canvas). Depth comes from material shading and slight yaw. Contact shadows only if the object is ever shown resting on a surface.

## 5. Camera

Orthographic (as in Phase 02.5) — keeps the object instrument-like, lets DOM labels align exactly with the poster, avoids perspective distortion on phones. Camera stays still; the object moves (balance, yaw ≤ ~0.22 rad), the environment carries information.

## 6. Interaction response

Pointer: subtle yaw follow on fine pointers; touch: drag adds yaw; selection: balance tips toward the chosen arm and settles (spring); transformation (Mein Kind): structure fades, elements stack on a measuring rod with growing size. All motion stops at rest (render-on-demand).

## 7. Static fallback

The SVG poster renders the same composition with the same palette (ceramic, anodized lines, enamel cobalt, coral, yellow) — first paint, no-WebGL, reduced motion, low power, Save-Data. The fallback must look *designed*, and it is also the screenshot/social image source.

## 8. Performance envelope

One canvas, DPR ≤ 1.75, lazy-loaded only when the stage is near the viewport and after idle; current chunk 238 KB gzip (three + R3F, not tree-shaken). Phase 06 target: tree-shake three, keep geometry procedural or < 100 KB compressed, no textures larger than needed (prefer none).
