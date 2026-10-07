# North Star

Phase: 01 — Product Strategy
Date: 2026-10-07
Inputs: all documents in `/docs/research/`, in particular [fact-status-register.md](../research/fact-status-register.md), [project-blockers.md](../research/project-blockers.md), [source-policy.md](../research/source-policy.md).

---

## Ambition

Not "a modern paediatric website", but **one of the most useful, memorable and forward-looking paediatric practice websites possible** — a bespoke digital product for one real practice in Hettstedt, with the craft of a €5,000–€10,000+ strategy, design and development engagement.

The ambition is measured by usefulness first. A beautiful site that lets a stressed parent down once has failed.

## Brand idea

**GESUND GROSS WERDEN.**

Growing up healthy is a process over years, with a practice that accompanies it. Every product layer expresses one aspect of it:

| Layer | Relation to "Gesund groß werden" |
|---|---|
| JETZT | The practice is there when it matters, today. |
| MEIN KIND | Each age has its own checks, questions and milestones. |
| PRAXIS | Real people accompany the child over years. |
| ENTDECKEN | The child understands their own body and the visit — and grows less afraid. |

## Core product principle

**UTILITY FIRST. WONDER SECOND.**

- Parents get critical information immediately, on any device, without waiting for anything to load, animate or be discovered.
- Children can enter a playful discovery world.
- Neither compromises the other: wonder never sits between a parent and the phone number, and utility never makes the child's world feel like a form.

## Truth principle

The website only says what is true **now**.

- Every operational claim is backed by a fact with status `VERIFIED_CURRENT` in the fact status register.
- `TO_BE_CONFIRMED` facts are never guessed; `OUTDATED_DO_NOT_PUBLISH` facts never appear as current.
- When in doubt, the site shows a neutral fallback instead of a specific claim (source-policy §5).
- Truth is visible: "Stand"/last-verified dates where they help, honest placeholders where assets are missing.

## The three questions

The whole product is organised around three parent questions, plus one child invitation:

1. **Was brauche ich jetzt?** — What do I need now? → JETZT, PRAXIS PULS
2. **Was ist für mein Kind wichtig?** — What is relevant for my child? → MEIN KIND
3. **Wer ist diese Praxis?** — Who is this practice? → PRAXIS
4. **Komm, wir entdecken!** — the child's door → ENTDECKEN

## Signature elements

1. **PRAXIS PULS** — a persistent, fail-safe operational layer answering "What is relevant about the practice right now?"
2. **The Growing Mobile** — a sculptural, interactive entry object (growth, medicine, curiosity, childhood, movement, discovery) that is also navigation, transforming into a time/status instrument (Praxis), an age instrument (Mein Kind) and an explorer (Entdecken). It is an enhancement, never a dependency.
3. **Mein Arztbesuch** — a calm, honest child-facing walkthrough of a visit to this practice.

## Primary and secondary users

- **Primary: parents** — often stressed, one-handed, holding a child, on an older phone, with varying digital confidence.
- **Secondary: children** — roughly pre-school to primary-school age, usually exploring together with a parent.
- **Operators: the practice team** — must keep operational information current with minimal effort, in German, without technical knowledge.

## What success looks like in one sentence

> A parent with a feverish child at 07:40 finds out within seconds whether, when and how to come — and the same family later returns with the child because the child *wants* to see "the mobile" again.

## Non-negotiables

- German public interface, including child experiences and CMS labels for staff.
- Phone, hours, status, emergency, route and contact work without 3D, animation, WebGL, scroll choreography, pointer precision — and without JavaScript.
- WCAG 2.2 AA as a floor.
- No health-data collection, no accounts, no diagnosis.
- No invented doctors, staff, qualifications, services, hours, rules, testimonials or medical claims.
- Launch only after the launch blockers in `project-blockers.md` are resolved.
