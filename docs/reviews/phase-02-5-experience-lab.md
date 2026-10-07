# Phase 02.5 — Signature Entry Experience Lab: Review

Date: 2026-10-07
Scope: first 5–10 seconds of the entry experience only. Internal lab, not the public homepage.
Status data: **demo fixtures only** (`src/lab/fixtures.ts`) — not practice data, visibly tagged "Demo-Daten" in every prototype.
Inputs: [strategy-lock.md](../product/strategy-lock.md), [phase-02-recommendations.md](../research/phase-02-recommendations.md), [signature-entry-research.md](../research/signature-entry-research.md), [praxis-puls-benchmarks.md](../research/praxis-puls-benchmarks.md), [mobile-benchmarks.md](../research/mobile-benchmarks.md).

No winner is chosen in this document. Scores are an internal first read for the human review.

---

## 1. What was built

| Route | Prototype | Core idea |
|---|---|---|
| `/lab` | Selector | Links to A, B, C and each demo state; no judgement |
| `/lab/a` | **A — Funktionales Growing Mobile** | Status statement left; large real-time 3D mobile asymmetric on the right; four arms carry real DOM labels Heute · Mein Kind · Praxis · Entdecken; choosing tips the balance; Mein Kind turns the object into a measuring instrument with four age stops |
| `/lab/b` | **B — Editorial Instrument** | Status set at very large editorial scale; a hairline day ruler (open state only); a small ink-toned 3D mobile beside a typographic index of the four paths — hovering/focusing a path highlights its element in cobalt |
| `/lab/c` | **C — Messlatte (2D/3D-Hybrid)** | A paediatric height chart on the wall: yellow measuring band with cm scale; four arms with hanging objects (CSS/SVG, spring physics, pointer-driven light and depth); no WebGL. Mein Kind turns the cm scale into four age bands |

URL parameters (all work without JavaScript): `?status=open|closed|unknown`, `?pfad=heute|mein-kind|praxis|entdecken`, `?3d=0` (force static rendering).

Shared across all three (identical content for fair comparison):
- **PRAXIS PULS** — inline statement (one status, one detail, one primary action) + desktop slim utility layer (status chip · Anrufen + number · Notfall · Menü) + mobile bottom dock (Anrufen · Heute · Notfall · Menü, 52 px cells).
- Three demo states: OPEN ("Praxis geöffnet / Heute bis 12:00 Uhr / Anrufen"), CLOSED ("Heute geschlossen / Nächste Sprechzeit ansehen / Notfall-Hinweise"), UNKNOWN ("Aktuelle Sprechzeiten / Informationen ansehen / Anrufen" — no status colour, no dot).
- Functional green only as a status dot; cobalt never signals a state; emergency red only for Notfall.
- Below the fold: minimal Sprechzeiten placeholder, Notfall (only 112 as verified fact; everything else explicitly "wird geprüft"), Menü.
- Typography: **Newsreader** (editorial serif, optical sizes) + **Instrument Sans** (precise neutral sans), self-hosted via `next/font` — no runtime request to Google (verified).

Deliberately **not** built: acute-consultation state (FB-01…FB-03 unresolved), real hours, team, services, CMS, child experiences, any medical content.

## 2. Screenshots

Location: [`docs/reviews/phase-02-5/screenshots/`](phase-02-5/screenshots/) (34 images, captured headless with `scripts/lab-capture.mjs`).

| Required | A | B | C |
|---|---|---|---|
| 1440 × 900 | `a-open-1440x900.png` | `b-open-1440x900.png` | `c-open-1440x900.png` |
| 390 × 844 | `a-open-390x844.png` | `b-open-390x844.png` | `c-open-390x844.png` |
| UNKNOWN, mobile | `a-unknown-390x844.png` | `b-unknown-390x844.png` | `c-unknown-390x844.png` |

Additional test matrix per prototype: 1920 × 1080, 430 × 932, 360 × 800, CLOSED mobile, Mein Kind transformation (desktop + mobile), reduced motion (mobile), 4× CPU throttle (mobile). Raw measurements: [`phase-02-5/metrics.json`](phase-02-5/metrics.json).

## 3. Measurements

Environment and caveats: headless Chrome 155 on a Windows desktop with a desktop GPU (NVIDIA RTX 2060 via ANGLE/D3D11). CPU throttling (4×) was used to approximate a mid-range phone CPU, but **GPU cost on low-end phones is not represented**. No real-device test was possible in this phase.

### 3.1 JavaScript transfer (gzip, from network)

