# Phase 08 — Discovery Production Status (Mein Arztbesuch, D1)

Checkpoint: Phase 08.8 · 2026-10-11 · References and provenance: [docs/design/discovery-reference/README.md](../design/discovery-reference/README.md)

## Status

| Asset | Visual status | Medical / practice / content approval | File |
|---|---|---|---|
| Discovery master reference | APPROVED | n/a (reference) | `approved-discovery-master-reference.webp` |
| Character consistency reference v1 | APPROVED WITH RESTRICTIONS (middle ¾ view only; no portraits, no hand) | n/a (reference) | `d1-character-consistency-reference-v1.png` |
| 01 Ankommen | VISUALLY APPROVED | open | `d1-01-ankommen-v1.png` |
| 02 Warten | VISUALLY APPROVED (corrected version) | open | `d1-02-warten-v1.png` |
| 03 Messen & Wiegen | VISUALLY APPROVED (style frame) | open — **physician review required** | `d1-03-messen-wiegen-styleframe-v1.png` |
| 04 Abhören | VISUALLY APPROVED — ChatGPT image generation (not Higgsfield), 1448 × 1086, `AI_CONCEPTUAL` | open — **physician review required**; practice and content approval pending | `d1-04-abhoeren-v1.png` |
| 05 Ohren & Hals | not produced — prompt ready (`prompts/d1-05-ohren-hals-prompt.txt`), generation blocked | open — physician review required | — |
| 06 Fertig | not produced | open | — |

## Current blocker (Higgsfield — affects scene 05, then 06)

Higgsfield returns `grace_daily_limit_reached` (`unlock_full_access_notice`) for every generation request, even though credits remain on the account (482.73 on 2026-10-11). Generation is currently blocked despite remaining credits. Scene 04 was produced outside Higgsfield (ChatGPT image generation) and is approved; the Scene 05 prompt is prepared; nothing further was generated or charged.

## Unchanged by this checkpoint (verified)

- `RELEASE.meinArztbesuchApproved = false`. `/entdecken/mein-arztbesuch` is still gated publicly, and the preview (`?vorschau=freigabe`) is unchanged.
- In `src/content/discovery.ts`: every `contentApproval`, `practiceApproval` and `medicalApproval` remains `TO_BE_CONFIRMED`, and every `visual.class` remains `PLACEHOLDER`. Visual approval is tracked here and in the reference README, not as a second approval model in code.
- No image is in `public/`, used in React, or exported to AVIF/WebP.

## Open items

1. **Scene 05:** generate **one** candidate once Higgsfield allows generation again, with [`d1-05-ohren-hals-prompt.txt`](../design/discovery-reference/prompts/d1-05-ohren-hals-prompt.txt). References in this order: Style Frame 03 (child), approved Scene 04 (doctor hand, sleeve, interaction), Discovery master (world). Use the character sheet only if the profile geometry needs it. Then stop for review. Higgsfield upload IDs (account workspace): Style Frame 03 `f6a4113d-f382-471c-b0ed-448416835add`, Scene 04 `8a4364d1-33ae-40a5-8a5a-bdb53395477c`, master `bddca56e-0c9c-49eb-bf3f-438d32c3c32d`.
   - Scene 04 note: optional listening effect (sound arcs) stays a possible later code/SVG layer, not part of the image.
2. **Scene 06:** produce it against the same hierarchy (Style Frame 03 → middle ¾ view → Scenes 01/02).
3. **Physician review** of scenes 03, 04 and 05 (instrument form, nothing medically misleading). For scene 04, note the silver chest piece, which deviates from the cobalt/brass brief.
4. **Practice and editorial approval** of all six scenes and their texts.
5. **Decision on publishing an AI-generated child** (as for the hero). Legal and practice decision.
6. **Integration pass** after six approvals: exports (960/1600/2400), alt texts already in `discovery.ts`, `visual.class` → `AI_CONCEPTUAL`, layout check against the brief safe zones.
