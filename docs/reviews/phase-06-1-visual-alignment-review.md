# Phase 06.1 — Visual Alignment Review

Phase: 06.1 — Visual Alignment Pass (correction pass, no new direction)
Date: 2026-10-07
Route: `/lab/final` (internal, `noindex`)
Visual source of truth: approved reference, middle variant
Previous review: [phase-06-signature-entry-review.md](phase-06-signature-entry-review.md)
Screenshots and metrics: [`phase-06-1/screenshots/`](phase-06-1/screenshots/) · [`phase-06-1/metrics-final.json`](phase-06-1/metrics-final.json)

Unchanged in this pass: PRAXIS PULS logic and wording, the four paths, the dock, header navigation, progressive enhancement and fallbacks, data (demo status with "Demo" tag; phone = F15, pending LB-00).

---

## 1. Scores (1–10)

| Criterion | Phase 06 | **Phase 06.1** | Note |
|---|---:|---:|---|
| REFERENCE ALIGNMENT | 8 | **8.5** | Window, floor, bowl and a seated child looking up: the reference's whole scene is now present, not just its palette. |
| WINDOW / LIGHT QUALITY | 7 | **8** | A real arched window (reveal, frame, mullions, sill, garden haze, sun hotspot) is the readable light source; sunlight is thrown onto the floor. Still vector light, not photographic. |
| SPATIAL DEPTH | 7 | **8** | Four planes: wall bloom → window reveal/glass → object in front with wall shadow → floor with child, bowl and contact shadows. |
| CHILD INTEGRATION | — | **7.5** | Present, calm, small, secondary, lit from the window, looking up at the mobile. Stylised vector — reads clearly as a child, but less tender than a photograph. |
| OBJECT INTEGRATION | 7 | **8** | The mobile now hangs in front of the window, casts onto the reveal, and its lowest element (Mein Kind) hangs right above the child's gaze. |
| PRACTICE PULSE CLARITY | 9 | **9** | Unchanged; still first after the statement on every size. |
| FOUR-PATH INTEGRATION | 7 | **8** | Panel, border, radius and drop shadow removed; now a lit ledge with a top light-line and fading separators. |
| MOBILE QUALITY | 8 | **8** | Scene (window + mobile + child) visible beside the headline; all critical utility still in the first viewport at 360/390/430. |
| ACCESSIBILITY | 8 | **8** | No regressions; child and room are `aria-hidden` decoration; no new interactive elements. |
| PERFORMANCE | 8 | **8** | +2.3 KB initial JS (inline SVG), no images, no new requests; frames unchanged. |
| **OVERALL SIGNATURE IMPACT** | 8 | **8.5** | It now reads as a scene in a pediatric practice, not as a layout with an object. |

---

## 2. What changed?

- **New `src/lab/final/room-scene.tsx`:** `RoomBackdrop` (wall bloom, arched window with wall thickness, glass with garden haze and sun hotspot, frame and mullions, sill, floor, projected sunlight patch with mullion shadows, ceramic bowl) and `SeatedChild` (small seated child, seen from behind, head tilted up).
- **Object zone → scene:** backdrop, mobile stage and child are composed in one scene box (`.scene`, 1000 : 1100). Backdrop edges dissolve into the page via CSS masks, so there is no visible rectangle.
- **Page light:** the old CSS arch shape was removed (the window is now real); a broad daylight wash around the window position remains.
- **Four paths:** translucent card panel → lit ledge (gradient glass, one light-line on top, separators that fade at both ends, no radius, no drop shadow).
- **Mobile:** the scene is anchored to the right edge so the window, the mobile and the child stay visible beside the headline.
- **Capture script:** scene close-ups at 1440 and 390 (`clipSelector`).

## 3. What now better matches the approved reference?

- The **architectural light source** is visible: an arched window behind the object, light entering from the upper right, a bright opening, shaded reveal.
- **Sunlight on the floor** (a projected patch with mullion shadows) and soft contact shadows to the left, consistent with the light direction.
- **A child seated low, looking up at the mobile**, small and secondary, right of centre — the reference's emotional relationship between child and object.
- The **ceramic bowl on the floor**, as in the reference.
- The **four paths** feel like part of the room (a lit ledge) rather than a row of website cards.

## 4. What still does not match?

