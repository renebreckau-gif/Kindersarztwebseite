# Discovery Reference — Mein Arztbesuch (D1)

Checkpoint: Phase 08.8 · 2026-10-11 · Status: **visual production in progress (3 of 6 scenes visually approved)**
Process: ART DIRECTION → APPROVED VISUAL REFERENCE → ASSET PRODUCTION → CODE INTEGRATION ([art direction](../mein-arztbesuch-art-direction.md), [scene briefs](../mein-arztbesuch-assets/00-overview.md), [production status](../../reviews/phase-08-discovery-production-status.md))

Precedent: [hero-reference/README.md](../hero-reference/README.md).

> **Visual approval is not medical, practice or content approval.** These files are approved as artwork only. Every scene still needs the editorial (content), practice and — for scenes 03, 04 and 05 — physician approval recorded in `src/content/discovery.ts`. None of those approvals is set by this checkpoint, and `RELEASE.meinArztbesuchApproved` stays `false`.

> **Not public production assets.** These are source references under `docs/`, deliberately not in `public/`. The chapter stays gated; the website still shows the labelled placeholders (`visual.class: "PLACEHOLDER"`). Integration (AVIF/WebP exports, layout, alt texts) happens only after all six scenes are approved.

## Files

| File | Purpose | Size (px) | Source | Visual status |
|---|---|---|---|---|
| `approved-discovery-master-reference.webp` | **World reference:** night stage, arches, lighting, materials, emotional tone, adult-hand style | 1448 × 1086 | Supplied by the project owner on 2026-10-07 as the approved master. Generator not recorded in this repository | APPROVED (master) |
| `d1-03-messen-wiegen-styleframe-v1.png` | **Style frame + primary child character anchor**; scene 03 candidate | 2400 × 1792 | Higgsfield · Nano Banana Pro · 2K · 2026-10-07 · reference: master | VISUALLY APPROVED (style frame) |
| `d1-character-consistency-reference-v1.png` | Character sheet: three full-body views, two portraits, companion sleeve | 2400 × 1792 | Higgsfield · Nano Banana Pro · 2K · 2026-10-07 · references: style frame 03 (primary), master | APPROVED WITH RESTRICTIONS (see below) |
| `d1-01-ankommen-v1.png` | Scene 01 — Ankommen | 2400 × 1792 | Higgsfield · Nano Banana Pro · 2K · 2026-10-11 · references: style frame 03, character sheet, master; one targeted edit pass | VISUALLY APPROVED |
| `d1-02-warten-v1.png` | Scene 02 — Warten | 2400 × 1792 | Higgsfield · Nano Banana Pro · 2K · 2026-10-11 · references: style frame 03, scene 01; one edit pass; final **local** retouch (see below) | VISUALLY APPROVED (corrected version) |

**Classification:** all generated files are `AI_CONCEPTUAL` (`src/domain/content-types.ts` media classes). They are never `REAL`. They do not show real patients, real staff, the real practice building or its rooms. The child and the companion are invented characters on a conceptual stage.

Nano Banana Pro's 4:3 output at 2K is 2400 × 1792 rather than the briefed 2400 × 1800 master (8 px less height). This is accepted. 4K was not available on the account's plan.

**SHA-256 at checkpoint** (pixels unchanged since approval; moved, not re-encoded):

```
7c2c0273c2b1f9ce65a5b8c2499854eabfedd0c1b685beede1276626deec1844  approved-discovery-master-reference.webp
0b03fd75e582160611de4469296e747d4e6415895061d5b1b550a47e4cc3d8cd  d1-03-messen-wiegen-styleframe-v1.png
100913f9c0f5dd1a043ee2ea459372c0d4b4c4021e9a47317fda62a5d5a6fa77  d1-character-consistency-reference-v1.png
048c1714b569bbac36f6c49cb2acc365b9880cc22401c3328d0df9a2da5ff01f  d1-01-ankommen-v1.png
864699161c0bd2dfb79e7ef8c4724c3b885feb3f6fffdc29e3f7a85b0543faa6  d1-02-warten-v1.png
```

Prompts used (and the ready scene 04 prompt): [prompts/](prompts/). Reference image order in each request: Style Frame 03 first.

## Binding reference hierarchy

| Topic | Priority 1 | Priority 2 | Priority 3 |
|---|---|---|---|
| **Child identity** | Style Frame 03 | Character sheet — **middle ¾ full-body view only** | Scenes 01 / 02 (continuity only) |
| **World / lighting** | Discovery master | Style Frame 03 | Approved scenes |
| **Companion** | Scene 01 | Scene 02 | — |

- Never average conflicting faces into a new child; Style Frame 03 wins.
- The master defines world, palette, light, materials and tone. It does **not** override Style Frame 03 for the exact child identity.
- The character sheet's oversized companion hand is **not** a production reference. Scale comes from Scenes 01 and 02.

### Character sheet restrictions

Use the **middle ¾ full-body view** only, and only for proportions, geometry and posture support. Front and profile views support geometry only. Do **not** use:

- the two small portraits (upper right) as identity anchors, because they are flatter and rounder;
- the companion hand, which is oversized;
- the front-view hairstyle (centre part, fuller bob) where it conflicts with Style Frame 03.

## Approved character lock

**Child**
- about 5 years old;
- warm, premium, animated-feature 3D style: softly stylised, not photoreal, not sculptural, wooden or felt-doll-like, not an exaggerated cartoon;
- face as in Style Frame 03;
- chestnut-brown, soft wavy hair, medium volume;
- **coral sweater #F28B74**, **cream / warm beige trousers**, neutral socks and simple cream shoes;
- calm, approachable expression, never looking at the camera.

> The early asset briefs described a **yellow top / yellow T-shirt**. That is **overridden** by this approved character. Yellow remains an *object* accent (height marker, light), never the child's clothing. The briefs now carry an explicit override note.

**Companion**
- cobalt sweater #4A5CFF, dark neutral trousers, optional coral shoulder bag;
- **never a face**: cropped below the chin, or at the shoulder line by the frame edge;
- naturally scaled hand;
- a parent or carer, never staff.

**Doctor (scenes 04/05)**
- only a hand and a short plain warm-ivory sleeve (#EEE9DF);
- no white coat, no badge, no face or body.

## Scene notes and known limitations

**01 Ankommen**
- A conceptual, free-standing ceramic arch; no real entrance, sign, house number or practice detail.
- The companion is cropped at the neck.
- Known: the child's hair is slightly curlier than in Style Frame 03, and the arch sits more centrally than briefed (about 30–71 % of the width).

**02 Warten**
- A conceptual bench, coral cushion, a plain blue-grey book without print, and a warm light disc (not a clock).
- It makes no claim about the real waiting room.
- **Local retouch, top-left corner only (x 0–204, y 0–244):** the adult's chin, neck and a hair strand were removed by continuing the measured shoulder line to the frame edge, with knit texture from the same sweater and neighbouring background. A pixel diff confirms that nothing outside that rectangle changed.
- Known: the child's head reads slightly larger and more toy-like than in Style Frame 03, and the wall disc can read as a moon.

**03 Messen & Wiegen (style frame)**
- A brass rod with engraved ticks only (no numbers), a yellow marker, a ceramic platform, and the child in socks with the companion holding the shoes.
- **Still requires medical review, practice review and editorial approval.**

**AI child**
- Using an AI-generated child on the public site is a separate, explicit decision, as for the hero. It is recorded as open in the production status.
