# Phase 08 Review — Mein Arztbesuch + Trust Hardening + Visual Asset Gate

Date: 2026-10-07 · Baseline: a2684525 · Screenshots: [phase-08/screenshots](phase-08/screenshots)
Reviewer stance: brutal; the scores count what is shipped and verified, not what is intended.

## What was built

| Workstream | Result |
|---|---|
| A — 116117 | Official source checked on 2026-10-07 (116117.de, verbatim quotes in `sources.ts` → `KBV_116117`). Entry in `notices.ts` set to VERIFIED_CURRENT (review due 2027-01-07). F57 updated in the fact register. /notfall now has three tiers: **112** (unchanged hero, red, first) → **116117** (cobalt, smaller, real `tel:116117`, "nicht bei Lebensgefahr – dann immer 112", source + check date) → **Praxis während der Sprechzeiten**. Local or practice-specific emergency data (F58–F65) is still unconfirmed and hidden. |
| B — U10 | `examinations.ts` models decision date, decision status, BMG review, Bundesanzeiger, entry into force, editorial approval and practice offer **separately**. Verified: Beschluss 20.08.2026 and "noch nicht in Kraft" (g-ba.de/beschluesse/7982). BMG non-objection 30.09.2026 comes from the brief and is recorded as TO_BE_CONFIRMED (not shown on the G-BA page). Public output = none (`publicDecisionStatement` → null). The status appears only in the internal note on /mein-kind/vorsorge. |
| C — Mein Arztbesuch | `/entdecken/mein-arztbesuch` with three modes from one function (`chapterView`): **GATED** (public, now: title + "In Vorbereitung" + back link, noindex), **PREVIEW** (`?vorschau=freigabe`, full story, "VORSCHAU – noch nicht freigegeben" label, review tag per scene), **PUBLIC** (only when `RELEASE.meinArztbesuchApproved` **and** every scene is content/practice approved, medically approved where needed, **and** no visual is a placeholder). /entdecken is now a chapter world driven by `CHAPTERS` (Mein Arztbesuch + three "Bald entdecken" chapters without links or dates). |
| Docs | Art direction (17 sections), 00-overview + six concrete scene briefs (20 fields each, pixel coordinates on a 12 × 9 grid), real practice photo brief (B1, B2, C1, C2, C3), D1 raised to P1 / V1 SIGNATURE S04 in the asset register. |

## Scores

