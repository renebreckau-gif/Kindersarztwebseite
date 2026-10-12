# Phase 08 — Discovery Production Status (Mein Arztbesuch, D1)

Checkpoint: Phase 08.8 · updated 2026-10-12 · References and provenance: [docs/design/discovery-reference/README.md](../design/discovery-reference/README.md)

## Status

| Asset | Visual status | Medical / practice / content approval | File |
|---|---|---|---|
| Discovery master reference | APPROVED | n/a (reference) | `approved-discovery-master-reference.webp` |
| Character consistency reference v1 | APPROVED WITH RESTRICTIONS (middle ¾ view only; no portraits, no hand) | n/a (reference) | `d1-character-consistency-reference-v1.png` |
| 01 Ankommen | VISUALLY APPROVED | open | `d1-01-ankommen-v1.png` |
| 02 Warten | VISUALLY APPROVED (corrected version) | open | `d1-02-warten-v1.png` |
| 03 Messen & Wiegen | VISUALLY APPROVED (style frame) | open — **physician review required** | `d1-03-messen-wiegen-styleframe-v1.png` |
| 04 Abhören | VISUALLY APPROVED — ChatGPT image generation (not Higgsfield), 1448 × 1086, `AI_CONCEPTUAL` | open — **physician review required**; practice and content approval pending | `d1-04-abhoeren-v1.png` |
| 05 Ohren & Hals | VISUALLY APPROVED (corrected version) — Higgsfield Nano Banana Pro, candidate + one targeted edit, 2400 × 1792, `AI_CONCEPTUAL` | open — **physician review required**; practice and content approval pending | `d1-05-ohren-hals-v1.png` |
| 06 Fertig | VISUALLY APPROVED (corrected version) — Higgsfield Nano Banana Pro + local top-edge retouch, 2400 × 1792, `AI_CONCEPTUAL` | open — practice and content approval pending (no medical content) | `d1-06-fertig-v1.png` |

**Visual production is complete: all six scenes have an approved reference file in `docs/design/discovery-reference/`. Publication is not complete** (approvals below; images not yet integrated).

## Higgsfield blocker (resolved)

Until 2026-10-11 Higgsfield returned `grace_daily_limit_reached` (`unlock_full_access_notice`) for every generation request, even though credits remain on the account (482.73 on 2026-10-11). Generation was blocked despite remaining credits. The block no longer applied on 2026-10-12: Scenes 05 and 06 were generated then. Scene 04 had been produced outside Higgsfield (ChatGPT image generation).

## Unchanged by this checkpoint (verified)

- `RELEASE.meinArztbesuchApproved = false`. `/entdecken/mein-arztbesuch` is still gated publicly, and the preview (`?vorschau=freigabe`) is unchanged.
- In `src/content/discovery.ts`: every `contentApproval`, `practiceApproval` and `medicalApproval` remains `TO_BE_CONFIRMED`, and every `visual.class` remains `PLACEHOLDER`. Visual approval is tracked here and in the reference README, not as a second approval model in code.
- No image is in `public/`, used in React, or exported to AVIF/WebP.

## Open items

1. **Scenes 05 and 06:** done (visually approved 2026-10-12, see the reference README for provenance and accepted deviations).
2. **Physician review** of scenes 03, 04 and 05 (instrument form, nothing medically misleading). For scene 04, note the silver chest piece, which deviates from the cobalt/brass brief.
3. **Practice and editorial approval** of all six scenes and their texts.
4. **Decision on publishing an AI-generated child** (as for the hero). Legal and practice decision.
5. **Integration pass** after six approvals: exports (960/1600/2400), alt texts already in `discovery.ts`, `visual.class` → `AI_CONCEPTUAL`, layout check against the brief safe zones.
