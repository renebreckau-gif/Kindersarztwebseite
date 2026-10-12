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

**Approvals recorded (2026-10-12):** practice + content for all six scenes and the introduction, physician review for 03–05, and the AI-child publication decision, all by Nadine Probst (Ärztin / Praxis), without conditions. Production images are in `public/discovery/` and integrated; the chapter was released the same day.

**Approval package (2026-10-12):** [discovery-approval-package.md](discovery-approval-package.md), with the review sheets for [physician (03–05)](discovery-physician-review.md), [practice + content (01–06)](discovery-practice-content-review.md) and the [AI-child publication decision](discovery-ai-child-publication-decision.md).

## Higgsfield blocker (resolved)

Until 2026-10-11 Higgsfield returned `grace_daily_limit_reached` (`unlock_full_access_notice`) for every generation request, even though credits remain on the account (482.73 on 2026-10-11). Generation was blocked despite remaining credits. The block no longer applied on 2026-10-12: Scenes 05 and 06 were generated then. Scene 04 had been produced outside Higgsfield (ChatGPT image generation).

## State after approval and integration (2026-10-12)

- `src/content/discovery.ts`: `practiceApproval` and `contentApproval` are `VERIFIED_CURRENT` for all six scenes, `medicalApproval` for 03–05 (Nadine Probst, 2026-10-12). `visual.class` is `AI_CONCEPTUAL` with production images.
- Production images in `public/discovery/d1-<slug>-<w>.{avif,webp}`: 960/1600/2400 px; scene 04 at 960/1448 px (native, not upscaled).
- Alt texts of scenes 04 and 05 were corrected to match the final images. The previous texts described the briefs ("T-Shirt", "Lampe leuchtet").
- **Released 2026-10-12:** `RELEASE.meinArztbesuchApproved = true` after the visual review of the integrated chapter. `/entdecken/mein-arztbesuch` is public; the site as a whole stays `noindex` (`RELEASE.indexable = false`, a separate launch decision).

## Open items

1. **Scenes 05 and 06:** done (visually approved 2026-10-12, see the reference README for provenance and accepted deviations).
2. **Physician review** of scenes 03, 04 and 05 (instrument form, nothing medically misleading). For scene 04, note the silver chest piece, which deviates from the cobalt/brass brief.
3. **Practice and editorial approval** of all six scenes and their texts.
4. **Decision on publishing an AI-generated child** (as for the hero). Legal and practice decision.
5. **Integration pass** after six approvals: exports (960/1600/2400), alt texts already in `discovery.ts`, `visual.class` → `AI_CONCEPTUAL`, layout check against the brief safe zones.
