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
| 04 Abhören | **prompt ready, generation blocked** | open — physician review required | — |
| 05 Ohren & Hals | not produced | open — physician review required | — |
| 06 Fertig | not produced | open | — |

## Current blocker (scene 04)

Higgsfield returns `grace_daily_limit_reached` (`unlock_full_access_notice`) for every generation request, even though credits remain on the account (482.73 on 2026-10-11). Generation is therefore currently blocked. The prompt for scene 04 is prepared; nothing was generated or charged.

## Unchanged by this checkpoint (verified)

- `RELEASE.meinArztbesuchApproved = false`. `/entdecken/mein-arztbesuch` is still gated publicly, and the preview (`?vorschau=freigabe`) is unchanged.
- In `src/content/discovery.ts`: every `contentApproval`, `practiceApproval` and `medicalApproval` remains `TO_BE_CONFIRMED`, and every `visual.class` remains `PLACEHOLDER`. Visual approval is tracked here and in the reference README, not as a second approval model in code.
- No image is in `public/`, used in React, or exported to AVIF/WebP.

## Open items

1. **Scene 04:** generate once Higgsfield allows generation again, with the prepared prompt [`d1-04-abhoeren-prompt-READY.txt`](../design/discovery-reference/prompts/d1-04-abhoeren-prompt-READY.txt). References in this order: Style Frame 03, character sheet, master. The sound arcs are deliberately left out of the image; if wanted, they can later be a subtle code layer.
2. **Scenes 05 and 06:** produce them against the same hierarchy (Style Frame 03 → middle ¾ view → Scenes 01/02).
3. **Physician review** of scenes 03, 04 and 05 (instrument form, nothing medically misleading).
4. **Practice and editorial approval** of all six scenes and their texts.
5. **Decision on publishing an AI-generated child** (as for the hero). Legal and practice decision.
6. **Integration pass** after six approvals: exports (960/1600/2400), alt texts already in `discovery.ts`, `visual.class` → `AI_CONCEPTUAL`, layout check against the brief safe zones.