- **Photographic quality.** The reference is a rendered/photographed room; this is vector light. Sun patches, bloom and soft floor reflections are approximated.
- **The child.** The reference child is a photographic three-quarter view with a face; ours is a stylised figure from behind. Intentionally: see §6.
- **Scale on mobile.** In the reference the scene dominates; here it sits in the right column at ~200 px so status, phone and Notfall stay first.
- **The floor** is implied by gradients only; no wood/stone texture, no reflections.
- **Window outside view** is a warm haze; the reference hints at a real garden.

## 5. Was the child added successfully?

Yes, as required. The child is:
- **present** on every viewport (desktop ~150 px tall, mobile ~60 px), in OPEN, UNKNOWN, Mein Kind, reduced-motion and no-3D states;
- **small and low**, seated cross-legged on the floor, clearly secondary to typography and utility;
- **calm and warm**: coral-rose sweater, oat trousers, warm socks, brown hair, rim light from the window;
- **integrated**: lit from the same window, contact shadow to the left, gaze directed at the yellow half-disc (the Mein Kind element) — and in Mein Kind mode it sits beside the measuring rod;
- **not stock, not photographic, not AI-generated**: a hand-built vector figure seen from behind. No face is drawn, so it cannot look uncanny or commercial, and it represents no real child (no consent issue).

## 6. Why is the child currently static?

- The brief for this pass asked for a static image presence first; pointer-follow is explicitly deferred.
- A static figure carries no motion risk: it does not compete with the status or the mobile, needs no reduced-motion alternative, and adds no JavaScript.
- **Possible future enhancement:** a very small head turn (±4°) toward the selected path's element, driven by the same pose springs as the mobile and disabled under reduced motion. Pointer-following by the child is not recommended — it would feel surveilling rather than warm.

## 7. What still feels too website-like?

- The **headline + pill + button stack** on the left is honest UI on a plain wall; the room lives only on the right half. A full-bleed room (window light reaching across the text side) would integrate further.
- The **ledge** is still a horizontal UI band across the full width.
- The **"Sprechzeiten ansehen"** link under the actions reads like a web link.
- **Below the fold** (lab sections, toolbar) is plain lab chrome — out of scope.

---

## 8. Mobile observations

- 360 × 800, 390 × 844, 430 × 932: identity, status pill, Anrufen, Notfall and the dock are all in the first viewport (audit: `status`/`action` true; no overflow; no small targets).
- The scene (window, mobile, child) sits in the right column, anchored to the screen edge, beside the three-line headline; it never pushes utility down.
- 200 % text: the statement column keeps its longest word; the scene shrinks; no overflow; status moves below the first viewport (as in Phase 06), dock remains.

## 9. Accessibility observations

- Room and child are decorative inline SVG with `aria-hidden="true"` and `focusable="false"`; no alt-text noise, no new tab stops.
- Heading structure, landmarks, live region, radios, focus rings unchanged.
- The ledge keeps the 2 × 2 (mobile) / 4-column (desktop) link grid with ≥ 48 px targets and `aria-current`.
- Reduced motion and `?3d=0`: the identical scene renders (poster object + room + child), no canvas.
- The headline is lifted above the scene layer (`z-index`) so the backdrop wash can never cover text.

## 10. Performance observations

- No images, no fonts, no new requests. Initial JS 144.3 → 146.6 KB (inline SVG markup); lazy 3D unchanged (241.5 KB, only when allowed).
- SVG uses three blur filters (bloom/haze/shadows) on a static element: painted once.
- Median frame 16.7 ms, p95 16.8 ms at 1440 and at 390 with 4× CPU throttle.
- The first capture of each run (1920) shows a one-off ~1.5 s long task (cold WebGL/shader start in the headless browser).

## 11. What remains open

- Final photographic or rendered **room plate** and **object model** (Phase 06 §6) would close the remaining realism gap.
- A **real-photography** child presence (consented, documentary) remains the long-term option; the vector child is a deliberate, safe interim.
- Phase 06 token additions (pill, glass, room tones) still to be promoted to `tokens.css` after human approval.
- Real devices and screen readers not yet tested.

## 12. Files

- `src/lab/final/room-scene.tsx` (new)
- `src/lab/final/signature-object.tsx` — scene composition (backdrop, stage, child)
- `src/lab/final/signature.module.css` — scene layout and masks, paths ledge, mobile anchoring, daylight wash
- `scripts/lab-capture.mjs` — scene close-ups, clip support
- `docs/reviews/phase-06-1/…` — 22 screenshots + metrics
