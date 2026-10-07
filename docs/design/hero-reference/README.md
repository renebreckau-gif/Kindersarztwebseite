# Hero Reference — Locked

Date: 2026-10-07
Status: **LOCKED** (human decision)

## APPROVED MASTER REFERENCE

**Variant A** → [`approved-hero-reference.png`](approved-hero-reference.png) (2688 × 1520, 16:9)

Human decision: Variant A is preferred because it feels sharper, clearer and more visually premium.
This is the single visual source of truth for the hero scene going forward: room, light direction, spatial depth, child position and gaze, mobile placement and the open left side for typography and utility.

## SECONDARY REFERENCES

- **Original room / lighting reference** → [`secondary-room-lighting-reference.webp`](secondary-room-lighting-reference.webp): architecture, warm daylight, materials, atmosphere.
- **Separate approved child asset** → [`secondary-child-asset-reference.webp`](secondary-child-asset-reference.webp): child pose, outfit, expression and emotional tone.

Secondary references support details only. Where they differ from the master, the master wins.

## REJECTED / ALTERNATIVE (not a visual source)

- [`rejected-alternative-variant-b.png`](rejected-alternative-variant-b.png): kept for the record only. It must **not** be treated as an equal or alternative visual source.

## Provenance and usage note

- The master and Variant B were generated with GPT Image 2.5 (Higgsfield) from the two secondary references. Class: `AI_CONCEPTUAL` (see [placeholder-system.md](../placeholder-system.md), [photography-direction.md](../photography-direction.md)).
- The child in these images is AI-generated. Using a child image of this kind on the public site is a separate, explicit decision that has not been taken. Until then these files are composition references, not production assets.
- Phase 06.2 implemented this reference in `/lab/final` (see below and `docs/reviews/phase-06-2-reference-to-code-review.md`).

## Derived implementation assets (Phase 06.2)

Used by `/lab/final` (`public/hero/`), all derived from the approved master:

- `room-{960,1600,2400}.{avif,webp}` — environment plate: the master with the hanging mobile and the child removed (object-removal edit, Nano Banana 2.1 via Higgsfield). Not a new concept or variant; the only visible difference is a slightly larger central arch behind where the mobile hung.
- `mobile-{420,830}.{avif,webp}` — the mobile cut out of the master (background removal), threads included.
- `child-{300,570}.{avif,webp}` — the child cut out of the master (background removal).

**Status: AI_CONCEPTUAL — INTERNAL PROTOTYPE / ART-DIRECTION ONLY.** These assets prove the intended experience. They are **not** approved as public production media. A later production decision chooses between final AI conceptual use (after legal review), a consented real photograph shot to this composition, or another licensed asset.
