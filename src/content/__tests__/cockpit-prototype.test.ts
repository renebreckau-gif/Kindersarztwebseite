// Phase 09.1 Praxis Cockpit lab prototype: mock data only, engine-driven guardrails,
// and no leak into the public site.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPracticeStatus } from "../../domain/practice-status.ts";
import { zonedToInstant } from "../../domain/time.ts";
import { reducer, versionOf } from "../../lab/cockpit/state.ts";
import { SCENARIOS } from "../../lab/cockpit/scenarios.ts";
import {
  MOCK_ACCOUNTS,
  MOCK_TODAY,
  afterEnd,
  checkReplacementPeriods,
  earlyCloseDraft,
  editableAnnouncements,
  existingTodayChange,
  overlappingVacation,
  withAnnouncement,
  withClosure,
  pastRecords,
  previewPair,
  pulsDataOf,
  upcoming,
  visibleAnnouncements,
  blocks,
  checkChange,
  earlyCloseEffect,
  earlyCloseLabel,
  checks,
  cutAt,
  directoryState,
  entryVerification,
  initialState,
  nowStatus,
  mockLogin,
  plannedSegments,
  readSession,
  replacementSchedule,
  statusAt,
  writeSession,
  type CockpitData,
} from "../../lab/cockpit/model.ts";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const earlyClose = (d: CockpitData, id: string, time: string): CockpitData => ({
  ...d,
  exceptions: [
    ...d.exceptions,
    {
      id,
      kind: "SPECIAL_HOURS",
      startDate: MOCK_TODAY,
      endDate: MOCK_TODAY,
      intervals: cutAt(plannedSegments(d, MOCK_TODAY), time).map((x) => ({ start: x.start, end: x.end, consultationType: x.type })),
      priority: 1,
      verification: entryVerification("Anna Beispiel", "STAFF", MOCK_TODAY),
    },
  ],
});

test("starting situation comes from the real engine: open now, 25.12. unresolved", () => {
  const { data } = initialState();
  assert.equal(nowStatus(data).status, "OPEN");
  const xmas = statusAt(data, "2026-12-25", "10:00");
  assert.equal(xmas.status, "UNKNOWN");
  assert.equal(xmas.reason, "HOLIDAY_WITHOUT_RULE");
  assert.ok(checks(data, "STAFF").some((c) => c.id === "feiertag-2026-12-25"));
});

test("early close passes the check; a second, different special time for today is blocked", () => {
  const base = initialState().data;
  const first = earlyClose(base, "a", "11:00");
  assert.equal(checkChange(base, first, MOCK_TODAY), null);
  const second = earlyClose(first, "b", "10:00");
  const problem = checkChange(first, second, MOCK_TODAY);
  assert.equal(problem?.title, "Widersprüchliche Angaben");
  assert.deepEqual(problem?.relatedIds, ["a"]);
});

test("closing today while a special time exists is blocked (no new UNKNOWN day)", () => {
  const base = earlyClose(initialState().data, "a", "11:00");
  const closed: CockpitData = {
    ...base,
    closures: [{ id: "c", kind: "SHORT_NOTICE", startDate: MOCK_TODAY, endDate: MOCK_TODAY, replacements: [], verification: entryVerification("Anna Beispiel", "STAFF", MOCK_TODAY) }],
  };
  assert.ok(checkChange(base, closed, MOCK_TODAY));
});

