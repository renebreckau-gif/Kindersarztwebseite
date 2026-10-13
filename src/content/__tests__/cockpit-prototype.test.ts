// Phase 09.1 Praxis Cockpit lab prototype: mock data only, engine-driven guardrails,
// and no leak into the public site.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MOCK_ACCOUNTS,
  MOCK_TODAY,
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
  assert.equal(problem?.title, "Widersprüchliche Sonderzeiten");
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
  assert.match(read("app/lab/praxis-cockpit/layout.tsx"), /robots: \{ index: false, follow: false \}/);
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
  walk("app/(site)");
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