| Criterion | Score | Gate | Why (and what keeps it from higher) |
|---|---|---|---|
| STORY CLARITY | **8** | ≥ 8 ✅ | Six scenes, one idea each, clear arc (arrive → wait → measure → listen → look → leave). Each title names the action. Not 9: without final images the story leans on text, and "Ohren & Hals" combines two actions in one scene. |
| CHILD APPROPRIATENESS | **8** | ≥ 8 ✅ | Short sentences, "du", concrete words, honest ("kann sich etwas kühl anfühlen"), no fear/pain/bravery wording (test-enforced, including the /entdecken lede, which no longer says "Angst"). Not 9: no physician or child-development review yet. |
| CALMNESS | **9** | — | One scene at a time, no timers, no autoplay, one 280 ms fade (off under reduced motion), night palette, no badges or points. |
| INTERACTION CLARITY | **8** | ≥ 8 ✅ | Weiter (primary, luminous) / Zurück (outline) / "Schließen – zur Übersicht" on every scene; the last scene's primary button is "Zur Übersicht"; "01 / 06" + six quiet marks; focus moves to the scene title; a live region announces "Szene 3 von 6: …". Not 9: "object tap → Warum" is a "Warum?" button for now, because tapping the object only makes sense with final art (hotspot layer `object` is specified in the briefs). |
| DISCOVERY WORLD CONTINUITY | **8** | — | Same night stage, same orb language (cobalt/coral/yellow), same type. The art direction ties the scenes to the hero light and the Growing Mobile materials without reusing the hero room. Not 9: continuity is only proven on paper until the style frame exists. |
| MOBILE QUALITY | **8** | ≥ 8 ✅ | Visual → progress → title → copy → Weiter/Zurück → Schließen → Warum → parent note. From scene 2 on, Weiter and Schließen are above the dock at 390 and 360 without scrolling (measured: dock top 770/726, Weiter bottom ≤ 603). No overflow at 360/390 at 100 % and 200 % text. Not 9: on **scene 1** the controls are below the first screen, because the chapter intro (and, in preview, the VORSCHAU label) come first. |
| ACCESSIBILITY | **8** | ≥ 8 ✅ | Works without JS (ordered list of all six scenes); targets ≥ 44 px (buttons 56 px, Warum 48 px); visible focus; reduced motion = complete static experience; forced-colours styles; placeholders `aria-hidden` (no fake alt for missing images; final alt texts are stored per scene). Found and fixed: the preview banner and internal note had pale inherited text on night pages, and 200 % text overflow on /notfall and the chapter page. Not 9: no screen-reader session with NVDA/VoiceOver yet. |
| DATA SAFETY | **10** | ≥ 9 ✅ | No inputs, forms, storage, cookies, audio, fetch or beacons in the story (test-enforced by a static scan). Progress lives only in component state. |
| MEDICAL CLAIM SAFETY | **9** | ≥ 9 ✅ | Why-texts are one plain sentence each ("So sieht man, wie ein Kind wächst."); no diagnosis or norms; "Manchmal" and "kann" everywhere; three scenes carry a separate medical-approval slot. U10 cannot surface publicly until it is verifiably in force **and** physician-approved (tested). 116117 is never offered for life-threatening situations. |
| RELEASE-GATE SAFETY | **10** | ≥ 9 ✅ | One gate function, three independent conditions (flag, approvals, no placeholders), scenes stripped from the GATED view model (not just hidden in the UI), noindex in non-public modes, tests for each path. `pulsPracticeSignOff` stays true (tested). |
| ART-DIRECTION READINESS | **9** | ≥ 9 ✅ | 17 decisions with numbers: light direction/elevation/temperature, horizon at 74 %, 50 mm at child eye height, colour tokens with hex, a "never appear" list, mobile legibility maths (head ≥ 176 px in the master), and the companion/doctor representation rule (no adult face, doctor only as a sleeve and hand). |
| ASSET-BRIEF QUALITY | **9** | ≥ 9 ✅ | Every brief places the subject and objects in grid cells and pixel coordinates, names the hero object, negative-space cells, light, palette, layers, mobile safe-zone check, alt text, forbidden content and the single optional motion. An illustrator can start the style frame (scene 03) without another art-direction meeting. Not 10: two choices are deliberately left to the style-frame review (scene 03 top colour: coral or yellow). |
| PERFORMANCE | **9** | — | The story route adds +1.3 KB JS (141.5 vs 140.2 KB first-load), no images, CSS-only placeholders, HTML 39 KB. Final art budget is set (≤ 140 KB per scene AVIF@1600, ≤ 900 KB story). |
| MAINTAINABILITY | **9** | — | All copy and approvals live in `discovery.ts`; future chapters only need data. Uses existing fact states and media classes (no second status model). Placeholders follow the brief coordinates and are replaced by swapping `visual.class`. |

All gates pass. Art-direction and asset-brief quality are at 9, so no extra UI polishing was done to compensate.

## Brutal review — answers

**Versteht ein Kind grundsätzlich, was in jeder Szene passiert?**
With an adult reading aloud: yes. Each scene has one action, a title that names it, and two or three short sentences. Alone and without the final images: only partly. The current placeholders are abstract and labelled, so the meaning rests on the text until the D1 scenes exist. That is why placeholders block the public release.

**Funktioniert die Experience ohne selbst lesen zu können?**
It is designed for it: the text is for reading aloud ("Lesen Sie die kurzen Sätze gern vor"), and the images are briefed to carry each scene's meaning on their own (one hero object per scene, ≥ 60 px on a phone). Today, with placeholders, a non-reader needs an adult. The design target is met only once the final images exist.

**Funktioniert sie ohne Animation?**
Yes. The only motion is a 280 ms fade, switched off under `prefers-reduced-motion`. Optional future micro-motions are defined so that their end frame **is** the master image. Verified with the reduced-motion capture at 390.

**Funktioniert sie mit Placeholders?**
Structurally yes (layout, flow, focus, mobile order are all reviewable now). Narratively only with text support. Publicly, no: placeholders block release by code.

**Behaupten wir irgendwo, jeder Arztbesuch laufe exakt so?**
No. The parent intro says "So kann ein Arztbesuch aussehen. Nicht jeder Besuch läuft genau so ab"; the scenes use "Manchmal …" and "kann"; scene 06 says "Jeder Besuch ist ein bisschen anders." The images are briefed as a neutral stage, never as a specific practice.

**Behaupten wir unbestätigte Details dieser Praxis?**
No. There is no waiting room description, no toys, no times, no staff and no rooms. The waiting tip is a book or toy *from home*. The art direction forbids anything practice-like (reception desk, play corner, signage). The doctor is "die Ärztin", a generic role that matches the practice's two physicians without naming either.