describe("early close change set (mock Tue: 08–12 with acute 10–11, 14–16)", () => {
  const today = () => plannedSegments(initialState().data, MOCK_TODAY);
  const asBlocks = (e: ReturnType<typeof earlyCloseEffect>) => blocks(e.segments).map((b) => `${b.start}–${b.end}`);

  test("10:30 inside the morning block → morning shortened, afternoon removed", () => {
    const e = earlyCloseEffect(today(), "10:30");
    assert.equal(e.kind, "INSIDE");
    assert.deepEqual(asBlocks(e), ["08:00–10:30"]);
    assert.equal(earlyCloseLabel(e, "10:30"), "Heute um 10:30 Uhr schließen");
  });

  test("13:00 in the lunch gap → morning unchanged, afternoon removed, exact wording", () => {
    const e = earlyCloseEffect(today(), "13:00");
    assert.equal(e.kind, "GAP");
    assert.deepEqual(asBlocks(e), ["08:00–12:00"]);
    assert.equal(e.lastEnd, "12:00");
    assert.deepEqual(e.removed, [{ start: "14:00", end: "16:00" }]);
    assert.equal(earlyCloseLabel(e, "13:00"), "Nachmittagssprechzeit heute entfallen lassen");
  });

  test("15:00 inside the afternoon block → morning unchanged, afternoon shortened", () => {
    const e = earlyCloseEffect(today(), "15:00");
    assert.equal(e.kind, "INSIDE");
    assert.deepEqual(asBlocks(e), ["08:00–12:00", "14:00–15:00"]);
    assert.equal(earlyCloseLabel(e, "15:00"), "Heute um 15:00 Uhr schließen");
  });

  test("engine shows the shortened day time-aware (open now, closed in the gap)", () => {
    const base = initialState().data;
    const draft = earlyClose(base, "x", "15:00");
    const open = statusAt(draft, MOCK_TODAY, "09:20");
    assert.equal(open.headline, "Praxis geöffnet");
    assert.equal(open.detail, "Heute bis 12:00 Uhr");
    const gap = statusAt(draft, MOCK_TODAY, "13:00");
    assert.equal(gap.detail, "Öffnet heute um 14:00 Uhr");
    const done = statusAt(draft, MOCK_TODAY, "15:30");
    assert.equal(done.headline, "Heute geschlossen");
  });
});

test("weekend holidays are resolved by the weekend rule; weekday holiday needs a check", () => {
  const { data } = initialState();
  assert.equal(statusAt(data, "2026-10-31", "10:00").status, "CLOSED");
  assert.deepEqual(
    checks(data, "STAFF").map((c) => c.id),
    ["feiertag-2026-12-25"],
  );
});

test("replacement directory: stale entry cannot be chosen", () => {
  const dir = initialState().data.directory;
  assert.equal(directoryState(dir.find((p) => p.id === "vb-a")!).usable, true);
  assert.equal(directoryState(dir.find((p) => p.id === "vb-c")!).usable, false);
});

test("prototype model uses mock data only (no import from src/content)", () => {
  const model = read("src/lab/cockpit/model.ts");
  assert.doesNotMatch(model, /from "\.\.\/\.\.\/content\//);
  assert.doesNotMatch(model, /@\/content\//);
});

test("prototype is labelled and not indexed", () => {
  assert.match(read("src/lab/cockpit/ui.tsx"), /PROTOTYP · keine echten Daten/);
  assert.match(read("app/(frontend)/lab/praxis-cockpit/layout.tsx"), /robots: \{ index: false, follow: false \}/);
});

test("public site never links to the cockpit prototype", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(join(ROOT, dir))) {
      const rel = `${dir}/${f}`;
      if (statSync(join(ROOT, rel)).isDirectory()) walk(rel);
      else if (/\.(tsx?|css)$/.test(f)) files.push(rel);
    }
  };
  walk("app/(frontend)/(site)");
  walk("src/site");
  walk("src/content");
  for (const f of files.filter((x) => !x.includes("__tests__"))) assert.doesNotMatch(read(f), /praxis-cockpit/, f);
});

// ---------------------------------------------------------------- Phase 09.1.2: login + vacation journey

describe("mock login (no real authentication)", () => {
  test("test account signs in as Praxisteam; e-mail is case-insensitive", () => {
    assert.equal(mockLogin("team@beispiel.test", "test1234"), "STAFF");
    assert.equal(mockLogin("  Team@Beispiel.TEST ", "test1234"), "STAFF");
    assert.equal(mockLogin("aerztin@beispiel.test", "test1234"), "DOCTOR");
  });

  test("wrong password or unknown e-mail fails without saying which", () => {
    assert.equal(mockLogin("team@beispiel.test", "falsch"), null);
    assert.equal(mockLogin("niemand@beispiel.test", "test1234"), null);
  });

  test("session keeps only the mock role; logout clears it", () => {
    const mem = new Map<string, string>();
    const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
    writeSession(store, "STAFF");
    assert.equal(readSession(store), "STAFF");
    assert.deepEqual([...mem.values()], ["STAFF"], "no password or token in the session");
    writeSession(store, null);
    assert.equal(readSession(store), null);
    assert.equal(readSession(undefined), null);
  });

  test("accounts are obvious test identities", () => {
    for (const a of MOCK_ACCOUNTS) assert.match(a.email, /@beispiel\.test$/);
  });
});

