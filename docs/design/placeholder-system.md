# Placeholder System

Phase: 05
Date: 2026-10-07
Component: [`src/design-system/components/media.tsx`](../../src/design-system/components/media.tsx) (`MediaFrame`). Demonstrated: `/design-system` §9.

Real photography does not exist yet. Placeholders must look **intentional** in prototypes and must never be mistaken for the real practice.

## 1. Visual pattern

- Sunken paper surface with a fine 135° hatch (reads as "drawing", never as "photo").
- Corner brackets inset 16 px (layout-proof marks).
- One abstract glyph per kind — geometry only, never faces or figures in action:

| Kind | Ratio | Glyph | Caption |
|---|---|---|---|
| Doctor / staff portrait | 4 : 5 | Head ring + shoulder arc (outline) | Porträt |
| Team photo | 3 : 2 | Three rings on a line | Teamfoto |
| Practice room | 3 : 2 | Rectangle with floor line and wall edge | Praxisraum |
| Child (conceptual) | 4 : 3 | Three overlapping soft discs (yellow, coral, lilac) on lilac-tinted ground | Kindheit (konzeptuell) |
| Video | 16 : 9 | Play triangle | Video |
| 3D asset | 1 : 1 | Skewed square outline | 3D-Objekt |

- Kind label bottom-left (caption, 600).
- Class badge top-right: **Platzhalter** (dashed outline), **KI-Konzept** (ink fill), **Echt** (green fill, development only).

## 2. Rules

1. PLACEHOLDER never appears on public production pages (publish validation blocks it, media-policy §3).
2. Placeholders are allowed in prototypes and review builds; the class badge is shown there.
3. No stock photos, no AI faces, no "temporary" real-looking images to fill space.
4. A confirmed person without a photo may be shown publicly with a designed neutral frame **without** the badge (trust-model §4); an unconfirmed person is not shown at all.
5. Accessible name of a placeholder states what it is ("Platzhalter: Porträt"); it is never described as a photo.
6. AI_CONCEPTUAL frames use the lilac-tinted ground so they are distinguishable from REAL even without the badge.

## 3. Development handling of media classes

| Class | Prototype / review | Production |
|---|---|---|
| REAL | Shown; badge "Echt" only in development | Shown (rights + consent verified) |
| PLACEHOLDER | Shown with badge | Blocked |
| AI_CONCEPTUAL | Shown with badge | Allowed only in conceptual contexts (ENTDECKEN, atmosphere); never on people/rooms |
