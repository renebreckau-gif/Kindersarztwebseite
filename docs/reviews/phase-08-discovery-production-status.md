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

**Summary (2026-10-13)**

| | |
|---|---|
| Visually approved | **yes** (all six scenes) |
| Production integrated | **yes** (`public/discovery/`, `visual.class` = `AI_CONCEPTUAL`) |
| Available in staging preview | **yes**: `/entdecken/mein-arztbesuch?vorschau=freigabe` (staging / pre-launch build, not the official practice website) |
| Formally approved (practice, content, medical 03–05, AI child) | **no**, all open |
| Publicly released | **no**: `RELEASE.meinArztbesuchApproved = false`; the whole site stays `noindex` (`RELEASE.indexable = false`) |

**Correction (2026-10-13):** Approval entries for practice, content, medical review and the AI-child decision (named reviewer, dated 2026-10-12) had been recorded on 2026-10-12 and the chapter was briefly released (commit `4a35e08`). That provenance was not confirmed approval evidence. It was removed and the release gate was reset. The image integration from that commit remains.

**Approval package:** [discovery-approval-package.md](discovery-approval-package.md), with the review sheets for [physician (03–05)](discovery-physician-review.md), [practice + content (01–06)](discovery-practice-content-review.md) and the [AI-child publication decision](discovery-ai-child-publication-decision.md). All sheets are open.

## Higgsfield blocker (resolved)

Until 2026-10-11 Higgsfield returned `grace_daily_limit_reached` (`unlock_full_access_notice`) for every generation request, even though credits remain on the account (482.73 on 2026-10-11). Generation was blocked despite remaining credits. The block no longer applied on 2026-10-12: Scenes 05 and 06 were generated then. Scene 04 had been produced outside Higgsfield (ChatGPT image generation).

## Integration state (2026-10-12/13)

- `src/content/discovery.ts`: every `practiceApproval` and `contentApproval`, and `medicalApproval` for 03–05, is `TO_BE_CONFIRMED`. `visual.class` is `AI_CONCEPTUAL` with production images.
- Production images in `public/discovery/d1-<slug>-<w>.{avif,webp}`: 960/1600/2400 px; scene 04 at 960/1448 px (native, not upscaled).
- Alt texts of scenes 04 and 05 were corrected to match the final images. The previous texts described the briefs ("T-Shirt", "Lampe leuchtet").

## Open items

1. **Physician review** of scenes 03, 04 and 05 (instrument form, nothing medically misleading). For scene 04: listening over the sweater, and the silver chest piece, which deviates from the cobalt/brass brief.
2. **Practice and editorial approval** of all six scenes, their texts and the chapter introduction.
3. **Decision on publishing an AI-generated child** (as for the hero). Legal and practice decision.
4. **Release:** record the approvals (name, role, date) in `discovery.ts`, then set `RELEASE.meinArztbesuchApproved = true`.

## Staging review (2026-10-13)

The complete chapter (six scenes, final images in `public/discovery/`, all tracked in git) is reviewable on staging:

- `/entdecken/mein-arztbesuch?vorschau=freigabe`
- `/entdecken?vorschau=freigabe` → "Mein Arztbesuch"
- via the review hub `/review`, if `REVIEW_HUB_ENABLED=true` is set

The normal route still shows "In Vorbereitung". This is review availability only, **not** a publication approval: `RELEASE.meinArztbesuchApproved = false` and `RELEASE.indexable = false` are unchanged, and all formal approvals (practice, content, physician 03–05, AI-child decision) remain open without names or dates.
