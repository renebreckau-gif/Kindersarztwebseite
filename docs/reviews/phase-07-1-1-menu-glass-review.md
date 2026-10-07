# Phase 07.1.1 — Real Mobile Menu Overlay + Glass Dock

Date: 2026-10-07 · Screenshots: [`phase-07-1-1/screenshots/`](phase-07-1-1/screenshots/)

## Why Phase 07.1 was incomplete

07.1 reordered the dock but kept the Menü control as `<a href="#menue">`, and the start-page hero header still used `menuHref="#menue"`. "Menü" therefore remained an in-page jump to the footer sitemap: no overlay existed.

| | Old | New |
|---|---|---|
| Menü (dock, all pages) | `<a href="#menue">` → scrolls to the footer | `<button type="button" aria-expanded aria-controls="hauptmenue" aria-label="Menü öffnen">` → opens the Hauptmenü overlay |
| Menü (start-page hero header, ≥ 64em) | `<a href="#menue">` (`menuHref`) | the same shared button, same overlay |
| Footer | `id="menue"` sitemap | unchanged (structure only; no visible trigger points to it) |

## Implementation

**Overlay:** `src/site/mobile-menu.tsx` (+ `mobile-menu.module.css`), the only `"use client"` boundary added.
- A tiny store (`useSyncExternalStore`) lets every `MenuButton` open the one `MobileMenu` mounted per page (`SiteMenu` in `PageFrame` and on the start page).
- The hero header receives the button through a new `menu` slot on `EntryHeader`; the lab keeps its old anchor.
- **Primary:** Start `/`, Heute `/heute`, Mein Kind `/mein-kind`, Praxis `/praxis`, Entdecken `/entdecken`. Newsreader 34–52 px, 56 px rows, `aria-current` on the current section, `<nav aria-label="Hauptmenü">`, no `role="menu"`.
- **Utilities:** Sprechzeiten `/heute/sprechzeiten`, Notfall `/notfall` (restrained red), Anrufen `tel:+493476851157` (verified F15). Instrument Sans 16 px, visually secondary below a hairline.
- **Dialog:** `role="dialog"`, `aria-modal="true"`, portalled to `<body>`.
- **Focus and background:**
  - every other `body` child is `inert` while open — no clicks, no focus, no AT access; this covers the dock;
  - focus starts on "Schließen"; Tab and Shift+Tab are trapped;
  - Escape and the close button close it; focus returns to the trigger that opened it.
- **Scroll lock:** body `position: fixed; top: -scrollY`, the iOS-safe pattern. On close the exact position is restored with `behavior: "instant"`, overriding the site's smooth scrolling. A completed navigation closes the menu.

**Dock glass (one shared object, `src/site/chrome.module.css`):**
- **Body:** `linear-gradient(rgb(28 30 36 / .78), rgb(20 22 28 / .84))` with `backdrop-filter: blur(22px) saturate(1.25)`.
- **Edge and depth:** a 1 px `rgb(255 255 255 / .08)` edge, an inset highlight of `rgb(255 255 255 / .10)` and a broad low-contrast shadow.
- **Shape:** geometry and order (Menü · Heute · Notfall · Anrufen) are unchanged; the lab dock gets the same material.

**Overlay glass:**
- **Body:** `rgb(15 18 32 / .86)` with `backdrop-filter: blur(28px) saturate(.85)`, plus a faint warm daylight tint (radial `rgb(255 236 214 / .07)`).
- **Result:** the page reads as light, colour and shape only.

**Fallbacks:**
- **No `backdrop-filter`:** the dock is `rgb(23 26 29 / .94)` (the former solid) and the overlay `rgb(15 18 32 / .97)`.
- **`prefers-reduced-transparency` / `prefers-contrast: more`:** fully opaque.
- **`forced-colors`:** Canvas/CanvasText with borders.
- **Reduced motion:** no fade.

**Contrast:** worst case is pure white behind the glass.

| Element | Ratio |
|---|---|
| Dock labels #f3efe7 | ≈ 8.7 : 1 |
| Notfall #ffa69c | ≈ 5.3 : 1 |
| Overlay links #f3efe7 | ≥ 12 : 1 |
| Overlay utilities #dcdbe6 | ≈ 10 : 1 |
| Overlay Notfall | ≈ 6.6 : 1 |

Over the lilac, paper, plaster and night surfaces the values only improve.

## Tests

- `npm test` **87/87**. New `src/content/__tests__/menu-triggers.test.ts` (4 tests):
  - no public file (`app/(site)`, `src/site`, `src/content`) links or scrolls to `#menue` or uses `menuHref`;
  - the dock Menü is the shared button and comes first;
  - the start page passes the shared button to the hero header and mounts the overlay;
  - the trigger is an accessible `<button>` controlling a modal dialog with `<nav aria-label="Hauptmenü">` and all eight destinations.
- Build ✓, typecheck ✓.
- **Runtime scan:** 19 public routes × 360/1440 — 0 `a[href*="#menue"]`, exactly one visible Menü button on phones, no overflow, no target under 44 px.
- **Menu test, 360 × 800 `/`, 390 × 844 `/mein-kind`, 430 × 932 `/entdecken`:**
  - the overlay opens at scroll position 600 and the page stays visually at 600;
  - five primary links are fully visible without scrolling, each 56 px tall;
  - the dock is inert and covered; focus is on "Schließen";
  - Tab and Shift+Tab wrap; Escape closes;
  - the scroll position is restored exactly (600 → 600); focus returns to Menü; no `inert` remains.
- **Menu links (390):** Start, Heute, Mein Kind, Praxis, Entdecken, Sprechzeiten and Notfall each land on their route, with the overlay closed and the body lock removed. Anrufen is `tel:+493476851157`. The close button works.
- **Hero header (1440):** the visible header Menü is a `<button>` that opens the same overlay; Escape returns focus to it.
- **Keyboard (390, real keys on `/heute`):**
  - Tab to "Menü öffnen" shows the 3 px focus ring;
  - Enter opens the overlay with focus on "Schließen" and the URL unchanged;
  - nine Tabs cycle through all controls and stay inside;
  - Escape closes.

## Visual review

| Question | Answer |
|---|---|
| Does the dock still look like a heavy black bar? | **No** — smoked glass that picks up the page tone ([contact sheet](phase-07-1-1/screenshots/dock-glass-surfaces-390.png)). |
| Does the glass subtly react to the page behind it? | Yes: warmer over the hero photo, lighter grey over lilac and paper, deeper over night. |
| Readable on bright and dark sections? | Yes, all eight surfaces checked; contrast values above. |
| Premium rather than gimmicky? | Restrained: no glossy gradient, no bright edge, no glow, no glass icons. |
| Overlay connected to the same material world? | Yes — same smoked material at room scale, same hairlines, same typography as the site. |
| Overlay dark enough for calm navigation? | Yes (86 % night + 28 px blur). |
| Can the underlying page still be faintly perceived? | Yes, as soft colour and light (e.g. the hero's cobalt and warmth), not as content. |
| Is Notfall clearly identifiable? | Yes — warning icon plus restrained red in the dock and the overlay. |
| Does the dock still feel like utility rather than decoration? | Yes — same geometry, order and labels; only the material changed. |

**Confirmed:**
- No public Menü trigger uses `#menue`.
- The mobile dock is no longer fully opaque black.