**Sind medizinische Erklärungen ausreichend begrenzt?**
Yes. Each is one sentence on *why something is looked at*, not what is found. There are no norms, values, diagnoses or symptom references. All three medical scenes need a separate physician approval before release.

**Wird irgendein persönliches Gesundheitsdatum abgefragt?**
No. There are no inputs, no age or birthday selection, no storage and no tracking (static test).

**Gibt es unnötige Gamification?**
No. There are no points, stars, badges, rewards, streaks or percentages. The progress is "01 / 06" plus six neutral marks. Scene 06 explicitly forbids reward imagery.

**Fühlt sich die Experience ruhig statt überreizt an?**
Yes. One scene at a time, a dark calm stage, large quiet type, one primary button, no sound and no autoplay.

**Sind alle zukünftigen Assets klar definiert?**
Yes for D1 (six scenes plus a model sheet) and for the real practice photos (B1, B2, C1, C2, C3). The future chapters (Reise in deinen Körper, Wachstum, Ernährung) are deliberately undefined: they are titles only, with no brief and no promise.

**Sind die Asset-Briefs konkret genug, um ohne neue Art-Direction-Diskussion Bilder produzieren zu können?**
Yes, with one planned checkpoint: the style frame (scene 03) must be approved before 01, 02 and 04–06 are produced. That checkpoint is a fixed step in the process, not a gap in the briefs. Positions, light, palette, camera, layers, crops and exclusions are all fixed.

**Ist 116117 sauber von praxisinternen Notfallinformationen getrennt?**
Yes. It is its own section ("Wenn die Praxis geschlossen ist") with an official source and check date, and its copy only covers the national facts. The internal note states explicitly that it makes no statement about practice substitution or local Bereitschaftspraxen (F59/F60 stay unconfirmed).

**Ist 112 weiterhin eindeutig erste Wahl bei Lebensgefahr?**
Yes. 112 comes first in the DOM and visually (red, 72 px target, largest number). 116117 is smaller, in cobalt, comes second, and says "Nicht bei Lebensgefahr – dann immer 112." Tested: 116117 sorts after 112 and the `tel:112` link comes first in the source.

**Ist U10 korrekt als beschlossen, aber aktuell noch nicht in Kraft modelliert?**
Yes. decisionStatus is BESCHLOSSEN (verified), entryIntoForce is NOCH_NICHT_IN_KRAFT (verified), ministryReview is NICHT_BEANSTANDET 30.09.2026 but TO_BE_CONFIRMED, gazettePublication is AUSSTEHEND, editorialApproval and offeredByPractice are unconfirmed. There is no public sentence and no practice claim (tested).

**Wurde Praxis Puls versehentlich wieder gegated?**
No. `pulsPracticeSignOff: true` is unchanged and asserted in a new test. The live homepage without parameters shows a real state ("Praxis geschlossen · Öffnet morgen um 08:00 Uhr") and no preview banner.

**Funktioniert das Mobile Menu weiterhin als Overlay?**
Yes. The dock MENÜ is a `<button aria-controls="hauptmenue">`; it opens the overlay with 5 primary + 3 utility links, focus moves inside, and Escape closes it. There are no `#menue` links. (The regression test's regex was fixed: it flagged *every* `scrollIntoView` due to operator precedence, including the story's scene scroll. It now checks only scrolling to `menue`.)

**Bleibt MENÜ links und ANRUFEN rechts?**
Yes. The dock order is Menü · Heute · Notfall · Anrufen (measured and tested).

## Issues found during this phase (fixed)

1. The preview banner inherited the night page's pale text on its cream background. Fixed with an explicit ink colour.
2. The internal note's semi-transparent stripes turned olive on night pages, giving low contrast. Fixed with an opaque background.
3. The 116117 pill wrapped awkwardly at 390. Fixed with a short "Anrufen" label plus a full aria-label.
4. 200 % text overflow on /notfall (tier 2) and the chapter page, caused by implicit grid tracks and a global `p { overflow-wrap: break-word }`. Fixed with `minmax(0,1fr)` tracks and `overflow-wrap: anywhere` on the elements.
5. A single Weiter on scene 1 sat in the right grid column. Fixed: a lone control spans the row.
6. The brief asks for ÜBERSICHT / SCHLIESSEN as a primary control. Added "Schließen – zur Übersicht" to every scene.

## Open (not fixed, by decision)

- Scene 1 on phones: controls sit below the first screen (intro first). Options for the next review: a shorter intro on mobile, or the intro moved below the story.
- The status chip's dot is hard to see on night pages (pre-existing, Phase 07). It is a glass/chrome detail, so it is outside this phase's locks.
- Object tap → Warum waits for the final art.
