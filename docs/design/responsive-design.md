# Responsive Design

Phase: 05
Date: 2026-10-07
Builds on: [mobile-priorities.md](../ux/mobile-priorities.md). Verified with `scripts/ds-capture.mjs` (44 captures, metrics in `docs/reviews/phase-05/metrics.json`).

Mobile is designed first and on its own terms; desktop adds width for asymmetry and editorial pacing.

## 1. Breakpoints

| Range | Name | Chrome | Grid | Notes |
|---|---|---|---|---|
| < 600 px | Phone | Dock (bottom), name only on top | 4 columns | One column of content; actions stack |
| 600–899 px | Tablet portrait / large phone landscape | Dock | 6 columns | Two-column content where useful |
| ≥ 900 px | Desktop / tablet landscape | Sticky header with paths + utilities | 12 columns | Asymmetric compositions (7 + 5, 8 + 4, 1 + 7 + 4) |
| `max-width: 20em` | Large system text | Dock becomes 2 × 2 | — | Responds to the user's base font size, not to device width |

## 2. Phone composition (360 / 390 / 430)

- Order: identity → status → primary action → secondary action → (instrument) → content → footer; dock fixed, early in DOM order.
- Side gutter 16 px at 360, growing fluidly.
- Display type scales down (Display L ≥ 38 px); status headline fits "Akutsprechstunde" on one line at default size.
- Actions are full labels (no icon-only buttons), ≥ 48 px, wrap to two lines if needed.
- Tables become blocks (rows as grids); no horizontal scrolling anywhere.
- Hover effects are optional sugar; every interaction works by tap.

## 3. Desktop composition

- Sticky header (grows with text instead of clipping).
- Section intro rhythm 1 + 7 + 4 (index · title · lede); content max 76 rem; entries up to 90 rem.
- Status hero 9 columns + state context 3; PULS matrix 4 columns.

## 4. Large text and zoom

- All sizes in rem (or clamp with rem floors) → scale with user text size.
- Containers grow: no fixed heights on header, chips or buttons.
- Every grid track is `minmax(0, 1fr)`; flex items that hold text may shrink; no `white-space: nowrap` on anything longer than a word.
- Verified: no horizontal overflow at 200 % root text on 390 px and 1440 px (after fixes in this phase). With 200 % text the dock labels are tight on a 390 px phone; with a real enlarged system font the 2 × 2 dock applies.

## 5. Orientation

Portrait first; landscape phones use the same order with the object (when present) reduced or beside the status, never above it. `svh` units, no `100vh`.

## 6. Low performance

Utility in server HTML; fonts 186 KB (two Newsreader styles + Instrument Sans, Latin); JS 143 KB baseline; 3D only on capable devices when in view (+238 KB). No preloader, no video, no third-party requests.

## 7. Testing matrix (minimum per release)

360 × 800 · 390 × 844 · 430 × 932 · 1440 × 900 · 1920 × 1080 · 200 % text (phone + desktop) · reduced motion · no WebGL · keyboard only · one real low-end Android · VoiceOver/TalkBack.