describe("vacation as parents see it (real engine, mock data)", () => {
  // Mon 19 – Fri 23 Oct 2026 (the Monday–Friday week after the test date)
  const vacation = (replacements: { replacementPracticeId: string; from: string; until: string }[]): CockpitData => {
    const d = initialState().data;
    return {
      ...d,
      closures: [
        {
          id: "u",
          kind: "VACATION",
          startDate: "2026-10-19",
          endDate: "2026-10-23",
          announceFrom: "2026-10-05",
          publicMessage: "Die Praxis ist in diesem Zeitraum geschlossen.",
          replacements,
          verification: entryVerification("Anna Beispiel", "STAFF", "2026-10-23"),
        },
      ],
    };
  };

  test("active vacation → closure state with replacement action and safe next opening", () => {
    const d = vacation([{ replacementPracticeId: "vb-a", from: "2026-10-19", until: "2026-10-23" }]);
    const r = statusAt(d, "2026-10-21", "09:00");
    assert.equal(r.status, "VACATION");
    assert.equal(r.indicator, "CLOSURE");
    assert.equal(r.headline, "Praxisurlaub");
    assert.equal(r.detail, "Bis Freitag, 23. Oktober");
    assert.equal(r.primaryAction.id, "REPLACEMENT");
    assert.equal(r.nextOpening?.label, "am Montag, 26. Oktober um 08:00 Uhr");
  });

  test("single replacement is exposed publicly for the whole period", () => {
    const d = vacation([{ replacementPracticeId: "vb-a", from: "2026-10-19", until: "2026-10-23" }]);
    const plan = replacementSchedule(d, "u", "2026-10-19");
    assert.equal(plan.length, 1);
    assert.equal(plan[0].rep.practiceName, "Praxis Beispiel A");
    assert.equal(plan[0].rep.phone, "01234 567890");
    assert.equal(plan[0].note, "Bitte melden Sie sich vorher telefonisch.");
    assert.equal("verification" in plan[0].rep, false, "no verification metadata in the public replacement");
  });

  test("split replacement: date leads, A then B, later views drop past periods", () => {
    const d = vacation([
      { replacementPracticeId: "vb-a", from: "2026-10-19", until: "2026-10-21" },
      { replacementPracticeId: "vb-b", from: "2026-10-22", until: "2026-10-23" },
    ]);
    assert.deepEqual(
      replacementSchedule(d, "u", "2026-10-19").map((p) => [p.from, p.until, p.rep.practiceName]),
      [
        ["2026-10-19", "2026-10-21", "Praxis Beispiel A"],
        ["2026-10-22", "2026-10-23", "Praxis Beispiel B"],
      ],
    );
    assert.deepEqual(replacementSchedule(d, "u", "2026-10-22").map((p) => p.rep.practiceName), ["Praxis Beispiel B"]);
    assert.deepEqual(statusAt(d, "2026-10-22", "09:00").replacementPractices.map((p) => p.id), ["vb-b"]);
  });

  test("stale replacement (Praxis Beispiel C) is not selectable and never shown publicly", () => {
    const d = vacation([{ replacementPracticeId: "vb-c", from: "2026-10-19", until: "2026-10-23" }]);
    assert.equal(directoryState(d.directory.find((p) => p.id === "vb-c")!, "2026-10-23").usable, false);
    assert.deepEqual(replacementSchedule(d, "u", "2026-10-19"), []);
    const r = statusAt(d, "2026-10-19", "09:00");
    assert.equal(r.replacementFallback, true);
    assert.equal(r.primaryAction.id, "EMERGENCY");
  });

  test("no replacement → emergency fallback", () => {
    const r = statusAt(vacation([]), "2026-10-20", "09:00");
    assert.equal(r.status, "VACATION");
    assert.equal(r.replacementFallback, true);
    assert.equal(r.primaryAction.id, "EMERGENCY");
  });

  test("before and after the vacation the normal rules apply", () => {
    const d = vacation([{ replacementPracticeId: "vb-a", from: "2026-10-19", until: "2026-10-23" }]);
    const before = statusAt(d, "2026-10-16", "09:00");
    assert.equal(before.status, "OPEN");
    assert.equal(before.upcomingClosure?.id, "u");
    const saturday = statusAt(d, "2026-10-24", "10:00");
    assert.equal(saturday.status, "CLOSED");
    assert.equal(saturday.nextOpening?.label, "am Montag, 26. Oktober um 08:00 Uhr");
    assert.equal(statusAt(d, "2026-10-26", "09:00").status, "OPEN");
  });
});

