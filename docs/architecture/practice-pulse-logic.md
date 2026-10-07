# PRAXIS PULS Logic

Phase: 04
Date: 2026-10-07
Implementation: [`src/domain/practice-status.ts`](../../src/domain/practice-status.ts) — `getPracticeStatus(now, data, options)`
Tests: [`src/domain/__tests__/practice-status.test.ts`](../../src/domain/__tests__/practice-status.test.ts) (59 tests, all passing) · run `npm test`
Status: prototype engine, **not connected to the public UI**.

Principle: **SAFE UNKNOWN over CONFIDENT BUT UNSUPPORTED.**

---

## 1. Function contract

```ts
getPracticeStatus(now: Date, data: PulsData, options?: PulsOptions): PracticeStatusResult
```

- Pure and deterministic: same `now` + same data → same result. No I/O, no server-timezone use.
- `data`: WeeklySchedule, ConsultationTypes, OpeningHourExceptions, Closures, ReplacementPractices, public-holiday dates, holiday policy.
- `options.soonThresholdMinutes`: enables OPENING_SOON / CLOSING_SOON; `null` (default) until the practice agrees a value.
- `options.nextOpeningSearchDays`: default 14 (extended automatically to cover an active closure + 7 days).

### Result (public vs. internal)

| Field | Public? | Meaning |
|---|---|---|
| `status` | yes (as wording) | One of the nine states |
| `indicator` | yes (visual family) | OPEN · NEUTRAL · ATTENTION · CLOSURE · **NONE** (UNKNOWN) |
| `headline`, `detail` | yes | German copy, e.g. "Praxis geöffnet" / "Heute bis 12:00 Uhr" |
| `primaryAction`, `secondaryActions` | yes | CALL · HOURS · EMERGENCY · REPLACEMENT · DETAILS with German labels |
| `currentInterval`, `consultationType` | yes | For detail views |
| `nextOpening` | yes | `{date, time, instant, label}`; `null` = cannot be determined safely |
| `activeException`, `activeClosure`, `upcomingClosure` | yes (messages) | For Heute and notices |
| `replacementPractices`, `replacementFallback` | yes | Only verified & fresh replacements for today's sub-period |
| `acuteSuppressed` | editor | Acute rules exist but are unusable |
| `dataConfidence` | editor | VERIFIED · REVIEW_DUE · UNKNOWN |
| `reason`, `sourceRecordIds`, `lastVerified` | editor / audit | Never rendered publicly except "Stand" from `lastVerified` where appropriate |
| `evaluatedAt` | internal | Instant, Berlin date/time, zone |

UNKNOWN result (always identical):

```json
{ "status": "UNKNOWN", "indicator": "NONE",
  "headline": "Aktuelle Sprechzeiten", "detail": "Bitte aktuelle Informationen prüfen.",
  "primaryAction": { "id": "HOURS", "label": "Sprechzeiten ansehen" },
  "secondaryActions": [{ "id": "CALL", "label": "Anrufen" }],
  "nextOpening": null, "dataConfidence": "UNKNOWN" }
```

No green indicator, no inferred acute state, no invented next opening.

## 2. Status hierarchy and rule precedence

Each **local day** (Europe/Berlin) is first resolved into a *day plan*; the status for `now` is derived from today's plan.

### Day resolution (first applicable layer decides; contradictions → UNKNOWN)

```
1. Closures covering the date
   - any covering closure not usable (unverified / stale)      → UNKNOWN (CLOSURE_UNVERIFIED)
   - several verified closures                                  → most specific kind wins:
                                                                   SHORT_NOTICE > TRAINING/OTHER > VACATION
2. Exceptions covering the date
   - any covering exception not usable                          → UNKNOWN (EXCEPTION_UNVERIFIED)
   - several: higher priority wins; equal priority + different  → UNKNOWN (EXCEPTION_CONFLICT)
3. Combine
   - closure + SPECIAL_HOURS exception (closed vs. open)        → UNKNOWN (CLOSURE_EXCEPTION_CONFLICT)
   - closure (+ CLOSED exception, consistent)                   → CLOSURE
   - exception CLOSED                                           → CLOSED (day)
   - exception SPECIAL_HOURS                                    → SPECIAL (intervals replace the week)
4. Public holiday (no closure/exception for the date)
   - policy REQUIRE_EXPLICIT_ENTRY                              → UNKNOWN (HOLIDAY_WITHOUT_RULE)
   - policy CLOSED_ON_PUBLIC_HOLIDAYS, verified                 → CLOSED (day)
   - policy unverified                                          → UNKNOWN
5. Weekly schedule
   - missing                                                    → UNKNOWN (NO_SCHEDULE)
   - schedule unverified / review expired beyond grace          → UNKNOWN
   - any non-acute rule for the weekday unverified              → UNKNOWN (RULE_UNVERIFIED)
   - no rules and weekday not confirmed closed (absence≠closed) → UNKNOWN (NO_RULES_FOR_DAY)
   - rules on a confirmed closed weekday                        → UNKNOWN (RULE_CONFLICT)
   - overlapping non-acute rules / invalid interval             → UNKNOWN
   - acute rule: used only if rule AND ACUTE type verified;
       unverified → ignored, acuteSuppressed = true
       verified but outside opening hours                       → UNKNOWN (ACUTE_CONFLICT)
```

