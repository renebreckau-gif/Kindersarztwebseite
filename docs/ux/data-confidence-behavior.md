# Data Confidence Behaviour

Phase: 03
Date: 2026-10-07
Policy source: [source-policy.md](../research/source-policy.md). Facts: [fact-status-register.md](../research/fact-status-register.md). Blockers: [project-blockers.md](../research/project-blockers.md).

This document turns the three fact states into interface rules — for the public site and, later, for the editor (CMS) view. It describes behaviour, not implementation.

---

## 1. The three states in the interface

| State | Public site | Editor view (later CMS) |
|---|---|---|
| `VERIFIED_CURRENT` | Shown as fact. High-risk facts show a "Stand" date where currency matters (emergency, medical orientation). | Green "bestätigt" badge with date and confirming person; re-verification due date |
| `TO_BE_CONFIRMED` | **Not shown as a claim.** The slot renders its defined neutral fallback, or nothing. Never "vermutlich", never a placeholder that looks like a fact. | Amber "zu bestätigen" badge; preview shows exactly what the public will see (the fallback); listed in an editor checklist |
| `OUTDATED_DO_NOT_PUBLISH` | **Never rendered.** | Grey "veraltet" badge; kept read-only as history; cannot be attached to a published page |

Content without any status is treated as `TO_BE_CONFIRMED`.

## 2. Rendering rules

**R1 — Slot-level fallback.** Every operational slot defines its fallback in advance. If its fact is not `VERIFIED_CURRENT`, the fallback renders.

**R2 — No partial operational claims.** A statement composed of several facts (e.g. "Akutsprechstunde heute ab 10:00 bis 11:00") renders only if *all* its facts are verified. Otherwise the whole statement falls back — never a half statement ("Akutsprechstunde heute ab 10:00" without end, if the end is unknown).

**R3 — Conflict = unknown.** If two sources disagree (e.g. schedule says open, an active closure says closed and it is unclear which applies; client clock vs. server state), the result is `UNKNOWN`.

**R4 — Expiry is structural.** Anything with an end date disappears after it, automatically. A notice without end date must be explicitly marked "unbefristet" by an editor.

**R5 — Stale is unverified.** A fact whose re-verification date has passed is treated as `TO_BE_CONFIRMED` for safety-critical categories (emergency, hours, replacement practices). Intervals are still to be agreed (source-policy §6).

**R6 — Pages need a verified core.** A page is published only if its core content is verified. Missing optional sections are omitted, not filled. Empty pages are never published (old site: empty "Praxis" page, F76).

**R7 — 112 is unconditional.** The emergency number and its sentence are always rendered (F56), independent of any other data.

**R8 — Phone is the universal fallback.** Where a fallback needs an action, it is "Anrufen" (F15) or "Sprechzeiten ansehen". If the phone number itself were ever unverified, the fallback becomes Kontakt (P-35) with whatever is verified, and the launch blocker LB-00 applies.

## 3. Fallback catalogue (working German copy)

| Slot | Requires | Verified rendering (example) | Fallback |
|---|---|---|---|
| PULS state | Schedule + exceptions + closures for today, holiday rule | "Praxis geöffnet · Heute bis 12:00 Uhr" | "Aktuelle Sprechzeiten · Informationen ansehen" (no dot, no colour) |
| Next opening | Schedule for the coming days incl. weekends/holidays (F40, F49) | "Öffnet morgen um 08:00 Uhr" | "Nächste Sprechzeit ansehen" |
| Akutsprechstunde | FB-01…03 | "Akutsprechstunde heute ab 10:00 Uhr" | Not shown; P-11 section: "Ob wir heute kranke Kinder ohne Termin sehen können, erfahren Sie telefonisch." + Anrufen |
| "Nur gesunde Patienten" window | F41 + F42 meaning | "08:00–10:00 Uhr: Vorsorge und Impfungen (nur gesunde Kinder)" | "08:00–10:00 Uhr: Bitte nur gesunde Kinder" only if F41 verified but F42 not; otherwise slot hidden |
| Telephone hours | F19 | "Telefonisch erreichbar: …" | Not shown; phone number only |
| Vertretung | Closure + FB-10 directory | Practice name, phone (tap), address, period | "Bitte informieren Sie sich telefonisch über die Vertretung." + Notfall link |
| Emergency facility | LB-10 per entry | Name, address, phone, hours, "Stand" | Entry omitted; 112 + (if confirmed) 116117 remain |
| 116117 | F57 | "Ärztlicher Bereitschaftsdienst: 116117" | Omitted |
| Physician/staff | F20–F33 incl. consent | Name, role, photo | Person omitted (no consent) / photo omitted (designed placeholder only for confirmed persons without photo) |
| Service | F66–F74 per entry | Entry with description | Entry omitted |
| U/J examination | Official source + governance | Entry with "Stand" | Entry reduced to official link |
| Vaccination topic | Official source + governance | Curated explanation + source + "Stand" | General explanation + official link without age detail (strategy-lock 2.3) |
| Address | F13 | Full address + route link | Launch blocker (LB-03) — no public fallback needed post-launch |
| Neu bei uns items | Per item (F77–F88) | Item shown | Item omitted; one shared line: "Weitere Fragen beantworten wir gern telefonisch." |

