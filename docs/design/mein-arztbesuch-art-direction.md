# Mein Arztbesuch — Art Direction

Phase: 08 · Date: 2026-10-07 · Status: **ART DIRECTION — awaiting approved visual reference**
Scope: the six story scenes of `/entdecken/mein-arztbesuch` (asset D1, V1 SIGNATURE S04).
Scene briefs: [mein-arztbesuch-assets/00-overview.md](mein-arztbesuch-assets/00-overview.md) · Register: [required-production-assets.md](required-production-assets.md) · Material source: [3d-language.md](3d-language.md) · Hero lock: [hero-reference/README.md](hero-reference/README.md)

Process (fixed): **ART DIRECTION → APPROVED VISUAL REFERENCE → ASSET PRODUCTION → CODE INTEGRATION.**
This document is step 1. No final image exists. Phase 08 produced no image generation, no Higgsfield production and no AI scenes. The geometric placeholders in code (`src/site/discovery/placeholders.*`) only hold the composition and are labelled "Platzhalter · Konzept".

---

## 1. Overall world

A **night-blue discovery stage** on which a few clearly made objects of the visit appear one at a time: a door arch, a bench, a measuring rod, a stethoscope, a small lamp. A **child figure** walks through the story with an **adult companion**. The figure is shown in the stage's own sculptural language. It is never a portrait.

The world is a **model of a visit**, not a picture of this practice. It is like a beautifully lit diorama or a pop-up book in a dark room: few objects, each one readable at a glance, each one carrying exactly one idea.

One sentence for every artist: *"A calm, warm-lit theatre model of a doctor's visit, in which a child can recognise each object before anything happens with it."*

## 2. Relation to the hero

- **Same light logic.** The hero has warm low sun from the right. The stage has the same: a warm key light from the **upper right**, at roughly 2 o'clock and 35° above horizontal. Cool cobalt ambient fills from the lower left.
- **Same object family.** The hero's Growing Mobile palette and materials (warm ceramic, dark anodized structure, cobalt enamel, coral soft-touch, discovery yellow) are the materials of every story object. A child who knows the homepage recognises the world.
- **Different register.** The hero is a photographic, daytime room. The story is a night stage and stylised. The story never reuses the hero room plate, the hero child or any hero cut-out.
- **The arch.** The hero's arched architecture returns as the single **doorway arch** in scenes 01 and 06. It is the only architectural element, and it is abstracted: a smooth plaster arch with no frame, no door leaf and no signage.

## 3. Relation to ENTDECKEN

