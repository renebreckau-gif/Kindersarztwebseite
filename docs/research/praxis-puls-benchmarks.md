# PRAXIS PULS Benchmarks

Phase: 02 — World-Class Benchmark & Translation Research
Date: 2026-10-07
Mechanisms: M01, M02, M05, M06, M13, M20, M21 in [transferable-patterns.md](transferable-patterns.md). Safety rules: [source-policy.md](source-policy.md) §5, [fact-status-register.md](fact-status-register.md).

---

## 1. Live-status references and principles

| Principle | Reference (inspected) | What they do | Translation for PRAXIS PULS |
|---|---|---|---|
| **OPEN NOW** as sentence | R40 MoMA, R38 Rijksmuseum, R16 kinderarzt.at | "The museum is open 10:30 a.m.–5:30 p.m. today." / "Heute geöffnet 08:00–13:00, 13:30–19:00" | "Heute geöffnet · bis 12:00" |
| **NEXT EVENT** | R04 Cincinnati ("Closed · Open 10/07/2026 at 9:00 AM"), R29 Lando Norris (next race in nav) | Closed state always carries the next opening | "Geschlossen · öffnet morgen um 08:00" |
| **TEMPORARY CHANGE** | R64 Flighty ("Changed to ORD Terminal 2 • Gate 7"), R39 Tate (end dates) | Change stated explicitly with scope | "Geänderte Sprechzeit heute: 08:00–10:00" |
| **CURRENT STATUS vocabulary** | R67 GitHub Status ("Operational", "Partial outage", "No incidents reported today") | Small fixed vocabulary + summary line | Five states (§3) |
| **REASON** | R64 Flighty ("See why you're delayed") | Deviation explained | "Praxisurlaub bis 07.08. · Vertretung anzeigen" |
| **WARNING** | R01 GOSH alert, R03 Boston construction notice | Alert above content | Notices only with validity window (M06) |
| **PRIMARY ACTION** | R68 Apple ("Or call"), R05 Seattle ("Visit ED or Urgent Care") | One clear next step | Action depends on state (§4) |
| **Constraint up front** | R16 ("! Terminvereinbarung immer notwendig") | Rule displayed with the status | "Nur Terminsprechstunde" when a slot type is verified (F43) |
| **Real-time load** | R06 RCH ED status ("how busy we are") | Live occupancy | **Not applicable** — no data source; must not be simulated |
| **Stale-state failure** | R06 RCH (March maintenance + COVID banners still live) | Status content outlives reality | Validity windows + auto-expiry + UNBEKANNT fallback |

Healthcare-specific caution: transport and status-page patterns imply the system *knows* the state in real time. PRAXIS PULS knows only what was entered and verified. Every displayed state is a **derived claim** from structured data and must be explainable from the fact register.

## 2. Placement — validation

### Options evaluated

| Form | Pros | Cons | Verdict |
|---|---|---|---|
| Top rail | Conventional location for alerts (R01, R03) | Out of thumb reach on mobile; competes with browser chrome; banner blindness | Desktop only (slim utility line) |
| Bottom rail | Thumb zone; persistent | Takes vertical space; must coexist with dock | Merge with dock (mobile) |
| Floating dock | Visible everywhere | Covers content; WCAG 2.4.11 focus obscuring; feels like a chat widget | Reject as a free-floating bubble |
| Inline element | Most readable; full sentence; no overlay | Disappears when scrolling | Primary on Heute |
| **Hybrid** | Inline detail where users look first + compact persistent echo elsewhere | Two renderings of one state (must stay identical) | **Recommended** |

### Recommended form: Hybrid

| Device | Primary (inline) | Persistent (compact) |
|---|---|---|
| **Desktop** | Heute: status sentence as editorial headline beside the Growing Mobile, with next transition and primary action | Slim utility line at the top: status chip · phone number as text · Notfall · Route. Not sticky-floating; sticky line is acceptable if ≤ ~48 px |
| **Tablet** | Same as desktop in landscape; in portrait like mobile | Portrait: bottom dock; landscape: utility line |
| **Mobile** | Heute: status sentence + actions in the first viewport, above the object | Bottom dock: status chip (one word + one time) · Anrufen · Notfall · Menü; chip expands to a sheet with reason + action |

On Heute the compact chip may collapse while the inline version is visible, to avoid duplication.

## 3. Initial information and state design

**Visible initially (any device):** state word + one time + one primary action. Everything else (reason details, week, replacement addresses) via disclosure (M22).

| State | Wording (working) | Visual distinction | Primary action | Data preconditions |
|---|---|---|---|---|
| **OPEN** | "Geöffnet · bis 12:00" | Functional green status dot **+ word**; never green surfaces or brand green | Anrufen | F35–F39 verified + no active closure/notice override |
| **CLOSED** | "Geschlossen · öffnet morgen um 08:00" | Neutral ink/grey dot + word; calm, not alarming | Notfall-Hinweise anzeigen (out of hours) / Sprechzeiten | Same + next-opening computable, F40/F49 resolved for weekends/holidays |
| **SPECIAL HOURS** | "Geänderte Sprechzeit · heute 08:00–10:00" | Attention marker (amber-type dot + outline icon) + word; reason line | Details anzeigen | Verified exception entry with date |
| **VACATION** | "Praxisurlaub bis 07.08. · Vertretung anzeigen" | Distinct icon (not a colour alone), slightly stronger presence; reason always shown | Vertretung anzeigen | Verified closure + FB-10 directory, else "Bitte informieren Sie sich telefonisch" |
| **UNKNOWN** (fallback) | "Aktuelle Sprechzeiten ansehen" / "Praxis kontaktieren" | **No status colour, no dot** — plain cobalt link styling; looks like navigation, not like a state | Sprechzeiten / Anrufen | Default whenever any precondition fails |

Acute consultation is a **sub-state** ("Akutsprechstunde ab 10:00") shown only when FB-01…FB-03 are resolved; until then it is never displayed — not even as "unknown".

Rules:
- Colour is never the only carrier (word + icon + colour).
- Status green is functional only; it is not the brand colour (brand: Warm Editorial + Cobalt). Cobalt is never used to signal a state, so that UNKNOWN cannot be misread as "OK".
- Emergency (Notfall) has its own fixed visual language, independent of PULS state, and never turns red-alert by status.
- No live-region announcements on page load; changes only announced on user request (avoid screen-reader noise).
- Time zone Europe/Berlin; server-rendered state; client refresh at slot boundaries; if client and server disagree → UNKNOWN.

## 4. State → action logic

| State | Primary | Secondary |
|---|---|---|
| OPEN | Anrufen | Route |
| CLOSED (out of hours) | Notfall-Hinweise | Sprechzeiten |
| SPECIAL HOURS | Details | Anrufen |
| VACATION | Vertretung anzeigen | Notfall-Hinweise |
| UNKNOWN | Sprechzeiten ansehen | Anrufen |

## 5. Risks specific to PRAXIS PULS

1. Users treat the chip as real-time truth → wording must stay factual ("laut Sprechzeiten") where helpful; show verification "Stand" on detail.
2. Two renderings drift apart → single state function rendered twice.
3. Holidays/bridge days unconfirmed (F49) → CLOSED/OPEN cannot be shown on those dates → UNKNOWN.
4. Editors forget to end a closure → auto-expiry + editor warnings (C13).
5. Over-designed state animation → state changes are instant; at most a subtle fade.
