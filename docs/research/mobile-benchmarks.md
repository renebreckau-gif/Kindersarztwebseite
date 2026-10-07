# Mobile Benchmarks

Phase: 02 — World-Class Benchmark & Translation Research
Date: 2026-10-07
Mechanisms: [transferable-patterns.md](transferable-patterns.md). References: [benchmark-study.md](benchmark-study.md).

Principle: the mobile site is designed for its own situation (one hand, a child on the arm, a weak connection, an older phone) — not as "the desktop award site, stacked vertically".

---

## 1. Findings

| Topic | Evidence | Finding |
|---|---|---|
| Persistent action docks | R70, R71 (platform guidance, corroboration), R73 NN/g study (179 users: visual salience and information scent drive discoverability) | Visible, labelled bottom actions beat hidden menus for core tasks |
| Thumb-reachable actions | R05/R03 task menus are top-of-page on mobile (hard to reach one-handed) | Hospitals put tasks in reach of the eye, not the thumb — opportunity |
| Compact status | R04 per-location status line; R64 one-line flight status; R72 Live Activity concept | One line: state + time; detail on tap |
| Responsive 3D | R29 (21 canvases), R34 (3 canvases) | Award sites multiply GPU work; mobile needs one small canvas or none |
| Graceful 3D fallback | R30, R31, R36: empty DOM without the 3D layer; R78 poster pattern | Fallback must be a designed state, not an error |
| Reduced motion | R76; R35 accessibility options | Must exist as a full alternative, not just "less animation" |
| Low-performance devices | R31 preloader > 18 s in throttled tab | Long preloads are fatal on low-end Android |
| Navigation without hover | R29 explicit touch instructions ("TAP TO LOCK") | When an interaction is non-standard, it needs words; better: use standard interactions |

## 2. Mobile model for this project

### First viewport (portrait, ~360 × 640 baseline)
1. Practice name (small, not a hero)
2. PRAXIS PULS status sentence (M01/M02) — editorial size
3. Action row: Anrufen · Route (M03); Notfall in the dock
4. Growing Mobile: cropped/partial, below or beside the sentence; lazy-initialised when visible
5. Bottom dock (M20/M21): status chip · Anrufen · Notfall · Menü

Utility is complete without scrolling and before any script runs.

### Navigation
- Four paths reachable via "Menü" in the dock (full-screen overlay list with large text targets) and via path entries on the Heute page.
- No hover dependency; no drag-only interactions (WCAG 2.5.7); targets ≥ 24 px minimum per WCAG 2.5.8 — project target 44–48 px.
- The dock never hides on scroll (orientation for low-confidence users); content gets bottom padding so nothing is obscured (WCAG 2.4.11).

### Growing Mobile on mobile
- One canvas, small resolution scale, capped device-pixel-ratio, render-on-demand (only when interacting or settling).
- Rendering paused when off-screen or the page is hidden.
- No gyroscope.
- Poster first; 3D replaces it only after idle time and if the device passes a capability check; otherwise the poster stays.

### Reduced motion / low power / no WebGL
All three map to the same designed static state: poster + DOM labels, instant transitions. Data saver / slow connection → never download 3D assets.

## 3. Evaluated mobile mechanisms

| Mechanism | Recommendation | Note |
|---|---|---|
| M20 Bottom action dock | USE | Core of mobile utility |
| M21 Compact status chip in dock | USE | Expands to sheet |
| M22 Staged disclosure | USE | Week, rules, replacements |
| M15 Touch-responsive sway | USE | Tap/drag only, no gyro |
| M29 Orbital labels | Desktop/tablet only | Too tight for 360 px; dock replaces it |
| M14 Spatial transitions | Desktop first | Mobile: simple fade at most |
| M16 Scroll-linked 3D | PHASE 2 | High risk on mobile |
| M17/M18 World navigation, preloader | REJECT | — |

## 4. Mobile test protocol (for later prototype phases)
- One-handed: phone, Notfall, route reached with the thumb of the holding hand.
- Older Android device on throttled 4G: utility visible within the success-criteria budget (A4).
- Screen reader (TalkBack, VoiceOver): reading order = status → actions → paths → object description.
- 200 % text zoom: no clipping in dock or chip.
- Low digital confidence participants: can they find the four paths without explanation?
