# Accessibility Principles

Phase: 03
Date: 2026-10-07
Target: **WCAG 2.2 AA** for every page, including ENTDECKEN. Related: [success-criteria.md](../product/success-criteria.md) A1–A5, [mobile-priorities.md](mobile-priorities.md).

Rule zero: **essential content never depends on hover, canvas, WebGL, dragging, audio or animation.**

---

## 1. Structure and semantics
- `lang="de"`; one `h1` per page; heading levels without gaps.
- Landmarks: `header`, `nav` (labelled: "Hauptnavigation", "Schnellzugriff", "Bereichsnavigation", "Brotkrumen"), `main`, `footer`.
- Real elements: links for navigation, buttons for actions, radio groups for age ranges, `details`/disclosure pattern for expandable content.
- Lists are lists; tables only for genuinely tabular data (e.g. weekly schedule), with headers.

## 2. Keyboard
- Everything operable by keyboard; visible focus (≥ 3 px, high contrast) on every interactive element.
- Logical focus order (see navigation-model.md §13); skip link "Zum Inhalt springen".
- Menü sheet: focus moves in on open, is contained while open, returns to the trigger on close; `Esc` closes.
- Growing Mobile: arms reachable as normal links/buttons in DOM order Heute → Mein Kind → Praxis → Entdecken; no keyboard trap in the canvas (canvas is `aria-hidden`, not focusable).
- No keyboard shortcuts that conflict with assistive technology.

## 3. Screen readers
- Status is text, never only colour/shape; dots are decorative (`aria-hidden`).
- PULS changes are not announced automatically on load; user-initiated changes (selection on Start, age choice) use a polite live region.
- `tel:` links carry full names ("Praxis anrufen: 03476 851157", "Notruf 112 anrufen").
- Times and dates written for speech ("bis 12:00 Uhr", "bis Freitag, 7. August"); no "12h", no "Mo–Fr" abbreviations in critical sentences (full forms or `<abbr>` with expansion).
- Images: meaningful alt text for people and rooms; decorative images and the 3D object `aria-hidden`.
- No split-letter typography (Phase 02 M19).

## 4. Touch and pointer
- Targets ≥ 44 × 44 px (target 48), spacing ≥ 8 px (WCAG 2.5.8 exceeded).
- No hover-only information; no drag-only controls (2.5.7); pointer cancellation respected (2.5.2).
- Tap alternatives for every gesture in ENTDECKEN.

## 5. Motion and audio
- `prefers-reduced-motion`: no sway, no transitions beyond instant state changes; poster instead of WebGL.
- Any automatic motion > 5 s can be paused or stops by itself (2.2.2): the Growing Mobile settles to rest.
- No flashing content (2.3.1).
- Audio only on explicit request, default off, visible control (ENTDECKEN).

## 6. Visual design
- Text contrast ≥ 4.5:1 (body), ≥ 3:1 (large text, UI components, focus indicators).
- Colour never the only carrier: status = word + (optional) dot; emergency = word + icon + colour; links underlined in running text.
- Cobalt used for interactive elements must meet contrast on the canvas (a darker text cobalt exists for small link text, as in the lab).
- Forced-colours / Windows high-contrast mode: status words, focus outlines and borders remain visible; decorative backgrounds may disappear.

## 7. Large text, zoom, reflow
- Works at 200 % text and 400 % zoom (reflow at 320 CSS px) without loss of content or function.
- Containers grow with text (no fixed-height bars — fixed in `/lab/final`'s utility layer).
- Line length ≤ ~70 characters for body text; generous line height.

## 8. Forms and controls
- V1 contains no data-collecting forms (no contact form, no booking — locked anti-patterns).
- Controls that exist (age range, disclosures, Menü, ENTDECKEN options) have visible labels, clear states (`aria-current`, `aria-expanded`, `checked`) and do not change context unexpectedly.
- If forms are introduced later: labels, error identification in text, suggestions, no time limits.

## 9. 3D alternatives
- Every 3D element has a designed static poster and DOM equivalents for all controls (Phase 02 M24).
- The 3D layer is optional: no-WebGL, reduced motion, low power and Save-Data all lead to the poster without loss of function.
- No information exists only in the 3D scene.

## 10. Language and cognition
- Plain German, short sentences, active voice; medical terms explained on first use.
- Consistent naming: an action keeps its name across the site (Anrufen is always "Anrufen").
- Predictable navigation: the same four paths, utilities and footer on every page.
- Phase 2 consideration: Leichte Sprache summary for Heute / Notfall / Neu bei uns (official health sites R19, R22 offer it).

## 11. Verification (later phases)
Automated checks (as in the lab capture), manual keyboard pass, screen readers (NVDA + Firefox/Chrome, VoiceOver iOS, TalkBack Android), 200 % text and 400 % zoom, forced colours, real low-end Android. Results recorded per release; the accessibility statement (P-92) reflects the actual state.
