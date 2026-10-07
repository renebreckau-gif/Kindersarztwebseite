# Media Policy

Phase: 04
Date: 2026-10-07
Model: MediaAsset in [content-model.md](content-model.md) §19 / [`content-types.ts`](../../src/domain/content-types.ts). Related: [trust-model.md](../product/trust-model.md) §4, [anti-patterns.md](../product/anti-patterns.md).

---

## 1. Classes

| Class | Definition | May represent | Must never |
|---|---|---|---|
| **REAL** | Photography/video/audio of the actual practice, its rooms or its people, with documented rights and consent | Doctors, staff, rooms, entrance, practice details | Be used without verified rights/consent; be edited to change what is real (e.g. adding equipment) |
| **PLACEHOLDER** | Neutral designed stand-in during development | Nothing real | Appear on production pages; look like a real photo of a person or room |
| **AI_CONCEPTUAL** | AI-generated or AI-assisted imagery for concepts, atmosphere, education | Conceptual children, discovery visuals, abstract growth/body illustrations | Depict or imply real doctors, staff, patients, or the practice's rooms; be attached to Doctor, TeamMember, Location |

## 2. Rules

1. **Real people and real practice spaces: REAL verified media only.** If no real photo exists: designed neutral placeholder for confirmed persons (no face), or omit (trust-model §4).
2. **AI-generated doctors are not allowed** as representations of actual staff — under no circumstances.
3. **AI-generated practice rooms are not allowed** as representations of the actual practice.
4. **AI children** are allowed only for conceptual / educational / atmospheric use, never presented as patients of the practice, never in testimonial-like contexts.
5. **Every asset has provenance and rights metadata**: class, rights owner, credit, rights end date, AI flag, people depicted + consent status, purpose.
6. **Consent** for identifiable people is documented per person; withdrawal → asset unpublished.
7. **Rights expiry** (`rightsUntil`) → asset unpublished automatically; editor warning 30 days ahead.
8. **Alt text** required for informative images (German, describes content: "Porträt Nadine Probst"); decorative images marked decorative.
9. **No stock photos of doctors, families or medical scenes** (anti-patterns).
10. **3D/illustration assets** for the Growing Mobile and ENTDECKEN are AI_CONCEPTUAL or original artwork; they must not mimic referenced artists (do-not-copy.md, e.g. Calder).
11. **Existing photos** (2020, credit "Thomas Reinhardt") may only be reused after rights confirmation (F11) and consent of depicted staff (F33).
12. **Logo / illustration** ("Liams Tiere", F12) only after rights confirmation.

## 3. Enforcement in the system

| Rule | Mechanism |
|---|---|
| PLACEHOLDER not in production | Publish validation blocks published documents referencing PLACEHOLDER assets |
| AI_CONCEPTUAL not for people/rooms | Validation on Doctor.photo, TeamMember.photo, Location media |
| Consent | Person and asset both require verified consent for publication (`decidePerson`) |
| Rights expiry | Date-based visibility, warnings |
| Provenance | Required fields on upload |

## 4. Open items
- Photo shoot of practice and team (NH-05, NH-12) — REAL media for P-31, P-32, P-36.
- Rights clarification for existing images and logo (LB-12).
- Labelling of AI_CONCEPTUAL imagery for the public (e.g. a note in the ENTDECKEN credits) — decide with legal review ⚖.
