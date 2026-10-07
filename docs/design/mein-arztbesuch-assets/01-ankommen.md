# D1-01 — Ankommen

Brief for scene 01 of `/entdecken/mein-arztbesuch` · Phase 08 · 2026-10-07 · **not produced**
Shared spec (master 2400 × 1800, 12 × 9 grid of 200 px cells C1–C12 / R1–R9, floor line y 1332, key light upper right, safe zone x 240–2160 / y 144–1656): [00-overview.md](00-overview.md) · World rules: [../mein-arztbesuch-art-direction.md](../mein-arztbesuch-art-direction.md)
Content: `src/content/discovery.ts` → scene `ankommen` · File names: `d1-01-ankommen-<layer>@<width>.<ext>`

## 1. PURPOSE

Opens the story. Establishes the stage, the light, the two figures and the arch, so every later scene is read as part of one visit. Job: *the visit begins; we go in together.*

## 2. STORY MOMENT

Child and companion stand on the floor just before the threshold of the arch, hands joined. The child's front foot points into the warm light that spills out of the arch. Copy: „Wir sind da. Wir gehen hinein und sagen Hallo.“

## 3. EMOTION

Curious anticipation, at ease. The child's head is slightly raised toward the light inside the arch. Shoulders are relaxed, and the free hand hangs loosely.

## 4. PRIMARY SUBJECT

**Door arch** (warm ceramic, opening ratio 1 : 1.9), C7–C10 × R1–R7: outer x 1200–2000, top y 150, standing on the floor line y 1332. The inside of the opening glows warm (#FFF0DC → transparent toward the edges). There is no door leaf, frame, sign or handle.

## 5. SECONDARY OBJECTS

- **Child** (full figure, ~900 px tall, y 432–1332), centred at x 820 (C4–C5), ¾ back view turned toward the arch; yellow top, dark trousers, short or tied hair.
- **Companion**: standing to the left of the child at x 380–700 (C2–C4), cut by the top edge at chin height. Visible: cobalt jacket, dark trousers, a coral shoulder bag; the right hand holds the child's left hand at x ~720, y ~980.
- A **warm light pool** on the floor in front of the arch (fx), reaching the child's feet.

## 6. ENVIRONMENT

Night stage only: dark gradient background, floor plane with a soft horizon at y 1332, the arch. No walls, windows, signs, house number, plants, steps or street.

## 7. COMPOSITION

Figures left of centre, arch right of centre. The eye travels child → hand → light → arch. The right 15 % (C11–C12) and the top band R1 above the figures stay calm.

## 8. CAMERA ANGLE

Child eye height (y ≈ 760 on the master), 50 mm, tilt ≤ 3° down; slightly behind the figures (they are seen ¾ from behind), so the viewer walks in with them.

## 9. LIGHT

Key from the upper right (shared spec), **plus the arch as the practical**: a warm glow from inside the opening that lights the child's front edge and the floor. Cobalt fill on the companion's back.

## 10. COLOR

Night #10132A/#1A1E33; arch ceramic #EEE9DF; inner glow #FFF0DC; child top discovery yellow #F1CF68; companion jacket cobalt #4A5CFF; bag coral #F28B74. No other accents.

## 11. MATERIAL

Ceramic arch (matte-satin, fine grain); felt-like matte clothes; the bag is velvety coral; no metal in this scene.

## 12. NEGATIVE SPACE

C1–C6 × R1–R2 (upper left, dark, holds the 4 % corner keep-out) and C11–C12 × R1–R9. No object may enter these zones.

## 13. DESKTOP ASPECT / CROP

Full 4 : 3 master in the 7/12 column. Weight left/centre; the calm right edge leads to the title „Ankommen“.

## 14. MOBILE ASPECT / CROP

Same master at full width. Safe zone check: the child's head (x 740–900, y 432–610) and the arch opening (x 1290–1910) are inside x 240–2160 / y 144–1656. Child head ≈ 24 px and arch ≈ 160 px tall at 328 px.

## 15. SEPARATE LAYERS

`bg` (gradient) · `floor` (plane + contact shadows) · `object` (arch) · `fx` (inner glow + light pool, separate) · `figures` (child and companion together, alpha).

## 16. POTENTIAL MOTION

Optional, once on entry: the inner glow of the arch rises from 60 % to 100 % over 1.6 s (fx layer opacity only). The end frame equals the master. There is none under reduced motion.

## 17. CLASSIFICATION

**ORIGINAL ART preferred** (commissioned illustrator/3D artist working to the style frame). AI_CONCEPTUAL is allowed only if (a) generated from the approved style frame and model sheet, (b) every frame is retouched to the rules, and (c) the class is recorded in `discovery.ts`. Never photoreal; never REAL (no photographs of children).

## 18. ACCESSIBILITY ROLE

Informative image. Alt: „Ein Kind steht an der Hand einer erwachsenen Person vor einem hellen, offenen Durchgang.“ The text carries the full meaning without the image.

## 19. WHAT NOT TO GENERATE

- A building facade, the real practice entrance, a house number, a sign or a practice name.
- A reception desk, staff, greeting persons or other patients.
- The companion's face; any figure looking at the camera.
- Rain, night street, cars, or a door with a handle or bell.

## 20. CONSISTENCY

Defines the figures' model sheet (proportions, clothes, colours) together with the style frame. The arch here is the **same object** as in 06, mirrored.
