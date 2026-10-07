# First Visit Flow — "Neu bei uns?"

Phase: 03
Date: 2026-10-07
Page: P-34 `/praxis/neu-bei-uns`. Journey: J7 in [user-journeys.md](user-journeys.md). Fact IDs: [fact-status-register.md](../research/fact-status-register.md).

Rule: every item is shown **only when confirmed**. Unknown items are tracked internally and never invented. The page must still be useful with few confirmed items: its job is then to get families on the phone.

---

## 1. Flow structure

The page is a short sequence of questions in the order a family asks them. Each block is one screen or less on mobile.

| # | Block (working heading) | Answers | Content source |
|---|---|---|---|
| 1 | **Wo finden Sie uns?** | Address, route link (phone's map app), public transport, parking | Practice profile (F13, F14); F87, F88 |
| 2 | **So erreichen Sie uns** | Phone (tap), telephone hours, email + usage note, fax | F15–F19 |
| 3 | **Termine** | How appointments are made; new-patient acceptance; newborn registration | F48, F77, F79 |
| 4 | **Wenn Sie ankommen** | What happens on arrival (reception, waiting, healthy/sick separation if any) | F78-related practice input; F47 |
| 5 | **Bitte mitbringen** | Documents (insurance card, U-Heft, Impfpass …) | F78 |
| 6 | **Zugang** | Step-free access, lift, stroller | F85, F86 |
| 7 | **Wen Sie treffen** | Ärztinnen and team (links, photos with consent) | F20–F33 → P-31, P-32 |
| 8 | **Für Ihr Kind** | Mein Arztbesuch (ENTDECKEN), parent explanation | P-41 |
| 9 | **Noch Fragen?** | "Weitere Fragen beantworten wir gern telefonisch." + Anrufen | F15 |

Blocks with no confirmed content are omitted entirely (no empty headings). Block 9 is always present.

## 2. Confirmation status per item (as of 2026-10-07)

| Item | Status | Public behaviour now |
|---|---|---|
| Address | TO_BE_CONFIRMED (spelling F13; launch blocker LB-03) | Shown after LB-03 |
| Postcode / city | VERIFIED_CURRENT (F14) | Shown |
| Route link | Depends on F13 | Shown after LB-03 |
| Phone | VERIFIED_CURRENT (F15) | Shown |
| Fax | VERIFIED_CURRENT (F16), display TBD (NH-13) | Shown if practice keeps it |
| Email + usage note | Address verified (F17); usage policy TBC (F18, LB-11) | Shown with note after LB-11 |
| Telephone hours | TO_BE_CONFIRMED (F19) | Omitted |
| Booking channel | TO_BE_CONFIRMED (F48) | Omitted; block 9 covers it |
| New-patient acceptance | TO_BE_CONFIRMED (F77) | Omitted — **no implied acceptance** |
| Newborn process | TO_BE_CONFIRMED (F79) | Omitted |
| What to bring | TO_BE_CONFIRMED (F78) | Omitted |
| Arrival procedure | Missing | Omitted |
| Mask rule | TO_BE_CONFIRMED (F47) | Omitted |
| Step-free access / lift | TO_BE_CONFIRMED (F85) | Omitted — **no accessibility claim by default** |
| Stroller | TO_BE_CONFIRMED (F86) | Omitted |
| Parking | TO_BE_CONFIRMED (F87) | Omitted |
| Public transport | TO_BE_CONFIRMED (F88) | Omitted |
| Physicians | VERIFIED_CURRENT names (F20, F22); titles partly TBC (F23); consent TBC (F33) | Shown after LB-05, LB-09 |
| Team | Names VERIFIED_CURRENT (F26–F30); completeness/consent TBC (F31, F33) | Shown after LB-08, LB-09 |
| Mein Arztbesuch | Pending physician approval | Shown when approved |

With today's data the public page would contain: blocks 1 (after LB-03), 2 (phone; email after LB-11), 7 (after LB-05/08/09), 8 (after approval), 9. That is enough to be useful and honest.

## 3. Future possibilities (not V1, not promised)

- Downloadable/printable first-visit checklist (only confirmed items)
- Photos of entrance and waiting room (NH-05, P-36)
- Short video tour (Phase 2; consent and accessibility needed)
- Online booking (X08 — explicitly not built until decided)
- Leichte Sprache version of this page

## 4. Editorial notes

- Wording is welcoming but factual — no "Wir freuen uns auf Sie!" filler as the only content.
- Every operational statement comes from the canonical source (contact, hours) — this page never holds its own copy of address or hours.
- Questions for the practice that would complete this page are listed in [missing-information.md](../research/missing-information.md) §C–E.