Why closures before exceptions: a closure is the stronger statement about the whole practice; an exception that *agrees* (closed) is harmless, one that *disagrees* (open hours during a closure) is a contradiction the editor must resolve — the public sees UNKNOWN until then.

### Status for `now`

| Day plan | Status |
|---|---|
| UNKNOWN | **UNKNOWN** |
| CLOSURE (VACATION) | **VACATION** (indicator CLOSURE; primary "Vertretung anzeigen" if a verified replacement exists, else "Notfall-Hinweise") |
| CLOSURE (other kinds) | **TEMPORARILY_CLOSED** (indicator ATTENTION) |
| CLOSED (exception / holiday) | **CLOSED** "Heute geschlossen" |
| SPECIAL | **SPECIAL_HOURS** all day (with `currentInterval` when inside) |
| REGULAR, inside acute window | **ACUTE_CONSULTATION** |
| REGULAR, inside block, ≤ threshold to end | **CLOSING_SOON** |
| REGULAR, inside block | **OPEN** |
| REGULAR, next interval today ≤ threshold | **OPENING_SOON** |
| REGULAR, otherwise | **CLOSED** with `nextOpening` |

Contiguous intervals (e.g. "nur gesunde Kinder" 08–10 + general 10–12) form one block: "Heute bis 12:00 Uhr"; the current consultation type is reported separately.

## 3. Required data per status

| Status | Requires (all verified, fresh) | Fact / blocker |
|---|---|---|
| OPEN / CLOSED | Weekly schedule incl. closed weekdays; holiday policy or explicit entries for holidays | F35–F40, F49; LB-00, FB-05, FB-06 |
| OPENING_SOON / CLOSING_SOON | As OPEN + agreed threshold | Practice decision |
| ACUTE_CONSULTATION | ACUTE consultation type + acute rules inside opening hours | FB-01…03 |
| SPECIAL_HOURS | Verified exception | FB-09 (editor routine) |
| VACATION | Verified closure; replacements only with verified directory entries | F53, F54; FB-07, FB-10 |
| TEMPORARILY_CLOSED | Verified closure (short notice / training / other) | FB-09 |
| UNKNOWN | — (default) | — |

**Current reality (2026-10-07):** acute rules, weekend and holiday rules are unconfirmed → in production today the engine would return OPEN/CLOSED only where the week is verified, never ACUTE_CONSULTATION, and UNKNOWN on weekends/holidays until F40/F49 are confirmed.

## 4. Timezone and date handling

- Zone is fixed: `Europe/Berlin` (`PRACTICE_TIME_ZONE`). All conversion via `Intl.DateTimeFormat` with explicit `timeZone`; the host zone is never used (test: Sunday 23:30 UTC is treated as Berlin Monday 01:30).
- Dates are calendar dates (`YYYY-MM-DD`) in Berlin; times are wall-clock `HH:MM`. Rules are evaluated on the Berlin date (validity periods included).
- `nextOpening.instant` is computed with `zonedToInstant()` — DST-correct (tests for 2026-03-29 and 2026-10-25).
- Spring-forward gap times resolve to the later offset (practice hours never fall into 02:00–03:00).
- Midnight: a day ends at 24:00 local; intervals crossing midnight are rejected as invalid data (none are needed; if ever required, model as two rules).
- Automatic expiry: closures/exceptions/announcements are compared against the Berlin date at evaluation time — no editor action needed.
- Rendering: the server computes the state per request (short cache; boundaries at slot starts/ends); the client may refresh at the next boundary. If client and server disagree → UNKNOWN (UX rule R3).

## 5. Conflict behaviour (explicit cases)

| Case | Result |
|---|---|
| Two exceptions overlap, equal priority, different content | UNKNOWN + editor conflict |
| Two exceptions overlap, different priority | Higher priority wins |
| Two opening rules overlap on the same weekday | UNKNOWN (RULE_CONFLICT) |
| Exception unverified | UNKNOWN for its dates |
| Vacation overlaps special (open) hours | UNKNOWN (contradiction) |
| Vacation overlaps CLOSED exception | VACATION |
| Short-notice closure overlaps vacation | TEMPORARILY_CLOSED |
| Replacement practice stale | Hidden; `replacementFallback = true` → phone/Notfall fallback |
| General hours verified, acute unverified | OPEN/CLOSED normally; acute never shown (`acuteSuppressed`) |
| Unknown day between now and next opening | `nextOpening = null` ("Nächste Sprechzeit ansehen") |