// ---------------------------------------------------------------- Phase 09.1.3: live preview + automatic expiry

describe("automatic expiry: temporary records stop counting, normal rules resume", () => {
  const withVacation = (from: string, to: string): CockpitData => {
    const d = initialState().data;
    return {
      ...d,
      closures: [{ id: "u", kind: "VACATION", startDate: from, endDate: to, publicMessage: "Die Praxis ist in diesem Zeitraum geschlossen.", replacements: [], verification: entryVerification("Anna Beispiel", "STAFF", to) }],
    };
  };

  test("1 + 2: vacation 19.–23.10. → 20./23. vacation, 24. weekend rule, 26. 09:00 normal Monday", () => {
    const d = withVacation("2026-10-19", "2026-10-23");
    assert.equal(statusAt(d, "2026-10-20", "09:00").status, "VACATION");
    assert.equal(statusAt(d, "2026-10-23", "09:00").status, "VACATION");
    const sat = statusAt(d, "2026-10-24", "10:00");
    assert.equal(sat.status, "CLOSED");
    assert.equal(sat.activeClosure, undefined);
    assert.equal(statusAt(d, "2026-10-26", "09:00").status, "OPEN");
    const after = afterEnd(d, "2026-10-23");
    assert.equal(after.clear, true);
    assert.equal(after.text, "Nächste Sprechzeit am Montag, 26. Oktober um 08:00 Uhr.");
  });

  test("3: another active exception after the vacation still wins", () => {
    const d = withVacation("2026-10-19", "2026-10-23");
    d.exceptions = [
      ...d.exceptions,
      {
        id: "mo-kurz",
        kind: "SPECIAL_HOURS",
        startDate: "2026-10-26",
        endDate: "2026-10-26",
        intervals: [{ start: "08:00", end: "10:00", consultationType: "GENERAL" }],
        priority: 1,
        verification: entryVerification("Anna Beispiel", "STAFF", "2026-10-26"),
      },
    ];
    const r = statusAt(d, "2026-10-26", "09:00");
    assert.equal(r.status, "SPECIAL_HOURS");
    assert.equal(r.detail, "Heute bis 10:00 Uhr");
  });

  test("4: a weekday holiday after the vacation follows holiday rules (never assumed open)", () => {
    const d = withVacation("2026-12-21", "2026-12-24");
    const xmas = statusAt(d, "2026-12-25", "10:00");
    assert.equal(xmas.status, "UNKNOWN");
    assert.equal(xmas.reason, "HOLIDAY_WITHOUT_RULE");
    const after = afterEnd(d, "2026-12-24");
    assert.equal(after.clear, false);
    assert.match(after.text, /Der Zustand nach diesem Zeitraum ist noch nicht eindeutig\. Am Freitag, 25\. Dezember ist ein Feiertag/);
  });

  test("5: expired announcement is no longer shown", () => {
    const d = initialState().data;
    assert.deepEqual(visibleAnnouncements(d, "2026-10-14").map((a) => a.id), ["mock-hinweis-fortbildung"]);
    assert.deepEqual(visibleAnnouncements(d, "2026-10-15"), []);
  });

  test("6: one-day special hours stop affecting the next day", () => {
    const d = initialState().data; // Wed 14.10. special hours 08–12
    assert.equal(statusAt(d, "2026-10-14", "09:00").status, "SPECIAL_HOURS");
    assert.equal(statusAt(d, "2026-10-15", "09:00").status, "OPEN");
    assert.equal(statusAt(d, "2026-10-15", "15:00").status, "OPEN");
  });

  test("7: one-day closure stops affecting the next day", () => {
    const d = initialState().data;
    d.closures = [{ id: "kurz", kind: "SHORT_NOTICE", startDate: "2026-10-15", endDate: "2026-10-15", replacements: [], verification: entryVerification("Anna Beispiel", "STAFF", "2026-10-15") }];
    assert.equal(statusAt(d, "2026-10-15", "09:00").status, "TEMPORARILY_CLOSED");
    assert.equal(statusAt(d, "2026-10-16", "09:00").status, "OPEN");
  });

  test("12: expired records are kept for history, not deleted", () => {
    const d = withVacation("2026-10-19", "2026-10-23");
    assert.ok(upcoming(d, "2026-10-20").some((i) => i.closure?.id === "u"));
    assert.equal(upcoming(d, "2026-10-24").some((i) => i.closure?.id === "u"), false);
    assert.deepEqual(pastRecords(d, "2026-10-24").map((p) => p.id).filter((id) => id === "u"), ["u"]);
    assert.equal(d.closures.length, 1, "expiry never removes the record");
    assert.ok(pastRecords(initialState().data, "2026-10-15").some((p) => p.id === "mock-hinweis-fortbildung"));
  });
});