| | Initial JS | Lazy JS (after idle) | Notes |
|---|---|---|---|
| Lab index (baseline React/Next) | 138.4 KB | — | Framework baseline |
| A | 143.3 KB | **+238 KB** | 3D chunk loads only after idle, only on capable devices, never with reduced motion |
| B | 143.2 KB | **+238 KB** | Same 3D chunk for a ~300 px object |
| C | 140.6 KB | 0 | No WebGL dependency |

The lazy 3D chunk is 898 KB raw / 235 KB gzip (three.js + React Three Fiber). Three.js is currently pulled in as a full namespace; tree-shaking (R3F `extend` with explicit classes) could cut this substantially later — not optimised in this phase by design.

### 3.2 Runtime

| | Long tasks, load only (4× CPU, 390 px) | Long tasks, load + pointer sweep (4× CPU, 390 px) | Frame timing during pointer sweep | Rendering at rest |
|---|---|---|---|---|
| A | 129 ms (2 tasks) | 196 ms | median 16.7 ms, p95 16.7 ms | Stops (render-on-demand; springs settle in ~4–5 s) |
| B | 60 ms (1 task) | 142 ms | median 16.7 ms, p95 16.8 ms | Stops |
| C | 99 ms (1 task) | 98 ms | median 16.7 ms, p95 16.7 ms | Spring loop sleeps when at rest |

All three hold 60 fps in this environment; the difference between A/B and C will appear on weak mobile GPUs, which must be tested on a real low-end Android device before any decision.

### 3.3 Automated layout and accessibility checks (all viewports, all states)

- No horizontal overflow at 360 / 390 / 430 / 1440 / 1920 px.
- Status title, primary action and dock (mobile) / utility layer (desktop) are fully inside the first viewport in every capture.
- 0 interactive targets under 44 px in the first viewport (automated check).
- German long-word stress test inside the status headline at 360 / 390 / 430 px ("Akutsprechstunde", "Sprechzeiten", "Kinderarztpraxis", "Akutsprechstunde ab 10:00 Uhr", "Geänderte Sprechzeit"): no overflow in any prototype. B's very large type hyphenates "Akut-sprechstunde" and "Kinderarzt-praxis" onto two lines at 360–390 px.
- Reduced motion: A and B show the designed SVG poster (no canvas, no 3D download); C shows static objects.
- Server HTML (before any JavaScript) already contains status, `tel:` links, path navigation and the poster.

## 4. Evaluation

Scale 1–10, **10 = best**. For PERFORMANCE RISK and TECHNICAL COMPLEXITY, 10 = lowest risk / lowest complexity.

| Criterion | A | B | C |
|---|---|---|---|
| WOW | 8 | 6 | 7 |
| IMMEDIATE UTILITY | 9 | 10 | 9 |
| INTUITIVENESS | 7 | 8 | 8 |
| BRAND FIT | 8 | 9 | 8 |
| MOBILE QUALITY | 8 | 8 | 9 |
| ACCESSIBILITY | 8 | 9 | 9 |
| PERFORMANCE RISK | 5 | 5 | 9 |
| TECHNICAL COMPLEXITY | 5 | 6 | 8 |
| SCALABILITY TO THE FULL WEBSITE | 8 | 9 | 7 |

Rationale per prototype:

### A — Funktionales Growing Mobile
- **WOW 8:** the lit, swaying sculpture beside the status is the most unexpected thing on a practice site; it reads as kinetic sculpture / scientific toy, not mascot. Not a 9–10 yet: geometry is still simple primitives, materials are flat-ish, and the entry sway is subtle.
- **Utility 9:** status, number and action are the first content; the object never covers them.
- **Intuitiveness 7:** labels sit under the elements, but whether parents read arms as *navigation* in 5 s is unproven (W1 from Phase 02). On mobile the 2 × 2 colour-keyed path buttons make it explicit.
- **Mein Kind transformation:** convincing — the mobile collapses onto a measuring rod and the elements become growing age stops. Strongest "functional, not decorative" moment of the lab.
- **Performance 5 / complexity 5:** +235 KB gzip lazily, WebGL on mobile; mitigated by render-on-demand, idle loading, capability checks and poster fallback — but real-device GPU cost is unknown.

### B — Editorial Instrument
- **WOW 6:** quiet and expensive; memorability comes from scale and precision rather than an object. The small ink mobile is elegant but at ~300 px it does not create the "noch nie gesehen" moment on its own.
- **Utility 10:** the status is the loudest element on the page; the day ruler makes "until 12:00" instantly legible (shown only for verified/open state).
- **Brand fit 9:** the purest expression of Warm Editorial + Cobalt; risk of reading slightly adult/boutique for a paediatric practice.
- **Performance 5:** pays the full 3D cost for a small object — the weakest cost/benefit ratio of the lab; the same object as SVG would deliver ~90 % of B's effect.
- Hyphenation of long German words in the giant headline at 360–390 px is a real readability risk once real states (e.g. Akutsprechstunde) exist.