## 4. Scenario rules (Journey 12 detail)

| Scenario | Public behaviour | Editor behaviour |
|---|---|---|
| **Opening hours conflict** (e.g. schedule vs. special-hours entry overlap with different times) | PULS → UNKNOWN fallback on all pages; P-11 shows the regular week but marks the affected date: "Für den {Datum} gelten geänderte Zeiten – bitte telefonisch erfragen." | Conflict warning naming both entries; publish blocked until resolved |
| **Acute rule unconfirmed** | No acute state anywhere; P-11 section shows fallback sentence + Anrufen | Acute fields shown as "zu bestätigen"; preview shows fallback |
| **Active closure without replacement** | PULS: "Praxisurlaub bis {Datum}" + action "Notfall-Hinweise"; P-10 #vertretung: fallback sentence | Warning "Schließung ohne bestätigte Vertretung" |
| **Replacement entry stale** (verification older than interval) | That replacement omitted; if none remain → fallback | Entry flagged "Prüfung fällig" |
| **Emergency entry stale** | Entry omitted; 112 (+116117) remain; page "Stand" reflects oldest shown entry | Flag with due date; dashboard count |
| **Contact detail uncertain** | Not applicable post-launch (launch blocker). Pre-launch: no public site. | — |
| **Notice expired** | Disappears from P-10, P-12 and PULS reason immediately at end date (server-side, no cache beyond the boundary) | Moves to "abgelaufen" list |
| **Notice without validity** | Not published | Save allowed, publish blocked until "gültig bis" or "unbefristet" set |
| **Clock / time-zone doubt** | UNKNOWN | — |
| **Data source unreachable** (e.g. CMS outage) | Last verified *static* week shown on P-11 with "Stand"; PULS → UNKNOWN (never a cached live state) | — |

## 5. PRAXIS PULS state model

States are publicly available only when their preconditions are verified. Until then the state machine still runs, but those states resolve to UNKNOWN or are skipped.

| State | Meaning | Preconditions (fact / blocker) | Public V1 availability |
|---|---|---|---|
| OPEN | Within a verified slot today | F35–F39, LB-00, no override | After LB-00 |
| CLOSING_SOON | ≤ N minutes before slot end (N TBC with practice) | OPEN + agreed N | After decision on N |
| OPENING_SOON | ≤ N minutes before next slot today | OPEN preconditions | After decision on N |
| ACUTE_CONSULTATION | Within verified acute window | FB-01…03 | **Not available** until resolved |
| SPECIAL_HOURS | Verified exception for today | Exception entry verified | After CMS + editor routine (FB-09) |
| VACATION | Planned closure active | Closure entry verified | After FB-09; replacement shown only with FB-10 |
| TEMPORARILY_CLOSED | Short-notice closure (e.g. illness, technical) | Closure entry verified (reason optional) | After FB-09 |
| CLOSED | Outside slots, next opening computable | F40, F49 for the relevant days | After FB-05/FB-06 |
| UNKNOWN | Any precondition missing, conflict, stale, outage | — | Always (default) |

Resolution order (first match wins): data error/conflict → UNKNOWN · TEMPORARILY_CLOSED · VACATION · SPECIAL_HOURS (replaces regular slots for the day) · ACUTE_CONSULTATION (sub-state of OPEN) · OPENING_SOON / CLOSING_SOON · OPEN · CLOSED · UNKNOWN.

Visual distinction (from praxis-puls-benchmarks.md §3): green dot only for OPEN family; neutral dot for CLOSED; attention marker + reason for SPECIAL_HOURS / TEMPORARILY_CLOSED; distinct icon + "Vertretung anzeigen" for VACATION; **no colour, no dot** for UNKNOWN. Cobalt is never a status.

## 6. What the user never sees

- A status with a question mark, "wahrscheinlich", "ca."
- A past closure, an expired notice, an ended training period (F25, F50–F52, F55)
- A replacement practice or emergency facility that has not been verified
- Placeholder people, services, rooms or photos presented as real
- A "last updated" date that is older than the re-verification interval on safety-critical content