## 6. Public-holiday strategy

Recommendation: **`REQUIRE_EXPLICIT_ENTRY` as default.**

- A maintained `HolidayCalendar` (Sachsen-Anhalt, per year, from an official source) marks holidays.
- On a holiday without a closure/exception, the engine returns **UNKNOWN** — it never assumes closed.
- The CMS warns in advance: "Am {Datum} ist ein Feiertag. Bitte Sonderöffnungszeit oder Schließung eintragen." (e.g. 30 days ahead).
- Once the practice confirms a general rule ("an gesetzlichen Feiertagen geschlossen"), the policy can switch to `CLOSED_ON_PUBLIC_HOLIDAYS` with its own verification. Bridge days are never inferred; they need explicit closures.

## 7. Examples (synthetic data: Mon–Fri 08–12, Mon 14–17, weekend closed)

| Now (Berlin) | Data situation | Result |
|---|---|---|
| Mon 09:00 | verified week | OPEN · "Heute bis 12:00 Uhr" · Anrufen |
| Mon 13:00 | verified week | CLOSED · "Öffnet heute um 14:00 Uhr" |
| Sat 12:00 | weekend confirmed closed | CLOSED · "Öffnet am Montag, 12. Oktober um 08:00 Uhr" |
| Mon 10:30 | acute 10–11 verified | ACUTE_CONSULTATION · "Heute bis 11:00 Uhr" |
| Mon 10:30 | acute 10–11 unverified | OPEN · acute suppressed |
| Mon 09:00 | vacation Mon–Fri, verified replacement | VACATION · "Bis Freitag, 9. Oktober" · Vertretung anzeigen |
| Mon 09:00 | vacation, replacement stale | VACATION · Notfall-Hinweise · replacement fallback |
| Mon 09:00 | holiday, no entry | UNKNOWN |
| Mon 18:00 | Tuesday is an unconfirmed holiday | CLOSED · "Nächste Sprechzeit ansehen" (next opening unknown) |

## 8. Test matrix

All in `practice-status.test.ts` (59) + time/publication tests in `publication.test.ts` (16). Result: **75/75 pass** (Node 24 test runner).

| Required scenario | Test(s) |
|---|---|
| Normal open | "normal open state" |
| Normal closed | "normal closed state after hours" |
| Before opening | "before opening without a soon-threshold", "opening soon" |
| Near closing | "near closing", "soon states are disabled …" |
| Special hours | "special hours today: inside …", "… after …" |
| One-day closure | "one-day closure exception (CLOSED)", "one-day training closure" |
| Vacation | "vacation with verified replacement …" |
| Temporary closure | "temporary closure (short notice)" |
| Future vacation | "future vacation inside announcement window", "… before its announcement window", "unverified future vacation …" |
| Expired vacation | "expired vacation disappears automatically" |
| Conflicting exceptions | "conflicting exceptions with equal priority", "… different priority" |
| Unverified opening hours | "unverified schedule", "unverified rule for today", "verified status without review dates …" |
| Missing opening hours | "missing opening hours", "weekday without rules that is not confirmed closed" |
| Verified general + unverified acute | "verified general hours + unverified acute rule", "acute rule verified but ACUTE type …" |
| Unverified exception | "unverified exception covering today" |
| Stale replacement practice | "vacation with stale replacement", "unverified replacement practice is never shown" |
| Overlapping vacation + special hours | "vacation overlapping special (open) hours", "vacation overlapping a CLOSED exception" |
| UNKNOWN state | `assertSafeUnknown` used in 18 cases; "UNKNOWN is never visually OPEN …" |
| DST transition | "spring DST …" (2), "autumn DST …" (2) |
| Midnight boundary | "midnight boundary: 23:59 Monday vs. 00:00 Tuesday" |
| Weekday transition | "weekday transition uses Berlin date, not UTC date", "validity periods … Berlin date" |
| Extra | rule conflicts, invalid intervals, review due vs. expired, holidays (4), next opening blocked by unknown day, invalid `now`, outdated records ignored |

## 9. Known limitations (prototype)

- No caching / rendering strategy implemented (decided in the build phase).
- `soonThresholdMinutes` not yet agreed → soon-states off by default.
- Telephone-hours state (FB-08) not modelled in the engine (separate field on Practice).
- Holiday calendar data itself must be sourced and maintained (not included).