### C — Messlatte
- **WOW 7:** the height chart is instantly paediatric without being childish; distinctive and memorable. Less "technology wow" than A.
- **Mobile 9:** the strongest mobile composition — the chart turns horizontal, objects hang from it, labels sit under them with 48 px targets. Not a stacked desktop.
- **Performance 9 / complexity 8:** no WebGL, ~2 KB more JS than baseline, spring loop sleeps at rest.
- **Scalability 7:** perfect for Mein Kind (age bands) and for growth themes; less obviously extendable to Praxis/Entdecken as instruments. The cm scale is decorative and must never be read as a growth norm (no medical meaning attached).
- Mein Kind mobile state is functional but visually busier than A's.

## 5. What works best

### WHAT WORKS BEST IN A
- The object has a real job: four labelled paths, a visible balance change on selection, and a credible instrument transformation (Mein Kind).
- Shared geometry drives 3D scene, SVG poster and DOM labels — poster and canvas align exactly, so the 3D layer fades in without any jump; reduced motion/no-WebGL gets a designed state, not a fallback.
- Asymmetric desktop composition keeps utility primary while the object owns half the stage.

### WHAT WORKS BEST IN B
- Typography as utility: the status sentence at editorial scale is the clearest PRAXIS PULS rendering of the lab.
- The hairline day ruler: a calm, precise time instrument that explains "bis 12:00 Uhr" at a glance.
- The typographic index with object highlight: accessible conventional navigation that still connects to the signature object.

### WHAT WORKS BEST IN C
- The Messlatte is the most paediatric-specific metaphor — rooted in the practice's own vernacular, not in web trends.
- Best mobile translation: horizontal chart with hanging objects and thumb-sized labels.
- Near-zero technical cost and full resilience (no WebGL, no preloader, no lazy chunk).

## 6. ELEMENTS THAT COULD BE COMBINED

| Combination | Why |
|---|---|
| **A's 3D mobile + C's height chart as the Mein Kind instrument** | A's object transforms into C's Messlatte instead of a plain rod: one coherent story ("Gesund groß werden"), stronger than either alone |
| **B's typographic status + B's day ruler in A or C** | Best utility rendering; ruler appears only for verified states |
| **C's mobile composition for A** | Horizontal chart/rail with hanging objects solves A's mobile density; dock unchanged |
| **B's index list as the accessible navigation companion of A's object** | Conventional, scannable path list plus signature object, linked by highlight |
| **C's pointer-driven light/shadow on A's SVG poster** | Gives the no-WebGL / low-power state life without WebGL cost |
| **C's CSS approach for B's small object** | Removes B's poor 3D cost/benefit ratio |
| **Shared: poster-first, render-on-demand, DOM labels from one geometry** | Infrastructure decision independent of the art direction |

## 7. Mobile observations
- All three keep status, action and dock in the first viewport at 360/390/430 px.
- The dock (Anrufen · Heute · Notfall · Menü) works identically everywhere; "Heute" carries the status dot (none for UNKNOWN).
- A: object sits under the status, then a 2 × 2 colour-keyed path grid; the second grid row is partly under the dock at 390 × 844 (visible on scroll).
- B: object + index side by side reads well; giant type hyphenates long words.
- C: horizontal Messlatte is the most native mobile solution; Mein Kind state is busy.

## 8. Accessibility observations
- Utility is server-rendered HTML; links work without JavaScript (anchors / `tel:` / query parameters).
- All path labels are real text links (`aria-current` for selection); age choice is a real radio group (`fieldset`/`legend`).
- Canvas and SVG poster are `aria-hidden`; no information exists only in the object.
- Focus visible (3 px cobalt); skip link; landmarks: header/nav (utility), main, nav (dock), footer (lab toolbar).
- Selection changes are announced through a polite live region; no announcements on load.
- Not yet tested: real screen readers (VoiceOver/TalkBack/NVDA), 200 % zoom on all states, Windows forced-colours mode, real low-end devices. These are required before any decision becomes final.

## 9. Open issues found in the lab
1. Real-device GPU/battery test for A and B on a low-end Android.
2. 5-second comprehension test with parents: do they read A's arms / C's arms as navigation?
3. Three.js tree-shaking if a WebGL variant continues.
4. B's headline size vs. German hyphenation for real status words.
5. A's mobile path grid partially below the dock at 390 × 844.

## 10. How to run

```
npm install
npm run build
npm run start -- -p 3100
node scripts/lab-capture.mjs   # screenshots + metrics into docs/reviews/phase-02-5/
```
