# Motion System

Phase: 05
Date: 2026-10-07
Tokens: `--duration-*`, `--ease-*` in [`tokens.css`](../../src/design-system/tokens.css). Demonstrated in `/design-system` §10.

Character: **physical, calm, intentional, slightly playful, precise.** Motion answers a person's action; almost nothing moves on its own; nothing important depends on motion.

## 1. Categories

| Category | What moves | Example |
|---|---|---|
| **Micro motion** | Underlines, fills, key press | Primary key sinks 3 px; link underline thickens |
| **Navigation motion** | Sheets, section change | Menü sheet slides up; current-path measure line grows from the left |
| **Content reveal** | One orchestrated moment per page | Opening headline words rise 0.18 em in sequence (70 ms stagger) |
| **Object response** | Growing Mobile | Springs settle after pointer/selection (render-on-demand) |
| **State transition** | PRAXIS PULS, selection | Cross-fade + 6 px rise; age-scale ticks rise with a physical ease |
| **Discovery motion** | ENTDECKEN only | Gentle glow, step transitions; never looping attract loops |
| **Reduced motion** | Everything above | See §4 |

## 2. Timing

| Occasion | Token | Duration | Easing |
|---|---|---|---|
| Button press | `--duration-instant` | 90 ms | `--ease-standard` |
| Hover / focus | `--duration-quick` | 160 ms | `--ease-standard` |
| Status / selection change | `--duration-state` | 260 ms | `--ease-out` |
| Navigation, menu sheet | `--duration-nav` | 360 ms | `--ease-out` (in) / `--ease-in` (out, 240 ms) |
| Content reveal | `--duration-reveal` | 520 ms | `--ease-out` |
| Growing Mobile response | spring | 0.6–1.2 s to rest | spring (k 11–15, light damping) |
| Larger transformation (mobile → instrument) | `--duration-transform` | 720 ms | `--ease-physical` |

`--ease-physical` is a CSS `linear()` curve with ≈ 4 % overshoot — used only for object and discovery motion, never for utility UI. No bouncy springs on buttons or status.

## 3. Rules

1. Utility (status, phone, emergency, route, hours) is rendered statically and never animates in.
2. One reveal per page, at most; no fade-and-slide on every section.
3. No scroll hijacking, no scroll-linked choreography on utility pages, no parallax beyond the object's subtle pointer response.
4. No autoplay audio; no motion loops longer than 5 s without pause (the mobile settles to rest).
5. Durations differ by purpose — feedback is fast, transformation is slower.
6. Motion never moves a target while it is being pressed or read.

## 4. Reduced motion (designed, not switched off)

| Normal | Reduced |
|---|---|
| Key sinks 3 px | Edge thins to 1 px, no translation |
| Status cross-fade + rise | Opacity only (160 ms) |
| Headline reveal | No animation — text present immediately |
| Age ticks rise with physical ease | Opacity change only |
| Growing Mobile WebGL with springs | Designed static poster (same composition), instant state swap |
| Menü sheet slides | Appears with opacity |
| Hover nudge (help topics) | Colour change only |

Implemented per component in CSS (`@media (prefers-reduced-motion: reduce)`) plus the existing 3D gate (`useEnhancement`), not as a global "0 s" override.