describe("Website-Vorschau", () => {
  test("8: preview uses the same domain engine as the public state", () => {
    const base = initialState().data;
    const draft = earlyClose(base, "x", "11:00");
    const pair = previewPair(base, draft, MOCK_TODAY, "09:20");
    assert.deepEqual(pair.current, getPracticeStatus(zonedToInstant(MOCK_TODAY, "09:20"), pulsDataOf(base)));
    assert.deepEqual(pair.changed, getPracticeStatus(zonedToInstant(MOCK_TODAY, "09:20"), pulsDataOf(draft)));
  });

  test("9: preview follows the current change set", () => {
    const base = initialState().data;
    const at11 = previewPair(base, earlyClose(base, "x", "11:00"), MOCK_TODAY, "09:20");
    assert.equal(at11.current.detail, "Heute bis 12:00 Uhr");
    assert.equal(at11.changed?.detail, "Heute bis 11:00 Uhr");
    const at1030 = previewPair(base, earlyClose(base, "y", "10:30"), MOCK_TODAY, "09:20");
    assert.equal(at1030.changed?.detail, "Heute bis 10:30 Uhr");
    assert.equal(previewPair(base, null, MOCK_TODAY, "09:20").changed, undefined);
  });

  test("10 + 11: cockpit wording uses Website-Vorschau, not the old labels", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(join(ROOT, dir))) {
        const rel = `${dir}/${f}`;
        if (statSync(join(ROOT, rel)).isDirectory()) walk(rel);
        else if (/\.tsx?$/.test(f)) files.push(rel);
      }
    };
    walk("src/lab/cockpit");
    walk("app/(frontend)/lab/praxis-cockpit");
    for (const f of files) {
      const src = read(f);
      assert.doesNotMatch(src, /Was sieht die Website\?/, f);
      assert.doesNotMatch(src, /Was sehen Eltern\?/, f);
      assert.doesNotMatch(src, /Website würde/, f);
    }
    assert.match(read("src/lab/cockpit/screens/live.tsx"), /Website-Vorschau/);
    assert.match(read("src/lab/cockpit/screens/live.tsx"), /So sieht es auf der Website aus\./);
  });
});

// ---------------------------------------------------------------- Phase 09.1.4: edit vs. supersede vs. conflict