- The ENTDECKEN overview already uses three orbs (cobalt sphere, coral half-disc, yellow sphere) on night blue (`pages.module.css .nightOrbs`). These forms become **companions in the scenes**:
  - the yellow sphere marks growth (scene 03);
  - the cobalt form marks sound and listening (04);
  - the coral form is the soft "human" accent (a cushion, the companion's bag).
- Background colour, typography and UI chrome stay the site's. The image never contains text, numbers, UI or progress indicators.
- Future chapters (Reise in deinen Körper, Wachstum, Ernährung) will reuse this stage, so every rule here must also work without a doctor's visit.

## 4. Lighting

| Element | Decision |
|---|---|
| Key | Warm, 3200–3600 K equivalent (#FFE4C4 at full intensity), from the upper right, soft-edged (a large source), falloff to the lower left |
| Fill | Cobalt (#4A5CFF at ~18 % strength) ambient from the lower left; keeps shadows blue, never black |
| Practical | One per scene at most: the lamp in 05 (warm, #FFF1C4) or the light behind the arch in 01/06 |
| Shadows | Soft contact shadows on the floor plane only; no cast shadows on the background wall |
| Forbidden | Clinical white light, cool overhead fluorescents, flashes, rim light, lens flares, light rays and "magic" sparkles |

Brightness budget: the brightest pixel cluster in every scene sits **on the story object**, never on the child's face.

## 5. Color

| Token | Hex | Use |
|---|---|---|
| Night stage | #10132A → #1A1E33 (vertical gradient) | Background; matches the `ScenePlaceholder` frame |
| Floor plane | #1E2236 with a warm glow of rgb(255 236 214 / 0.07) | Ground; horizon at 74 % image height |
| Warm ceramic | #EEE9DF | Arch, bench, scale platform, lamp body |
| Dark anodized | #202327 | Thin structure: stethoscope tubing, rod mounts |
| Cobalt enamel | #4A5CFF | One cobalt element per scene (stethoscope chest piece, the companion's jacket) |
| Coral soft-touch | #F28B74 | Small human accents: cushion, scarf, bag |
| Discovery yellow | #F1CF68 | Growth and light: marker on the rod, lamp glow |
| Brass | #C9A25E | Measuring rod, otoscope ring |

Rule: **at most three accent colours per scene** besides night and ceramic. There is no red (emergency colour), no medical green and no hospital blue-white.

## 6. Materials

Exactly the 3D language: matte-satin ceramic, satin anodized metal, glossy cobalt enamel, velvety coral, satin yellow, brushed brass for instruments. Fabric on the figures is **felt-like and matte**, with no woven texture. There is no glass except the otoscope lens, no chrome and no plastic gloss. Surfaces may show very fine material grain (sculptural, hand-made); they show no scratches, dirt or wear.

## 7. Camera and perspective

- **Eye height of a 5-year-old**: about 95 cm in model scale. The camera looks almost straight ahead, tilted at most 5° down.
- Lens equivalent **50 mm** (no wide-angle distortion, no fish-eye). Orthographic is allowed for the 2.5D variant.
- The camera **never** looks down on the child from above (adult power angle) and never looks up from below at the doctor (threat angle).
- The same camera height and lens hold for all six scenes, so the sequence reads as one continuous walk.
- The floor horizon is always at **74 % of image height**.

## 8. Child representation

- **Style:** illustrative 2D/2.5D or sculptural: a figure like a carved wooden or felt toy, with clear proportions (head ≈ 1/5 of height), simplified face (eyes as calm dots or soft lines, a small neutral-friendly mouth), and no individual likeness. "Softly realistic but unmistakably conceptual": volume and soft light yes, skin pores and photographic hair no.
- **Age read:** 4–7 years.
- **Gender, skin and hair:** not specified by the brief. The figure stays open: medium warm skin tone, short or tied hair, neutral clothes (coral or yellow top, dark trousers). Never a stereotype.
- **Emotion range:** curious, attentive, at ease, a little proud at the end. **Never** crying, scared, cheering, or exaggerated-happy.
- **Always clothed** in day clothes in every scene. Scenes 03–05 show no undressing, no bare torso and no underwear. In scene 04 the chest piece rests on the T-shirt.
- **Never alone with an adult stranger in an enclosed room.** The companion adult is present in every scene except the close-ups (04, 05), where the companion's hand or knee may appear at the frame edge.

## 9. Object representation

Objects are the protagonists. Each scene has **one hero object**, drawn larger than life-size relative to the figure (about 1.2×) so it reads on a 360 px phone.

| Object | Form rules |
|---|---|
| Door arch (01, 06) | Smooth ceramic arch, opening ratio 1 : 1.9, warm light inside, no door leaf |
| Bench (02) | Long, low ceramic bench with one coral cushion; no clock, no magazines, no toys |
| Measuring rod (03) | Brass rod with fine engraved ticks (no numerals), a sliding yellow marker; the scale is a low ceramic platform without a display |
| Stethoscope (04) | Cobalt chest piece (round, enamel), dark tubing, brass ear tubes; complete and correct in form |
| Otoscope lamp (05) | Ceramic handle, brass ring, small warm glow at the tip; **no** speculum close-up, nothing inside an ear |

Medical objects must be **recognisable and correct** (a physician checks every one). They are never toy-like caricatures, oversized syringes or anything sharp.

## 10. Character rules

- **Two figures maximum:** the child and **one** companion adult (parent or carer, unspecified relation).
- **The companion's face is never in frame.** The camera is at child eye height and the child figure is about 900 px tall in the master (needed for mobile legibility, §14), so a standing adult is cut by the top edge at chin height, and a seated adult is cut at the shoulder by the side edge. The adult reads through a hand, a sleeve (cobalt jacket) and a coral bag. This is deliberate: the story is seen from the child's height, and no adult "person" has to be invented.
- The **doctor is never shown as a full figure.** At most there is a sleeve and a hand at the frame edge in 04 and 05 (warm ceramic sleeve, no white coat, no face). This avoids presenting a fake physician of the practice (no AI person as staff).
- There is no medical assistant, no reception person, no other patients and no other children.
- No figure looks into the camera, and no figure talks (no speech bubbles).
- There is no mascot, no talking animal and no anthropomorphised instrument.

## 11. Environment rules

- **No real room.** The stage has a floor plane, a dark background and at most one architectural element (the arch). It has no walls with windows, no furniture beyond the scene's object, no posters, no logos, no signage and no recognisable location.
- Nothing may suggest that it shows the rooms of the Praxis Probst & Böhme: no reception desk, no toys corner, no fish tank, no plants, no specific floor colour.
- The night stage is a **neutral theatre**, so the story stays true for visits in any practice ("So kann ein Arztbesuch aussehen").

## 12. What must never appear

- Photorealistic children, photorealistic faces, or any real or AI "patient".
- A full-figure doctor, a white coat, the practice's staff, or names on badges.
- Syringes, needles, blood, wounds, plasters on wounds, thermometers in mouths, tongue depressors in mouths, or open mouths shown in detail.
- An ear canal, eardrum or throat interior; X-rays; bodies with visible organs.
- Undressing, bare skin beyond face, hands and forearms, underwear or nappies.
- Crying, fear or pain expressions; heroic or bravery poses; rewards (stickers, sweets, medals); scores or stars.
- Text, numbers, clocks, screens, UI, logos, brand marks or the practice's name.
- Real practice photos inside the story (they belong to the separate photo track).
- Red as an accent (reserved for 112).

## 13. Desktop composition

- The **master is 4 : 3, 2400 × 1800 px**. It is shown in the left 7/12 column next to the text (5/12), vertically centred (`story.module.css`).
- Because text sits to the right of the image, the **visual weight sits left of centre or in the centre**. The right 20 % of the image is calm (falling light), leading the eye towards the title.
- Subject placement uses a 12 × 9 grid. The briefs give exact cells.
- Image corners are rounded 18 px by the frame (CSS), so nothing important may sit within 4 % of a corner.

## 14. Mobile composition

- The **same 4 : 3 master**, full width (328–398 px). There is no second crop, so production stays single-master and continuity is guaranteed.
- **Mobile safe zone:** the central 80 % width × 84 % height. The hero object and the figure's face must be inside it.
- **Legibility test:** at 328 px width the hero object must be ≥ 60 px in its larger dimension, and the figure's head ≥ 24 px. With a scale of 328 / 2400 = 0.137 this means **head ≥ 176 px and full child figure ≈ 880–920 px tall in the master**; hero objects ≥ 440 px.
- Mobile order is fixed in code: visual → progress → title → child copy → Zurück/Weiter → Warum? → parent note. The image therefore never needs to carry the explanation alone.

## 15. Potential motion

Optional, after the static set is approved, and only as **layered parallax-free micro-motion**:

- one motion per scene, **≤ 2 s, once**, triggered on scene entry, then still;
- allowed: the yellow marker sliding up the rod (03); one sound arc fading out of the stethoscope (04); the lamp glow switching on (05); light growing inside the arch (01) or fading (06);
- forbidden: loops, bouncing, camera moves, character animation (walking or blinking), sound, and anything that runs while the child reads.

Under `prefers-reduced-motion: reduce` the end frame is shown statically, and that end frame **is** the master image. Motion never carries information.

## 16. Accessibility

- Every scene image has a German **alt text** stored in `discovery.ts` (`visual.alt`) that describes what a child sees, not the style.
- The **story is complete without images**: child copy, title and why-text carry the meaning. Images support but never replace.
- Contrast: the hero object must stand out from the background by **≥ 3 : 1** (WCAG 1.4.11 non-text contrast); verify with an eyedropper on the delivered master.
- No flashing, no strobing and no high-frequency patterns (the measuring ticks at least 8 px apart at 360 px width).
- Figures avoid reliance on colour alone: the cobalt chest piece also has a distinct round form.

## 17. Asset consistency rules

1. **One artist / one pipeline / one style frame** for all six scenes. The approved visual reference (step 2) becomes the style frame, and every scene is checked against it side by side.
2. Same camera height, lens, horizon (74 %), key-light direction and colour tokens in all scenes.
3. The child and companion keep **identical proportions, clothes and colours** across all scenes (model sheet: front, ¾, side).
4. Every scene delivers the same layer set (see the briefs): `bg`, `floor`, `arch`/`object`, `figures`, `fx` (light), as layered PSD/PSB or SVG/PNG with alpha, plus a flattened AVIF/WebP at 2400, 1600 and 960 px.
5. Naming: `d1-0X-<slug>-<layer>@<width>.<ext>` (e.g. `d1-03-messen-wiegen-flat@1600.avif`).
6. Each delivered scene carries its classification (ORIGINAL ART or AI_CONCEPTUAL), the generator or artist, the date, and its approvals (content, practice, physician) in `discovery.ts`, and only then may `visual.class` leave `PLACEHOLDER`.
7. File budget: flattened AVIF at 1600 px ≤ 140 KB per scene; the whole story ≤ 900 KB on mobile.
