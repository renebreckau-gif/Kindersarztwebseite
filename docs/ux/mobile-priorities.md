# Mobile Priorities

Phase: 03
Date: 2026-10-07
Reference: `/lab/final` (tested at 360 × 800, 390 × 844, 430 × 932, 200 % root text — see [phase-02-5-experience-lab.md](../reviews/phase-02-5-experience-lab.md) §11).

Mobile is a product in its own right. Order, density and controls are designed for one hand, a child on the arm, a weak connection and possibly large system text — not derived from the desktop layout.

---

## 1. Must be visible immediately (first viewport, every common phone)

On **Start**, at 360 × 800 without scrolling, with default and enlarged text:
1. Practice identity (name, small)
2. PRAXIS PULS: state word + one time/detail (or the neutral UNKNOWN fallback)
3. Primary action (Anrufen / Notfall-Hinweise / Vertretung anzeigen — state-dependent)
4. Dock: Anrufen · Heute · Notfall · Menü

On **every other page**: `h1`, the first meaningful content line, and the dock.

On **P-15 Notfall**: "Bei Lebensgefahr: 112" and its call button above everything else.

## 2. May move below the fold

- Growing Mobile (Start) — it follows the status and action, capped at ~36 svh so it can never push them out (as in `/lab/final`)
- Day ruler (may sit just below the action)
- Path buttons (2 × 2) on Start
- Brand claim ("Gesund groß werden.")
- Week schedule, explanations, replacement addresses (behind disclosures)
- Footer

## 3. Persistent actions

The dock (Anrufen · Heute · Notfall · Menü) on every page, including ENTDECKEN; never hides on scroll; content gets bottom padding equal to dock height + safe area so nothing is obscured (WCAG 2.4.11).

## 4. Touch targets

| Element | Minimum | Target |
|---|---|---|
| Any interactive element | 44 × 44 px | 48 × 48 px |
| Dock cells | 52 px high, 1/4 width | — |
| Primary action (call) | 52 px high | full label + number |
| Menü sheet rows | 48 px | 56 px for path rows |
| Spacing between adjacent targets | 8 px | — |

No interaction depends on hover, long-press, drag or multi-finger gestures (WCAG 2.5.1, 2.5.7). Every swipe has a tap alternative.

## 5. Long German words

Terms to test in every component that can hold them: **Akutsprechstunde, Sprechzeiten, Kinderarztpraxis, Vorsorgeuntersuchung(en), Vertretungspraxis, Früherkennungsuntersuchung, Bereitschaftsdienst, Kinder- und Jugendmedizin**.

Rules:
1. `lang="de"` on `<html>`; `hyphens: auto` for headings and body text.
2. Soft hyphens (`&shy;`) in CMS-managed headings for known long compounds where automatic hyphenation breaks badly (editor guideline).
3. **Never truncate critical terms with an ellipsis**; navigation labels wrap to two lines instead.
4. Dock labels stay single short words (Anrufen, Heute, Notfall, Menü) — no compound nouns in the dock.
5. Headline sizes on mobile are chosen so that "Akutsprechstunde" and "Kinderarztpraxis" fit one line at 360 px in default text size (verified for the `/lab/final` status headline); with enlarged text, hyphenation is acceptable, overflow is not.
6. Buttons allow two-line labels; minimum height grows with content.

## 6. 3D behaviour on mobile

- Static designed poster first; WebGL layer only when the object is near the viewport, after idle, and never with reduced motion, Save-Data, no WebGL or weak hardware (implemented in `/lab/final`).
- One canvas maximum, capped device-pixel-ratio, render-on-demand (no frames at rest), paused when off-screen.
- No gyroscope / device-orientation permission prompts.
- Touch: tap on labels/path buttons; optional drag to sway — never required.
- The object carries no information that is not also in the DOM.

## 7. Orientation changes

- Portrait is the primary design; landscape on phones (e.g. 844 × 390) must keep status + action + a reachable dock: in landscape the object is hidden or reduced to its poster beside the status, never above it.
- Tablets: portrait uses the mobile model (dock), landscape (≥ 900 px) the desktop model (header utilities).
- No layout depends on `100vh`; use small-viewport units (`svh`) so browser chrome does not push content.
- State (selected age range, open disclosures) survives rotation.

## 8. Small phones and large text

| Situation | Behaviour |
|---|---|
| 320–359 px width | Same order; headline scales down; path buttons switch to one column; dock labels may wrap below icons |
| Large system text / 200 % zoom | Status, action and dock remain in the first viewport on Start (verified at 200 % root text in `/lab/final`); dock grows in height rather than truncating; phone number may wrap inside the call button (refine in design phase) |
| Reflow (WCAG 1.4.10) | No horizontal scrolling at 320 CSS px, except for content that requires two dimensions (none in V1) |
| Text spacing (WCAG 1.4.12) | Layouts tolerate increased line/letter/word spacing |

## 9. Low-performance behaviour

- Utility renders from server HTML before any script.
- 3D never loads on devices reporting ≤ 2 CPU cores, low memory or Save-Data; poster stays.
- No preloader, no autoplay video, no web fonts beyond two self-hosted families with `display: swap`.
- Budgets from success-criteria A4/A5 apply; the 3D chunk (currently 235 KB gzip, not tree-shaken) is loaded only on demand.
- Network failure on enhancement → poster remains; no error UI for decorative layers.

## 10. Mobile-specific content order

| Page | Mobile order |
|---|---|
| Start | Name → PULS → action → (day ruler) → object → path buttons → claim |
| Heute | State + reason → primary action → active notices → closure/Vertretung → today's slots → Route → Sprechzeiten der Woche |
| Notfall | 112 → 116117 (if confirmed) → Giftnotruf (if verified) → facilities (verified) → practice phone |
| Mein Kind | Age range control → topics for that range → "In der Praxis" |
| Neu bei uns | Wo? → Wie erreichen? → Termin? → Ankunft → Mitbringen → Zugang → Wer? (confirmed items only) |