describe("existing changes are edited, true conflicts stay blocked", () => {
  const scenario = (key: "A" | "B" | "C" | "D", d = initialState().data, today = MOCK_TODAY) => SCENARIOS.find((x) => x.key === key)!.build(d, today).next;
  const todaySpecial = (d: CockpitData) => d.exceptions.filter((x) => x.kind === "SPECIAL_HOURS" && x.startDate === MOCK_TODAY);
  const blocksOf = (d: CockpitData) => todaySpecial(d).flatMap((x) => blocks(x.intervals.map((i) => ({ start: i.start, end: i.end, type: i.consultationType }))).map((b) => `${b.start}–${b.end}`));

  test("1: an existing special-hours change for today is offered for editing", () => {
    const d = scenario("A");
    assert.equal(existingTodayChange(d, MOCK_TODAY)?.id, "szenario-a-heute");
    assert.equal(existingTodayChange(initialState().data, MOCK_TODAY), undefined);
  });

  test("2: editing 15:00 → 13:00 replaces the record (no second active record, no conflict)", () => {
    const d = scenario("A");
    const { effect, draft } = earlyCloseDraft(d, MOCK_TODAY, "13:00", { existing: existingTodayChange(d, MOCK_TODAY), person: "Anna Beispiel", role: "STAFF" });
    assert.equal(effect.kind, "GAP");
    assert.equal(todaySpecial(draft!).length, 1);
    assert.deepEqual(blocksOf(draft!), ["08:00–12:00"]);
    assert.equal(checkChange(d, draft!, MOCK_TODAY), null);
    // the same kind of input as a NEW, independent record would contradict the existing one
    const { draft: second } = earlyCloseDraft(d, MOCK_TODAY, "11:00", { person: "Anna Beispiel", role: "STAFF" });
    assert.equal(checkChange(d, second!, MOCK_TODAY)?.title, "Widersprüchliche Angaben");
  });

  test("3 + 10: undo of the latest edit restores version 1; history keeps every version", () => {
    let st = initialState();
    const a = SCENARIOS[0].build(st.data, MOCK_TODAY);
    st = reducer(st, { type: "seed", next: a.next, entry: a.entry, id: "v1", actorRole: a.actorRole, time: a.time });
    const { draft } = earlyCloseDraft(st.data, MOCK_TODAY, "13:00", { existing: existingTodayChange(st.data, MOCK_TODAY), person: "Anna Beispiel", role: "STAFF" });
    st = reducer(st, { type: "apply", next: draft!, entry: { title: "Sonderzeit geändert", entityIds: ["szenario-a-heute"] }, id: "v2" });
    assert.deepEqual(blocksOf(st.data), ["08:00–12:00"]);
    assert.equal(versionOf(st.audit, st.audit.find((e) => e.id === "v2")!), 2);
    st = reducer(st, { type: "revert", id: "v2", revertId: "r1" });
    assert.deepEqual(blocksOf(st.data), ["08:00–12:00", "14:00–15:00"], "back to version 1, record not deleted");
    assert.deepEqual(
      st.audit.slice(0, 3).map((e) => e.id),
      ["r1", "v2", "v1"],
      "every version stays in the history",
    );
    assert.equal(st.audit.find((e) => e.id === "v1")?.actor, "Dr. Lena Beispiel");
  });

  test("4: an overlapping existing vacation is detected (edit offered instead of conflict)", () => {
    const d = scenario("B");
    assert.equal(overlappingVacation(d, "2026-10-22", "2026-10-26", MOCK_TODAY)?.id, "szenario-b-urlaub");
    assert.equal(overlappingVacation(d, "2026-10-24", "2026-10-30", MOCK_TODAY), undefined);
    assert.equal(overlappingVacation(d, "2026-10-22", "2026-10-26", MOCK_TODAY, "szenario-b-urlaub"), undefined, "the edited vacation itself is no overlap");
  });

  test("5: extending the vacation revalidates replacement coverage (never stretched silently)", () => {
    const c = checkReplacementPeriods("2026-10-19", "2026-10-26", [{ from: "2026-10-19", to: "2026-10-23", practice: "vb-a" }], { from: "2026-10-19", to: "2026-10-23" });
    assert.deepEqual(c.issues, []);
    assert.deepEqual(c.newGaps, [{ from: "2026-10-24", to: "2026-10-26" }]);
    const b = scenario("B");
    // the edit re-confirms the record with the new end date (as the cockpit does)
    const d = withClosure(b, { ...b.closures[0], endDate: "2026-10-26", verification: entryVerification("Anna Beispiel", "STAFF", "2026-10-26") });
    assert.equal(statusAt(d, "2026-10-26", "09:00").replacementFallback, true, "no replacement shown for the new day");
    assert.equal(statusAt(d, "2026-10-26", "09:00").nextOpening?.label, "morgen um 08:00 Uhr");
  });

  test("6: shortening the vacation requires correcting periods beyond the new end", () => {
    const c = checkReplacementPeriods(
      "2026-10-19",
      "2026-10-22",
      [
        { from: "2026-10-19", to: "2026-10-23", practice: "vb-a" },
        { from: "2026-10-23", to: "2026-10-23", practice: "vb-b" },
      ],
      { from: "2026-10-19", to: "2026-10-23" },
    );
    assert.deepEqual(
      c.issues.map((i) => [i.index, i.kind]),
      [
        [0, "beyond"],
        [1, "outside"],
      ],
    );
    assert.deepEqual(c.issues[0].fix, { from: "2026-10-19", to: "2026-10-22" });
    const overlap = checkReplacementPeriods("2026-10-19", "2026-10-23", [
      { from: "2026-10-19", to: "2026-10-21", practice: "vb-a" },
      { from: "2026-10-21", to: "2026-10-23", practice: "vb-b" },
    ]);
    assert.equal(overlap.issues[0].text, "Dieser Zeitraum überschneidet sich mit einer anderen Vertretung.");
  });

  test("7: an existing announcement is editable; extension shows on the new last day", () => {
    const d = scenario("C");
    const a = editableAnnouncements(d, MOCK_TODAY).find((x) => x.id === "szenario-c-hinweis")!;
    assert.equal(a.validUntil, "2026-10-16");
    const edited = withAnnouncement(d, { ...a, validUntil: "2026-10-19" });
    assert.equal(edited.announcements.filter((x) => x.id === a.id).length, 1);
    assert.ok(visibleAnnouncements(edited, "2026-10-19").some((x) => x.id === a.id));
    assert.equal(visibleAnnouncements(edited, "2026-10-20").some((x) => x.id === a.id), false);
  });

  test("8: vacation over an independent special opening stays blocked", () => {
    const d = scenario("D");
    const draft = withClosure(d, { id: "neu", kind: "VACATION", startDate: "2026-10-19", endDate: "2026-10-23", replacements: [], verification: entryVerification("Anna Beispiel", "STAFF", "2026-10-23") });
    const problem = checkChange(d, draft, "2026-10-19", "2026-10-23");
    assert.equal(problem?.title, "Widersprüchliche Angaben");
    assert.match(problem!.text, /zwei unterschiedliche Änderungen, die gleichzeitig gelten würden/);
    assert.deepEqual(problem?.relatedIds, ["szenario-d-sonder"]);
  });

  test("9: expired records are not offered as current editable records", () => {
    const d = scenario("B", scenario("C", scenario("A")));
    assert.notEqual(existingTodayChange(d, "2026-10-14")?.id, "szenario-a-heute", "yesterday's change is history on the next day");
    assert.equal(overlappingVacation(d, "2026-10-19", "2026-10-23", "2026-10-24"), undefined);
    assert.equal(editableAnnouncements(d, "2026-10-17").some((a) => a.id === "szenario-c-hinweis"), false);
  });

  test("11: Website-Vorschau reflects the edited state", () => {
    const d = scenario("A");
    const { draft } = earlyCloseDraft(d, MOCK_TODAY, "13:00", { existing: existingTodayChange(d, MOCK_TODAY), person: "Anna Beispiel", role: "STAFF" });
    const at1430 = previewPair(d, draft, MOCK_TODAY, "14:30");
    assert.equal(at1430.current.headline, "Praxis geöffnet");
    assert.equal(at1430.current.detail, "Heute bis 15:00 Uhr");
    assert.equal(at1430.changed?.headline, "Heute geschlossen");
  });

  test("12: public website and domain code never import the cockpit prototype", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(join(ROOT, dir))) {
        const rel = `${dir}/${f}`;
        if (statSync(join(ROOT, rel)).isDirectory()) walk(rel);
        else if (/\.tsx?$/.test(f)) files.push(rel);
      }
    };
    walk("app/(frontend)/(site)");
    walk("src/site");
    walk("src/domain");
    for (const f of files.filter((x) => !x.includes("__tests__"))) assert.doesNotMatch(read(f), /lab\/cockpit/, f);
  });
});
